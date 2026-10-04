import assert from "node:assert/strict";
import test from "node:test";

import {
  CHILD_MEMBER_IDS,
  ON_VESSEL,
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
