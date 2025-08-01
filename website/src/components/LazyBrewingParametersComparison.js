import { lazy, Suspense } from 'react';
import { Paper, Loader, Center, Box, Text } from '@mantine/core';

// Lazy load the BrewingParametersComparison component with preload capability
const BrewingParametersComparison = lazy(() => 
  import(/* webpackChunkName: "brewing-parameters" */ './brewing-parameters/BrewingParametersComparison')
);

// Preload function to prefetch the component
export const preloadBrewingParameters = () => {
  import(/* webpackChunkName: "brewing-parameters" */ './brewing-parameters/BrewingParametersComparison');
};

const LazyBrewingParametersComparison = ({ hopData }) => {
  return (
    <Suspense 
      fallback={
        <Paper shadow="sm" p="lg">
          <Center style={{ height: 200 }}>
            <Box ta="center">
              <Loader size="md" />
              <Text size="sm" c="dimmed" mt="sm">Loading Parameters...</Text>
            </Box>
          </Center>
        </Paper>
      }
    >
      <BrewingParametersComparison hopData={hopData} />
    </Suspense>
  );
};

export default LazyBrewingParametersComparison;
