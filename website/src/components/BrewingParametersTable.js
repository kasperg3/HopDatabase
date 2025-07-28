import React from 'react';
import {
  Paper,
  Title,
  Text,
  Box,
  Table,
  Badge,
  Progress,
  Group,
} from '@mantine/core';

const BrewingParametersTable = ({ hopData }) => {
  if (!hopData || hopData.length === 0) {
    return null;
  }

  // Helper function to safely parse numeric values
  const parseValue = (value) => {
    if (typeof value === 'number') return value;
    if (typeof value === 'string') {
      const cleaned = value.replace(/[^\d.]/g, '');
      const parsed = parseFloat(cleaned);
      return isNaN(parsed) ? 0 : parsed;
    }
    return 0;
  };

  // Format range display
  const formatRange = (from, to, unit = '%') => {
    const fromVal = parseValue(from);
    const toVal = parseValue(to);
    
    if (fromVal === 0 && toVal === 0) return 'N/A';
    if (fromVal === toVal) return `${fromVal}${unit}`;
    if (toVal === 0) return `${fromVal}${unit}`;
    if (fromVal === 0) return `${toVal}${unit}`;
    return `${fromVal} - ${toVal}${unit}`;
  };

  // Get average value for calculations
  const getAverageValue = (from, to) => {
    const fromVal = parseValue(from);
    const toVal = parseValue(to);
    if (fromVal === 0 && toVal === 0) return 0;
    if (toVal === 0) return fromVal;
    if (fromVal === 0) return toVal;
    return (fromVal + toVal) / 2;
  };

  // Classification functions
  const getAlphaClassification = (avgAlpha) => {
    if (avgAlpha >= 10) return { label: 'High', color: 'red' };
    if (avgAlpha >= 6) return { label: 'Medium', color: 'yellow' };
    return { label: 'Low', color: 'green' };
  };

  const getOilClassification = (avgOil) => {
    if (avgOil >= 2.5) return { label: 'High', color: 'blue' };
    if (avgOil >= 1.5) return { label: 'Medium', color: 'cyan' };
    return { label: 'Low', color: 'gray' };
  };

  const getHopPurpose = (avgAlpha, avgOil) => {
    if (avgAlpha >= 10 && avgOil < 2) return { label: 'Bittering', color: 'orange' };
    if (avgAlpha < 8 && avgOil >= 1.5) return { label: 'Aroma', color: 'teal' };
    return { label: 'Dual Purpose', color: 'violet' };
  };

  // Progress bar component for visual comparison
  const ParameterProgress = ({ value, maxValue, color }) => {
    const percentage = Math.min((value / maxValue) * 100, 100);
    return (
      <Progress
        value={percentage}
        color={color}
        size="sm"
        style={{ width: 80 }}
      />
    );
  };

  const colors = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7'
  ];

  return (
    <Paper shadow="sm" p="lg">
      <Title order={3} mb="md">
        Detailed Brewing Parameters
      </Title>
      
      {/* Main Parameters Table */}
      <Paper withBorder mb="lg">
        <Table>
          <Table.Thead>
            <Table.Tr style={{ backgroundColor: '#f8f9fa' }}>
              <Table.Th><Text fw={700}>Parameter</Text></Table.Th>
              {hopData.map((hop, index) => (
                <Table.Th key={`${hop.name}-${hop.source}-header-${index}`} ta="center">
                  <Box style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Box
                      style={{
                        width: 12,
                        height: 12,
                        borderRadius: '50%',
                        backgroundColor: colors[index % colors.length],
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
            {/* Alpha Acid Row */}
            <Table.Tr>
              <Table.Th>
                <Text fw={700}>Alpha Acid %</Text>
              </Table.Th>
              {hopData.map((hop, index) => {
                const avgAlpha = getAverageValue(hop.alpha_from, hop.alpha_to);
                const classification = getAlphaClassification(avgAlpha);
                return (
                  <Table.Td key={`${hop.name}-alpha-${index}`} ta="center">
                    <Box>
                      <Text size="sm" fw={600}>
                        {formatRange(hop.alpha_from, hop.alpha_to)}
                      </Text>
                      <Box style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', marginTop: 4 }}>
                        <ParameterProgress value={avgAlpha} maxValue={20} color={colors[index % colors.length]} />
                      </Box>
                      <Box style={{ display: 'flex', justifyContent: 'center', marginTop: 4 }}>
                        <Badge size="xs" color={classification.color} variant="light">
                          {classification.label}
                        </Badge>
                      </Box>
                    </Box>
                  </Table.Td>
                );
              })}
            </Table.Tr>

            {/* Beta Acid Row */}
            <Table.Tr>
              <Table.Th>
                <Text fw={700}>Beta Acid %</Text>
              </Table.Th>
              {hopData.map((hop, index) => {
                const avgBeta = getAverageValue(hop.beta_from, hop.beta_to);
                const classification = { label: 'Standard', color: 'gray' }; // Consistent spacing
                return (
                  <Table.Td key={`${hop.name}-beta-${index}`} ta="center">
                    <Box>
                      <Text size="sm" fw={600}>
                        {formatRange(hop.beta_from, hop.beta_to)}
                      </Text>
                      <Box style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', marginTop: 4 }}>
                        <ParameterProgress value={avgBeta} maxValue={10} color={colors[index % colors.length]} />
                      </Box>
                      <Box style={{ display: 'flex', justifyContent: 'center', marginTop: 4 }}>
                        <Badge size="xs" color={classification.color} variant="light" style={{ opacity: 0.6 }}>
                          {classification.label}
                        </Badge>
                      </Box>
                    </Box>
                  </Table.Td>
                );
              })}
            </Table.Tr>

            {/* Oil Content Row */}
            <Table.Tr>
              <Table.Th>
                <Text fw={700}>Total Oil (mL/100g)</Text>
              </Table.Th>
              {hopData.map((hop, index) => {
                const avgOil = getAverageValue(hop.oil_from, hop.oil_to);
                const classification = getOilClassification(avgOil);
                return (
                  <Table.Td key={`${hop.name}-oil-${index}`} ta="center">
                    <Box>
                      <Text size="sm" fw={600}>
                        {formatRange(hop.oil_from, hop.oil_to, '')}
                      </Text>
                      <Box style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', marginTop: 4 }}>
                        <ParameterProgress value={avgOil} maxValue={4} color={colors[index % colors.length]} />
                      </Box>
                      <Box style={{ display: 'flex', justifyContent: 'center', marginTop: 4 }}>
                        <Badge size="xs" color={classification.color} variant="light">
                          {classification.label}
                        </Badge>
                      </Box>
                    </Box>
                  </Table.Td>
                );
              })}
            </Table.Tr>

            {/* Cohumulone Row */}
            {hopData.some(hop => hop.co_h_from !== undefined && hop.co_h_from !== '') && (
              <Table.Tr>
                <Table.Th>
                  <Text fw={700}>Cohumulone %</Text>
                </Table.Th>
                {hopData.map((hop, index) => {
                  const avgCohumulone = getAverageValue(hop.co_h_from, hop.co_h_to);
                  const classification = { label: 'Standard', color: 'gray' }; // Consistent spacing
                  return (
                    <Table.Td key={`${hop.name}-cohumulone-${index}`} ta="center">
                      <Box>
                        <Text size="sm" fw={600}>
                          {hop.co_h_from && hop.co_h_to ? 
                            formatRange(hop.co_h_from, hop.co_h_to) : 
                            'N/A'
                          }
                        </Text>
                        {avgCohumulone > 0 ? (
                          <>
                            <Box style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', marginTop: 4 }}>
                              <ParameterProgress value={avgCohumulone} maxValue={50} color={colors[index % colors.length]} />
                            </Box>
                            <Box style={{ display: 'flex', justifyContent: 'center', marginTop: 4 }}>
                              <Badge size="xs" color={classification.color} variant="light" style={{ opacity: 0.6 }}>
                                {classification.label}
                              </Badge>
                            </Box>
                          </>
                        ) : (
                          <Box style={{ height: 44 }} /> // Placeholder for consistent height when N/A
                        )}
                      </Box>
                    </Table.Td>
                  );
                })}
              </Table.Tr>
            )}
          </Table.Tbody>
        </Table>
      </Paper>

      {/* Hop Purpose Classification */}
      <Paper withBorder>
        <Table>
          <Table.Thead>
            <Table.Tr style={{ backgroundColor: '#f8f9fa' }}>
              <Table.Th><Text fw={700}>Brewing Purpose</Text></Table.Th>
              {hopData.map((hop, index) => (
                <Table.Th key={`${hop.name}-purpose-header-${index}`} ta="center">
                  <Text fw={700} size="sm">{hop.name}</Text>
                </Table.Th>
              ))}
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            <Table.Tr>
              <Table.Th>
                <Text fw={700}>Recommended Use</Text>
              </Table.Th>
              {hopData.map((hop, index) => {
                const avgAlpha = getAverageValue(hop.alpha_from, hop.alpha_to);
                const avgOil = getAverageValue(hop.oil_from, hop.oil_to);
                const purpose = getHopPurpose(avgAlpha, avgOil);
                
                return (
                  <Table.Td key={`${hop.name}-purpose-${index}`} ta="center">
                    <Badge
                      size="md"
                      color={purpose.color}
                      variant="filled"
                      style={{ fontWeight: 600 }}
                    >
                      {purpose.label}
                    </Badge>
                  </Table.Td>
                );
              })}
            </Table.Tr>
          </Table.Tbody>
        </Table>
      </Paper>

      <Box mt="md">
        <Text size="xs" c="dimmed">
          <strong>Purpose Classifications:</strong> Bittering (High α, Low Oil), Aroma (Low α, High Oil), Dual Purpose (Moderate α & Oil)
          <br />
          <strong>Progress bars</strong> show relative values within typical ranges for each parameter.
        </Text>
      </Box>
    </Paper>
  );
};

export default BrewingParametersTable;
