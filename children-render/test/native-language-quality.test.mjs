import test from "node:test";
import assert from "node:assert/strict";
import {
  generateValidatedYucatecMayaReply,
  nativeLanguageSurfaceCheck,
  parseStrictJsonObject,
} from "../lib/native-language-quality.mjs";

function geminiResponse(text) {
  return {
    ok: true,
    status: 200,
    async json() {
      return { candidates: [{ content: { parts: [{ text }] } }] };
    },
  };
}

test("surface gate rejects obvious English leakage and structured output", () => {
  assert.equal(nativeLanguageSurfaceCheck("The sun is good and you are safe.").ok, false);
  assert.equal(nativeLanguageSurfaceCheck('{"translation":"Ma\'alob"}').ok, false);
  assert.equal(nativeLanguageSurfaceCheck("Ma'alob tin wóol, yéetel yanen waye'.").ok, true);
});

test("strict JSON parser tolerates fenced model JSON", () => {
  assert.deepEqual(parseStrictJsonObject('```json\n{"valid":true}\n```'), { valid: true });
});

test("validated Yucatec pipeline returns only approved target-language text and logs the audit backtranslation", async () => {
  const replies = [
    geminiResponse('{"meaning":"I hear the pain in what you said. Rest and nourishment matter too.","tone":"warm and practical"}'),
    geminiResponse("Ma'alob. K'áabet a je'elsik a wíinklil yéetel a janal."),
    geminiResponse('{"valid":true,"semanticMatch":true,"grammarConfidence":"medium","backtranslation":"Good. You need to rest your body and eat.","issues":[]}'),
  ];
  const logs = [];
  const result = await generateValidatedYucatecMayaReply({
    apiKey: "test",
    model: "test-model",
    prompt: "Reply as Ah-Muzen-Cab.",
    currentRequest: "I need guidance.",
    fetchImpl: async () => replies.shift(),
    logger: { info: (...args) => logs.push(args), warn: () => {} },
  });
  assert.equal(result, "Ma'alob. K'áabet a je'elsik a wíinklil yéetel a janal.");
  assert.equal(replies.length, 0);
  assert.match(JSON.stringify(logs), /backtranslation/);
});

test("surface rejection triggers one bounded rerender before publication", async () => {
  const replies = [
    geminiResponse('{"meaning":"Stay steady and take care of yourself.","tone":"direct"}'),
    geminiResponse("Ma'alob yéetel the good water."),
    geminiResponse("Ma'alob. Kanáant a báaj yéetel p'áatal jets'."),
    geminiResponse('{"valid":true,"semanticMatch":true,"grammarConfidence":"medium","backtranslation":"Good. Take care of yourself and remain calm.","issues":[]}'),
  ];
  let calls = 0;
  const result = await generateValidatedYucatecMayaReply({
    apiKey: "test",
    model: "test-model",
    prompt: "Reply as Ah-Muzen-Cab.",
    fetchImpl: async () => {
      calls += 1;
      return replies.shift();
    },
    logger: { info: () => {}, warn: () => {} },
  });
  assert.equal(result, "Ma'alob. Kanáant a báaj yéetel p'áatal jets'.");
  assert.equal(calls, 4);
});
