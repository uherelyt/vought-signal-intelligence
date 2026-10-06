import test from "node:test";
import assert from "node:assert/strict";
import { recordDiscordActivity } from "../lib/children-of-endless.ts";

test("structured activity survives transient cache failure", async (t) => {
  const infoCalls: unknown[][] = [];
  const errorCalls: unknown[][] = [];

  t.mock.method(console, "info", (...args: unknown[]) => {
    infoCalls.push(args);
  });
  t.mock.method(console, "error", (...args: unknown[]) => {
    errorCalls.push(args);
  });

  const redis = {
    async lpush() {
      throw new Error("transient cache unavailable");
    },
    async ltrim() {
      throw new Error("should not be reached");
    },
    async expire() {
      throw new Error("should not be reached");
    },
  } as any;

  const record = await recordDiscordActivity(redis, {
    eventId: "activity-test-1",
    timestamp: "2026-10-06T02:40:00.000Z",
    speakers: ["Bart", "Rose Walker"],
    channelId: "1555308025525440584",
    location: "#house — House of Mirrors (1555308025525440584)",
    plane: "mental",
    movementFrom: [],
    movementTo: [],
    transcript: "Bart: test\nRose Walker: received",
    discordMessageIds: ["1550000000000000001"],
    durableCanon: true,
  });

  assert.equal(record.eventId, "activity-test-1");
  assert.equal(infoCalls.length, 1);
  assert.equal(infoCalls[0]?.[0], "[children-discord-activity]");
  assert.match(String(infoCalls[0]?.[1]), /activity-test-1/);
  assert.equal(errorCalls.length, 1);
  assert.equal(errorCalls[0]?.[0], "[children-discord-activity-cache-error]");
  assert.match(String(errorCalls[0]?.[1]), /activity-test-1/);
});
