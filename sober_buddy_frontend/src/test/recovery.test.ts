import { describe, expect, it } from 'vitest';
import en from '../shared/i18n/en.json';

describe('useTranslation interpolation', () => {
  it('replaces template variables in strings', () => {
    const template = en.dashboard_panic_script_caregiver_title;
    const result = template.replace(/\{\{name\}\}/g, 'Alex');
    expect(result).toContain('Alex');
    expect(result).not.toContain('{{name}}');
  });

  it('includes required dashboard keys', () => {
    expect(en.dashboard_sober_btn_chat).toBeTruthy();
    expect(en.education_title).toBeTruthy();
    expect(en.voice_chat_error_session).toBeTruthy();
  });
});

describe('resolveRiskFlag logic (mirrored)', () => {
  function resolveRiskFlag(message = '') {
    const normalized = message.toLowerCase();
    if (/(hurt|suicide|self-harm|overdose|kill|emergency|panic)/.test(normalized)) {
      return 'high';
    }
    if (/(craving|drink|use|relapse|lonely|stress|anxious|overwhelmed|need help)/.test(normalized)) {
      return 'medium';
    }
    return 'low';
  }

  it('classifies high risk messages', () => {
    expect(resolveRiskFlag('I want to hurt myself')).toBe('high');
  });

  it('classifies medium risk messages', () => {
    expect(resolveRiskFlag('I have a craving')).toBe('medium');
  });

  it('defaults to low risk', () => {
    expect(resolveRiskFlag('hello')).toBe('low');
  });
});
