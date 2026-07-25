import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

describe('Firestore security rules', () => {
  it('denies client writes to alertEvents', () => {
    const rules = readFileSync(resolve(__dirname, '../../firestore.rules'), 'utf8');
    expect(rules).toContain('match /alertEvents/{alertId}');
    expect(rules).toContain('allow write: if false');
  });

  it('requires accepted link for caregiver profile reads', () => {
    const rules = readFileSync(resolve(__dirname, '../../firestore.rules'), 'utf8');
    expect(rules).toContain('isLinkedCaregiver');
    expect(rules).toContain("status == 'accepted'");
  });
});
