const test = require("node:test");
const assert = require("node:assert/strict");
const { buildSystemPrompt, resolveRiskFlag } = require("../index.js");

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

test("resolveRiskFlag falls back to a sensible severity", () => {
  assert.equal(resolveRiskFlag("I want to hurt myself"), "high");
  assert.equal(resolveRiskFlag("I feel lonely and stressed"), "medium");
  assert.equal(resolveRiskFlag("I want to talk"), "low");
});
