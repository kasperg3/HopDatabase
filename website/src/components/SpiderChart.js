import React, { useRef, useState } from 'react';
import { Paper, Title, Text, Box, Grid, Card, Group, ThemeIcon, useMantineColorScheme, Collapse, Button } from '@mantine/core';
import {
  IconChartBar,
  IconDroplet,
  IconShieldCheck,
  IconChevronDown,
  IconChevronUp,
} from '@tabler/icons-react';
import Plot from 'react-plotly.js';
import { getAverageValue } from '../utils/hopUtils';

const SpiderChart = ({ hopData }) => {
  const chartRef = useRef();
  const { colorScheme } = useMantineColorScheme();
  const [isExpanded, setIsExpanded] = useState(true);

  // Dynamic sizing helper
  const getResponsiveValue = (mobileValue, desktopValue) => {
    return window.innerWidth <= 768 ? mobileValue : desktopValue;
  };

  // Define consistent aroma categories mapping
  const aromaCategories = [
    'Citrus', 'Resin/Pine', 'Spice', 'Herbal', 
    'Grassy', 'Floral', 'Berry', 'Stone Fruit', 'Tropical Fruit'
  ];

  const colors = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', 
    '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE'
  ];

  // Calculate overall statistics
  const calculateOverallStats = () => {
    if (!hopData || hopData.length === 0) {
      return {
        avgAlpha: 0,
        avgBeta: 0,
        avgOil: 0,
        avgCohumulone: 0,
      };
    }

    const stats = hopData.map(hop => ({
      avgAlpha: getAverageValue(hop.alpha_from, hop.alpha_to),
      avgBeta: getAverageValue(hop.beta_from, hop.beta_to),
      avgOil: getAverageValue(hop.oil_from, hop.oil_to),
      avgCohumulone: getAverageValue(hop.co_h_from, hop.co_h_to),
    }));

    return {
      avgAlpha: stats.reduce((sum, hop) => sum + hop.avgAlpha, 0) / stats.length,
      avgBeta: stats.reduce((sum, hop) => sum + hop.avgBeta, 0) / stats.length,
      avgOil: stats.reduce((sum, hop) => sum + hop.avgOil, 0) / stats.length,
      avgCohumulone: stats.filter(hop => hop.avgCohumulone > 0).reduce((sum, hop) => sum + hop.avgCohumulone, 0) / (stats.filter(hop => hop.avgCohumulone > 0).length || 1),
    };
  };

  const overallStats = calculateOverallStats();

  // StatCard component
  const StatCard = ({ icon, color, label, value, unit }) => (
    <Grid.Col span={{ base: 6, sm: 3 }}>
      <Card withBorder p={{ base: "xs", sm: "sm" }}>
        <Group wrap="nowrap" gap="xs">
          <ThemeIcon color={color} variant="light" size={{ base: "md", sm: "lg" }} radius="md">
            {icon}
          </ThemeIcon>
          <div>
            <Text size="xs" fw={700} c="dimmed">
              {label}
            </Text>
            <Text fw={700} size={{ base: "md", sm: "lg" }}>
              {value}
              {unit && <Text span size="xs" c="dimmed" ml={4}>{unit}</Text>}
            </Text>
          </div>
        </Group>
      </Card>
    </Grid.Col>
  );

  const createSpiderChartData = () => {
    if (!hopData || hopData.length === 0) {
      // Return empty trace to show grid structure
      return [{
        type: 'scatterpolar',
        mode: 'lines',
        r: new Array(aromaCategories.length + 1).fill(0), // +1 to close the shape
        theta: [...aromaCategories, aromaCategories[0]], // Close the shape
        fill: 'none',
        line: { color: 'rgba(0,0,0,0)', width: 0 },
        showlegend: false,
        hoverinfo: 'skip'
      }];
    }

    return hopData.map((hop, index) => {
      // Extract aroma values for each category
      const aromaValues = aromaCategories.map(category => {
        const value = hop.aromas && hop.aromas[category] ? hop.aromas[category] : 0;
        // Ensure value is a number and within 0-5 range
        const numValue = typeof value === 'string' ? parseInt(value) || 0 : value || 0;
        return Math.min(Math.max(numValue, 0), 5);
      });

      const color = colors[index % colors.length];
      
      // Convert hex to rgba for fill color with higher opacity
      const r = parseInt(color.slice(1,3), 16);
      const g = parseInt(color.slice(3,5), 16);
      const b = parseInt(color.slice(5,7), 16);
      const fillColor = `rgba(${r}, ${g}, ${b}, 0.4)`;

      return {
        type: 'scatterpolar',
        mode: 'lines+markers',
        r: [...aromaValues, aromaValues[0]], // Close the shape by repeating first value
        theta: [...aromaCategories, aromaCategories[0]], // Close the shape by repeating first category
        fill: 'toself',
        fillcolor: fillColor,
        name: hop.name,
        line: {
          color: color,
          width: 2
        },
        marker: {
          color: color,
          size: 6,
          line: {
            color: 'white',
            width: 1
          }
        },
        hovertemplate: `<b>${hop.name}</b><br>%{theta}: %{r}/5<extra></extra>`
      };
    });
  };

  const layout = {
    polar: {
      bgcolor: 'rgba(0,0,0,0)', // Make polar plot background transparent
      radialaxis: {
        visible: true,
        range: [-1, 5],
        showline: false,
        showgrid: true,
        gridcolor: colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.2)' : 'rgba(128, 128, 128, 0.3)',
        showticklabels: false,
        ticks: ''
      },
      angularaxis: {
        showline: false,
        gridcolor: colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.2)' : 'rgba(128, 128, 128, 0.3)',
        tickfont: { 
          size: getResponsiveValue(9, 12), 
          color: colorScheme === 'dark' ? '#C1C2C5' : '#666' 
        },
        rotation: 90,
        direction: 'clockwise'
      }
    },
    showlegend: true,
    legend: {
      orientation: 'h',
      yanchor: 'bottom',
      y: getResponsiveValue(-0.25, -0.15),
      xanchor: 'center',
      x: 0.5,
      font: {
        color: colorScheme === 'dark' ? '#C1C2C5' : '#333',
        size: getResponsiveValue(10, 12)
      }
    },
    font: { 
      size: getResponsiveValue(10, 12),
      color: colorScheme === 'dark' ? '#C1C2C5' : '#333'
    },
    paper_bgcolor: 'rgba(0,0,0,0)',
    plot_bgcolor: 'rgba(0,0,0,0)',
    margin: { t: 20, b: getResponsiveValue(80, 100), l: 20, r: 20 },
    autosize: true,
    dragmode: false,
    scrollZoom: false,
    doubleClick: false
  };

  const config = {
    responsive: true,
    displayModeBar: false,
    staticPlot: false,
    scrollZoom: false,
    doubleClick: false,
    showTips: false,
    showAxisDragHandles: false,
    showAxisRangeEntryBoxes: false,
    modeBarButtonsToRemove: ['zoom2d', 'pan2d', 'select2d', 'lasso2d', 'zoomIn2d', 'zoomOut2d', 'autoScale2d', 'resetScale2d']
  };

  return (
    <Paper shadow="sm" p={{ base: "md", sm: "lg" }}>
      <Group justify="space-between" align="center" mb="md">
        <Title order={4}>
          Aroma Profile Comparison
        </Title>
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
      {hopData && hopData.length > 0 ? (
        <Box style={{ height: getResponsiveValue(350, 500) }}>
          <Plot
            ref={chartRef}
            data={createSpiderChartData()}
            layout={layout}
            config={config}
            style={{ width: '100%', height: '100%' }}
            useResizeHandler={true}
          />
        </Box>
      ) : (
        <Box 
          style={{ 
            height: getResponsiveValue(300, 400), 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            borderRadius: 8
          }}
          bg={colorScheme === 'dark' ? 'dark.5' : 'gray.1'}
        >
          <Text c="dimmed" size={{ base: "sm", sm: "md" }}>
            Select hops to see their aroma profile comparison
          </Text>
        </Box>
      )}

      {hopData && hopData.length > 0 && (
        <Box mt="lg">
          <Grid>
            <StatCard 
              icon={<IconChartBar size={getResponsiveValue("1.2rem", "1.4rem")} />} 
              color="orange" 
              label="Avg α" 
              value={overallStats.avgAlpha.toFixed(1)} 
              unit="%" 
            />
            <StatCard 
              icon={<IconChartBar size={getResponsiveValue("1.2rem", "1.4rem")} />} 
              color="blue" 
              label="Avg β" 
              value={overallStats.avgBeta.toFixed(1)} 
              unit="%" 
            />
            <StatCard 
              icon={<IconDroplet size={getResponsiveValue("1.2rem", "1.4rem")} />} 
              color="teal" 
              label="Avg Oil" 
              value={overallStats.avgOil.toFixed(1)} 
              unit="ml/100g" 
            />
            <StatCard 
              icon={<IconShieldCheck size={getResponsiveValue("1.2rem", "1.4rem")} />} 
              color="red" 
              label="Avg Coh." 
              value={overallStats.avgCohumulone.toFixed(1)} 
              unit="%" 
            />
          </Grid>

        </Box>
      )}
      </Collapse>

      
    </Paper>
  );
};

export default React.memo(SpiderChart);
