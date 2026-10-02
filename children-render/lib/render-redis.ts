import { createClient, type RedisClientType } from "redis";

type SetOptions = {
  nx?: boolean;
  ex?: number;
};

export class Redis {
  private client: RedisClientType;
  private connecting: Promise<void> | null = null;

  constructor(url: string) {
    this.client = createClient({ url });
    this.client.on("error", (error) => {
      console.error("[children-render-redis-error]", error instanceof Error ? error.message : String(error));
    });
  }

  private async ready() {
    if (this.client.isOpen) return this.client;
    if (!this.connecting) {
      this.connecting = this.client.connect().then(() => undefined).finally(() => {
        this.connecting = null;
      });
    }
    await this.connecting;
    return this.client;
  }

  async get(key: string) {
    return (await this.ready()).get(key);
  }

  async set(key: string, value: unknown, options: SetOptions = {}) {
    const args: Record<string, unknown> = {};
    if (options.nx) args.NX = true;
    if (typeof options.ex === "number") args.EX = options.ex;
    return (await this.ready()).set(key, String(value), args as never);
  }

  async del(...keys: string[]) {
    if (!keys.length) return 0;
    return (await this.ready()).del(keys);
  }

  async expire(key: string, seconds: number) {
    return (await this.ready()).expire(key, seconds);
  }

  async incr(key: string) {
    return (await this.ready()).incr(key);
  }

  async lpush(key: string, value: unknown) {
    return (await this.ready()).lPush(key, String(value));
  }

  async lrange(key: string, start: number, stop: number) {
    return (await this.ready()).lRange(key, start, stop);
  }

  async ltrim(key: string, start: number, stop: number) {
    return (await this.ready()).lTrim(key, start, stop);
  }

  async eval(script: string, keys: string[] = [], args: Array<string | number> = []) {
    return (await this.ready()).eval(script, {
      keys,
      arguments: args.map(String),
    });
  }
}
