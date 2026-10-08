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


test("QA rejection feeds the rejected target, backtranslation, and issue into the next rerender", async () => {
  const replies = [
    geminiResponse('{"meaning":"Stay near the hive and watch the rain.","tone":"calm and direct"}'),
    geminiResponse("P'áatal naats' ti' le jobon yéetel il le cháak."),
    geminiResponse('{"valid":false,"semanticMatch":false,"grammarConfidence":"medium","backtranslation":"Stay near the hive and see the rain.","issues":["Use a more natural verb for watch."]}'),
    geminiResponse("P'áatal naats' ti' le jobon yéetel pakte' le cháak."),
    geminiResponse('{"valid":true,"semanticMatch":true,"grammarConfidence":"medium","backtranslation":"Stay near the hive and watch the rain.","issues":[]}'),
  ];
  const prompts = [];

  const result = await generateValidatedYucatecMayaReply({
    apiKey: "test",
    model: "test-model",
    prompt: "Reply as Ah-Muzen-Cab.",
    fetchImpl: async (_url, options) => {
      const body = JSON.parse(options.body);
      prompts.push(body.contents?.[0]?.parts?.map((part) => part.text ?? "").join("\n") ?? "");
      return replies.shift();
    },
    logger: { info: () => {}, warn: () => {} },
  });

  assert.equal(result, "P'áatal naats' ti' le jobon yéetel pakte' le cháak.");
  assert.equal(replies.length, 0);
  assert(prompts.some((prompt) => prompt.includes("PREVIOUS REJECTED TARGET")));
  assert(prompts.some((prompt) => prompt.includes("Stay near the hive and see the rain.")));
  assert(prompts.some((prompt) => prompt.includes("Use a more natural verb for watch.")));
});

test("malformed QA output is treated as a bounded retry instead of aborting the validator", async () => {
  const replies = [
    geminiResponse('{"meaning":"Rest here and drink water.","tone":"gentle"}'),
    geminiResponse("Je'els a wíinklil waye' yéetel uk' ja'."),
    geminiResponse("not-json"),
    geminiResponse("Je'els a wíinklil waye'. Uk' ja'."),
    geminiResponse('{"valid":true,"semanticMatch":true,"grammarConfidence":"medium","backtranslation":"Rest here. Drink water.","issues":[]}'),
  ];

  const result = await generateValidatedYucatecMayaReply({
    apiKey: "test",
    model: "test-model",
    prompt: "Reply as Ah-Muzen-Cab.",
    fetchImpl: async () => replies.shift(),
    logger: { info: () => {}, warn: () => {} },
  });

  assert.equal(result, "Je'els a wíinklil waye'. Uk' ja'.");
  assert.equal(replies.length, 0);
});

test("a rejected Maya draft can be repaired by QA only after independent revalidation", async () => {
  const replies = [
    geminiResponse('{"meaning":"Welcome to this place.","tone":"gentle"}'),
    geminiResponse("Leela' ma'alob ti' a talel."),
    geminiResponse('{"valid":false,"semanticMatch":false,"grammarConfidence":"low","backtranslation":"It is good when you arrive.","issues":["Meaning is not an actual welcome."],"suggestedCorrection":"Ma\'alob k\'iin, ki\'imak in wóol a taal."}'),
    geminiResponse('{"valid":true,"semanticMatch":true,"grammarConfidence":"medium","backtranslation":"Good day, I am glad you came.","issues":[],"suggestedCorrection":""}'),
  ];
  const prompts = [];
  const result = await generateValidatedYucatecMayaReply({
    apiKey: "test", model: "test-model", prompt: "Welcome a guest.",
    fetchImpl: async (_url, options) => {
      prompts.push(JSON.parse(options.body).contents[0].parts.map((part) => part.text ?? "").join(""));
      return replies.shift();
    },
    logger: { info: () => {}, warn: () => {} },
  });
  assert.equal(result, "Ma'alob k'iin, ki'imak in wóol a taal.");
  assert.equal(prompts.length, 4);
  assert.match(prompts[3], /Reevaluate it from scratch/);
  assert.equal(replies.length, 0);
});

test("an English QA correction is never published and falls back to regeneration", async () => {
  const replies = [
    geminiResponse('{"meaning":"Drink clean water.","tone":"direct"}'),
    geminiResponse("Ma'alob. Uk' ja'."),
    geminiResponse('{"valid":false,"semanticMatch":false,"grammarConfidence":"low","backtranslation":"Good. Drink water.","issues":["Extra claim."],"suggestedCorrection":"Drink the good water."}'),
    geminiResponse("Uk' ja'."),
    geminiResponse('{"valid":true,"semanticMatch":true,"grammarConfidence":"high","backtranslation":"Drink water.","issues":[]}'),
  ];
  const result = await generateValidatedYucatecMayaReply({
    apiKey: "test", model: "test-model", prompt: "Reply to a guest.",
    fetchImpl: async () => replies.shift(),
    logger: { info: () => {}, warn: () => {} },
  });
  assert.equal(result, "Uk' ja'.");
  assert.equal(replies.length, 0);
});

test("four rejected Maya candidates still fail closed with no unvalidated reply", async () => {
  const replies = [geminiResponse('{"meaning":"Welcome.","tone":"brief"}')];
  for (let i = 0; i < 4; i++) {
    replies.push(geminiResponse("Ba'ax ka wa'alik?"));
    replies.push(geminiResponse('{"valid":false,"semanticMatch":false,"grammarConfidence":"low","backtranslation":"What do you say?","issues":["Different intended meaning."],"suggestedCorrection":""}'));
  }
  let calls = 0;
  await assert.rejects(
    generateValidatedYucatecMayaReply({
      apiKey: "test", model: "test-model", prompt: "Welcome a guest.",
      fetchImpl: async () => { calls++; return replies.shift(); },
      logger: { info: () => {}, warn: () => {} },
    }),
    /Modern Yucatec Maya validation failed after 4 attempts/,
  );
  assert.equal(calls, 9);
  assert.equal(replies.length, 0);
});
