import React, { useState, useMemo } from 'react';
import {
  Paper,
  Text,
  Box,
  MultiSelect,
  Badge,
  Stack,
  Group,
  ThemeIcon,
  Card,
  Grid,
  Tooltip,
  Divider,
  useMantineColorScheme,
  Collapse,
  Button,
  Chip,
} from '@mantine/core';
import {
  IconFlask,
  IconDroplet,
  IconChartBar,
  IconTarget,
  IconShieldCheck,
  IconScale,
  IconLeaf,
  IconX,
  IconChevronDown,
  IconChevronUp,
} from '@tabler/icons-react';

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

const HopSelector = ({ 
  hopData, 
  selectedHops, 
  onHopSelection
}) => {
  const { colorScheme } = useMantineColorScheme();
  
  // Filter states
  const [selectedAromas, setSelectedAromas] = useState([]);
  const [filtersExpanded, setFiltersExpanded] = useState(false);
  
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
  // Helper function to get top 3 aromas for a hop (including all ties with 3rd place)
  const getTopAromas = (hop, count = 3) => {
    if (!hop.aromas || typeof hop.aromas !== 'object') return [];
    
    const sortedAromas = Object.entries(hop.aromas)
      .filter(([_, intensity]) => intensity > 0)
      .sort(([_, a], [__, b]) => b - a)
      .map(([category, intensity]) => ({ category, intensity }));
    
    if (sortedAromas.length <= count) {
      return sortedAromas;
    }
    
    // Get the intensity of the 3rd place aroma
    const thirdPlaceIntensity = sortedAromas[count - 1].intensity;
    
    // Include all aromas that have intensity > 3rd place intensity OR equal to 3rd place intensity
    return sortedAromas.filter(aroma => 
      aroma.intensity >= thirdPlaceIntensity
    );
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

  // Extract standardized aroma categories for filtering (only those with intensity > 0)
  const availableAromaCategories = useMemo(() => {
    const aromaCounts = {};
    
    // Count how many hops have each aroma with intensity > 0
    hopData.forEach(hop => {
      if (hop.aromas && typeof hop.aromas === 'object') {
        Object.entries(hop.aromas).forEach(([category, intensity]) => {
          if (intensity > 0) {
            aromaCounts[category] = (aromaCounts[category] || 0) + 1;
          }
        });
      }
    });
    
    // Only return categories that have at least one hop with intensity > 0
    return Object.keys(aromaCounts).sort();
  }, [hopData]);

  // Filter hops based on selected aroma categories
  const filteredHops = useMemo(() => {
    let filtered = uniqueHops;
    
    // Filter by selected aroma categories (focus on top 3 aromas)
    if (selectedAromas.length > 0) {
      filtered = filtered.filter(hop => {
        const topAromas = getTopAromas(hop, 3);
        const topAromaCategories = topAromas.map(aroma => aroma.category);
        
        // Check if ALL of the selected aromas are in the top 3 (AND logic)
        return selectedAromas.every(selectedAroma => topAromaCategories.includes(selectedAroma));
      });
    }
    
    // If filtering by aroma, sort by sum of selected aroma intensities (descending)
    if (selectedAromas.length > 0) {
      return filtered.sort((a, b) => {
        // Sum intensities of selected aromas for each hop
        const sumA = selectedAromas.reduce((acc, aroma) => acc + (a.aromas?.[aroma] || 0), 0);
        const sumB = selectedAromas.reduce((acc, aroma) => acc + (b.aromas?.[aroma] || 0), 0);
        // If sums are equal, fallback to displayName
        if (sumB === sumA) {
          return a.displayName.localeCompare(b.displayName);
        }
        return sumB - sumA;
      });
    }
    // Default sort by displayName
    return filtered.sort((a, b) => a.displayName.localeCompare(b.displayName));
  }, [uniqueHops, selectedAromas]);

  // Sort by display name for better UX
  const availableHops = filteredHops;

  // Generate aroma combination suggestions
  const getAromaCombinationSuggestions = () => {
    if (selectedAromas.length === 0) return [];
    
    const suggestedCombinations = [
      { aromas: ['Citrus', 'Tropical Fruit'], description: 'Modern American IPA character', style: 'American IPA' },
      { aromas: ['Floral', 'Spice'], description: 'Classic European noble hop profile', style: 'Pilsner/Lager' },
      { aromas: ['Resin/Pine'], description: 'West Coast IPA bitterness', style: 'West Coast IPA' },
      { aromas: ['Berry', 'Stone Fruit'], description: 'New England IPA fruitiness', style: 'NEIPA' },
      { aromas: ['Herbal', 'Grassy'], description: 'Traditional lager character', style: 'European Lager' },
      { aromas: ['Citrus', 'Resin/Pine'], description: 'Cascade-style American hop blend', style: 'American Pale Ale' },
      { aromas: ['Tropical Fruit', 'Stone Fruit'], description: 'Modern hazy IPA profile', style: 'Hazy IPA' },
      { aromas: ['Spice', 'Herbal'], description: 'Belgian-style complexity', style: 'Belgian Ales' },
      { aromas: ['Floral', 'Citrus'], description: 'Balanced aromatic profile', style: 'Session IPA' },
    ];
    
    return suggestedCombinations.filter(combo => 
      combo.aromas.some(aroma => selectedAromas.includes(aroma))
    );
  };

  const getHopInfo = (hopUniqueId) => {
    return uniqueHops.find(hop => hop.uniqueId === hopUniqueId);
  };

  // Clear all filters
  const clearAllFilters = () => {
    setSelectedAromas([]);
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

  return (
    <Paper shadow="sm" p="lg">
      {/* Search and Filter Section */}
      <Box mb="md">
        <Group justify="space-between" mb="md">
          <Text size="lg" fw={600}>Hop Selection & Filtering</Text>
          <Button
            variant="subtle"
            size="sm"
            leftSection={filtersExpanded ? <IconChevronUp size="1rem" /> : <IconChevronDown size="1rem" />}
            onClick={() => setFiltersExpanded(!filtersExpanded)}
          >
            {filtersExpanded ? 'Hide' : 'Show'} Filters
          </Button>
        </Group>

        <Collapse in={filtersExpanded}>
          <Stack gap="md" mb="md">
            {/* Aroma Categories Filter */}
            <Box>
              <Text size="sm" fw={500} mb="xs">
                Filter by Aroma Categories:
              </Text>
              <Chip.Group multiple value={selectedAromas} onChange={setSelectedAromas}>
                <Group gap="xs">
                  {availableAromaCategories.map((aroma) => (
                    <Chip key={aroma} value={aroma} size="sm">
                      {aroma}
                    </Chip>
                  ))}
                </Group>
              </Chip.Group>
              
              {selectedAromas.length > 0 && (
                <Group justify="space-between" mt="sm">
                  <Text size="xs" c="dimmed">
                    Selected: {selectedAromas.join(', ')}
                  </Text>
                  <Button
                    variant="light"
                    size="xs"
                    leftSection={<IconX size="0.8rem" />}
                    onClick={clearAllFilters}
                  >
                    Clear filters
                  </Button>
                </Group>
              )}
            </Box>

            {/* Aroma Combination Suggestions */}
            {selectedAromas.length > 0 && (
              <Box>
                <Text size="sm" fw={500} mb="xs">
                  Suggested Aroma Combinations:
                </Text>
                <Stack gap="xs">
                  {getAromaCombinationSuggestions().map((suggestion, index) => (
                    <Card key={index} p="xs" withBorder>
                      <Group justify="space-between">
                        <Box>
                          <Group gap="xs" mb="xs">
                            {suggestion.aromas.map((aroma) => (
                              <Badge key={aroma} size="xs" variant="light" color="blue">
                                {aroma}
                              </Badge>
                            ))}
                            <Badge size="xs" variant="filled" color="grape">
                              {suggestion.style}
                            </Badge>
                          </Group>
                          <Text size="xs" c="dimmed">
                            {suggestion.description}
                          </Text>
                        </Box>
                        <Button
                          size="xs"
                          variant="light"
                          onClick={() => setSelectedAromas(suggestion.aromas)}
                        >
                          Apply
                        </Button>
                      </Group>
                    </Card>
                  ))}
                </Stack>
              </Box>
            )}

            {/* Filter Results Summary */}
            <Box p="sm" style={{ borderRadius: 6 }} bg={colorScheme === 'dark' ? 'dark.5' : 'gray.1'}>
              <Text size="sm" fw={500}>
                Showing {availableHops.length} of {uniqueHops.length} hops
                {selectedAromas.length > 0 && (
                  <Text component="span" c="dimmed" size="sm">
                    {' '}• with {selectedAromas.join(', ')} in their top 3 aromas
                  </Text>
                )}
              </Text>
            </Box>
          </Stack>
        </Collapse>

        {/* Hop Selection MultiSelect */}
        <MultiSelect
          placeholder="Search and choose hops..."
          value={selectedHops}
          searchable
          clearable
          maxValues={5}
          data={availableHops.map((hop) => ({
            value: hop.uniqueId,
            label: hop.uniqueId
          }))}
          onChange={onHopSelection}
          mb="md"
        />
      </Box>

      {selectedHops.length > 0 && (
        <Stack gap="md">
          <Divider label="Selected Hops" labelPosition="center" />
          {selectedHops.map((hopName) => {
            const hopInfo = getHopInfo(hopName);
            if (!hopInfo) return null;

            const IconComponent = hopInfo.purpose.icon;

            return (
              <Card key={hopName} withBorder p="md" style={{ borderLeft: `4px solid ${getBorderColor(hopInfo.purpose.color)}` }}>
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
                <Grid mb="md">
                  <Grid.Col span={6}>
                    <Stack gap="xs">
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
                    </Stack>
                  </Grid.Col>
                  <Grid.Col span={6}>
                    <Stack gap="xs">
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
                  </Grid.Col>
                </Grid>

                {/* Aroma Profile & Flavor Notes */}
                <Box mb="md">
                  {/* Standardized Aroma Categories - DISABLED */}
                  {/* {hopInfo.aromas && Object.entries(hopInfo.aromas).some(([_, intensity]) => intensity > 0) && (
                    <Box mb="sm">
                      <Group gap="xs" mb="xs">
                        <ThemeIcon size="sm" variant="light" color="purple">
                          <IconDroplet size="0.8rem" />
                        </ThemeIcon>
                        <Text size="sm" fw={500}>Aroma Profile (Top 3):</Text>
                      </Group>
                      <Box style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                        {getTopAromas(hopInfo, 3).map(({ category, intensity }, index) => (
                          <Badge 
                            key={category} 
                            variant="filled"
                            size="sm"
                            color={index === 0 ? 'purple' : index === 1 ? 'violet' : 'indigo'}
                          >
                            #{index + 1} {category} ({intensity}/5)
                          </Badge>
                        ))}
                      </Box>
                      {/* Show additional aromas if any */}
                      {/*Object.entries(hopInfo.aromas).filter(([_, intensity]) => intensity > 0).length > 3 && (
                        <Box mt="xs">
                          <Text size="xs" c="dimmed">
                            Other aromas: {Object.entries(hopInfo.aromas)
                              .filter(([_, intensity]) => intensity > 0)
                              .sort(([_, a], [__, b]) => b - a)
                              .slice(3)
                              .map(([category, intensity]) => `${category} (${intensity})`)
                              .join(', ')}
                          </Text>
                        </Box>
                      )}
                    </Box>
                  )} */}

                  {/* Text-based Flavor Notes */}
                  {hopInfo.notes && hopInfo.notes.length > 0 && (
                    <Box>
                      <Group gap="xs" mb="xs">
                        <ThemeIcon size="sm" variant="light" color="green">
                          <IconLeaf size="0.8rem" />
                        </ThemeIcon>
                        <Text size="sm" fw={500}>Flavor Notes:</Text>
                      </Group>
                      <Box style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                        {hopInfo.notes.map((note, i) => (
                          <Badge 
                            key={i} 
                            variant="outline"
                            size="sm"
                            color="green"
                          >
                            {note}
                          </Badge>
                        ))}
                      </Box>
                    </Box>
                  )}
                </Box>

                {/* Brewing Recommendations */}
                <Box mt="md" p="sm" style={{ borderRadius: 6 }} bg={colorScheme === 'dark' ? 'dark.5' : 'gray.1'}>
                  <Text size="xs" fw={500} mb="xs">Quick Brewing Tips:</Text>
                  <Text size="xs" c="dimmed">
                    {getBrewingTip(hopInfo)}
                  </Text>
                </Box>
              </Card>
            );
          })}
        </Stack>
      )}
    </Paper>
  );
};

export default HopSelector;
