import { Redis } from "./render-redis.ts";
import { ensureChildrenSlashCommands, handleChildrenInteraction, type ChildrenInteraction } from "./children-discord-commands.ts";
import {
  getChildrenLocationByChannelId,
  getChildrenLocationRegistry,
  runChildrenReactiveMessage,
  runChildrenPulse,
} from "./children-of-endless.ts";

const DISCORD_API_BASE = "https://discord.com/api/v10";
const GATEWAY_VERSION = 10;
const GATEWAY_INTENTS = (1 << 0) | (1 << 9) | (1 << 15);
const STATE_PREFIX = "vought:children-of-the-endless";
const QUEUE_TOPIC = "children-discord-gateway";
const LEASE_KEY = `${STATE_PREFIX}:gateway:lease`;
const HEARTBEAT_KEY = `${STATE_PREFIX}:gateway:heartbeat`;
const SESSION_KEY = `${STATE_PREFIX}:gateway:session`;
const LAST_READY_KEY = `${STATE_PREFIX}:gateway:last_ready_at`;
const LAST_EVENT_KEY = `${STATE_PREFIX}:gateway:last_event_at`;
const LAST_ERROR_KEY = `${STATE_PREFIX}:gateway:last_error`;
const LAST_ERROR_AT_KEY = `${STATE_PREFIX}:gateway:last_error_at`;
const LAST_ERROR_CODE_KEY = `${STATE_PREFIX}:gateway:last_error_code`;
const OBSERVER_IDENTITY_KEY = `${STATE_PREFIX}:gateway:observer_identity`;
const ACTIVE_DEPLOYMENT_KEY = `${STATE_PREFIX}:gateway:active_deployment_id`;
const KICK_LOCK_KEY = `${STATE_PREFIX}:gateway:kick_lock`;
const WORKER_LIFETIME_MS = 220_000;
const LEASE_TTL_SECONDS = 280;
const SESSION_TTL_SECONDS = 15 * 60;
const BLOCKED_RETRY_MS = 5 * 60 * 1000;
const PERSISTENT_RECONNECT_DELAY_MS = 1_500;
const PERSISTENT_SCHEDULER_TICK_MS = 60_000;

type DiscordGatewayPayload = {
  op: number;
  d?: unknown;
  s?: number | null;
  t?: string | null;
};

type DiscordMessageCreate = {
  id?: string;
  channel_id?: string;
  webhook_id?: string | null;
  content?: string;
  attachments?: Array<{
    id?: string;
    filename?: string;
    size?: number;
    url?: string;
    proxy_url?: string;
    content_type?: string | null;
    width?: number | null;
    height?: number | null;
  }>;
  author?: {
    id?: string;
    username?: string;
    global_name?: string | null;
    bot?: boolean;
  };
  member?: {
    nick?: string | null;
  };
};

type GatewaySessionState = {
  sessionId: string;
  resumeGatewayUrl: string;
  seq: number;
  updatedAt: string;
};

type GatewayLeaseResult = {
  ok: boolean;
  skipped?: boolean;
  reason?: string;
  closeCode?: number;
  closeReason?: string;
  fatal?: boolean;
};

function redisClient() {
  const url = process.env.REDIS_URL?.trim();
  if (!url) return null;
  return new Redis(url);
}

function gatewayConfig() {
  const coveBotToken = process.env.COVE_DISCORD_BOT_TOKEN?.trim();
  const coveApplicationId = process.env.COVE_DISCORD_APPLICATION_ID?.trim();
  const childrenBotToken = process.env.CHILDREN_DISCORD_BOT_TOKEN?.trim();
  const childrenApplicationId = process.env.CHILDREN_DISCORD_APPLICATION_ID?.trim();
  const locations = getChildrenLocationRegistry();

  const coveConfigured =
    Boolean(coveBotToken) && /^\d{15,22}$/.test(coveApplicationId ?? "");
  const childrenConfigured =
    Boolean(childrenBotToken) && /^\d{15,22}$/.test(childrenApplicationId ?? "");

  if (!locations.length || (!coveConfigured && !childrenConfigured)) return null;

  if (coveConfigured) {
    return {
      botToken: coveBotToken!,
      applicationId: coveApplicationId!,
      observerIdentity: "cove" as const,
      allowedChannelIds: new Set(locations.map((location) => location.channelId)),
    };
  }

  return {
    botToken: childrenBotToken!,
    applicationId: childrenApplicationId!,
    observerIdentity: "children_fallback" as const,
    allowedChannelIds: new Set(locations.map((location) => location.channelId)),
  };
}

