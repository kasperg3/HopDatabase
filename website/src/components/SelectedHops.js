import React, { useState } from 'react';
import {
  Paper,
  Text,
  Box,
  Badge,
  Stack,
  Group,
  ThemeIcon,
  Card,
  Grid,
  Tooltip,
  useMantineColorScheme,
  Collapse,
  Button,
  Title,
  Tabs,
} from '@mantine/core';
import {
  IconFlask,
  IconDroplet,
  IconChartBar,
  IconTarget,
  IconShieldCheck,
  IconScale,
  IconLeaf,
  IconChevronDown,
  IconChevronUp,
} from '@tabler/icons-react';
import BrewingParametersComparison from './BrewingParametersComparison';
import BrewingSummary from './BrewingSummary';

// Advanced classification functions based on modern hop science
const ALPHA_THRESHOLDS = {
  SUPER_ALPHA: 11,
  HIGH: 8,
  MEDIUM: 5,
  LOW: 3,
  VERY_LOW: 3,
};

const OIL_THRESHOLDS = {
  VERY_HIGH: 2.5,
  HIGH: 1.5,
  MEDIUM: 0.8,
  LOW: 0.4,
};

const COHUMULONE_THRESHOLDS = {
  HIGH: 34,
  LOW: 25,
};

const BETA_ALPHA_THRESHOLDS = {
  STABLE: 0.8,
  AGING_POTENTIAL: 0.9,
};

