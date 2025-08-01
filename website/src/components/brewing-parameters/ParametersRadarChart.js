import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Legend } from 'recharts';
import { Paper, Box } from '@mantine/core';
import { CHART_COLORS } from '../../utils/hopConstants';

const ParametersRadarChart = ({ radarData, processedHops }) => {
  return (
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
                stroke={CHART_COLORS[hop.index % CHART_COLORS.length]}
                fill={CHART_COLORS[hop.index % CHART_COLORS.length]}
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
};

export default ParametersRadarChart;