function reactiveEnabled() {
  return process.env.CHILDREN_REACTIVE_ENABLED?.trim().toLowerCase() !== "false";
}

async function sendLegacyQueue(_topic: string, _payload: unknown) {
  throw new Error("Legacy Vercel queue is unavailable in the persistent Wispbyte runtime");
}

async function recordGatewayError(
  redis: Redis,
  message: string,
  code?: number,
) {
  const now = new Date().toISOString();
  const writes: Array<Promise<unknown>> = [
    redis.set(LAST_ERROR_KEY, message.slice(0, 300), { ex: 24 * 60 * 60 }),
    redis.set(LAST_ERROR_AT_KEY, now, { ex: 24 * 60 * 60 }),
  ];
  if (code !== undefined) {
    writes.push(
      redis.set(LAST_ERROR_CODE_KEY, String(code), { ex: 24 * 60 * 60 }),
    );
  }
  await Promise.all(writes);
}

async function clearGatewayError(redis: Redis) {
  await Promise.all([
    redis.del(LAST_ERROR_KEY),
    redis.del(LAST_ERROR_AT_KEY),
    redis.del(LAST_ERROR_CODE_KEY),
  ]);
}

async function readSession(redis: Redis, key = SESSION_KEY): Promise<GatewaySessionState | null> {
  const raw = await redis.get(key);
  if (typeof raw !== "string") return null;
  try {
    const parsed = JSON.parse(raw) as GatewaySessionState;
    if (
      !parsed.sessionId ||
      !parsed.resumeGatewayUrl ||
      !Number.isFinite(parsed.seq) ||
      !parsed.updatedAt
    ) {
      return null;
    }
    if (Date.now() - Date.parse(parsed.updatedAt) > SESSION_TTL_SECONDS * 1000) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

async function saveSession(
  redis: Redis,
  sessionId: string | null,
  resumeGatewayUrl: string | null,
  seq: number | null,
  key = SESSION_KEY,
) {
  if (!sessionId || !resumeGatewayUrl || seq === null) return;
  const state: GatewaySessionState = {
    sessionId,
    resumeGatewayUrl,
    seq,
    updatedAt: new Date().toISOString(),
  };
  await redis.set(key, JSON.stringify(state), {
    ex: SESSION_TTL_SECONDS,
  });
}

function gatewayUrl(base: string) {
  const url = new URL(base);
  url.searchParams.set("v", String(GATEWAY_VERSION));
  url.searchParams.set("encoding", "json");
  return url.toString();
}

async function discoverGatewayUrl(botToken: string) {
  const response = await fetch(`${DISCORD_API_BASE}/gateway/bot`, {
    headers: {
      authorization: `Bot ${botToken}`,
      "user-agent": "Vought-Children-of-the-Endless-Gateway/1.0",
    },
    cache: "no-store",
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) {
    throw new Error(`Discord gateway discovery returned ${response.status}`);
  }
  const body = (await response.json()) as { url?: string };
  if (!body.url?.startsWith("wss://")) {
    throw new Error("Discord gateway discovery returned no WebSocket URL");
  }
  return gatewayUrl(body.url);
}

function websocketText(data: unknown) {
  if (typeof data === "string") return data;
  if (data instanceof ArrayBuffer) {
    return new TextDecoder().decode(new Uint8Array(data));
  }
  if (ArrayBuffer.isView(data)) {
    return new TextDecoder().decode(
      new Uint8Array(data.buffer, data.byteOffset, data.byteLength),
    );
  }
  return null;
}

function fatalGatewayClose(code: number) {
  return [4004, 4010, 4011, 4012, 4013, 4014].includes(code);
}

function gatewayErrorForClose(code: number, reason: string) {
  if (code === 4014) {
    return "Discord rejected the privileged Message Content intent. Enable Message Content Intent in the Discord Developer Portal for the active Cove/Children observer application.";
  }
  if (code === 4004) return "Discord rejected the configured bot token.";
  if (code === 4013) return "Discord rejected the configured Gateway intent bitfield.";
  if (code === 4010) return "Discord rejected the Gateway shard configuration.";
  return `Discord Gateway closed with ${code}${reason ? `: ${reason}` : ""}`;
}

async function handleMessageCreate(
  redis: Redis,
  config: NonNullable<ReturnType<typeof gatewayConfig>>,
  data: DiscordMessageCreate,
) {
  if (!data.channel_id || !config.allowedChannelIds.has(data.channel_id)) return;
  if (!getChildrenLocationByChannelId(data.channel_id)) return;
  if (!data.id || !data.author?.id) return;
  if (data.webhook_id || data.author.bot) return;

  const content = data.content?.trim() ?? "";
  const attachments = (data.attachments ?? []).flatMap((attachment) => {
    const url = attachment.url?.trim() || attachment.proxy_url?.trim();
    const id = attachment.id?.trim();
    const filename = attachment.filename?.trim();
    if (!url || !id || !filename) return [];
    return [{
      id,
      filename: filename.slice(0, 180),
      url,
      contentType: attachment.content_type?.trim() || undefined,
      size: typeof attachment.size === "number" ? attachment.size : undefined,
      width: typeof attachment.width === "number" ? attachment.width : undefined,
      height: typeof attachment.height === "number" ? attachment.height : undefined,
    }];
  });
  if (!content && !attachments.length) return;

  const authorName =
    data.member?.nick?.trim() ||
    data.author.global_name?.trim() ||
    data.author.username?.trim() ||
    "Human";

  await redis.set(LAST_EVENT_KEY, new Date().toISOString(), {
    ex: 7 * 24 * 60 * 60,
  });

  try {
    await runChildrenReactiveMessage({
      messageId: data.id,
      channelId: data.channel_id,
      authorId: data.author.id,
      authorName,
      content,
      attachments,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await recordGatewayError(redis, `Reactive reply failed: ${message}`);
    console.error("[children-gateway-reactive-error]", message);
  }
}

async function runGatewayConnection(
  redis: Redis,
  config: NonNullable<ReturnType<typeof gatewayConfig>> & {
    commandOnly?: boolean;
    persistent?: boolean;
    leaseOwnerId?: string;
  },
): Promise<GatewayLeaseResult> {
  const scope = config.commandOnly ? `${STATE_PREFIX}:commands` : `${STATE_PREFIX}:gateway`;
  const sessionKey = `${scope}:session`;
  const heartbeatKey = `${scope}:heartbeat`;
  const readyKey = `${scope}:last_ready_at`;
  const priorSession = await readSession(redis, sessionKey);
  const initialUrl = priorSession?.resumeGatewayUrl
    ? gatewayUrl(priorSession.resumeGatewayUrl)
    : await discoverGatewayUrl(config.botToken);

  return new Promise<GatewayLeaseResult>((resolve) => {
    const ws = new WebSocket(initialUrl);
    let heartbeatTimer: ReturnType<typeof setInterval> | null = null;
    let initialHeartbeatTimer: ReturnType<typeof setTimeout> | null = null;
    let lifetimeTimer: ReturnType<typeof setTimeout> | null = null;
    let forceFinishTimer: ReturnType<typeof setTimeout> | null = null;
    let seq: number | null = priorSession?.seq ?? null;
    let sessionId: string | null = priorSession?.sessionId ?? null;
    let resumeGatewayUrl: string | null =
      priorSession?.resumeGatewayUrl ?? null;
    let settled = false;
    let intentionalHandoff = false;
    let reactiveChain = Promise.resolve();
    const interactions = new Set<Promise<void>>();

    const cleanup = () => {
      if (heartbeatTimer) clearInterval(heartbeatTimer);
      if (initialHeartbeatTimer) clearTimeout(initialHeartbeatTimer);
      if (lifetimeTimer) clearTimeout(lifetimeTimer);
      if (forceFinishTimer) clearTimeout(forceFinishTimer);
    };

    const sendPayload = (payload: unknown) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(payload));
      }
    };

    const heartbeat = () => {
      sendPayload({ op: 1, d: seq });
      void redis.set(heartbeatKey, new Date().toISOString(), {
        ex: LEASE_TTL_SECONDS,
      });
      if (config.persistent && !config.commandOnly && config.leaseOwnerId) {
        void redis.eval(
          "if redis.call('get', KEYS[1]) == ARGV[1] then return redis.call('expire', KEYS[1], ARGV[2]) else return 0 end",
          [LEASE_KEY],
          [config.leaseOwnerId, String(LEASE_TTL_SECONDS)],
        );
      }
      void saveSession(redis, sessionId, resumeGatewayUrl, seq, sessionKey);
    };

    const finish = async (
      result: GatewayLeaseResult,
      closeCode?: number,
      closeReason?: string,
    ) => {
      if (settled) return;
      settled = true;
      cleanup();
      await reactiveChain.catch(() => undefined);
      await Promise.allSettled([...interactions]);
      await saveSession(redis, sessionId, resumeGatewayUrl, seq, sessionKey);
      if (closeCode && closeCode !== 1000) {
        const message = gatewayErrorForClose(closeCode, closeReason ?? "");
        if (config.commandOnly) await redis.set(`${scope}:last_error`, message);
        else await recordGatewayError(redis, message, closeCode);
      }
      resolve({
        ...result,
        closeCode,
        closeReason,
        fatal: closeCode ? fatalGatewayClose(closeCode) : result.fatal,
      });
    };

    ws.addEventListener("open", () => {
      void redis.set(heartbeatKey, new Date().toISOString(), {
        ex: LEASE_TTL_SECONDS,
      });
    });

    ws.addEventListener("message", (event) => {
      const text = websocketText(event.data);
      if (!text) return;

      let payload: DiscordGatewayPayload;
      try {
        payload = JSON.parse(text) as DiscordGatewayPayload;
      } catch {
        return;
      }

      if (typeof payload.s === "number") seq = payload.s;

      if (payload.op === 10) {
        const hello = payload.d as { heartbeat_interval?: number } | undefined;
        const interval = Math.max(
          5_000,
          Number(hello?.heartbeat_interval ?? 41_250),
        );
        initialHeartbeatTimer = setTimeout(
          heartbeat,
          Math.floor(Math.random() * interval),
        );
        heartbeatTimer = setInterval(heartbeat, interval);

        if (priorSession?.sessionId && priorSession.seq !== null) {
          sendPayload({
            op: 6,
            d: {
              token: config.botToken,
              session_id: priorSession.sessionId,
              seq: priorSession.seq,
            },
          });
        } else {
          sendPayload({
            op: 2,
            d: {
              token: config.botToken,
              intents: config.commandOnly ? 1 : GATEWAY_INTENTS,
              properties: {
                os: "linux",
                browser: "vought-cove",
                device: "vought-cove",
              },
            },
          });
        }
        return;
      }

      if (payload.op === 7) {
        intentionalHandoff = false;
        ws.close(4000, "Discord requested reconnect");
        return;
      }

      if (payload.op === 9) {
        sessionId = null;
        resumeGatewayUrl = null;
        seq = null;
        void redis.del(sessionKey);
        intentionalHandoff = false;
        ws.close(4000, "Invalid Gateway session");
        return;
      }

      if (payload.op !== 0) return;

      if (payload.t === "READY") {
        if (config.commandOnly) console.info("[children-command-gateway-ready]");
        const ready = payload.d as {
          session_id?: string;
          resume_gateway_url?: string;
        };
        sessionId = ready.session_id ?? sessionId;
        resumeGatewayUrl = ready.resume_gateway_url ?? resumeGatewayUrl;
        const now = new Date().toISOString();
        void Promise.all([
          redis.set(readyKey, now, { ex: 7 * 24 * 60 * 60 }),
          redis.set(heartbeatKey, now, { ex: LEASE_TTL_SECONDS }),
          config.commandOnly ? redis.del(`${scope}:last_error`) : clearGatewayError(redis),
          saveSession(redis, sessionId, resumeGatewayUrl, seq, sessionKey),
        ]);
        return;
      }

      if (payload.t === "RESUMED") {
        const now = new Date().toISOString();
        void Promise.all([
          redis.set(readyKey, now, { ex: 7 * 24 * 60 * 60 }),
          redis.set(heartbeatKey, now, { ex: LEASE_TTL_SECONDS }),
          config.commandOnly ? redis.del(`${scope}:last_error`) : clearGatewayError(redis),
          saveSession(redis, sessionId, resumeGatewayUrl, seq, sessionKey),
        ]);
        return;
      }

      if (payload.t === "INTERACTION_CREATE" &&
          (config.commandOnly || config.observerIdentity === "children_fallback")) {
        const task = handleChildrenInteraction(payload.d as ChildrenInteraction).catch(() => {
          console.error("[children-interaction-error]");
        });
        interactions.add(task);
        void task.finally(() => interactions.delete(task));
      }

      if (payload.t === "MESSAGE_CREATE" && !config.commandOnly) {
        const data = payload.d as DiscordMessageCreate;
        reactiveChain = reactiveChain.then(() =>
          handleMessageCreate(redis, config, data),
        );
      }
    });

    ws.addEventListener("error", () => {
      if (config.commandOnly) void redis.set(`${scope}:last_error`, "Discord command Gateway WebSocket error");
      else void recordGatewayError(redis, "Discord Gateway WebSocket error");
    });

    ws.addEventListener("close", (event) => {
      const reason = event.reason || "";
      if (event.code === 4007 || event.code === 4009) {
        sessionId = null;
        resumeGatewayUrl = null;
        seq = null;
        void redis.del(sessionKey);
      }
      void finish(
        {
          ok: !fatalGatewayClose(event.code),
          reason: intentionalHandoff ? "lease_handoff" : "gateway_closed",
        },
        event.code,
        reason,
      );
    });

    if (!config.persistent) {
      lifetimeTimer = setTimeout(() => {
        intentionalHandoff = true;
        if (ws.readyState === WebSocket.OPEN) {
          ws.close(1000, "legacy lease handoff");
        } else {
          void finish({ ok: true, reason: "lease_handoff" }, 1000, "");
        }
        forceFinishTimer = setTimeout(() => {
          void finish({ ok: true, reason: "lease_handoff" }, 1000, "");
        }, 5_000);
      }, WORKER_LIFETIME_MS);
    }
  });
}

export async function getChildrenGatewayStatus() {
  const redis = redisClient();
  const config = gatewayConfig();
  if (!redis) {
    return {
      configured: Boolean(config),
      reactive_enabled: reactiveEnabled(),
      alive: false,
      state_configured: false,
      last_ready_at: null,
      last_event_at: null,
      last_reactive_at: null,
      last_error: "state_backend_unconfigured",
      last_error_at: null,
      last_error_code: null,
      observer_identity: config?.observerIdentity ?? null,
      allowlisted_channel_count: getChildrenLocationRegistry().length,
    };
  }

  const [
    heartbeat,
    lastReady,
    lastEvent,
    lastReactive,
    lastError,
    lastErrorAt,
    lastErrorCode,
    lease,
    activeObserverIdentity,
    commandHeartbeat,
    commandReady,
    commandError,
    commandsRegistered,
  ] = await Promise.all([
    redis.get(HEARTBEAT_KEY),
    redis.get(LAST_READY_KEY),
    redis.get(LAST_EVENT_KEY),
    redis.get(`${STATE_PREFIX}:gateway:last_reactive_at`),
    redis.get(LAST_ERROR_KEY),
    redis.get(LAST_ERROR_AT_KEY),
    redis.get(LAST_ERROR_CODE_KEY),
    redis.get(LEASE_KEY),
    redis.get(OBSERVER_IDENTITY_KEY),
    redis.get(`${STATE_PREFIX}:commands:heartbeat`),
    redis.get(`${STATE_PREFIX}:commands:last_ready_at`),
    redis.get(`${STATE_PREFIX}:commands:last_error`),
    redis.get(`${STATE_PREFIX}:commands:registered_at`),
  ]);

  const heartbeatAt =
    typeof heartbeat === "string" ? Date.parse(heartbeat) : Number.NaN;
  const alive =
    Boolean(config) &&
    reactiveEnabled() &&
    typeof lease === "string" &&
    typeof activeObserverIdentity === "string" &&
    activeObserverIdentity === config?.observerIdentity &&
    Number.isFinite(heartbeatAt) &&
    Date.now() - heartbeatAt < 90_000;

  return {
    configured: Boolean(config),
    reactive_enabled: reactiveEnabled(),
    alive,
    state_configured: true,
    heartbeat_at: typeof heartbeat === "string" ? heartbeat : null,
    last_ready_at: typeof lastReady === "string" ? lastReady : null,
    last_event_at: typeof lastEvent === "string" ? lastEvent : null,
    last_reactive_at: typeof lastReactive === "string" ? lastReactive : null,
    last_error: typeof lastError === "string" ? lastError : null,
    last_error_at: typeof lastErrorAt === "string" ? lastErrorAt : null,
    last_error_code:
      typeof lastErrorCode === "number"
        ? lastErrorCode
        : typeof lastErrorCode === "string"
          ? Number(lastErrorCode)
          : null,
    observer_identity: config?.observerIdentity ?? null,
    active_observer_identity:
      typeof activeObserverIdentity === "string" ? activeObserverIdentity : null,
    allowlisted_channel_count: getChildrenLocationRegistry().length,
    slash_commands: {
      registered_at: commandsRegistered,
      last_ready_at: commandReady,
      alive: typeof commandHeartbeat === "string" && Date.now() - Date.parse(commandHeartbeat) < 90_000,
      last_error: commandError,
      application: "children",
    },
  };
}

export async function ensureChildrenDiscordGatewayCurrentDeployment() {
  if (!reactiveEnabled()) {
    return { ok: true, queued: false, reason: "reactive_disabled" };
  }

  const config = gatewayConfig();
  const redis = redisClient();
  const deploymentId = process.env.VERCEL_DEPLOYMENT_ID?.trim();
  if (!config || !redis || !deploymentId) {
    return { ok: false, queued: false, reason: "gateway_deployment_unconfigured" };
  }

  const activeDeploymentId = await redis.get(ACTIVE_DEPLOYMENT_KEY);
  if (
    typeof activeDeploymentId === "string" &&
    activeDeploymentId === deploymentId
  ) {
    return { ok: true, queued: false, reason: "current_deployment_active" };
  }

  const deploymentKickKey = `${KICK_LOCK_KEY}:deployment:${deploymentId}`;
  const kick = await redis.set(deploymentKickKey, crypto.randomUUID(), {
    nx: true,
    ex: 90,
  });
  if (kick !== "OK") {
    return { ok: true, queued: false, reason: "deployment_kick_already_pending" };
  }

  try {
    const result = await sendLegacyQueue(QUEUE_TOPIC, {
      reason: "deployment_boot",
      deploymentId,
      queuedAt: new Date().toISOString(),
    });
    console.info("[children-gateway-current-deployment-kick]", deploymentId);
    return {
      ok: true,
      queued: true,
      deployment_id: deploymentId,
      message_id:
        typeof result === "object" &&
        result !== null &&
        "messageId" in result
          ? String((result as { messageId: unknown }).messageId)
          : null,
    };
  } catch (error) {
    await redis.del(deploymentKickKey);
    const message = error instanceof Error ? error.message : String(error);
    await recordGatewayError(
      redis,
      `Gateway deployment kick failed: ${message}`,
    );
    return { ok: false, queued: false, reason: "deployment_kick_failed" };
  }
}

export async function ensureChildrenDiscordGatewayListener(force = false) {
  if (!reactiveEnabled()) {
    return { ok: true, queued: false, reason: "reactive_disabled" };
  }

  const config = gatewayConfig();
  const redis = redisClient();
  if (!config || !redis) {
    return { ok: false, queued: false, reason: "gateway_unconfigured" };
  }

  if (!force) {
    const status = await getChildrenGatewayStatus();
    if (status.alive) {
      return { ok: true, queued: false, reason: "already_alive" };
    }

    if (
      status.last_error_code === 4014 &&
      status.last_error_at &&
      Date.now() - Date.parse(status.last_error_at) < BLOCKED_RETRY_MS
    ) {
      return {
        ok: false,
        queued: false,
        reason: "message_content_intent_required",
      };
    }
  }

  const kick = await redis.set(KICK_LOCK_KEY, crypto.randomUUID(), {
    nx: true,
    ex: 30,
  });
  if (kick !== "OK" && !force) {
    return { ok: true, queued: false, reason: "kick_already_pending" };
  }

  try {
    const result = await sendLegacyQueue(QUEUE_TOPIC, {
      reason: force ? "forced_kick" : "ensure_listener",
      queuedAt: new Date().toISOString(),
    });
    return {
      ok: true,
      queued: true,
      message_id:
        typeof result === "object" &&
        result !== null &&
        "messageId" in result
          ? String((result as { messageId: unknown }).messageId)
          : null,
    };
  } catch (error) {
    await redis.del(KICK_LOCK_KEY);
    const message = error instanceof Error ? error.message : String(error);
    await recordGatewayError(redis, `Gateway queue send failed: ${message}`);
    return { ok: false, queued: false, reason: "queue_send_failed" };
  }
}

export async function runChildrenDiscordGatewayLease(options: {
  forceTakeover?: boolean;
} = {}) {
  const config = gatewayConfig();
  const redis = redisClient();
  if (!reactiveEnabled()) {
    return { ok: true, skipped: true, reason: "reactive_disabled" };
  }
  if (!config || !redis) {
    return { ok: false, skipped: true, reason: "gateway_unconfigured" };
  }

  const workerId = crypto.randomUUID();

  if (options.forceTakeover) {
    await Promise.all([
      redis.del(LEASE_KEY),
      redis.del(SESSION_KEY),
      redis.del(KICK_LOCK_KEY),
    ]);
    console.info(
      "[children-gateway-deployment-takeover]",
      process.env.VERCEL_DEPLOYMENT_ID?.trim() || "unknown-deployment",
    );
  }

  const lease = await redis.set(LEASE_KEY, workerId, {
    nx: true,
    ex: LEASE_TTL_SECONDS,
  });
  if (lease !== "OK") {
    return { ok: true, skipped: true, reason: "listener_already_running" };
  }

  await redis.del(KICK_LOCK_KEY);

  const priorObserverIdentity = await redis.get(OBSERVER_IDENTITY_KEY);
  if (
    typeof priorObserverIdentity === "string" &&
    priorObserverIdentity !== config.observerIdentity
  ) {
    await redis.del(SESSION_KEY);
  }
  await redis.set(OBSERVER_IDENTITY_KEY, config.observerIdentity, {
    ex: 7 * 24 * 60 * 60,
  });
  const currentDeploymentId = process.env.VERCEL_DEPLOYMENT_ID?.trim();
  if (currentDeploymentId) {
    await redis.set(ACTIVE_DEPLOYMENT_KEY, currentDeploymentId, {
      ex: 7 * 24 * 60 * 60,
    });
  }

  let result: GatewayLeaseResult;
  try {
    // Evaluate local-hour slots on the existing leased Queue, without upgrading cron or waiting for human activity.
    // Isolate generation/delivery errors so ambient activity cannot stop the observer or slash-command sockets.
    const activity = runChildrenPulse({ mode: "cron" }).then((pulse) => {
      if (!pulse.skipped) console.info("[children-scheduled-activity]", JSON.stringify({ ok: pulse.ok, posted: pulse.posted, participants: pulse.participants }));
    }).catch((error) => {
      console.error("[children-scheduled-activity-error]", error instanceof Error ? error.message : "Scheduled pulse failed");
    });
    const registration = ensureChildrenSlashCommands(redis).catch((error) => {
      console.error("[children-command-registration-error]", error instanceof Error ? error.message : "Registration failed");
    });
    const commandToken = process.env.CHILDREN_DISCORD_BOT_TOKEN?.trim();
    const commandAppId = process.env.CHILDREN_DISCORD_APPLICATION_ID?.trim();
    if (config.observerIdentity === "cove" && commandToken && commandAppId) {
      const [observer] = await Promise.all([
        runGatewayConnection(redis, config),
        runGatewayConnection(redis, {
          botToken: commandToken, applicationId: commandAppId,
          observerIdentity: "children_fallback",
          allowedChannelIds: config.allowedChannelIds, commandOnly: true,
        }).catch(async () => {
          await redis.set(`${STATE_PREFIX}:commands:last_error`, "Command Gateway failed");
          return { ok: false };
        }),
        registration,
        activity,
      ]);
      result = observer;
    } else {
      [result] = await Promise.all([runGatewayConnection(redis, config), registration, activity]);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await recordGatewayError(redis, `Gateway worker failed: ${message}`);
    result = { ok: false, reason: "worker_error" };
  } finally {
    const owner = await redis.get(LEASE_KEY);
    if (owner === workerId) await redis.del(LEASE_KEY);
  }

  if (!result.fatal && reactiveEnabled()) {
    try {
      await sendLegacyQueue(QUEUE_TOPIC, {
        reason: "lease_handoff",
        queuedAt: new Date().toISOString(),
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      await recordGatewayError(
        redis,
        `Gateway handoff queue failed: ${message}`,
      );
      throw error;
    }
  }

  return result;
}


async function persistentDelay(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function runPersistentGatewayLoop(
  redis: Redis,
  config: NonNullable<ReturnType<typeof gatewayConfig>> & { commandOnly?: boolean },
  leaseOwnerId: string,
) {
  while (reactiveEnabled()) {
    const owner = await redis.get(LEASE_KEY);
    if (!config.commandOnly && owner !== leaseOwnerId) {
      return { ok: false, fatal: true, reason: "persistent_lease_lost" } as GatewayLeaseResult;
    }

    const result = await runGatewayConnection(redis, {
      ...config,
      persistent: true,
      leaseOwnerId: config.commandOnly ? undefined : leaseOwnerId,
    });
    if (result.fatal) return result;
    await persistentDelay(PERSISTENT_RECONNECT_DELAY_MS);
  }
  return { ok: true, reason: "reactive_disabled" } as GatewayLeaseResult;
}

async function runPersistentScheduler(redis: Redis, leaseOwnerId: string) {
  while (reactiveEnabled()) {
    const owner = await redis.get(LEASE_KEY);
    if (owner !== leaseOwnerId) return;
    try {
      const pulse = await runChildrenPulse({ mode: "cron" });
      if (!pulse.skipped) {
        console.info("[children-scheduled-activity]", JSON.stringify({
          ok: pulse.ok,
          posted: pulse.posted,
          participants: pulse.participants,
        }));
      }
    } catch (error) {
      console.error(
        "[children-scheduled-activity-error]",
        error instanceof Error ? error.message : "Scheduled pulse failed",
      );
    }
    await persistentDelay(PERSISTENT_SCHEDULER_TICK_MS);
  }
}

export async function runChildrenDiscordGatewayPersistent(options: {
  forceTakeover?: boolean;
} = {}) {
  const config = gatewayConfig();
  const redis = redisClient();
  if (!reactiveEnabled()) {
    return { ok: true, skipped: true, reason: "reactive_disabled" };
  }
  if (!config || !redis) {
    return { ok: false, skipped: true, reason: "gateway_unconfigured" };
  }

  const runtimeHost =
    process.env.CHILDREN_RUNTIME_HOST?.trim().toLowerCase() || "persistent";
  const workerId =
    process.env.CHILDREN_HOST_INSTANCE_ID?.trim() ||
    process.env.CHILDREN_HOST_DEPLOYMENT_ID?.trim() ||
    `${runtimeHost}-${crypto.randomUUID()}`;

  if (options.forceTakeover !== false) {
    await Promise.all([
      redis.del(LEASE_KEY),
      redis.del(KICK_LOCK_KEY),
    ]);
  }

  const lease = await redis.set(LEASE_KEY, workerId, {
    nx: true,
    ex: LEASE_TTL_SECONDS,
  });
  if (lease !== "OK") {
    return { ok: true, skipped: true, reason: "listener_already_running" };
  }

  const priorObserverIdentity = await redis.get(OBSERVER_IDENTITY_KEY);
  if (
    typeof priorObserverIdentity === "string" &&
    priorObserverIdentity !== config.observerIdentity
  ) {
    await redis.del(SESSION_KEY);
  }

  await Promise.all([
    redis.set(OBSERVER_IDENTITY_KEY, config.observerIdentity, {
      ex: 7 * 24 * 60 * 60,
    }),
    redis.set(
      ACTIVE_DEPLOYMENT_KEY,
      `${runtimeHost}:${process.env.CHILDREN_HOST_DEPLOYMENT_ID?.trim() || workerId}`,
      { ex: 7 * 24 * 60 * 60 },
    ),
    redis.del(KICK_LOCK_KEY),
  ]);

  await ensureChildrenSlashCommands(redis);

  void runPersistentScheduler(redis, workerId);

  const commandToken = process.env.CHILDREN_DISCORD_BOT_TOKEN?.trim();
  const commandAppId = process.env.CHILDREN_DISCORD_APPLICATION_ID?.trim();
  if (config.observerIdentity === "cove" && commandToken && commandAppId) {
    void runPersistentGatewayLoop(
      redis,
      {
        botToken: commandToken,
        applicationId: commandAppId,
        observerIdentity: "children_fallback",
        allowedChannelIds: config.allowedChannelIds,
        commandOnly: true,
      },
      workerId,
    ).catch(async (error) => {
      const message = error instanceof Error ? error.message : String(error);
      await redis.set(`${STATE_PREFIX}:commands:last_error`, message.slice(0, 300));
      console.error("[children-command-gateway-error]", message);
    });
  }

  console.info("[children-persistent-gateway-started]", JSON.stringify({
    runtimeHost,
    workerId,
    observerIdentity: config.observerIdentity,
    channels: config.allowedChannelIds.size,
    deploymentId: process.env.CHILDREN_HOST_DEPLOYMENT_ID?.trim() || null,
  }));

  const result = await runPersistentGatewayLoop(redis, config, workerId);
  const owner = await redis.get(LEASE_KEY);
  if (owner === workerId) {
    await redis.eval(
      "if redis.call('get', KEYS[1]) == ARGV[1] then return redis.call('del', KEYS[1]) else return 0 end",
      [LEASE_KEY],
      [workerId],
    );
  }
  return result;
}
