import { Paper, Grid } from '@mantine/core';
import { processHopData } from '../../utils/hopUtils';
import ParametersRadarChart from './ParametersRadarChart';
import ParametersLegend from './ParametersLegend';
import { useRadarChartData } from './useRadarChartData';

const BrewingParametersComparison = ({ hopData }) => {
  // Process hop data with all analysis - do this first to avoid conditional hooks
  const processedHops = hopData && hopData.length > 0 ? processHopData(hopData) : [];
  
  // Generate radar chart data - call hook before any early returns
  const radarData = useRadarChartData(processedHops);

  if (!hopData || hopData.length === 0) {
    return null;
  }

  return (
    <Paper shadow="sm" p="lg">
      <Grid>
        {/* <Grid.Col span={{ base: 12, lg: 7 }}>
          <ParametersTable processedHops={processedHops} />
        </Grid.Col> */}
        <Grid.Col span={{ base: 12, lg: 5 }}>
          <ParametersRadarChart 
            radarData={radarData} 
            processedHops={processedHops} 
          />
        </Grid.Col>
      </Grid>

      <ParametersLegend />
    </Paper>
  );
};

export default BrewingParametersComparison;
