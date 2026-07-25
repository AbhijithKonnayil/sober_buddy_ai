import en from '../i18n/en.json';

type TranslationKeys = keyof typeof en;

export const useTranslation = () => {
  const t = (key: TranslationKeys | string): string => {
    // Since our JSON structure is currently flat, direct key access is clean
    const value = (en as Record<string, string>)[key];
    if (value !== undefined) {
      return value;
    }
    
    const resolved = key.split('.').reduce<unknown>((acc, part) => {
      if (acc && typeof acc === 'object') {
        return (acc as Record<string, unknown>)[part];
      }
      return undefined;
    }, en);
    
    return typeof resolved === 'string' ? resolved : key;
  };

  return { t };
};
