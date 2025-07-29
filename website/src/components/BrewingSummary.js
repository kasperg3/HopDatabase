import React from 'react';
import {
  Paper,
  Title,
  Text,
  Grid,
  Card,
  Badge,
  Group,
  ThemeIcon,
  Stack,
  Tooltip,
} from '@mantine/core';
import {
  IconFlask,
  IconDroplet,
  IconTarget,
} from '@tabler/icons-react';

// ===== BREWING PARAMETER CONSTANTS (ADVANCED CHEMISTRY-BASED) =====

// Alpha acid classification thresholds (from research)
const ALPHA_THRESHOLDS = {
  SUPER_ALPHA: 11, // >= 11% Super-Alpha (Maximum bittering efficiency)
  HIGH: 8, // 8-11% High/Assertive (Powerful bittering)
  MEDIUM: 5, // 5-8% Medium (Balanced bittering)
  LOW: 3, // 3-5% Low (Aroma-focused)
  VERY_LOW: 3, // < 3% Very Low (Noble hops)
};

// Total Oil content classification thresholds (mL/100g) - refined based on research
const OIL_THRESHOLDS = {
  VERY_HIGH: 2.5, // >= 2.5 mL/100g = Very High (Modern American varieties)
  HIGH: 1.5, // 1.5 - 2.4 mL/100g = High 
  MEDIUM: 0.8, // 0.8 - 1.4 mL/100g = Medium
  LOW: 0.4, // 0.4 - 0.7 mL/100g = Low (Traditional varieties)
};

// Cohumulone thresholds - Updated based on research showing it affects IBU yield, not harshness
const COHUMULONE_THRESHOLDS = {
  HIGH: 34, // >34% High (Yields more IBUs than predicted)
  MODERATE: 26, // 26-33% Moderate (Standard IBU predictions)
  LOW: 25, // <25% Low (May yield fewer IBUs than predicted)
};

// Note: HSI (Hop Storage Index) data not available in current dataset

// Beta:Alpha ratio thresholds for stability assessment
const BETA_ALPHA_THRESHOLDS = {
  STABLE: 0.8, // >= 0.8 indicates good bitterness stability over time
  AGING_POTENTIAL: 0.9, // >= 0.9 may develop pleasant aromas during aging
};

// Advanced hop classification based on chemistry - More nuanced than traditional categories
const HOP_PURPOSE_RULES = {
  SUPER_ALPHA: {
    alpha_min: ALPHA_THRESHOLDS.SUPER_ALPHA,
    label: 'Super-Alpha',
    color: 'red',
    icon: IconFlask,
    description: 'Exceptionally high alpha content (11-20%+) for maximum bittering efficiency. Allows high bitterness with minimal hop quantities.'
  },
  BITTERING: {
    alpha_min: ALPHA_THRESHOLDS.HIGH,
    alpha_max: ALPHA_THRESHOLDS.SUPER_ALPHA,
    label: 'Bittering',
    color: 'orange',
    icon: IconFlask,
    description: 'High alpha acid content (8-11%) provides efficient bittering. Primary role is backbone bitterness.'
  },
  AROMA_NOBLE: {
    alpha_max: ALPHA_THRESHOLDS.VERY_LOW,
    oil_max: OIL_THRESHOLDS.LOW,
    label: 'Noble/Aroma',
    color: 'teal',
    icon: IconDroplet,
    description: 'Traditional European varieties (2-4% AA) prized for refined, spicy, herbal character. The foundation of classic styles.'
  },
  AROMA_MODERN: {
    alpha_max: ALPHA_THRESHOLDS.MEDIUM,
    oil_min: OIL_THRESHOLDS.HIGH,
    label: 'Modern Aroma',
    color: 'cyan',
    icon: IconDroplet,
    description: 'Contemporary varieties bred for intense aromatics. High oil content delivers complex flavor profiles.'
  },
  DUAL_PURPOSE: {
    label: 'Dual-Purpose',
    color: 'violet',
    icon: IconTarget,
    description: 'Versatile hops combining significant alpha acids with desirable aroma. The workhorses of modern craft brewing.'
  }
};