const SelectedHops = ({ hopData, selectedHops }) => {
  const { colorScheme } = useMantineColorScheme();
  const [isExpanded, setIsExpanded] = useState(true);

  // Helper functions
  const parseValue = (value) => {
    if (typeof value === 'number') return value;
    if (typeof value === 'string') {
      const cleaned = value.replace(/[^\d.]/g, '');
      const parsed = parseFloat(cleaned);
      return isNaN(parsed) ? 0 : parsed;
    }
    return 0;
  };

  // Specific parser for oil values to handle unit consistency
  const parseOilValue = (value) => {
    if (typeof value === 'number') return value;
    if (typeof value === 'string') {
      // Handle both "1.5" and "1.5 mL/100g" formats
      // Both should be treated as mL/100g values
      const cleaned = value.replace(/[^\d.]/g, '');
      const parsed = parseFloat(cleaned);
      return isNaN(parsed) ? 0 : parsed;
    }
    return 0;
  };

  const getAverageValue = (from, to, isOil = false) => {
    const parseFunc = isOil ? parseOilValue : parseValue;
    const fromVal = parseFunc(from);
    const toVal = parseFunc(to);
    if (fromVal === 0 && toVal === 0) return 0;
    if (toVal === 0) return fromVal;
    if (fromVal === 0) return toVal;
    return (fromVal + toVal) / 2;
  };

  const formatRange = (from, to, unit = '%', isOil = false) => {
    const parseFunc = isOil ? parseOilValue : parseValue;
    const fromVal = parseFunc(from);
    const toVal = parseFunc(to);
    
    if (fromVal === 0 && toVal === 0) return 'N/A';
    if (fromVal === toVal) return `${fromVal}${unit}`;
    if (toVal === 0) return `${fromVal}${unit}`;
    if (fromVal === 0) return `${toVal}${unit}`;
    return `${fromVal} - ${toVal}${unit}`;
  };

  // Advanced classification functions
  const getHopPurpose = (avgAlpha, avgOil, avgBeta) => {
    if (avgAlpha >= ALPHA_THRESHOLDS.SUPER_ALPHA) {
      return { label: 'Super-Alpha', color: 'red', icon: IconFlask, description: 'Maximum bittering efficiency' };
    }
    if (avgAlpha <= ALPHA_THRESHOLDS.VERY_LOW && avgOil <= OIL_THRESHOLDS.LOW) {
      return { label: 'Noble/Aroma', color: 'teal', icon: IconDroplet, description: 'Traditional European character' };
    }
    if (avgAlpha <= ALPHA_THRESHOLDS.MEDIUM && avgOil >= OIL_THRESHOLDS.HIGH) {
      return { label: 'Modern Aroma', color: 'cyan', icon: IconDroplet, description: 'Contemporary aromatics' };
    }
    if (avgAlpha >= ALPHA_THRESHOLDS.HIGH && avgOil < OIL_THRESHOLDS.HIGH) {
      return { label: 'Bittering', color: 'orange', icon: IconFlask, description: 'Efficient bittering' };
    }
    return { label: 'Dual-Purpose', color: 'violet', icon: IconTarget, description: 'Versatile applications' };
  };

  const getCohumuloneClassification = (avgCohumulone) => {
    if (avgCohumulone === 0) return { label: 'Unknown', color: 'gray', description: 'Data not available' };
    if (avgCohumulone > COHUMULONE_THRESHOLDS.HIGH) return { label: 'High IBU Yield', color: 'yellow', description: '+15-25% more IBUs than predicted' };
    if (avgCohumulone < COHUMULONE_THRESHOLDS.LOW) return { label: 'Low IBU Yield', color: 'blue', description: 'May yield fewer IBUs' };
    return { label: 'Standard IBUs', color: 'green', description: 'Standard IBU prediction' };
  };

  const getBetaAlphaClassification = (ratio) => {
    if (ratio >= BETA_ALPHA_THRESHOLDS.AGING_POTENTIAL) return { label: 'Aging Potential', color: 'orange', description: 'May develop pleasant aged character' };
    if (ratio >= BETA_ALPHA_THRESHOLDS.STABLE) return { label: 'Storage Stable', color: 'blue', description: 'Good bitterness stability' };
    if (ratio < 0.5) return { label: 'Use Fresh', color: 'red', description: 'Rapid alpha degradation' };
    return { label: 'Standard Storage', color: 'gray', description: 'Normal degradation rate' };
  };

  // Create unique hop entries with enhanced data processing
  const uniqueHops = hopData.map(hop => {
    const avgAlpha = getAverageValue(hop.alpha_from, hop.alpha_to);
    const avgBeta = getAverageValue(hop.beta_from, hop.beta_to);
    const avgOil = getAverageValue(hop.oil_from, hop.oil_to, true); // Use oil parser
    const avgCohumulone = getAverageValue(hop.co_h_from, hop.co_h_to);
    const betaAlphaRatio = avgAlpha > 0 ? avgBeta / avgAlpha : 0;

    return {
      ...hop,
      uniqueId: `${hop.name} (${hop.source})`,
      displayName: hop.name,
      avgAlpha,
      avgBeta,
      avgOil,
      avgCohumulone,
      betaAlphaRatio,
      purpose: getHopPurpose(avgAlpha, avgOil, avgBeta),
      cohumuloneClass: getCohumuloneClassification(avgCohumulone),
      betaAlphaClass: getBetaAlphaClassification(betaAlphaRatio),
    };
  });

  const getHopInfo = (hopUniqueId) => {
    return uniqueHops.find(hop => hop.uniqueId === hopUniqueId);
  };

  // Generate brewing tip based on hop characteristics
  const getBrewingTip = (hopInfo) => {
    const tips = [];
    
    if (hopInfo.avgAlpha > 15) {
      tips.push('High alpha - excellent for bittering additions');
    } else if (hopInfo.avgAlpha < 5) {
      tips.push('Low alpha - ideal for aroma and late additions');
    }
    
    if (hopInfo.avgOil > 2.5) {
      tips.push('high oil content provides intense aroma');
    }
    
    if (hopInfo.cohumuloneClass.label.includes('Low')) {
      tips.push('smooth, refined bitterness character');
    } else if (hopInfo.cohumuloneClass.label.includes('High')) {
      tips.push('punchy bitterness - use carefully');
    }
    
    if (hopInfo.betaAlphaClass.label.includes('Stable')) {
      tips.push('excellent storage stability');
    }
    
    const purposeMap = {
      'Bittering': 'Add early in boil (60-90 min) for clean bitterness',
      'Aroma': 'Add late in boil (&lt;15 min), whirlpool, or dry hop',
      'Dual-Purpose': 'Versatile - great for any stage of brewing'
    };
    
    if (purposeMap[hopInfo.purpose.label]) {
      tips.push(purposeMap[hopInfo.purpose.label]);
    }
    
    return tips.join('; ') || 'Excellent brewing characteristics.';
  };

  // Helper to get border color for cards
  const getBorderColor = (color) => {
    const colorMap = {
      'orange': '#fd7e14',
      'green': '#51cf66',
      'blue': '#339af0',
      'violet': '#845ec2'
    };
    return colorMap[color] || '#ced4da';
  };

  const [expandedNotes, setExpandedNotes] = React.useState({});

  if (selectedHops.length === 0) {
    return null;
  }

  const handleExpandNotes = (hopId) => {
    setExpandedNotes((prev) => ({ ...prev, [hopId]: true }));
  };

  const handleCollapseNotes = (hopId) => {
    setExpandedNotes((prev) => ({ ...prev, [hopId]: false }));
  };

  return (
    <Paper shadow="sm" p="lg">
      <Group justify="space-between" align="center" mb="md">
        <Title order={3}>Selected Hops Details</Title>
        <Button
          variant="subtle"
          size="sm"
          color="gray"
          rightSection={isExpanded ? <IconChevronUp size={16} /> : <IconChevronDown size={16} />}
          onClick={() => setIsExpanded(!isExpanded)}
        >
        </Button>
      </Group>
      
      <Collapse in={isExpanded}>
      <Grid>
        {selectedHops.map((hopName) => {
          const hopInfo = getHopInfo(hopName);
          if (!hopInfo) return null;

          const IconComponent = hopInfo.purpose.icon;
          const isExpanded = expandedNotes[hopInfo.uniqueId];

          return (
            <Grid.Col key={hopName} span={{ base: 12, xs: 12, sm: 6, md: 4, lg: 3, xl: 3 }}>
              <Card withBorder p="md" h="100%" style={{ borderLeft: `4px solid ${getBorderColor(hopInfo.purpose.color)}` }}>
                {/* Header Section */}
                <Group justify="space-between" mb="sm">
                  <Group>
                    <ThemeIcon color={hopInfo.purpose.color} variant="light" size="lg">
                      <IconComponent size="1.2rem" />
                    </ThemeIcon>
                    <div>
                      <Text fw={600} size="lg" c="blue">
                        {hopInfo.displayName}
                      </Text>
                      <Group gap="xs">
                        <Text size="sm" c="dimmed">
                          {hopInfo.country} • {hopInfo.source}
                        </Text>
                        <Tooltip label={hopInfo.purpose.description} withArrow>
                          <Badge color={hopInfo.purpose.color} variant="light" size="sm">
                            {hopInfo.purpose.label}
                          </Badge>
                        </Tooltip>
                      </Group>
                    </div>
                  </Group>
                </Group>

                {/* Chemistry Analysis */}
                <Stack gap="xs" mb="md">
                  <Group gap="xs">
                    <ThemeIcon size="sm" variant="light" color="orange">
                      <IconFlask size="0.8rem" />
                    </ThemeIcon>
                    <Text size="sm" fw={500}>Alpha Acids:</Text>
                    <Text size="sm">{formatRange(hopInfo.alpha_from, hopInfo.alpha_to)}</Text>
                  </Group>
                  <Group gap="xs">
                    <ThemeIcon size="sm" variant="light" color="blue">
                      <IconChartBar size="0.8rem" />
                    </ThemeIcon>
                    <Text size="sm" fw={500}>Beta Acids:</Text>
                    <Text size="sm">{formatRange(hopInfo.beta_from, hopInfo.beta_to)}</Text>
                  </Group>
                  <Group gap="xs">
                    <ThemeIcon size="sm" variant="light" color="teal">
                      <IconDroplet size="0.8rem" />
                    </ThemeIcon>
                    <Text size="sm" fw={500}>Total Oil:</Text>
                    <Text size="sm">{formatRange(hopInfo.oil_from, hopInfo.oil_to, ' ml/100g', true)}</Text>
                  </Group>
                  {hopInfo.avgCohumulone > 0 && (
                    <Group gap="xs">
                      <ThemeIcon size="sm" variant="light" color="yellow">
                        <IconShieldCheck size="0.8rem" />
                      </ThemeIcon>
                      <Text size="sm" fw={500}>Cohumulone:</Text>
                      <Text size="sm">{formatRange(hopInfo.co_h_from, hopInfo.co_h_to)}</Text>
                      <Tooltip label={hopInfo.cohumuloneClass.description} withArrow>
                        <Badge size="xs" color={hopInfo.cohumuloneClass.color} variant="light">
                          {hopInfo.cohumuloneClass.label}
                        </Badge>
                      </Tooltip>
                    </Group>
                  )}
                  <Group gap="xs">
                    <ThemeIcon size="sm" variant="light" color="gray">
                      <IconScale size="0.8rem" />
                    </ThemeIcon>
                    <Text size="sm" fw={500}>β/α Ratio:</Text>
                    <Text size="sm">{hopInfo.betaAlphaRatio.toFixed(2)}</Text>
                    <Tooltip label={hopInfo.betaAlphaClass.description} withArrow>
                      <Badge size="xs" color={hopInfo.betaAlphaClass.color} variant="light">
                        {hopInfo.betaAlphaClass.label}
                      </Badge>
                    </Tooltip>
                  </Group>
                </Stack>

                {/* Flavor Notes */}
                {hopInfo.notes && hopInfo.notes.length > 0 && (
                  <Box mb="md">
                    <Group gap="xs" mb="xs">
                      <ThemeIcon size="sm" variant="light" color="green">
                        <IconLeaf size="0.8rem" />
                      </ThemeIcon>
                      <Text size="sm" fw={500}>Flavor Notes:</Text>
                    </Group>
                    <Box style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                      {(isExpanded ? hopInfo.notes : hopInfo.notes.slice(0, 3)).map((note, i) => (
                        <Badge 
                          key={i} 
                          variant="outline"
                          size="sm"
                          color="green"
                        >
                          {note}
                        </Badge>
                      ))}
                      {hopInfo.notes.length > 3 && !isExpanded && (
                        <Badge
                          variant="outline"
                          size="sm"
                          color="gray"
                          style={{ cursor: 'pointer', userSelect: 'none' }}
                          onClick={() => handleExpandNotes(hopInfo.uniqueId)}
                        >
                          +{hopInfo.notes.length - 3} more
                        </Badge>
                      )}
                      {hopInfo.notes.length > 3 && isExpanded && (
                        <Badge
                          variant="outline"
                          size="sm"
                          color="gray"
                          style={{ cursor: 'pointer', userSelect: 'none' }}
                          onClick={() => handleCollapseNotes(hopInfo.uniqueId)}
                        >
                          Show less
                        </Badge>
                      )}
                    </Box>
                  </Box>
                )}

                {/* Brewing Recommendations */}
                <Box mt="auto" p="sm" style={{ borderRadius: 6 }} bg={colorScheme === 'dark' ? 'dark.5' : 'gray.1'}>
                  <Text size="xs" fw={500} mb="xs">Quick Brewing Tips:</Text>
                  <Text size="xs" c="dimmed">
                    {getBrewingTip(hopInfo)}
                  </Text>
                </Box>
              </Card>
            </Grid.Col>
          );
        })}
      </Grid>      
      </Collapse>

      {/* Brewing Analysis Tabs - Show only when hops are selected */}
      {selectedHops.length > 0 && (
        <Box mt="xl">
          <Tabs defaultValue="brewing-parameters" variant="outline">
            <Tabs.List>
              <Tabs.Tab value="brewing-parameters">
                Brewing Parameters
              </Tabs.Tab>
              <Tabs.Tab value="brewing-summary">
                Brewing Summary
              </Tabs.Tab>
            </Tabs.List>
            
            <Tabs.Panel value="brewing-parameters" pt="lg">
              <BrewingParametersComparison hopData={uniqueHops.filter(hop => selectedHops.includes(hop.uniqueId))} />
            </Tabs.Panel>

            <Tabs.Panel value="brewing-summary" pt="lg">
              <BrewingSummary hopData={uniqueHops.filter(hop => selectedHops.includes(hop.uniqueId))} />
            </Tabs.Panel>
          </Tabs>
        </Box>
      )}
    </Paper>
  );
};

export default SelectedHops;
