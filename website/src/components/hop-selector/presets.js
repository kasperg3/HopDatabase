// Generate aroma combination suggestions
export const getAllAromaCombinations = () => {
  return [
    // IPA Styles
    { aromas: ['Citrus', 'Tropical Fruit'], description: 'Modern American IPA character', style: 'American IPA', type: 'high', category: 'IPA' },
    { aromas: ['Tropical Fruit', 'Stone Fruit'], description: 'Tropical and stone fruit haze character', style: 'NEIPA', type: 'high', category: 'IPA' },
    { aromas: ['Resin/Pine', 'Citrus'], description: 'Classic pine and citrus West Coast bitterness', style: 'West Coast IPA', type: 'high', category: 'IPA' },
    { aromas: ['Floral', 'Citrus'], description: 'Balanced aromatic profile', style: 'Session IPA', type: 'high', category: 'IPA' },
    { aromas: ['Citrus', 'Resin/Pine'], description: 'Cascade-style American hop blend', style: 'American Pale Ale', type: 'high', category: 'IPA' },
    {
      aromasHigh: ['Tropical Fruit', 'Citrus'],
      aromasLow: ['Resin/Pine'],
      description: 'Bright tropical and citrus with clean, soft finish',
      style: 'Hazy IPA',
      type: 'mixed',
      category: 'IPA'
    },
    {
      aromasHigh: ['Berry', 'Tropical Fruit'],
      aromasLow: ['Spice', 'Herbal'],
      description: 'Fruit-forward with minimal spice interference',
      style: 'Fruit-Forward IPA',
      type: 'mixed',
      category: 'IPA'
    },

    // European Styles
    { aromas: ['Floral', 'Spice'], description: 'Classic European noble hop profile', style: 'Pilsner/Lager', type: 'high', category: 'European' },
    { aromas: ['Herbal', 'Grassy'], description: 'Traditional lager character', style: 'European Lager', type: 'high', category: 'European' },
    { aromas: ['Grassy', 'Herbal'], description: 'Clean, subtle background for malt-forward styles', style: 'Märzen/Oktoberfest', type: 'low', category: 'European' },
    { aromas: ['Spice', 'Floral'], description: 'Minimal hop character for traditional styles', style: 'Vienna Lager', type: 'low', category: 'European' },
    {
      aromasHigh: ['Citrus', 'Tropical Fruit'],
      aromasLow: ['Grassy', 'Herbal'],
      description: 'Bright citrus focus with clean, neutral base',
      style: 'Modern Pilsner',
      type: 'mixed',
      category: 'European'
    },
    {
      aromasHigh: ['Floral'],
      aromasLow: ['Resin/Pine', 'Herbal'],
      description: 'Delicate floral character without harsh resins',
      style: 'Noble Pale Ale',
      type: 'mixed',
      category: 'European'
    },

    // Belgian Styles
    { aromas: ['Spice', 'Herbal'], description: 'Belgian-style complexity', style: 'Belgian Ales', type: 'high', category: 'Belgian' },
    {
      aromasHigh: ['Spice', 'Floral'],
      aromasLow: ['Resin/Pine'],
      description: 'Spice and floral character without aggressive resin',
      style: 'Belgian IPA',
      type: 'mixed',
      category: 'Belgian'
    },
    { aromas: ['Herbal', 'Spice'], description: 'Traditional Belgian earthiness', style: 'Belgian Dubbel', type: 'high', category: 'Belgian' },
    { aromas: ['Floral', 'Spice'], description: 'Refined Belgian character', style: 'Belgian Tripel', type: 'low', category: 'Belgian' },

    // English Styles
    { aromas: ['Herbal', 'Resin/Pine'], description: 'Understated earthiness for balanced ales', style: 'English Bitter', type: 'low', category: 'English' },
    { aromas: ['Resin/Pine', 'Herbal'], description: 'Restrained earthiness for porter base', style: 'Porter Base', type: 'low', category: 'English' },
    { aromas: ['Floral', 'Herbal'], description: 'Traditional English hop character', style: 'ESB', type: 'high', category: 'English' },
    { aromas: ['Herbal', 'Grassy'], description: 'Classic mild ale profile', style: 'English Mild', type: 'low', category: 'English' },

    // American Lagers
    { aromas: ['Grassy'], description: 'Clean, minimal hop character', style: 'American Lager', type: 'low', category: 'American' },
    { aromas: ['Citrus'], description: 'Light citrus character for cream ales', style: 'Cream Ale', type: 'low', category: 'American' },
    { aromas: ['Floral'], description: 'Delicate floral for wheat beers', style: 'American Wheat', type: 'low', category: 'American' },

    // German Styles
    { aromas: ['Herbal'], description: 'Very subtle hop presence for malt showcase', style: 'Doppelbock', type: 'low', category: 'German' },
    { aromas: ['Spice'], description: 'Traditional German hop spice', style: 'Kölsch', type: 'low', category: 'German' },
    { aromas: ['Floral', 'Spice'], description: 'Noble hop character', style: 'German Pilsner', type: 'high', category: 'German' },
    { aromas: ['Herbal', 'Spice'], description: 'Weizen hop balance', style: 'Hefeweizen', type: 'low', category: 'German' },

    // Specialty Styles
    {
      aromasHigh: ['Resin/Pine', 'Citrus'],
      aromasLow: ['Floral', 'Berry'],
      description: 'Clean pine and citrus bitterness without floral sweetness',
      style: 'West Coast Clean',
      type: 'mixed',
      category: 'Specialty'
    },
    { aromas: ['Berry', 'Citrus'], description: 'Fruit beer hop balance', style: 'Fruit Beer', type: 'low', category: 'Specialty' },
    { aromas: ['Resin/Pine', 'Herbal'], description: 'Barrel-aged beer harmony', style: 'Barrel-Aged', type: 'low', category: 'Specialty' },
    { aromas: ['Tropical Fruit', 'Citrus'], description: 'Summer seasonal brightness', style: 'Summer Ale', type: 'high', category: 'Specialty' },
  ];
};

