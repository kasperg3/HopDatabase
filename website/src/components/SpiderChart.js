import React, { useRef } from 'react';
import { Paper, Title, Text, Box } from '@mantine/core';
import Plot from 'react-plotly.js';

const SpiderChart = ({ hopData }) => {
  const chartRef = useRef();

  // Define consistent aroma categories mapping
  const aromaCategories = [
    'Citrus', 'Resin/Pine', 'Spice', 'Herbal', 
    'Grassy', 'Floral', 'Berry', 'Stone Fruit', 'Tropical Fruit'
  ];

  const colors = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', 
    '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE'
  ];

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
      radialaxis: {
        visible: true,
        range: [-1, 5],
        showline: false,
        showgrid: true,
        gridcolor: 'rgba(128, 128, 128, 0.3)',
        showticklabels: false,
        ticks: ''

      },
      angularaxis: {
        showline: false,
        gridcolor: 'rgba(128, 128, 128, 0.3)',
        tickfont: { size: 12, color: '#666' },
        rotation: 90,
        direction: 'clockwise'
      }
    },
    showlegend: true,
    legend: {
      orientation: 'h',
      yanchor: 'bottom',
      y: -0.15,
      xanchor: 'center',
      x: 0.5
    },
    title: {
      text: 'Hop Aroma Profile Comparison (0-5 Scale)',
      font: { size: 16, color: '#333' },
      y: 0.95
    },
    font: { size: 12 },
    paper_bgcolor: 'rgba(0,0,0,0)',
    plot_bgcolor: 'rgba(0,0,0,0)',
    margin: { t: 100, b: 100, l: 80, r: 80 },
    autosize: true
  };

  const config = {
    responsive: true,
    displayModeBar: false
  };

  return (
    <Paper shadow="sm" p="lg">
      <Title order={3} mb="md">
        Aroma Profile Comparison
      </Title>
      
      {hopData && hopData.length > 0 ? (
        <Box style={{ height: 500 }}>
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
            height: 400, 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            backgroundColor: '#f8f9fa',
            borderRadius: 8
          }}
        >
          <Text c="dimmed">
            Select hops to see their aroma profile comparison
          </Text>
        </Box>
      )}
    </Paper>
  );
};

export default SpiderChart;
