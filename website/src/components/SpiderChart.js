import React, { useRef, useState } from 'react';
import {
  Paper,
  Title,
  Text,
  Box,
  Grid,
  Card,
  Group,
  ThemeIcon,
  useMantineColorScheme,
  Collapse,
  ActionIcon,
  Tooltip,
  Stack,
} from '@mantine/core';
import {
  IconChartRadar,
  IconDroplet,
  IconShieldCheck,
  IconChevronDown,
  IconChevronUp,
  IconFlask,
  IconLeaf,
} from '@tabler/icons-react';
import Plot from 'react-plotly.js';
import { getAverageValue } from '../utils/hopUtils';

// Vibrant, distinct color palette
const CHART_COLORS = [
  '#2ea82e', // hop green
  '#4ECDC4', // teal
  '#FF6B6B', // coral
  '#45B7D1', // sky blue
  '#F9A825', // amber
  '#AB47BC', // purple
  '#26A69A', // dark teal
  '#EF5350', // red
  '#42A5F5', // blue
];

const SpiderChart = ({ hopData }) => {
  const chartRef = useRef();
  const { colorScheme } = useMantineColorScheme();
  const isDark = colorScheme === 'dark';
  const [isExpanded, setIsExpanded] = useState(true);

  const isMobile = window.innerWidth <= 768;

  const aromaCategories = [
    'Citrus', 'Resin/Pine', 'Spice', 'Herbal',
    'Grassy', 'Floral', 'Berry', 'Stone Fruit', 'Tropical Fruit',
  ];

  const calculateOverallStats = () => {
    if (!hopData || hopData.length === 0) {
      return { avgAlpha: 0, avgBeta: 0, avgOil: 0, avgCohumulone: 0 };
    }
    const stats = hopData.map(hop => ({
      avgAlpha:      getAverageValue(hop.alpha_from, hop.alpha_to),
      avgBeta:       getAverageValue(hop.beta_from, hop.beta_to),
      avgOil:        getAverageValue(hop.oil_from, hop.oil_to),
      avgCohumulone: getAverageValue(hop.co_h_from, hop.co_h_to),
    }));
    return {
      avgAlpha:      stats.reduce((s, h) => s + h.avgAlpha, 0) / stats.length,
      avgBeta:       stats.reduce((s, h) => s + h.avgBeta, 0) / stats.length,
      avgOil:        stats.reduce((s, h) => s + h.avgOil, 0) / stats.length,
      avgCohumulone: stats.filter(h => h.avgCohumulone > 0)
                         .reduce((s, h) => s + h.avgCohumulone, 0)
                         / (stats.filter(h => h.avgCohumulone > 0).length || 1),
    };
  };

  const overallStats = calculateOverallStats();

  const StatCard = ({ icon, color, label, value, unit }) => (
    <Grid.Col span={{ base: 6, sm: 3 }}>
      <Card
        withBorder
        p="sm"
        radius="md"
        style={{
          background: isDark ? 'var(--mantine-color-dark-6)' : 'white',
        }}
      >
        <Group wrap="nowrap" gap="sm">
          <ThemeIcon color={color} variant="light" size="lg" radius="md">
            {icon}
          </ThemeIcon>
          <Box>
            <Text size="xs" fw={600} c="dimmed" tt="uppercase" style={{ letterSpacing: '0.05em' }}>
              {label}
            </Text>
            <Group gap={3} align="baseline">
              <Text fw={700} size="xl" style={{ lineHeight: 1.1 }}>
                {value}
              </Text>
              {unit && (
                <Text size="xs" c="dimmed">
                  {unit}
                </Text>
              )}
            </Group>
          </Box>
        </Group>
      </Card>
    </Grid.Col>
  );

  const createSpiderChartData = () => {
    if (!hopData || hopData.length === 0) {
      return [{
        type: 'scatterpolar',
        mode: 'lines',
        r: new Array(aromaCategories.length + 1).fill(0),
        theta: [...aromaCategories, aromaCategories[0]],
        fill: 'none',
        line: { color: 'rgba(0,0,0,0)', width: 0 },
        showlegend: false,
        hoverinfo: 'skip',
      }];
    }

    return hopData.map((hop, index) => {
      const aromaValues = aromaCategories.map(category => {
        const value = hop.aromas && hop.aromas[category] ? hop.aromas[category] : 0;
        const numValue = typeof value === 'string' ? parseInt(value) || 0 : value || 0;
        return Math.min(Math.max(numValue, 0), 5);
      });

      const color = CHART_COLORS[index % CHART_COLORS.length];
      const r = parseInt(color.slice(1, 3), 16);
      const g = parseInt(color.slice(3, 5), 16);
      const b = parseInt(color.slice(5, 7), 16);
      const fillColor = `rgba(${r}, ${g}, ${b}, 0.18)`;

      return {
        type: 'scatterpolar',
        mode: 'lines+markers',
        r: [...aromaValues, aromaValues[0]],
        theta: [...aromaCategories, aromaCategories[0]],
        fill: 'toself',
        fillcolor: fillColor,
        name: hop.name,
        line: { color, width: 2.5 },
        marker: {
          color,
          size: 6,
          line: { color: isDark ? '#1a1a2e' : 'white', width: 1.5 },
        },
        hovertemplate: `<b>${hop.name}</b><br>%{theta}: %{r}/5<extra></extra>`,
      };
    });
  };

  const gridColor = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)';
  const tickColor = isDark ? 'rgba(255,255,255,0.6)' : '#555';

  const layout = {
    polar: {
      bgcolor: 'rgba(0,0,0,0)',
      radialaxis: {
        visible: true,
        range: [-0.5, 5],
        showline: false,
        showgrid: true,
        gridcolor: gridColor,
        showticklabels: false,
        ticks: '',
      },
      angularaxis: {
        showline: false,
        gridcolor: gridColor,
        tickfont: {
          size: isMobile ? 9 : 12,
          color: tickColor,
          family: 'Inter, sans-serif',
        },
        rotation: 90,
        direction: 'clockwise',
      },
    },
    showlegend: true,
    legend: {
      orientation: 'h',
      yanchor: 'bottom',
      y: isMobile ? -0.28 : -0.18,
      xanchor: 'center',
      x: 0.5,
      font: {
        color: isDark ? '#C1C2C5' : '#444',
        size: isMobile ? 10 : 12,
        family: 'Inter, sans-serif',
      },
    },
    font: {
      size: isMobile ? 10 : 12,
      color: isDark ? '#C1C2C5' : '#333',
      family: 'Inter, sans-serif',
    },
    paper_bgcolor: 'rgba(0,0,0,0)',
    plot_bgcolor: 'rgba(0,0,0,0)',
    margin: { t: 20, b: isMobile ? 90 : 110, l: 20, r: 20 },
    autosize: true,
    dragmode: false,
    scrollZoom: false,
    doubleClick: false,
  };

  const config = {
    responsive: true,
    displayModeBar: false,
    staticPlot: false,
    scrollZoom: false,
    doubleClick: false,
    showTips: false,
  };

  const hasHops = hopData && hopData.length > 0;

  return (
    <Paper
      shadow="xs"
      p={{ base: 'md', sm: 'lg' }}
      style={{
        background: isDark ? 'var(--mantine-color-dark-7)' : 'white',
        border: `1px solid ${isDark ? 'var(--mantine-color-dark-5)' : 'var(--mantine-color-gray-2)'}`,
      }}
    >
      <Group justify="space-between" align="center" mb={isExpanded ? 'md' : 0}>
        <Group gap="sm">
          <ThemeIcon color="hop" variant="light" size="md" radius="md">
            <IconChartRadar size={16} />
          </ThemeIcon>
          <Title
            order={5}
            style={{ fontFamily: 'Space Grotesk, Inter, sans-serif' }}
          >
            Aroma Profile Comparison
          </Title>
        </Group>
        <Tooltip label={isExpanded ? 'Collapse' : 'Expand'} position="left">
          <ActionIcon
            variant="subtle"
            color="gray"
            size="sm"
            radius="md"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? <IconChevronUp size={14} /> : <IconChevronDown size={14} />}
          </ActionIcon>
        </Tooltip>
      </Group>

      <Collapse in={isExpanded}>
        {hasHops ? (
          <>
            <Box style={{ height: isMobile ? 340 : 480 }}>
              <Plot
                ref={chartRef}
                data={createSpiderChartData()}
                layout={layout}
                config={config}
                style={{ width: '100%', height: '100%' }}
                useResizeHandler={true}
              />
            </Box>

            <Grid mt="sm">
              <StatCard
                icon={<IconFlask size={16} />}
                color="orange"
                label="Avg Alpha"
                value={overallStats.avgAlpha.toFixed(1)}
                unit="%"
              />
              <StatCard
                icon={<IconLeaf size={16} />}
                color="hop"
                label="Avg Beta"
                value={overallStats.avgBeta.toFixed(1)}
                unit="%"
              />
              <StatCard
                icon={<IconDroplet size={16} />}
                color="teal"
                label="Avg Oil"
                value={overallStats.avgOil.toFixed(2)}
                unit="ml/100g"
              />
              <StatCard
                icon={<IconShieldCheck size={16} />}
                color="red"
                label="Avg Cohum."
                value={overallStats.avgCohumulone.toFixed(1)}
                unit="%"
              />
            </Grid>
          </>
        ) : (
          <Box
            style={{
              height: isMobile ? 200 : 260,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 12,
              background: isDark
                ? 'linear-gradient(135deg, var(--mantine-color-dark-6) 0%, var(--mantine-color-dark-5) 100%)'
                : 'linear-gradient(135deg, #f0faf0 0%, #f7f9f7 100%)',
              border: `1px dashed ${isDark ? 'var(--mantine-color-dark-3)' : 'var(--mantine-color-gray-3)'}`,
            }}
          >
            <Stack align="center" gap="xs">
              <Text fz={32}>🍃</Text>
              <Text fw={600} c="dimmed" size="sm" ta="center">
                Select hops above to compare their aroma profiles
              </Text>
              <Text c="dimmed" size="xs" ta="center">
                Up to 5 hops can be compared at once
              </Text>
            </Stack>
          </Box>
        )}
      </Collapse>
    </Paper>
  );
};

export default React.memo(SpiderChart);
