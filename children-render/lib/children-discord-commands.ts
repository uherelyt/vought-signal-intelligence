import type { Redis } from "@upstash/redis";
import {
  isChildrenDiscordImageAttachmentSupported,
  loadChildrenDiscordImageFiles,
  type ChildrenDiscordImageAttachment,
} from "./children-image-input.ts";
import {
  CHILD_MEMBER_IDS, CHILDREN_PERSONAS, getChildrenLocationByChannelId,
  getChildrenLocationRegistry, runChildrenReactiveMessage, selectChildMembers, selectCrew, selectChildrenLocationForTopic,
  type PersonaId,
} from "./children-of-endless.ts";

const API = "https://discord.com/api/v10";
const PREFIX = "vought:children-of-the-endless:commands";
const COMMAND_VERSION = "20261004-membership-vessel-split-2";
const RETIRED_MEMBER_COMMANDS = new Set(["thanatos", "perses"]);
export const MEMBER_COMMANDS: Record<string, PersonaId> = {
  john: "john", orpheus: "orpheus", rose: "rose", distress: "distress",
  "ah-muzen-cab": "ah_muzen_cab", asclepius: "asclepius", cab: "cab",
};
const messageOption = {
  type: 3, name: "message", description: "Optional message or question.",
  required: false, min_length: 1, max_length: 1500,
};
const imageOption = {
  type: 11, name: "image", description: "Optional image for them to inspect.",
  required: false,
};
export const CHILDREN_SLASH_COMMANDS = [
  ...Object.entries(MEMBER_COMMANDS).map(([name, persona]) => ({
    name, type: 1, description: `Talk to ${CHILDREN_PERSONAS[persona].displayName}.`,
    options: [messageOption, imageOption],
  })),
  {
    name: "children", type: 1, description: "Talk to up to three actual Children of the Endless.",
    options: [
      messageOption,
      imageOption,
      { type: 3, name: "members", description: "Optional: up to three Child IDs, separated by commas." },
    ],
  },
  {
    name: "crew", type: 1, description: "Summon three people currently traveling aboard the vessel.",
    options: [messageOption, imageOption],
  },
];

export type ChildrenInteraction = {
  id?: string; token?: string; type?: number; application_id?: string;
  channel_id?: string; guild_id?: string;
  member?: { nick?: string; user?: { id?: string; username?: string; global_name?: string; bot?: boolean } };
  data?: {
    name?: string;
    options?: Array<{ name?: string; value?: unknown }>;
    resolved?: {
      attachments?: Record<string, {
        id?: string;
        filename?: string;
        size?: number;
        url?: string;
        proxy_url?: string;
        content_type?: string | null;
        width?: number | null;
        height?: number | null;
      }>;
    };
  };
};

function resolvedSlashImage(interaction: ChildrenInteraction): ChildrenDiscordImageAttachment | null {
  const value = interaction.data?.options?.find((row) => row.name === "image")?.value;
  if (typeof value !== "string" || !value) return null;
  const attachment = interaction.data?.resolved?.attachments?.[value];
  if (!attachment) return null;
  const url = attachment.url?.trim() || attachment.proxy_url?.trim();
  const id = attachment.id?.trim() || value;
  const filename = attachment.filename?.trim();
  if (!url || !filename) return null;
  const normalized: ChildrenDiscordImageAttachment = {
    id,
    filename: filename.slice(0, 180),
    url,
    contentType: attachment.content_type?.trim() || undefined,
    size: typeof attachment.size === "number" ? attachment.size : undefined,
    width: typeof attachment.width === "number" ? attachment.width : undefined,
    height: typeof attachment.height === "number" ? attachment.height : undefined,
  };
  return isChildrenDiscordImageAttachmentSupported(normalized) ? normalized : null;
}

export function routeChildrenCommand(interaction: ChildrenInteraction) {
  if (interaction.type !== 2 || !interaction.data?.name) return null;
  const name = interaction.data.name;
  if (!Object.hasOwn(MEMBER_COMMANDS, name) && name !== "children" && name !== "crew") return null;
  const rawMessage = interaction.data.options?.find((row) => row.name === "message")?.value;
  if (rawMessage !== undefined && typeof rawMessage !== "string") return null;
  const message = typeof rawMessage === "string" ? rawMessage.trim() : "";
  if (message.length > 1500) return null;

  const imageRequested = interaction.data.options?.some((row) => row.name === "image");
  const image = resolvedSlashImage(interaction);
  if (imageRequested && !image) return null;
  if (!message && !image) return null;

  const content = message || "Please respond to the attached image.";
  const attachments = image ? [image] : [];
  const displayContent = message;

  if (Object.hasOwn(MEMBER_COMMANDS, name)) {
    return { content, displayContent, attachments, participants: [MEMBER_COMMANDS[name]] };
  }
  if (name === "children") {
    const members = interaction.data.options?.find((row) => row.name === "members")?.value;
    if (members !== undefined) {
      if (typeof members !== "string") return null;
      const values = [...new Set(members.split(",").map((id) => id.trim().toLowerCase()))];
      const ids = values.map((id) => MEMBER_COMMANDS[id] ?? id);
      if (!ids.length || ids.length > 3 || ids.some((id) => !CHILD_MEMBER_IDS.includes(id as PersonaId))) return null;
      return { content, displayContent, attachments, participants: ids as PersonaId[] };
    }
    return { content, displayContent, attachments, participants: selectChildMembers(`slash:${interaction.id}`, 3) };
  }

  return { content, displayContent, attachments, participants: selectCrew(`slash:${interaction.id}`, 3) };
}

