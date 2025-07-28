import React from 'react';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Legend } from 'recharts';
import {
  Paper,
  Title,
  Text,
  Box,
  Table,
  Group,
  Grid,
  ThemeIcon,
  useMantineColorScheme,
} from '@mantine/core';
import {
  IconFlask,
  IconDroplet,
  IconChartBar,
  IconTarget,
  IconShieldCheck,
  IconScale,
} from '@tabler/icons-react';

// Advanced hop chemistry constants based on research
const ALPHA_THRESHOLDS = {
  SUPER_ALPHA: 11, // >= 11% Super-Alpha
  HIGH: 8, // 8-11% High/Assertive
  MEDIUM: 5, // 5-8% Medium
  LOW: 3, // 3-5% Low
  VERY_LOW: 3, // < 3% Very Low (Noble)
};

const OIL_THRESHOLDS = {
  VERY_HIGH: 2.5, // >= 2.5 mL/100g Very High
  HIGH: 1.5, // 1.5-2.4 mL/100g High
  MEDIUM: 0.8, // 0.8-1.4 mL/100g Medium
  LOW: 0.4, // < 0.8 mL/100g Low
};

const COHUMULONE_THRESHOLDS = {
  HIGH: 34, // >34% High (Yields more IBUs)
  MODERATE: 26, // 26-33% Moderate
  LOW: 25, // <25% Low (May yield fewer IBUs)
};

const BETA_ALPHA_THRESHOLDS = {
  STABLE: 0.8, // >= 0.8 indicates good stability
  AGING_POTENTIAL: 0.9, // >= 0.9 may develop pleasant aromas
};

