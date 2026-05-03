const REQUIRED_KEYS = [
  'entity.cartography.hint.minimumScale',
  'entity.cartography.hint.maximumScale',
  'entity.cartography.error.scaleNonNegativeInteger',
  'entity.cartography.error.scaleRange'
] as const;

const LOCALE_FILES = [
  'ca',
  'en',
  'es',
  'fr',
  'oc-aranes'
] as const;

describe('Cartography scale i18n keys', () => {
  LOCALE_FILES.forEach((lang) => {
    it(`should define all scale keys in ${lang}.json`, () => {
      const bundle = require(`../../assets/i18n/${lang}.json`) as Record<
        string,
        string
      >;
      REQUIRED_KEYS.forEach((k) => {
        expect(bundle[k]).toBeDefined();
        expect(String(bundle[k]).length).toBeGreaterThan(0);
      });
    });
  });
});
