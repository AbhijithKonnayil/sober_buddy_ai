import en from '../i18n/en.json';

type TranslationKeys = keyof typeof en;
type TranslationParams = Record<string, string | number>;

export const useTranslation = () => {
  const t = (key: TranslationKeys | string, params?: TranslationParams): string => {
    const value = (en as Record<string, string>)[key];
    let resolved = value;

    if (resolved === undefined) {
      const nested = key.split('.').reduce<unknown>((acc, part) => {
        if (acc && typeof acc === 'object') {
          return (acc as Record<string, unknown>)[part];
        }
        return undefined;
      }, en);
      resolved = typeof nested === 'string' ? nested : key;
    }

    if (!params) {
      return resolved;
    }

    return Object.entries(params).reduce(
      (text, [paramKey, paramValue]) =>
        text.replace(new RegExp(`\\{\\{${paramKey}\\}\\}`, 'g'), String(paramValue)),
      resolved,
    );
  };

  return { t };
};
