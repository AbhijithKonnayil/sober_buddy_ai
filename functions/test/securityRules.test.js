const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

test("Firestore security rules: denies client writes to alertEvents", () => {
  const rules = fs.readFileSync(path.resolve(__dirname, "../../firestore.rules"), "utf8");
  assert.match(rules, /match \/alertEvents\/\{alertId\}/);
  assert.match(rules, /allow write: if false/);
});

test("Firestore security rules: requires accepted link for caregiver profile reads", () => {
  const rules = fs.readFileSync(path.resolve(__dirname, "../../firestore.rules"), "utf8");
  assert.match(rules, /isLinkedCaregiver/);
  assert.match(rules, /status == 'accepted'/);
});
