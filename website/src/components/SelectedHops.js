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
  ActionIcon,
  Title,
  Tabs,
  Table,
  Divider,
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
  IconArchive,
  IconPackage,
  IconList,
  IconNotes,
} from '@tabler/icons-react';
import LazyBrewingParametersComparison from './LazyBrewingParametersComparison';
import BrewingSummary from './BrewingSummary';
import {
  getAverageValue,
  formatRange,
  getCohumuloneClassification,
  getBetaAlphaClassification,
  generateSensoryDescription,
} from '../utils/hopUtils';
import { ALPHA_THRESHOLDS, OIL_THRESHOLDS } from '../utils/hopConstants';

// Variant type display names and badge colours
const VARIANT_COLORS = {
  'T-90 Pellets': 'blue',
  'LupuLN2® Cryo Hops®': 'cyan',
  'Lupomax®': 'violet',
  'Incognito®': 'dark',
  'Whole Cone': 'green',
};

const VariantsComparison = ({ hopData }) => {
  const hopsWithVariants = hopData.filter(h => h.product_variants?.length > 0);

  const allVariantTypes = [...new Set(
    hopsWithVariants.flatMap(h => h.product_variants.map(v => v.type))
  )].sort();

  if (hopsWithVariants.length === 0) return null;

  return (
    <Stack gap="md">
      <Text size="sm" c="dimmed">
        Cryo Hops® and Lupomax® concentrate alpha acids and oils — use lower weights than T-90 pellets.
      </Text>

      {allVariantTypes.map(type => {
        const color = VARIANT_COLORS[type] || 'gray';
        const rows = hopsWithVariants.map(hop => ({
          hop,
          variant: hop.product_variants.find(v => v.type === type) || null,
        }));

        return (
          <Card key={type} withBorder padding={0} radius="sm">
            <Box
              px="sm"
              py={6}
              style={(theme) => ({
                backgroundColor: `var(--mantine-color-${color}-light)`,
                borderBottom: `2px solid var(--mantine-color-${color}-filled)`,
              })}
            >
              <Text fw={600} size="sm" c={`${color}.8`}>{type}</Text>
            </Box>
            <Box style={{ overflowX: 'auto' }}>
              <Table highlightOnHover style={{ minWidth: 360 }}>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Hop</Table.Th>
                    <Table.Th>α%</Table.Th>
                    <Table.Th>β%</Table.Th>
                    <Table.Th>Oil (ml/100g)</Table.Th>
                    <Table.Th>CoH%</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {rows.map(({ hop, variant }) => (
                    <Table.Tr key={hop.uniqueId}>
                      <Table.Td fw={500} style={{ whiteSpace: 'nowrap' }}>{hop.displayName}</Table.Td>
                      {variant ? (
                        <>
                          <Table.Td style={{ whiteSpace: 'nowrap' }}>{formatRange(variant.alpha_from, variant.alpha_to, '%')}</Table.Td>
                          <Table.Td style={{ whiteSpace: 'nowrap' }}>{formatRange(variant.beta_from, variant.beta_to, '%')}</Table.Td>
                          <Table.Td style={{ whiteSpace: 'nowrap' }}>{formatRange(variant.oil_from, variant.oil_to, '')}</Table.Td>
                          <Table.Td style={{ whiteSpace: 'nowrap' }}>{formatRange(variant.co_h_from, variant.co_h_to, '%')}</Table.Td>
                        </>
                      ) : (
                        <Table.Td colSpan={4}>
                          <Text size="sm" c="dimmed" fs="italic">Not available</Text>
                        </Table.Td>
                      )}
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            </Box>
          </Card>
        );
      })}
    </Stack>
  );
};

// Purpose border accent colors
const PURPOSE_ACCENTS = {
  'Super-Alpha':   '#ef5350',
  'Noble/Aroma':   '#26a69a',
  'Modern Aroma':  '#29b6f6',
  'Bittering':     '#ff9800',
  'Dual-Purpose':  '#7c3aed',
};

const SelectedHops = ({ hopData, selectedHops }) => {
  const { colorScheme } = useMantineColorScheme();
  const isDark = colorScheme === 'dark';
  const [isExpanded, setIsExpanded] = useState(true);
  const [expandedNotes, setExpandedNotes] = useState({});

  const getHopPurpose = (avgAlpha, avgOil, avgBeta) => {
    if (avgAlpha >= ALPHA_THRESHOLDS.SUPER_ALPHA)
      return { label: 'Super-Alpha', color: 'red',    icon: IconFlask,  description: 'Maximum bittering efficiency' };
    if (avgAlpha <= ALPHA_THRESHOLDS.VERY_LOW && avgOil <= OIL_THRESHOLDS.LOW)
      return { label: 'Noble/Aroma', color: 'teal',   icon: IconDroplet, description: 'Traditional European character' };
    if (avgAlpha <= ALPHA_THRESHOLDS.MEDIUM && avgOil >= OIL_THRESHOLDS.HIGH)
      return { label: 'Modern Aroma', color: 'cyan',  icon: IconDroplet, description: 'Contemporary aromatics' };
    if (avgAlpha >= ALPHA_THRESHOLDS.HIGH && avgOil < OIL_THRESHOLDS.HIGH)
      return { label: 'Bittering', color: 'orange',   icon: IconFlask,  description: 'Efficient bittering' };
    return   { label: 'Dual-Purpose', color: 'violet', icon: IconTarget, description: 'Versatile applications' };
  };

  const uniqueHops = hopData.map(hop => {
    const avgAlpha      = getAverageValue(hop.alpha_from, hop.alpha_to);
    const avgBeta       = getAverageValue(hop.beta_from,  hop.beta_to);
    const avgOil        = getAverageValue(hop.oil_from,   hop.oil_to, true);
    const avgCohumulone = getAverageValue(hop.co_h_from,  hop.co_h_to);
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
      purpose:        getHopPurpose(avgAlpha, avgOil, avgBeta),
      cohumuloneClass: getCohumuloneClassification(avgCohumulone),
      betaAlphaClass:  getBetaAlphaClassification(betaAlphaRatio),
    };
  });

  const getHopInfo = (hopUniqueId) =>
    uniqueHops.find(hop => hop.uniqueId === hopUniqueId);

  const getBrewingTip = (hopInfo) => {
    const tips = [];
    if (hopInfo.avgAlpha > 15)      tips.push('High alpha — ideal for bittering additions');
    else if (hopInfo.avgAlpha < 5)  tips.push('Low alpha — perfect for late/dry hop additions');
    if (hopInfo.avgOil > 2.5)       tips.push('rich oil content for intense aroma');
    if (hopInfo.cohumuloneClass.label.includes('Low'))  tips.push('smooth, refined bitterness');
    else if (hopInfo.cohumuloneClass.label.includes('High')) tips.push('punchy bitterness — use with care');
    if (hopInfo.betaAlphaClass.label.includes('Stable')) tips.push('excellent storage stability');

    const purposeMap = {
      'Bittering':    'Add early in boil (60–90 min) for clean bitterness',
      'Aroma':        'Add late (<15 min), whirlpool, or dry hop',
      'Dual-Purpose': 'Versatile — great at any stage of the brew',
    };
    if (purposeMap[hopInfo.purpose.label]) tips.push(purposeMap[hopInfo.purpose.label]);
    return tips.join(' · ') || 'Excellent all-around brewing characteristics.';
  };

  if (selectedHops.length === 0) return null;

  return (
    <Paper
      shadow="xs"
      p="lg"
      style={{
        background: isDark ? 'var(--mantine-color-dark-7)' : 'white',
        border: `1px solid ${isDark ? 'var(--mantine-color-dark-5)' : 'var(--mantine-color-gray-2)'}`,
      }}
    >
      <Group justify="space-between" align="center" mb={isExpanded ? 'md' : 0}>
        <Group gap="sm">
          <ThemeIcon color="hop" variant="light" size="md" radius="md">
            <IconList size={16} />
          </ThemeIcon>
          <Title order={5} style={{ fontFamily: 'Space Grotesk, Inter, sans-serif' }}>
            Selected Hops
          </Title>
          <Badge size="sm" color="hop" variant="light" radius="sm">
            {selectedHops.length}
          </Badge>
        </Group>
        <ActionIcon
          variant="subtle"
          color="gray"
          size="sm"
          radius="md"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          {isExpanded ? <IconChevronUp size={14} /> : <IconChevronDown size={14} />}
        </ActionIcon>
      </Group>

      <Collapse in={isExpanded}>
        <Grid gutter="md">
          {selectedHops.map((hopName) => {
            const hopInfo = getHopInfo(hopName);
            if (!hopInfo) return null;

            const IconComponent = hopInfo.purpose.icon;
            const notesExpanded = expandedNotes[hopInfo.uniqueId];
            const accentColor = PURPOSE_ACCENTS[hopInfo.purpose.label] || '#ced4da';

            return (
              <Grid.Col key={hopName} span={{ base: 12, xs: 12, sm: 6, md: 4, lg: 3, xl: 3 }}>
                <Card
                  withBorder
                  p={0}
                  h="100%"
                  radius="lg"
                  style={{
                    borderColor: isDark ? 'var(--mantine-color-dark-4)' : 'var(--mantine-color-gray-2)',
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column',
                  }}
                >
                  {/* Colored top accent bar */}
                  <Box
                    style={{
                      height: 4,
                      background: `linear-gradient(90deg, ${accentColor} 0%, ${accentColor}88 100%)`,
                    }}
                  />

                  <Box p="md" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                    {/* Header */}
                    <Group justify="space-between" mb="sm" wrap="nowrap">
                      <Group gap="xs" wrap="nowrap" style={{ minWidth: 0 }}>
                        <ThemeIcon color={hopInfo.purpose.color} variant="light" size="md" radius="md" style={{ flexShrink: 0 }}>
                          <IconComponent size={14} />
                        </ThemeIcon>
                        <Box style={{ minWidth: 0 }}>
                          <Text fw={700} size="md" style={{ fontFamily: 'Space Grotesk, Inter, sans-serif' }} truncate>
                            {hopInfo.displayName}
                          </Text>
                          <Text size="xs" c="dimmed" truncate>
                            {hopInfo.country}{hopInfo.country && hopInfo.source ? ' · ' : ''}{hopInfo.source}
                          </Text>
                        </Box>
                      </Group>
                      <Tooltip label={hopInfo.purpose.description} withArrow>
                        <Badge
                          color={hopInfo.purpose.color}
                          variant="light"
                          size="xs"
                          radius="sm"
                          style={{ flexShrink: 0, cursor: 'default' }}
                        >
                          {hopInfo.purpose.label}
                        </Badge>
                      </Tooltip>
                    </Group>

                    {/* Chemistry rows */}
                    <Stack gap={6} mb="md">
                      <ChemRow
                        icon={<IconFlask size={11} />}
                        iconColor="orange"
                        label="Alpha"
                        value={formatRange(hopInfo.alpha_from, hopInfo.alpha_to)}
                      />
                      <ChemRow
                        icon={<IconChartBar size={11} />}
                        iconColor="blue"
                        label="Beta"
                        value={formatRange(hopInfo.beta_from, hopInfo.beta_to)}
                      />
                      <ChemRow
                        icon={<IconDroplet size={11} />}
                        iconColor="teal"
                        label="Oil"
                        value={formatRange(hopInfo.oil_from, hopInfo.oil_to, ' ml/100g', true)}
                      />
                      {hopInfo.avgCohumulone > 0 && (
                        <ChemRow
                          icon={<IconShieldCheck size={11} />}
                          iconColor="yellow"
                          label="Cohumulone"
                          value={formatRange(hopInfo.co_h_from, hopInfo.co_h_to)}
                          badge={
                            <Tooltip label={hopInfo.cohumuloneClass.description} withArrow>
                              <Badge size="xs" color={hopInfo.cohumuloneClass.color} variant="dot" radius="sm" style={{ cursor: 'default' }}>
                                {hopInfo.cohumuloneClass.label}
                              </Badge>
                            </Tooltip>
                          }
                        />
                      )}
                      <ChemRow
                        icon={<IconScale size={11} />}
                        iconColor="gray"
                        label="β/α"
                        value={hopInfo.betaAlphaRatio.toFixed(2)}
                        badge={
                          <Tooltip label={hopInfo.betaAlphaClass.description} withArrow>
                            <Badge size="xs" color={hopInfo.betaAlphaClass.color} variant="dot" radius="sm" style={{ cursor: 'default' }}>
                              {hopInfo.betaAlphaClass.label}
                            </Badge>
                          </Tooltip>
                        }
                      />
                      {hopInfo.storage && (
                        <ChemRow
                          icon={<IconArchive size={11} />}
                          iconColor="indigo"
                          label="Storage"
                          value={hopInfo.storage}
                        />
                      )}
                    </Stack>

                    {/* Flavor Notes */}
                    {hopInfo.notes && hopInfo.notes.length > 0 && (
                      <Box mb="md">
                        <Group gap="xs" mb={6}>
                          <ThemeIcon size="xs" variant="light" color="green" radius="sm">
                            <IconLeaf size={9} />
                          </ThemeIcon>
                          <Text size="xs" fw={600} c="dimmed" tt="uppercase" style={{ letterSpacing: '0.05em' }}>
                            Flavor Notes
                          </Text>
                        </Group>
                        <Box style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                          {(notesExpanded ? hopInfo.notes : hopInfo.notes.slice(0, 4)).map((note, i) => (
                            <Badge key={i} variant="outline" size="xs" color="green" radius="sm">
                              {note}
                            </Badge>
                          ))}
                          {hopInfo.notes.length > 4 && !notesExpanded && (
                            <Badge
                              variant="outline"
                              size="xs"
                              color="gray"
                              radius="sm"
                              style={{ cursor: 'pointer' }}
                              onClick={() => setExpandedNotes(p => ({ ...p, [hopInfo.uniqueId]: true }))}
                            >
                              +{hopInfo.notes.length - 4} more
                            </Badge>
                          )}
                          {hopInfo.notes.length > 4 && notesExpanded && (
                            <Badge
                              variant="outline"
                              size="xs"
                              color="gray"
                              radius="sm"
                              style={{ cursor: 'pointer' }}
                              onClick={() => setExpandedNotes(p => ({ ...p, [hopInfo.uniqueId]: false }))}
                            >
                              Show less
                            </Badge>
                          )}
                        </Box>
                      </Box>
                    )}

                    {/* Sensory Profile */}
                    {(() => {
                      const description = generateSensoryDescription(hopInfo);
                      return description ? (
                        <Box mb="md">
                          <Group gap="xs" mb={6}>
                            <ThemeIcon size="xs" variant="light" color="grape" radius="sm">
                              <IconNotes size={9} />
                            </ThemeIcon>
                            <Text size="xs" fw={600} c="dimmed" tt="uppercase" style={{ letterSpacing: '0.05em' }}>
                              Sensory Profile
                            </Text>
                          </Group>
                          <Text size="xs" c="dimmed" style={{ lineHeight: 1.5 }}>
                            {description}
                          </Text>
                        </Box>
                      ) : null;
                    })()}

                    {/* Product Variants */}
                    {hopInfo.product_variants && hopInfo.product_variants.length > 0 && (
                      <Box mb="md">
                        <Divider mb="xs" />
                        <Group gap="xs" mb={6}>
                          <ThemeIcon size="xs" variant="light" color="indigo" radius="sm">
                            <IconPackage size={9} />
                          </ThemeIcon>
                          <Text size="xs" fw={600} c="dimmed" tt="uppercase" style={{ letterSpacing: '0.05em' }}>
                            Product Forms
                          </Text>
                        </Group>
                        <Table fz="xs" withColumnBorders={false} withTableBorder={false}>
                          <Table.Thead>
                            <Table.Tr>
                              <Table.Th style={{ paddingLeft: 0, fontSize: 11 }}>Form</Table.Th>
                              <Table.Th style={{ fontSize: 11 }}>Alpha</Table.Th>
                              <Table.Th style={{ fontSize: 11 }}>Beta</Table.Th>
                              <Table.Th style={{ fontSize: 11 }}>Oil</Table.Th>
                            </Table.Tr>
                          </Table.Thead>
                          <Table.Tbody>
                            {hopInfo.product_variants.map((variant) => (
                              <Table.Tr key={variant.type}>
                                <Table.Td style={{ paddingLeft: 0, fontWeight: 600 }}>{variant.type}</Table.Td>
                                <Table.Td>{formatRange(variant.alpha_from, variant.alpha_to)}</Table.Td>
                                <Table.Td>{formatRange(variant.beta_from, variant.beta_to)}</Table.Td>
                                <Table.Td>{formatRange(variant.oil_from, variant.oil_to, ' ml/100g')}</Table.Td>
                              </Table.Tr>
                            ))}
                          </Table.Tbody>
                        </Table>
                      </Box>
                    )}

                    {/* Brewing tip */}
                    <Box
                      mt="auto"
                      pt="sm"
                      style={{
                        borderTop: `1px solid ${isDark ? 'var(--mantine-color-dark-5)' : 'var(--mantine-color-gray-2)'}`,
                      }}
                    >
                      <Text size="xs" fw={600} c="dimmed" tt="uppercase" mb={4} style={{ letterSpacing: '0.05em' }}>
                        Brewing Tip
                      </Text>
                      <Text size="xs" c="dimmed" style={{ lineHeight: 1.5 }}>
                        {getBrewingTip(hopInfo)}
                      </Text>
                    </Box>
                  </Box>
                </Card>
              </Grid.Col>
            );
          })}
        </Grid>

        {selectedHops.length > 0 && (
          <Box mt="xl">
            <Tabs defaultValue="brewing-parameters" variant="pills" radius="md">
              <Tabs.List mb="md">
                <Tabs.Tab value="brewing-parameters">
                  Brewing Parameters
                </Tabs.Tab>
                <Tabs.Tab value="brewing-summary">
                  Brewing Summary
                </Tabs.Tab>
              {uniqueHops.filter(hop => selectedHops.includes(hop.uniqueId) && hop.product_variants?.length > 0).length > 0 && (
                <Tabs.Tab value="variants" leftSection={<IconPackage size={14} />}>
                  Product Variants
                </Tabs.Tab>
              )}
              </Tabs.List>

              <Tabs.Panel value="brewing-parameters">
                <LazyBrewingParametersComparison
                  hopData={uniqueHops.filter(hop => selectedHops.includes(hop.uniqueId))}
                />
              </Tabs.Panel>

              <Tabs.Panel value="brewing-summary">
                <BrewingSummary
                  hopData={uniqueHops.filter(hop => selectedHops.includes(hop.uniqueId))}
                />
              </Tabs.Panel>

              <Tabs.Panel value="variants">
                <VariantsComparison hopData={uniqueHops.filter(hop => selectedHops.includes(hop.uniqueId))} />
              </Tabs.Panel>
            </Tabs>
          </Box>
        )}
      </Collapse>
    </Paper>
  );
};

// Small helper component for chemistry rows
function ChemRow({ icon, iconColor, label, value, badge }) {
  return (
    <Group gap="xs" wrap="nowrap">
      <ThemeIcon size="xs" variant="light" color={iconColor} radius="sm" style={{ flexShrink: 0 }}>
        {icon}
      </ThemeIcon>
      <Text size="xs" fw={600} c="dimmed" style={{ minWidth: 64, flexShrink: 0 }}>
        {label}
      </Text>
      <Text size="xs" style={{ flex: 1 }}>
        {value}
      </Text>
      {badge}
    </Group>
  );
}

export default SelectedHops;