export const getPopularPresets = () => {
  const allCombinations = getAllAromaCombinations();
  return [
    allCombinations.find(c => c.style === 'American IPA'),
    allCombinations.find(c => c.style === 'NEIPA'),
    allCombinations.find(c => c.style === 'West Coast IPA'),
    allCombinations.find(c => c.style === 'Pilsner/Lager'),
    allCombinations.find(c => c.style === 'Belgian Ales'),
    allCombinations.find(c => c.style === 'English Bitter'),
  ].filter(Boolean);
};

/**
 * Convert a preset to its expected aromaStates shape for comparison.
 */
export function presetToAromaStates(preset) {
  const states = {};
  if (preset.type === 'mixed') {
    preset.aromasHigh?.forEach(a => { states[a] = 'high'; });
    preset.aromasLow?.forEach(a => { states[a] = 'low'; });
  } else {
    preset.aromas.forEach(a => {
      states[a] = preset.type === 'low' ? 'low' : 'high';
    });
  }
  return states;
}

/**
 * Returns the style name of the active preset, or null if none match.
 * Compares current aromaStates (filtering out 'none' entries) against
 * each preset's expected states for an exact match.
 */
export function getActivePresetStyle(aromaStates) {
  const effective = {};
  Object.entries(aromaStates).forEach(([k, v]) => {
    if (v && v !== 'none') effective[k] = v;
  });

  const effectiveKeys = Object.keys(effective).sort();
  if (effectiveKeys.length === 0) return null;

  for (const preset of getAllAromaCombinations()) {
    const expected = presetToAromaStates(preset);
    const expectedKeys = Object.keys(expected).sort();
    if (expectedKeys.length !== effectiveKeys.length) continue;
    if (expectedKeys.every((k, i) => k === effectiveKeys[i] && expected[k] === effective[k])) {
      return preset.style;
    }
  }
  return null;
}
