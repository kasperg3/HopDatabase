import { lazy, Suspense } from 'react';
import { Paper, Loader, Center, Box, Text } from '@mantine/core';

// Lazy load the SpiderChart component with preload capability
const SpiderChart = lazy(() => 
  import(/* webpackChunkName: "spider-chart" */ './SpiderChart')
);

// Preload function to prefetch the component
export const preloadSpiderChart = () => {
  import(/* webpackChunkName: "spider-chart" */ './SpiderChart');
};

const LazySpiderChart = ({ hopData }) => {
  return (
    <Suspense 
      fallback={
        <Paper shadow="sm" p="lg">
          <Center style={{ height: 200 }}>
            <Box ta="center">
              <Loader size="md" />
              <Text size="sm" c="dimmed" mt="sm">Loading Chart...</Text>
            </Box>
          </Center>
        </Paper>
      }
    >
      <SpiderChart hopData={hopData} />
    </Suspense>
  );
};

export default LazySpiderChart;
