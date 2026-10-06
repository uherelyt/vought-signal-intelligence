import assert from "node:assert/strict";
import test from "node:test";

import {
  CHILD_MEMBER_IDS,
  CHILDREN_PERSONAS,
  ON_VESSEL,
  reserveChildrenActivitySlot,
  selectChildMembers,
  selectCrew,
  selectReactiveParticipants,
} from "../lib/children-of-endless.ts";
import {
  CHILDREN_SLASH_COMMANDS,
  routeChildrenCommand,
} from "../lib/children-discord-commands.ts";

const interaction = (
  name: string,
  options: Array<{ name: string; value: unknown }> = [{ name: "message", value: "hello" }],
) => ({
  id: `test-${name}`,
  type: 2,
  data: { name, options },
});

test("membership and vessel sets stay distinct", () => {
  assert.deepEqual(CHILD_MEMBER_IDS, ["john", "orpheus", "rose", "distress"]);
  assert.deepEqual(ON_VESSEL, [
    "john", "orpheus", "rose", "distress",
    "asclepius", "ah_muzen_cab", "cab",
  ]);
});

test("/children selects only actual Children", () => {
  const routed = routeChildrenCommand(interaction("children"));
  assert(routed);
  assert.equal(routed.participants.length, 3);
  assert(routed.participants.every((id) => CHILD_MEMBER_IDS.includes(id)));
});

test("/children rejects attached crew in explicit members", () => {
  const routed = routeChildrenCommand(interaction("children", [
    { name: "message", value: "hello" },
    { name: "members", value: "asclepius" },
  ]));
  assert.equal(routed, null);
});

test("/crew selects three on-vessel personas", () => {
  const routed = routeChildrenCommand(interaction("crew"));
  assert(routed);
  assert.equal(routed.participants.length, 3);
  assert(routed.participants.every((id) => ON_VESSEL.includes(id)));
});

test("individual non-Child vessel commands remain valid", () => {
  assert.deepEqual(routeChildrenCommand(interaction("asclepius"))?.participants, ["asclepius"]);
  assert.deepEqual(routeChildrenCommand(interaction("ah-muzen-cab"))?.participants, ["ah_muzen_cab"]);
  assert.deepEqual(routeChildrenCommand(interaction("cab"))?.participants, ["cab"]);
});

test("selector contracts preserve ontology", () => {
  assert(selectChildMembers("child-seed", 3).every((id) => CHILD_MEMBER_IDS.includes(id)));
  assert.deepEqual(
    selectCrew("crew-seed", 3, ["asclepius", "ah_muzen_cab", "cab"]),
    ["asclepius", "ah_muzen_cab", "cab"],
  );
  assert(selectReactiveParticipants("m1", "children, answer me").every((id) => CHILD_MEMBER_IDS.includes(id)));
  assert(selectReactiveParticipants("m2", "crew, answer me").every((id) => ON_VESSEL.includes(id)));
});

test("slash registry includes /children and /crew", () => {
  const names = CHILDREN_SLASH_COMMANDS.map((row) => row.name);
  assert(names.includes("children"));
  assert(names.includes("crew"));
  assert.equal(names.length, 9);
});


test("source-character bridge keeps published identities primary", () => {
  assert.match(CHILDREN_PERSONAS.john.sourceCanonBaseline ?? "", /John Ryder.*Destiny: A Chronicle of Deaths Foretold/);
  assert.doesNotMatch(CHILDREN_PERSONAS.john.chronologicalAge, /primordial|ageless/i);
  assert.match(CHILDREN_PERSONAS.john.chronologicalAge, /Byzantine/i);

  assert.match(CHILDREN_PERSONAS.orpheus.sourceCanonBaseline ?? "", /son of Dream\/Oneiros and Calliope/i);
  assert.match(CHILDREN_PERSONAS.orpheus.projectContinuityLayer ?? "", /canonically dead/i);
  assert.match(CHILDREN_PERSONAS.orpheus.projectContinuityLayer ?? "", /ghost\/spirit/i);

  assert.match(CHILDREN_PERSONAS.rose.sourceCanonBaseline ?? "", /human Dream Vortex/i);
  assert.match(CHILDREN_PERSONAS.rose.sourceCanonBaseline ?? "", /Jed Walker/i);

  assert.match(CHILDREN_PERSONAS.john.sourceCanonBaseline ?? "", /"Son" of Destiny/i);
  assert.match(CHILDREN_PERSONAS.distress.sourceCanonBaseline ?? "", /Despair III/i);
  assert.match(CHILDREN_PERSONAS.distress.sourceCanonBaseline ?? "", /third incarnation/i);
});


test("scheduled activity retries are bounded and a released pre-publication claim can retry", async () => {
  class FakeRedis {
    values = new Map<string, string>();

    async set(key: string, value: string, options?: { nx?: boolean }) {
      if (options?.nx && this.values.has(key)) return null;
      this.values.set(key, String(value));
      return "OK";
    }

    async incr(key: string) {
      const next = Number(this.values.get(key) ?? "0") + 1;
      this.values.set(key, String(next));
      return next;
    }

    async expire(_key: string, _seconds: number) {
      return 1;
    }

    async del(key: string) {
      return this.values.delete(key) ? 1 : 0;
    }
  }

  const redis = new FakeRedis();
  const now = new Date("2026-10-06T04:15:00.000Z");

  const first = await reserveChildrenActivitySlot(redis as any, now);
  assert.equal(first.ok, true);
  if (!first.ok) return;
  assert.equal(first.retryAttempt, 1);
  await redis.del(first.claimKey);

  const second = await reserveChildrenActivitySlot(redis as any, now);
  assert.equal(second.ok, true);
  if (!second.ok) return;
  assert.equal(second.retryAttempt, 2);
  await redis.del(second.claimKey);

  const third = await reserveChildrenActivitySlot(redis as any, now);
  assert.equal(third.ok, true);
  if (!third.ok) return;
  assert.equal(third.retryAttempt, 3);
  await redis.del(third.claimKey);

  const fourth = await reserveChildrenActivitySlot(redis as any, now);
  assert.deepEqual(fourth, { ok: false, reason: "retry_limit" });

  const fifth = await reserveChildrenActivitySlot(redis as any, now);
  assert.deepEqual(fifth, { ok: false, reason: "duplicate_slot" });
});
