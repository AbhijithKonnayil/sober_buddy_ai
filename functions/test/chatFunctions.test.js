const test = require("node:test");
const assert = require("node:assert/strict");
const {
  buildSystemPrompt,
  buildEmergencyScriptPrompt,
  resolveRiskFlag,
  assertSessionOwner,
} = require("../lib/chatUtils");
const { buildFallbackEmergencyScripts } = require("../lib/aiProvider");

test("buildSystemPrompt includes role-specific instructions", () => {
  const prompt = buildSystemPrompt({
    role: "sober",
    message: "I want to drink tonight",
    profile: {
      substance: "opioids",
      triggers: ["stress", "loneliness"],
      copingStrategies: ["walking", "music"],
    },
  });

  assert.match(prompt, /sober/i);
  assert.match(prompt, /opioids/i);
  assert.match(prompt, /walking/i);
});

test("buildSystemPrompt includes caregiver coaching context", () => {
  const prompt = buildSystemPrompt({
    role: "caregiver",
    message: "She wants to drink tonight",
    profile: { substance: "alcohol", triggers: ["conflict"], copingStrategies: ["call"] },
  });

  assert.match(prompt, /caregiver coach/i);
  assert.match(prompt, /alcohol/i);
});

test("buildEmergencyScriptPrompt references profile fields", () => {
  const prompt = buildEmergencyScriptPrompt({
    role: "sober",
    profile: { substance: "opioids", triggers: ["stress"], copingStrategies: ["walk"] },
    contact: { name: "Meera" },
  });

  assert.match(prompt, /opioids/i);
  assert.match(prompt, /stress/i);
});

test("resolveRiskFlag classifies severity correctly", () => {
  assert.equal(resolveRiskFlag("I want to hurt myself"), "high");
  assert.equal(resolveRiskFlag("I might overdose"), "high");
  assert.equal(resolveRiskFlag("I feel lonely and stressed"), "medium");
  assert.equal(resolveRiskFlag("I have a craving"), "medium");
  assert.equal(resolveRiskFlag("I want to talk"), "low");
  assert.equal(resolveRiskFlag(""), "low");
});

test("assertSessionOwner rejects mismatched users", () => {
  assert.throws(
    () => assertSessionOwner({ userId: "abc" }, "xyz"),
    (err) => err.code === "permission-denied",
  );
  assert.doesNotThrow(() => assertSessionOwner({ userId: "abc" }, "abc"));
});

test("buildFallbackEmergencyScripts includes profile context", () => {
  const scripts = buildFallbackEmergencyScripts({
    profile: {
      substance: "alcohol",
      triggers: ["stress"],
      copingStrategies: ["walking"],
    },
    contact: { name: "Alex" },
  });

  assert.match(scripts.soberScript, /alcohol/i);
  assert.match(scripts.caregiverScript, /Alex/i);
  assert.match(scripts.caregiverScript, /stress/i);
});
