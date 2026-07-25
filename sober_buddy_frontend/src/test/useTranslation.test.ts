import { describe, expect, it } from 'vitest';
import { useTranslation } from '../shared/hooks/useTranslation';

describe('useTranslation hook', () => {
  it('translates dynamic keys', () => {
    const { t } = useTranslation();
    const result = t('auth_title_login');
    expect(result).toBe('Welcome Back');
  });

  it('translates nested keys', () => {
    const { t } = useTranslation();
    const result = t('landing_nav_logo_text');
    expect(result).toBe('SoberBuddy AI');
  });

  it('substitutes template parameters', () => {
    const { t } = useTranslation();
    // Test direct key substitution (if we had any parametrized keys)
    const result = t('onboarding_q_substance_caregiver', { name: 'Abhi' });
    expect(result).toContain('Abhi');
    expect(result).not.toContain('{{name}}');
  });

  it('falls back to key if not found', () => {
    const { t } = useTranslation();
    const result = t('non_existent_translation_key');
    expect(result).toBe('non_existent_translation_key');
  });
});