async function api(path: string, token: string, method = "GET", body?: unknown, deadline = Infinity) {
  for (let attempt = 0; attempt < 4; attempt++) {
    const remaining = deadline - Date.now();
    if (remaining <= 0) throw new Error("Discord command registration will retry next lease");
    const response = await fetch(`${API}${path}`, {
      method, headers: { authorization: `Bot ${token}`, "content-type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(Math.min(15_000, remaining)),
    });
    if (response.status === 429 && attempt < 3) {
      const limited = await response.json().catch(() => ({}));
      const seconds = Number(limited.retry_after ?? response.headers.get("retry-after") ?? 1);
      if (!Number.isFinite(seconds) || seconds > 20) throw new Error("Discord command rate limit requires a later lease retry");
      const delay = Math.max(250, seconds * 1000) + 100;
      if (Date.now() + delay >= deadline) throw new Error("Discord command registration will retry next lease");
      await new Promise((resolve) => setTimeout(resolve, delay));
      continue;
    }
    if (!response.ok) throw new Error(`Discord command API returned ${response.status} for ${path}`);
    if (response.status === 204) return null;
    return response.json().catch(() => null);
  }
  throw new Error("Discord command registration exhausted retries");
}

export async function ensureChildrenSlashCommands(redis: Redis) {
  const token = process.env.CHILDREN_DISCORD_BOT_TOKEN?.trim();
  const appId = process.env.CHILDREN_DISCORD_APPLICATION_ID?.trim();
  if (!token || !appId) return;
  const locations = getChildrenLocationRegistry();
  const registryKey = `${PREFIX}:registry:${COMMAND_VERSION}:${locations.map((row) => row.channelId).join(",")}`;
  if (await redis.get(registryKey)) return;
  const guilds = new Set<string>();
  const deadline = Date.now() + 45_000;
  for (const location of locations) {
    const channel = await api(`/channels/${location.channelId}`, token, "GET", undefined, deadline);
    if (channel.guild_id) guilds.add(channel.guild_id);
  }
  let retiredRemoved = 0;
  for (const guild of guilds) {
    // Upsert our nine commands while preserving unrelated application commands.
    for (const command of CHILDREN_SLASH_COMMANDS) {
      await api(`/applications/${appId}/guilds/${guild}/commands`, token, "POST", command, deadline);
    }

    // Remove stale member commands that belonged to personas no longer hosted as
    // Children slash targets. Discord does not remove old guild commands merely
    // because they disappear from the current registration array.
    const registered = await api(
      `/applications/${appId}/guilds/${guild}/commands`,
      token,
      "GET",
      undefined,
      deadline,
    ) as Array<{ id?: string; name?: string }> | null;
    for (const command of registered ?? []) {
      if (!command.id || !command.name || !RETIRED_MEMBER_COMMANDS.has(command.name)) continue;
      await api(
        `/applications/${appId}/guilds/${guild}/commands/${command.id}`,
        token,
        "DELETE",
        undefined,
        deadline,
      );
      retiredRemoved += 1;
    }
  }
  if (!guilds.size) throw new Error("No allowlisted guild found for Children commands");
  await redis.set(registryKey, true, { ex: 24 * 60 * 60 });
  await redis.set(`${PREFIX}:registered_at`, new Date().toISOString());
  console.info("[children-slash-commands-registered]", {
    count: CHILDREN_SLASH_COMMANDS.length,
    guilds: guilds.size,
    retiredRemoved,
  });
}

export async function handleChildrenInteraction(interaction: ChildrenInteraction) {
  const appId = process.env.CHILDREN_DISCORD_APPLICATION_ID?.trim();
  if (!appId || interaction.application_id !== appId || !interaction.id || !interaction.token || interaction.type !== 2) return;
  const user = interaction.member?.user;
  const route = routeChildrenCommand(interaction);
  const location = interaction.channel_id ? getChildrenLocationByChannelId(interaction.channel_id) : null;
  const valid = Boolean(route && location && user?.id && !user.bot);
  const destination = route && location ? selectChildrenLocationForTopic(route.content, location.channelId) : null;
  const routingLink = destination && destination.channelId !== location?.channelId ? `\n\nReplies in <#${destination.channelId}>.` : "";
  const header = route && user?.id
    ? `<@${user.id}> → /${interaction.data?.name} (${route.participants.map((id) => CHILDREN_PERSONAS[id].displayName).join(", ")})`
    : "";
  const publicMessage = route && user?.id
    ? [header, route.displayContent, routingLink.trim()].filter(Boolean).join("\n\n")
    : "";
  const hasImage = Boolean(route?.attachments.length);

  // Image interactions are deferred immediately so Discord's 3-second deadline
  // is met before we download and re-upload the selected file into the public
  // interaction response. Text-only interactions can publish in one step.
  const ackPayload = valid
    ? hasImage
      ? { type: 5, data: {} }
      : { type: 4, data: { content: publicMessage, allowed_mentions: { parse: [] } } }
    : { type: 4, data: { flags: 64, content: `Use a member command, /children, or /crew in ${getChildrenLocationRegistry().map((row) => `#${row.slug}`).join(", ")}. Include a message, a supported image, or both. /children accepts up to three actual Child IDs; /crew randomly summons three on-vessel personas.`, allowed_mentions: { parse: [] } } };

  const ack = await fetch(`${API}/interactions/${interaction.id}/${interaction.token}/callback`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(ackPayload),
    signal: AbortSignal.timeout(2500),
  });
  if (!ack.ok || !valid || !route || !location || !user?.id) return;

  let persistedAttachmentIds: Array<{ id: string; filename?: string }> = [];
  if (hasImage) {
    const files = await loadChildrenDiscordImageFiles(route.attachments);
    if (files.length) {
      const form = new FormData();
      const payload = {
        content: publicMessage,
        allowed_mentions: { parse: [] as string[] },
      };
      form.append("payload_json", JSON.stringify(payload));

      files.forEach((file, index) => {
        const bytes = Uint8Array.from(file.bytes);
        const arrayBuffer = bytes.buffer.slice(
          bytes.byteOffset,
          bytes.byteOffset + bytes.byteLength,
        ) as ArrayBuffer;
        form.append(
          `files[${index}]`,
          new Blob([arrayBuffer], { type: file.mimeType }),
          file.filename,
        );
      });

      const published = await fetch(`${API}/webhooks/${appId}/${interaction.token}/messages/@original`, {
        method: "PATCH",
        body: form,
        signal: AbortSignal.timeout(15_000),
      });

      if (published.ok) {
        const message = await published.json().catch(() => null) as
          | { attachments?: Array<{ id?: string; filename?: string }> }
          | null;
        persistedAttachmentIds = (message?.attachments ?? []).flatMap((attachment) => {
          if (typeof attachment.id !== "string") return [];
          return attachment.filename
            ? [{ id: attachment.id, filename: attachment.filename }]
            : [{ id: attachment.id }];
        });
      } else {
        console.warn("[children-command-image-publish-error]", {
          interactionId: interaction.id,
          status: published.status,
        });
      }
    }

    if (!persistedAttachmentIds.length) {
      await fetch(`${API}/webhooks/${appId}/${interaction.token}/messages/@original`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          content: [publicMessage, route.attachments.map((item) => `[image unavailable: ${item.filename}]`).join("\n")].filter(Boolean).join("\n\n"),
          allowed_mentions: { parse: [] },
        }),
        signal: AbortSignal.timeout(15_000),
      });
    }
  }
  let content = "The requested vessel persona(s) could not answer. Please try again.";
  try {
    const result = await runChildrenReactiveMessage({
      messageId: `interaction:${interaction.id}`, channelId: location.channelId,
      authorId: user.id, authorName: interaction.member?.nick || user.global_name || user.username || "Human",
      content: route.content, attachments: route.attachments,
      participants: route.participants, routingNotice: false,
    });
    content = result.ok && !result.skipped ? "" : `Conversation skipped: ${result.reason || "unavailable"}.`;
  } catch {
    console.error("[children-command-reply-error]", { interactionId: interaction.id });
  }
  // Successful persona replies are delivered to the linked topic channel.
  // On failure, append the status without replacing or deleting that input.
  if (!content) return;
  await fetch(`${API}/webhooks/${appId}/${interaction.token}/messages/@original`, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      content: [publicMessage, content].filter(Boolean).join("\n\n"),
      allowed_mentions: { parse: [] },
      ...(persistedAttachmentIds.length ? { attachments: persistedAttachmentIds } : {}),
    }),
    signal: AbortSignal.timeout(15_000),
  });
}
