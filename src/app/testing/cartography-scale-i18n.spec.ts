import { readFileSync } from 'fs';
import { join } from 'path';

/** Keys that must exist in every shipped locale bundle (layers form, feature flags, scale hints). */
const KEYS = [
  'entity.cartography.hint.minimumScale',
  'entity.cartography.hint.maximumScale',
  'entity.cartography.error.scaleNonNegativeInteger',
  'entity.cartography.error.scaleRange',
  'entity.cartography.hint.order',
  'entity.cartography.hint.source',
  'featureFlags.layersFeatureInformationTab.description'
] as const;

const LANGS = ['ca', 'en', 'es', 'fr', 'oc-aranes'] as const;

describe('Cartography / layers form i18n keys', () => {
  it.each(LANGS)('%s.json defines required keys', (lang) => {
    const bundle = JSON.parse(
      readFileSync(join(__dirname, `../../assets/i18n/${lang}.json`), 'utf8')
    ) as Record<string, string>;
    for (const k of KEYS) {
      expect(bundle[k]).toBeDefined();
      expect(String(bundle[k]).length).toBeGreaterThan(0);
    }
  });
});
