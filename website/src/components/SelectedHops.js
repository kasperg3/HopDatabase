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
import LazyBrewingParametersComparison from './LazyBrewingParametersComparison';
import BrewingSummary from './BrewingSummary';
import {
  getAverageValue,
  formatRange,
  getCohumuloneClassification,
  getBetaAlphaClassification
} from '../utils/hopUtils';
import { ALPHA_THRESHOLDS, OIL_THRESHOLDS } from '../utils/hopConstants';

const SelectedHops = ({ hopData, selectedHops }) => {
  const { colorScheme } = useMantineColorScheme();
  const [isExpanded, setIsExpanded] = useState(true);

  // Local getHopPurpose function that includes icon components
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
              <LazyBrewingParametersComparison hopData={uniqueHops.filter(hop => selectedHops.includes(hop.uniqueId))} />
            </Tabs.Panel>

            <Tabs.Panel value="brewing-summary" pt="lg">
              <BrewingSummary hopData={uniqueHops.filter(hop => selectedHops.includes(hop.uniqueId))} />
            </Tabs.Panel>
          </Tabs>
        </Box>
      )}
      </Collapse>

    </Paper>
  );
};

export default SelectedHops;
