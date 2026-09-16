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

/**
 * Gene metadata for genetic rare diseases.
 * Maps disease keys to their associated gene symbol(s).
 * Used to generate Exon Editor links for diseases with known genetic causes.
 */
export const DISEASE_GENES = {
  dmd: ['DMD'],
  bmd: ['DMD'],
  sma: ['SMN1', 'SMN2'],
  hd: ['HTT'],
  cf: ['CFTR'],
  als: ['SOD1', 'C9orf72', 'FUS', 'TARDBP'],
  rett: ['MECP2'],
  fragile_x: ['FMR1'],
  pompe: ['GAA'],
  gaucher: ['GBA'],
  fabry: ['GLA'],
  pku: ['PAH'],
  hemophilia: ['F8', 'F9'],
  marfan: ['FBN1'],
  eds: ['COL5A1', 'COL5A2', 'COL3A1'],
  oi: ['COL1A1', 'COL1A2'],
  pws: ['SNRPN', 'NDN', 'MAGEL2'],
  angelman: ['UBE3A'],
  tsc: ['TSC1', 'TSC2'],
  nf1: ['NF1'],
  rp: ['RHO', 'RPGR', 'USH2A'],
  friedreich: ['FXN'],
  myotonic: ['DMPK', 'CNBP'],
  lgmd: ['CAPN3', 'DYSF', 'SGCA', 'SGCB'],
  cmt: ['PMP22', 'MFN2', 'GJB1'],
  eb: ['KRT5', 'KRT14', 'COL7A1'],
  sickle_cell: ['HBB'],
  thalassemia: ['HBA1', 'HBA2', 'HBB'],
};

export const EXON_EDITOR_BASE_URL = 'https://exoneditor.com';

/**
 * Check if a disease has associated gene(s) in the catalogue.
 */
export function diseaseHasGenes(diseaseKey) {
  return diseaseKey && Object.hasOwn(DISEASE_GENES, diseaseKey);
}

/**
 * Get the gene symbol(s) for a disease key.
 * Returns an array of gene symbols, or an empty array if none.
 */
export function getGenesForDisease(diseaseKey) {
  return DISEASE_GENES[diseaseKey] || [];
}

/**
 * Build an Exon Editor URL for a given gene symbol.
 */
export function buildExonEditorUrl(geneSymbol) {
  return `${EXON_EDITOR_BASE_URL}/?gene=${encodeURIComponent(geneSymbol)}`;
}

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
