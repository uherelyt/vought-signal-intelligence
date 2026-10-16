import test from "node:test";
import assert from "node:assert/strict";
import { PRIVATE_CANON_COMMAND, canonAuthorized, canonIntent, canonText, handlePrivateCanonInteraction } from "../lib/erelyt-canon-bridge.mjs";

test("owner identity strictly required", () => {
  assert.equal(canonAuthorized("123456789012345678", "123456789012345678"), true);
  assert.equal(canonAuthorized("123456789012345678", ""), false);
  assert.equal(canonAuthorized("123456789012345678", "222222222222222222"), false);
});

test("validates energy and prioritizes only optional user self-reports", () => {
  assert.deepEqual(canonIntent([{ name: "view", value: "energy" }, { name: "energy", value: 6 }, { name: "focus", value: "Make the episode" }]), { view: "energy", energy: 6, focus: "Make the episode" });
  assert.equal(canonIntent([{ name: "energy", value: 12 }]).energy, null);
  assert.equal(canonIntent([{ name: "focus", value: "x".repeat(300) }]).focus.length, 150);
});

test("private Notion URL is environment supplied and domain checked", () => {
  const ok = canonText("index", "https://app.notion.com/p/example");
  assert.match(ok, /app\.notion\.com/);
  assert.doesNotMatch(canonText("index", "https://bad.invalid/notion"), /bad\.invalid/);
  assert.match(canonText("facets"), /Erelyt: voice/);
  assert.equal(PRIVATE_CANON_COMMAND.name, "canon");
});

test("does not intercept other slash commands", async () => {
  assert.equal(await handlePrivateCanonInteraction({ type: 2, data: { name: "crew" } }), false);
});
