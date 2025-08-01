import {
  Paper,
  Text,
  Table,
  Group,
  ThemeIcon,
  Box,
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
import { formatRange } from '../../utils/hopUtils';
import { CHART_COLORS } from '../../utils/hopConstants';

const ParametersTable = ({ processedHops }) => {
  const { colorScheme } = useMantineColorScheme();

  return (
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
                      backgroundColor: CHART_COLORS[hop.index % CHART_COLORS.length],
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
};

export default ParametersTable;
