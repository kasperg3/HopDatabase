import React from 'react';
import {
  Paper,
  Title,
  Text,
  Box,
  Table,
  Badge,
  Grid,
  Card,
} from '@mantine/core';

const DetailedComparison = ({ hopData }) => {
  if (!hopData || hopData.length === 0) {
    return null;
  }

  const aromaCategories = [
    'Citrus', 'Resin/Pine', 'Spice', 'Herbal', 
    'Grassy', 'Floral', 'Berry', 'Stone Fruit', 'Tropical Fruit'
  ];

  const getAromaValue = (hop, category) => {
    const value = hop.aromas && hop.aromas[category] ? hop.aromas[category] : 0;
    return typeof value === 'string' ? parseInt(value) || 0 : value || 0;
  };

  const formatRange = (from, to) => {
    if (from === to) return `${from}`;
    return `${from} - ${to}`;
  };

  const colors = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', 
    '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE'
  ];

  return (
    <Paper shadow="sm" p="lg">
      <Title order={3} mb="md">
        Detailed Comparison
      </Title>

      {/* Basic Information Cards */}
      <Grid mb="lg">
        {hopData.map((hop, index) => (
          <Grid.Col span={{ base: 12, sm: 6, md: 4 }} key={`${hop.name}-${hop.source}-${index}`}>
            <Card 
              withBorder
              style={{ 
                borderLeft: `4px solid ${colors[index % colors.length]}`,
                height: '100%'
              }}
            >
              <Title order={4} c="blue" mb="sm">
                {hop.name}
              </Title>
              <Text size="sm" c="dimmed" mb="xs">
                <Text component="span" fw={500}>Origin:</Text> {hop.country}
              </Text>
              <Text size="sm" c="dimmed" mb="xs">
                <Text component="span" fw={500}>Source:</Text> {hop.source}
              </Text>
              <Text size="sm" c="dimmed" mb="xs">
                <Text component="span" fw={500}>Alpha Acid:</Text> {formatRange(hop.alpha_from, hop.alpha_to)}%
              </Text>
              <Text size="sm" c="dimmed" mb="sm">
                <Text component="span" fw={500}>Beta Acid:</Text> {formatRange(hop.beta_from, hop.beta_to)}%
              </Text>
              {hop.notes && hop.notes.length > 0 && (
                <Box mt="md">
                  <Text size="sm" fw={500} mb="xs">
                    Flavor Notes:
                  </Text>
                  <Box style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                    {hop.notes.slice(0, 6).map((note, i) => (
                      <Badge 
                        key={i} 
                        variant="light"
                        size="sm"
                      >
                        {note}
                      </Badge>
                    ))}
                  </Box>
                </Box>
              )}
            </Card>
          </Grid.Col>
        ))}
      </Grid>

      {/* Aroma Comparison Table */}
      <Title order={4} mb="md" mt="lg">
        Aroma Intensity Comparison
      </Title>
      
      <Paper withBorder>
        <Table>
          <Table.Thead>
            <Table.Tr style={{ backgroundColor: '#f8f9fa' }}>
              <Table.Th><Text fw={700}>Aroma Category</Text></Table.Th>
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
                    <Text fw={700}>{hop.name}</Text>
                  </Box>
                </Table.Th>
              ))}
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {aromaCategories.map((category) => (
              <Table.Tr key={category}>
                <Table.Th>
                  <Text fw={700}>{category}</Text>
                </Table.Th>
                {hopData.map((hop, hopIndex) => {
                  const value = getAromaValue(hop, category);
                  return (
                    <Table.Td key={`${hop.name}-${hop.source}-${category}-${hopIndex}`} ta="center">
                      <Box style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Text fw={700}>
                          {value}/5
                        </Text>
                        <Box
                          style={{
                            width: 40,
                            height: 8,
                            backgroundColor: '#e9ecef',
                            borderRadius: 4,
                            marginLeft: 8,
                            position: 'relative'
                          }}
                        >
                          <Box
                            style={{
                              width: `${(value / 5) * 100}%`,
                              height: '100%',
                              backgroundColor: colors[hopIndex % colors.length],
                              borderRadius: 4
                            }}
                          />
                        </Box>
                      </Box>
                    </Table.Td>
                  );
                })}
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      </Paper>

      {/* Additional Properties Table (if available) */}
      <Title order={4} mb="md" mt="lg">
        Additional Properties
      </Title>
      
      <Paper withBorder>
        <Table>
          <Table.Thead>
            <Table.Tr style={{ backgroundColor: '#f8f9fa' }}>
              <Table.Th><Text fw={700}>Property</Text></Table.Th>
              {hopData.map((hop, index) => (
                <Table.Th key={`${hop.name}-${hop.source}-props-header-${index}`} ta="center">
                  <Text fw={700}>{hop.name}</Text>
                </Table.Th>
              ))}
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            <Table.Tr>
              <Table.Th>
                <Text fw={700}>Total Oil Content</Text>
              </Table.Th>
              {hopData.map((hop, index) => (
                <Table.Td key={`${hop.name}-${hop.source}-oil-${index}`} ta="center">
                  {formatRange(hop.oil_from, hop.oil_to)} ml/100g
                </Table.Td>
              ))}
            </Table.Tr>
            {hopData.some(hop => hop.co_h_from !== undefined && hop.co_h_from !== '') && (
              <Table.Tr>
                <Table.Th>
                  <Text fw={700}>Cohumulone</Text>
                </Table.Th>
                {hopData.map((hop, index) => (
                  <Table.Td key={`${hop.name}-${hop.source}-cohumulone-${index}`} ta="center">
                    {hop.co_h_from && hop.co_h_to ? 
                      `${formatRange(hop.co_h_from, hop.co_h_to)}%` : 
                      'N/A'
                    }
                  </Table.Td>
                ))}
              </Table.Tr>
            )}
          </Table.Tbody>
        </Table>
      </Paper>
    </Paper>
  );
};

export default DetailedComparison;