// Comprehensive brewing guidelines based on modern hop science
const BREWING_GUIDELINES = {
  BITTERING: 'Add 60+ minutes for clean bitterness. Super-alpha hops (>11% AA) provide maximum efficiency.',
  AROMA: 'Add ≤15 minutes, whirlpool at 160-170°F, or dry hop. Contact time: 24-48 hours optimal.',
  DUAL_PURPOSE: 'Most versatile. Early additions for bittering, late/whirlpool for aroma, dry hop for intensity.',
  COHUMULONE: `Cohumulone affects IBU yield, not harshness. High cohumulone (>34%) yields 15-25% more IBUs than standard formulas predict. Low cohumulone (<25%) may yield fewer IBUs.`,
  BETA_ALPHA_RATIO: 'High ratios (≥0.8) provide bitterness stability during storage. Ratios ≥0.9 may develop pleasant oxidized aromas in aged beers.',
  WHIRLPOOL: 'Temperature controls extraction: >175°F adds IBUs + flavor, 160-170°F maximizes aroma with minimal bitterness, <160°F preserves most delicate aromatics.',
  BIOTRANSFORMATION: 'Yeast with β-lyase activity can unlock bound thiols during fermentation, creating intense tropical fruit aromas from hops like Cascade and Saaz.',
  FIRST_WORT: 'Adding hops during lautering creates smoother, more harmonious bitterness while maintaining calculated IBU levels.'
};

// ===== END CONSTANTS =====

