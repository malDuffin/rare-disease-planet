export const LANGS = [
  { code: 'en', native: 'English' },
  { code: 'ja', native: '日本語' },
  { code: 'es', native: 'Español' },
  { code: 'fr', native: 'Français' },
  { code: 'pt', native: 'Português' },
  { code: 'de', native: 'Deutsch' },
  { code: 'ar', native: 'العربية', dir: 'rtl' },
  { code: 'hi', native: 'हिन्दी' },
  { code: 'zh', native: '中文' },
];

export const DISEASE_KEYS = [
  'dmd',
  'bmd',
  'sma',
  'hd',
  'cf',
  'als',
  'rett',
  'fragile_x',
  'pompe',
  'gaucher',
  'fabry',
  'pku',
  'hemophilia',
  'marfan',
  'eds',
  'oi',
  'pws',
  'angelman',
  'tsc',
  'nf1',
  'rp',
  'friedreich',
  'myotonic',
  'lgmd',
  'cmt',
  'eb',
  'sickle_cell',
  'thalassemia',
  'other',
];

export const FEATURE_KEYS = [
  'same_condition',
  'family_support',
  'research_news',
  'caregiver',
  'specialists',
  'advocacy',
  'awareness',
  'mental_health',
  'school',
  'travel_care',
  'translation',
  'events',
];

export const ROLE_KEYS = [
  'living_with',
  'parent',
  'sibling',
  'family',
  'caregiver',
  'clinician',
  'advocate',
  'friend',
];

export const RELATIONSHIP_KEYS = [
  'child',
  'parent',
  'sibling',
  'partner',
  'grandparent',
  'other',
];

export function countryName(code, locale) {
  if (!code) return '';
  try {
    const name = new Intl.DisplayNames([locale, 'en'], { type: 'region' }).of(code);
    return name || code;
  } catch {
    return code;
  }
}

export function diseaseLabel(pin, t) {
  if (pin?.rareDiseaseKey && pin.rareDiseaseKey !== 'other') {
    return t(`diseases.${pin.rareDiseaseKey}`);
  }
  return pin?.rareDisease || '';
}

export function pinLine(pin, t, locale) {
  const parts = [countryName(pin.countryCode, locale), diseaseLabel(pin, t)];
  if (pin.variant) parts.push(pin.variant);
  if (pin.townCity) parts.push(pin.townCity);
  return parts.filter(Boolean).join(' · ');
}