const BrewingParametersComparison = ({ hopData }) => {
  const { colorScheme } = useMantineColorScheme();
  
  if (!hopData || hopData.length === 0) {
    return null;
  }

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

  const getAverageValue = (from, to) => {
    const fromVal = parseValue(from);
    const toVal = parseValue(to);
    if (fromVal === 0 && toVal === 0) return 0;
    if (toVal === 0) return fromVal;
    if (fromVal === 0) return toVal;
    return (fromVal + toVal) / 2;
  };

  const formatRange = (from, to, unit = '%') => {
    const fromVal = parseValue(from);
    const toVal = parseValue(to);
    
    if (fromVal === 0 && toVal === 0) return 'N/A';
    if (fromVal === toVal) return `${fromVal}${unit}`;
    if (toVal === 0) return `${fromVal}${unit}`;
    if (fromVal === 0) return `${toVal}${unit}`;
    return `${fromVal} - ${toVal}${unit}`;
  };

  // Advanced classification functions based on research
  const getAlphaClassification = (avgAlpha) => {
    if (avgAlpha >= ALPHA_THRESHOLDS.SUPER_ALPHA) return { label: 'Super-Alpha', color: 'red', description: 'Maximum bittering efficiency' };
    if (avgAlpha >= ALPHA_THRESHOLDS.HIGH) return { label: 'High Alpha', color: 'orange', description: 'Efficient bittering' };
    if (avgAlpha >= ALPHA_THRESHOLDS.MEDIUM) return { label: 'Medium Alpha', color: 'yellow', description: 'Balanced bittering' };
    if (avgAlpha >= ALPHA_THRESHOLDS.LOW) return { label: 'Low Alpha', color: 'green', description: 'Aroma-focused' };
    return { label: 'Noble/Very Low', color: 'teal', description: 'Traditional aroma' };
  };

  const getOilClassification = (avgOil) => {
    if (avgOil >= OIL_THRESHOLDS.VERY_HIGH) return { label: 'Very High', color: 'blue', description: 'Exceptional aroma potential' };
    if (avgOil >= OIL_THRESHOLDS.HIGH) return { label: 'High', color: 'cyan', description: 'Strong aroma character' };
    if (avgOil >= OIL_THRESHOLDS.MEDIUM) return { label: 'Medium', color: 'grape', description: 'Moderate aroma' };
    return { label: 'Low', color: 'gray', description: 'Subtle aroma' };
  };

  const getCohumuloneClassification = (avgCohumulone) => {
    if (avgCohumulone === 0) return { label: 'Unknown', color: 'gray', description: 'Data not available' };
    if (avgCohumulone > COHUMULONE_THRESHOLDS.HIGH) return { label: 'High Yield', color: 'yellow', description: '+15-25% more IBUs than predicted' };
    if (avgCohumulone < COHUMULONE_THRESHOLDS.LOW) return { label: 'Low Yield', color: 'blue', description: 'May yield fewer IBUs' };
    return { label: 'Standard', color: 'green', description: 'Standard IBU prediction' };
  };

  const getBetaAlphaClassification = (ratio) => {
    if (ratio >= BETA_ALPHA_THRESHOLDS.AGING_POTENTIAL) return { label: 'Aging+', color: 'orange', description: 'May develop pleasant aged character' };
    if (ratio >= BETA_ALPHA_THRESHOLDS.STABLE) return { label: 'Stable', color: 'blue', description: 'Good bitterness stability' };
    if (ratio < 0.5) return { label: 'Rapid Loss', color: 'red', description: 'Rapid alpha degradation' };
    return { label: 'Standard', color: 'gray', description: 'Normal degradation rate' };
  };

  const getHopPurpose = (avgAlpha, avgOil, avgBeta) => {
    const betaAlphaRatio = avgAlpha > 0 ? avgBeta / avgAlpha : 0;
    
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

  // Process hop data with advanced analysis
  const processedHops = hopData.map((hop, index) => {
    const avgAlpha = getAverageValue(hop.alpha_from, hop.alpha_to);
    const avgBeta = getAverageValue(hop.beta_from, hop.beta_to);
    const avgOil = getAverageValue(hop.oil_from, hop.oil_to);
    const avgCohumulone = getAverageValue(hop.co_h_from, hop.co_h_to);
    const betaAlphaRatio = avgAlpha > 0 ? avgBeta / avgAlpha : 0;

    return {
      ...hop,
      index,
      avgAlpha,
      avgBeta,
      avgOil,
      avgCohumulone,
      betaAlphaRatio,
      alphaClass: getAlphaClassification(avgAlpha),
      oilClass: getOilClassification(avgOil),
      cohumuloneClass: getCohumuloneClassification(avgCohumulone),
      betaAlphaClass: getBetaAlphaClassification(betaAlphaRatio),
      purpose: getHopPurpose(avgAlpha, avgOil, avgBeta),
    };
  });

  // Chart data preparation
  const normalizeAlpha = (value) => Math.min((parseValue(value) / 20) * 10, 10);
  const normalizeBeta = (value) => Math.min((parseValue(value) / 10) * 10, 10);
  const normalizeOil = (value) => Math.min((parseValue(value) / 4) * 10, 10);
  const normalizeCohumulone = (value) => Math.min((parseValue(value) / 50) * 10, 10);
  const normalizeBetaAlpha = (value) => Math.min((parseValue(value) / 2) * 10, 10);

  const categories = ['Alpha Acid', 'Beta Acid', 'Oil Content', 'Cohumulone', 'β/α Ratio'];
  
  const radarData = categories.map(category => {
    const dataPoint = { category };
    
    processedHops.forEach((hop) => {
      let normalizedValue = 0;
      
      switch (category) {
        case 'Alpha Acid':
          normalizedValue = normalizeAlpha(hop.avgAlpha);
          break;
        case 'Beta Acid':
          normalizedValue = normalizeBeta(hop.avgBeta);
          break;
        case 'Oil Content':
          normalizedValue = normalizeOil(hop.avgOil);
          break;
        case 'Cohumulone':
          normalizedValue = normalizeCohumulone(hop.avgCohumulone);
          break;
        case 'β/α Ratio':
          normalizedValue = normalizeBetaAlpha(hop.betaAlphaRatio);
          break;
      }
      
      dataPoint[hop.name] = Math.round(normalizedValue * 10) / 10;
    });
    
    return dataPoint;
  });

  const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#FF8A80', '#82B1FF'];

  // Table view component
  const TableView = () => (
    <Paper withBorder>
      <Table>
        <Table.Thead>
          <Table.Tr bg={colorScheme === 'dark' ? 'dark.5' : 'gray.1'}>
            <Table.Th><Text fw={700}>Parameter</Text></Table.Th>
            {processedHops.map((hop) => (
              <Table.Th key={`${hop.name}-${hop.source}-header`} ta="center">
                <Box style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Box
                    style={{
                      width: 12,
                      height: 12,
                      borderRadius: '50%',
                      backgroundColor: colors[hop.index % colors.length],
                      marginRight: 8
                    }}
                  />
                  <Text fw={700} size="sm">{hop.name}</Text>
                </Box>
              </Table.Th>
            ))}
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {/* Purpose Row */}
          <Table.Tr>
            <Table.Th>
              <Group gap="xs">
                <ThemeIcon size="sm" variant="light" color="blue">
                  <IconTarget size="0.8rem" />
                </ThemeIcon>
                <Text fw={700}>Brewing Purpose</Text>
              </Group>
            </Table.Th>
            {processedHops.map((hop) => (
              <Table.Td key={`${hop.name}-purpose`} ta="center">
                <Text size="sm" fw={600}>
                  {hop.purpose.label}
                </Text>
              </Table.Td>
            ))}
          </Table.Tr>

          {/* Alpha Acid Row */}
          <Table.Tr>
            <Table.Th>
              <Group gap="xs">
                <ThemeIcon size="sm" variant="light" color="orange">
                  <IconFlask size="0.8rem" />
                </ThemeIcon>
                <Text fw={700}>Alpha Acid %</Text>
              </Group>
            </Table.Th>
            {processedHops.map((hop) => (
              <Table.Td key={`${hop.name}-alpha`} ta="center">
                <Text size="sm" fw={600}>
                  {formatRange(hop.alpha_from, hop.alpha_to)}
                </Text>
              </Table.Td>
            ))}
          </Table.Tr>

          {/* Beta Acid Row */}
          <Table.Tr>
            <Table.Th>
              <Group gap="xs">
                <ThemeIcon size="sm" variant="light" color="blue">
                  <IconChartBar size="0.8rem" />
                </ThemeIcon>
                <Text fw={700}>Beta Acid %</Text>
              </Group>
            </Table.Th>
            {processedHops.map((hop) => (
              <Table.Td key={`${hop.name}-beta`} ta="center">
                <Text size="sm" fw={600}>
                  {formatRange(hop.beta_from, hop.beta_to)}
                </Text>
              </Table.Td>
            ))}
          </Table.Tr>

          {/* Oil Content Row */}
          <Table.Tr>
            <Table.Th>
              <Group gap="xs">
                <ThemeIcon size="sm" variant="light" color="teal">
                  <IconDroplet size="0.8rem" />
                </ThemeIcon>
                <Text fw={700}>Total Oil (mL/100g)</Text>
              </Group>
            </Table.Th>
            {processedHops.map((hop) => (
              <Table.Td key={`${hop.name}-oil`} ta="center">
                <Text size="sm" fw={600}>
                  {formatRange(hop.oil_from, hop.oil_to, '')}
                </Text>
              </Table.Td>
            ))}
          </Table.Tr>

          {/* Cohumulone Row */}
          {processedHops.some(hop => hop.avgCohumulone > 0) && (
            <Table.Tr>
              <Table.Th>
                <Group gap="xs">
                  <ThemeIcon size="sm" variant="light" color="yellow">
                    <IconShieldCheck size="0.8rem" />
                  </ThemeIcon>
                  <Text fw={700}>Cohumulone %</Text>
                </Group>
              </Table.Th>
              {processedHops.map((hop) => (
                <Table.Td key={`${hop.name}-cohumulone`} ta="center">
                  <Text size="sm" fw={600}>
                    {hop.avgCohumulone > 0 ? 
                      formatRange(hop.co_h_from, hop.co_h_to) : 
                      'N/A'
                    }
                  </Text>
                </Table.Td>
              ))}
            </Table.Tr>
          )}

          {/* Beta:Alpha Stability Row */}
          <Table.Tr>
            <Table.Th>
              <Group gap="xs">
                <ThemeIcon size="sm" variant="light" color="gray">
                  <IconScale size="0.8rem" />
                </ThemeIcon>
                <Text fw={700}>β/α Ratio</Text>
              </Group>
            </Table.Th>
            {processedHops.map((hop) => (
              <Table.Td key={`${hop.name}-stability`} ta="center">
                <Text size="sm" fw={600}>
                  {hop.betaAlphaRatio.toFixed(2)}
                </Text>
              </Table.Td>
            ))}
          </Table.Tr>
        </Table.Tbody>
      </Table>
    </Paper>
  );

  // Chart view component
  const ChartView = () => (
    <Paper withBorder p="md">
      <Box style={{ width: '100%', height: 500 }}>
        <ResponsiveContainer>
          <RadarChart data={radarData} margin={{ top: 40, right: 60, bottom: 40, left: 60 }}>
            <PolarGrid />
            <PolarAngleAxis 
              dataKey="category" 
              tick={{ fontSize: 12, fontWeight: 500 }}
            />
            <PolarRadiusAxis 
              angle={90} 
              domain={[0, 10]}
              tick={{ fontSize: 10 }}
              tickCount={6}
            />
            {processedHops.map((hop) => (
              <Radar
                key={`${hop.name}-${hop.source}`}
                name={hop.name}
                dataKey={hop.name}
                stroke={colors[hop.index % colors.length]}
                fill={colors[hop.index % colors.length]}
                fillOpacity={0.1}
                strokeWidth={2}
              />
            ))}
            <Legend 
              verticalAlign="bottom" 
              height={50}
              wrapperStyle={{ fontSize: '12px' }}
            />
          </RadarChart>
        </ResponsiveContainer>
      </Box>
    </Paper>
  );

  return (
    <Paper shadow="sm" p="lg">
      <Grid>
        <Grid.Col span={{ base: 12, lg: 7 }}>
          <TableView />
        </Grid.Col>
        <Grid.Col span={{ base: 12, lg: 5 }}>
          <ChartView />
        </Grid.Col>
      </Grid>

      <Box mt="md">
        <Text size="xs" c="dimmed">
          <strong>Advanced Classifications:</strong> Based on modern hop chemistry research. 
          Super-Alpha (≥11% AA), High Alpha (8-11%), Noble/Aroma (≤3% AA + Low Oil), Modern Aroma (≤5% AA + High Oil).
          <br />
          <strong>Cohumulone Impact:</strong> High (&gt;34%) yields 15-25% more IBUs than predicted. Low (&lt;25%) may yield fewer IBUs.
          <br />
          <strong>β/α Ratio:</strong> Indicates storage stability. ≥0.8 = Stable, ≥0.9 = May develop pleasant aged character.
        </Text>
      </Box>
    </Paper>
  );
};

export default BrewingParametersComparison;