const BrewingSummary = ({ hopData }) => {
  if (!hopData || hopData.length === 0) {
    return null;
  }

  const parseValue = (value) => {
    if (typeof value === 'number') return value;
    if (typeof value === 'string') {
      const cleaned = value.replace(/[^\d.]/g, '');
      const parsed = parseFloat(cleaned);
      return isNaN(parsed) ? 0 : parsed;
    }
    return 0;
  };

  const getAverageValue = (from, to) => {
    const fromVal = parseValue(from);
    const toVal = parseValue(to);
    if (fromVal === 0 && toVal === 0) return 0;
    if (toVal === 0) return fromVal;
    if (fromVal === 0) return toVal;
    return (fromVal + toVal) / 2;
  };

  // Advanced hop classification based on modern understanding
  const getHopPurpose = (avgAlpha, avgOil, avgBeta) => {
    // Super-Alpha classification (highest priority)
    if (avgAlpha >= ALPHA_THRESHOLDS.SUPER_ALPHA) {
      return HOP_PURPOSE_RULES.SUPER_ALPHA;
    }
    
    // Traditional Noble/Low Alpha aromatics
    if (avgAlpha <= ALPHA_THRESHOLDS.VERY_LOW && avgOil <= OIL_THRESHOLDS.LOW) {
      return HOP_PURPOSE_RULES.AROMA_NOBLE;
    }
    
    // Modern high-oil aromatics
    if (avgAlpha <= ALPHA_THRESHOLDS.MEDIUM && avgOil >= OIL_THRESHOLDS.HIGH) {
      return HOP_PURPOSE_RULES.AROMA_MODERN;
    }
    
    // High-alpha bittering
    if (avgAlpha >= ALPHA_THRESHOLDS.HIGH && avgOil < OIL_THRESHOLDS.HIGH) {
      return HOP_PURPOSE_RULES.BITTERING;
    }
    
    // Default to dual-purpose for everything else
    return HOP_PURPOSE_RULES.DUAL_PURPOSE;
  };

  const stats = hopData.map(hop => {
    const avgAlpha = getAverageValue(hop.alpha_from, hop.alpha_to);
    const avgBeta = getAverageValue(hop.beta_from, hop.beta_to);
    const avgOil = getAverageValue(hop.oil_from, hop.oil_to);
    const avgCohumulone = getAverageValue(hop.co_h_from, hop.co_h_to);
    
    // Calculate Beta:Alpha Ratio
    const betaAlphaRatio = avgAlpha > 0 ? avgBeta / avgAlpha : 0;

    return {
      ...hop,
      avgAlpha,
      avgBeta,
      avgOil,
      avgCohumulone,
      betaAlphaRatio,
      purpose: getHopPurpose(avgAlpha, avgOil, avgBeta)
    };
  });

  // Get specific brewing recommendations for an individual hop
  const getHopSpecificRecommendations = (hop) => {
    const recommendations = [];
    
    // Purpose-based recommendations
    if (hop.purpose.label === 'Super-Alpha') {
      recommendations.push({
        type: 'Bittering',
        text: 'Use minimal quantities (0.25-0.5 oz/5 gal) early in boil (60+ min) for maximum efficiency',
        color: 'red'
      });
    } else if (hop.purpose.label === 'Bittering') {
      recommendations.push({
        type: 'Bittering', 
        text: 'Add early in boil (45-60 min) for clean, efficient bittering',
        color: 'orange'
      });
    } else if (hop.purpose.label === 'Noble/Aroma') {
      recommendations.push({
        type: 'Traditional Use',
        text: 'Late boil (5-15 min), whirlpool, or light dry hop for classic European character',
        color: 'teal'
      });
      recommendations.push({
        type: 'Style Pairing',
        text: 'Perfect for Pilsners, Lagers, and traditional European styles',
        color: 'blue'
      });
    } else if (hop.purpose.label === 'Modern Aroma') {
      recommendations.push({
        type: 'Aroma Focus',
        text: 'Whirlpool at 160-170°F or dry hop for maximum aromatic impact',
        color: 'cyan'
      });
      recommendations.push({
        type: 'Style Pairing',
        text: 'Excellent for IPAs, Pale Ales, and hop-forward styles',
        color: 'grape'
      });
    } else if (hop.purpose.label === 'Dual-Purpose') {
      recommendations.push({
        type: 'Versatile Use',
        text: 'Early boil for bittering, late boil/whirlpool for flavor, dry hop for aroma',
        color: 'violet'
      });
    }
    
    // Alpha acid level recommendations
    if (hop.avgAlpha >= ALPHA_THRESHOLDS.SUPER_ALPHA) {
      recommendations.push({
        type: 'Quantity',
        text: `High alpha (${hop.avgAlpha.toFixed(1)}%) - Use sparingly to avoid over-bittering`,
        color: 'yellow'
      });
    } else if (hop.avgAlpha <= ALPHA_THRESHOLDS.VERY_LOW) {
      recommendations.push({
        type: 'Quantity',
        text: `Low alpha (${hop.avgAlpha.toFixed(1)}%) - Can use generously for aroma without excessive bitterness`,
        color: 'green'
      });
    }
    
    // Oil content recommendations
    if (hop.avgOil >= OIL_THRESHOLDS.VERY_HIGH) {
      recommendations.push({
        type: 'Aroma Extraction',
        text: `Very high oils (${hop.avgOil.toFixed(1)} ml/100g) - Excellent for whirlpool and dry hopping`,
        color: 'teal'
      });
    } else if (hop.avgOil >= OIL_THRESHOLDS.HIGH) {
      recommendations.push({
        type: 'Aroma Extraction',
        text: `High oils (${hop.avgOil.toFixed(1)} ml/100g) - Good for late additions and dry hopping`,
        color: 'cyan'
      });
    }
    
    // Cohumulone-specific recommendations
    if (hop.avgCohumulone > COHUMULONE_THRESHOLDS.HIGH) {
      recommendations.push({
        type: 'IBU Calculation',
        text: `High cohumulone (${hop.avgCohumulone.toFixed(1)}%) - Expect 15-25% more IBUs than calculated`,
        color: 'yellow'
      });
    } else if (hop.avgCohumulone > 0 && hop.avgCohumulone < COHUMULONE_THRESHOLDS.LOW) {
      recommendations.push({
        type: 'IBU Calculation',
        text: `Low cohumulone (${hop.avgCohumulone.toFixed(1)}%) - May yield fewer IBUs than predicted`,
        color: 'blue'
      });
    }
    
    // Beta:Alpha ratio recommendations
    if (hop.betaAlphaRatio >= BETA_ALPHA_THRESHOLDS.AGING_POTENTIAL) {
      recommendations.push({
        type: 'Aging Character',
        text: `High β/α ratio (${hop.betaAlphaRatio.toFixed(2)}) - May develop pleasant character when aged`,
        color: 'orange'
      });
    } else if (hop.betaAlphaRatio >= BETA_ALPHA_THRESHOLDS.STABLE) {
      recommendations.push({
        type: 'Storage',
        text: `Good β/α ratio (${hop.betaAlphaRatio.toFixed(2)}) - Stable bitterness during storage`,
        color: 'blue'
      });
    } else if (hop.betaAlphaRatio < 0.5) {
      recommendations.push({
        type: 'Storage',
        text: `Low β/α ratio (${hop.betaAlphaRatio.toFixed(2)}) - Use fresh, rapid alpha acid loss when aged`,
        color: 'red'
      });
    }
    
    // Biotransformation potential (simplified)
    if (hop.purpose.label.includes('Aroma') || hop.purpose.label === 'Dual-Purpose') {
      recommendations.push({
        type: 'Biotransformation',
        text: 'Consider pairing with thiol-releasing yeast strains for enhanced tropical character',
        color: 'grape'
      });
    }
    
    return recommendations;
  };


  return (
    <Paper shadow="sm" p="lg" radius="md">      
      <Grid>
        <Grid.Col span={{ base: 12 }}>
            {/* Individual Hop Cards with Specific Recommendations */}
            <Title order={4} mb="md">Individual Hop Analysis & Brewing Recommendations</Title>
            <Stack gap="md">
                {stats.map((hop, index) => {
                    const IconComponent = hop.purpose.icon;
                    const hopRecommendations = getHopSpecificRecommendations(hop);
                    
                    return (
                        <Card key={`${hop.name}-${index}`} withBorder p="md">
                            {/* Hop Header */}
                            <Group justify="space-between" mb="sm">
                                <Group>
                                    <ThemeIcon color={hop.purpose.color} variant="light" size="md">
                                        <IconComponent size="1.2rem" />
                                    </ThemeIcon>
                                    <div>
                                        <Text fw={600} size="lg">{hop.name}</Text>
                                        <Badge color={hop.purpose.color} variant="light" size="sm">
                                            {hop.purpose.label}
                                        </Badge>
                                    </div>
                                </Group>
                                <Text size="sm" c="dimmed">
                                    α: {hop.avgAlpha.toFixed(1)}% | β: {hop.avgBeta.toFixed(1)}% | Oil: {hop.avgOil.toFixed(1)} | β/α: {hop.betaAlphaRatio.toFixed(2)}
                                </Text>
                            </Group>

                            {/* Hop Description */}
                            <Text size="sm" c="dimmed" mb="md">
                                {hop.purpose.description}
                            </Text>

                            {/* Brewing Recommendations */}
                            <Title order={6} mb="xs">Brewing Recommendations:</Title>
                            <Stack gap="xs">
                                {hopRecommendations.map((rec, recIndex) => (
                                    <Group key={recIndex} wrap="nowrap">
                                        <Badge color={rec.color} variant="light" size="xs" style={{ minWidth: 'fit-content' }}>
                                            {rec.type}
                                        </Badge>
                                        <Text size="xs">{rec.text}</Text>
                                    </Group>
                                ))}
                            </Stack>
                        </Card>
                    );
                })}
            </Stack>
        </Grid.Col>
      </Grid>

      {/* Advanced Chemistry Analysis */}
      <Card withBorder mt="lg">
        <Title order={4} mb="md">Advanced Chemistry Analysis</Title>
        <Grid>
          <Grid.Col span={{ base: 12, md: 6 }}>
            <Stack gap="xs">
              <Text size="sm" fw={600}>Cohumulone Impact</Text>
              {stats.map((hop, index) => {
                let cohumuloneStatus = 'Standard';
                let cohumuloneColor = 'gray';
                let cohumuloneDescription = 'Standard IBU prediction';
                
                if (hop.avgCohumulone > COHUMULONE_THRESHOLDS.HIGH) {
                  cohumuloneStatus = 'High Yield';
                  cohumuloneColor = 'yellow';
                  cohumuloneDescription = '+15-25% more IBUs';
                } else if (hop.avgCohumulone > 0 && hop.avgCohumulone < COHUMULONE_THRESHOLDS.LOW) {
                  cohumuloneStatus = 'Low Yield';
                  cohumuloneColor = 'blue';
                  cohumuloneDescription = 'May yield fewer IBUs';
                }
                
                return (
                  <Group key={`cohu-${hop.name}-${index}`} justify="space-between">
                    <Text size="xs">{hop.name}</Text>
                    <Tooltip label={cohumuloneDescription} withArrow>
                      <Badge size="xs" color={cohumuloneColor} variant="light">
                        {cohumuloneStatus}
                      </Badge>
                    </Tooltip>
                  </Group>
                );
              })}
            </Stack>
          </Grid.Col>
          
          <Grid.Col span={{ base: 12, md: 6 }}>
            <Stack gap="xs">
              <Text size="sm" fw={600}>Stability Profile</Text>
              {stats.map((hop, index) => {
                let stabilityStatus = 'Standard';
                let stabilityColor = 'gray';
                let stabilityDescription = 'Normal degradation rate';
                
                if (hop.betaAlphaRatio >= BETA_ALPHA_THRESHOLDS.AGING_POTENTIAL) {
                  stabilityStatus = 'Aging+';
                  stabilityColor = 'orange';
                  stabilityDescription = 'May develop pleasant aged character';
                } else if (hop.betaAlphaRatio >= BETA_ALPHA_THRESHOLDS.STABLE) {
                  stabilityStatus = 'Stable';
                  stabilityColor = 'blue';
                  stabilityDescription = 'Good bitterness stability';
                } else if (hop.betaAlphaRatio < 0.5) {
                  stabilityStatus = 'Rapid Loss';
                  stabilityColor = 'red';
                  stabilityDescription = 'Rapid alpha acid degradation';
                }
                
                return (
                  <Group key={`stability-${hop.name}-${index}`} justify="space-between">
                    <Text size="xs">{hop.name}</Text>
                    <Tooltip label={stabilityDescription} withArrow>
                      <Badge size="xs" color={stabilityColor} variant="light">
                        {stabilityStatus}
                      </Badge>
                    </Tooltip>
                  </Group>
                );
              })}
            </Stack>
          </Grid.Col>
        </Grid>
      </Card>

      {/* General Guidelines */}
      <Card withBorder mt="lg">
        <Title order={4} mb="md">General Brewing Guidelines</Title>
        <Text size="xs" c="dimmed">
            <strong>Bittering Hops:</strong> {BREWING_GUIDELINES.BITTERING}<br/>
            <strong>Aroma Hops:</strong> {BREWING_GUIDELINES.AROMA}<br/>
            <strong>Dual-Purpose Hops:</strong> {BREWING_GUIDELINES.DUAL_PURPOSE}<br/>
            <strong>Cohumulone:</strong> {BREWING_GUIDELINES.COHUMULONE}<br/>
            <strong>Beta:Alpha Ratio:</strong> {BREWING_GUIDELINES.BETA_ALPHA_RATIO}<br/>
            <strong>Whirlpool Technique:</strong> {BREWING_GUIDELINES.WHIRLPOOL}<br/>
            <strong>Biotransformation:</strong> {BREWING_GUIDELINES.BIOTRANSFORMATION}<br/>
            <strong>First Wort Hopping:</strong> {BREWING_GUIDELINES.FIRST_WORT}
        </Text>
      </Card>

    </Paper>
  );
};

export default BrewingSummary;
