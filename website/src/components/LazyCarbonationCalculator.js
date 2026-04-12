import { lazy, Suspense } from 'react';
import { Paper, Loader, Center, Box, Text } from '@mantine/core';

// Lazy load the CarbonationCalculator component with preload capability
const CarbonationCalculator = lazy(() =>
  import(/* webpackChunkName: "carbonation-calculator" */ './carbonation-calculator/CarbonationCalculator')
);

// Preload function to prefetch the component
export const preloadCarbonationCalculator = () => {
  import(/* webpackChunkName: "carbonation-calculator" */ './carbonation-calculator/CarbonationCalculator');
};

const LazyCarbonationCalculator = () => {
  return (
    <Suspense
      fallback={
        <Paper shadow="sm" p="lg" m="md">
          <Center style={{ height: 200 }}>
            <Box ta="center">
              <Loader size="md" />
              <Text size="sm" c="dimmed" mt="sm">Loading Calculator...</Text>
            </Box>
          </Center>
        </Paper>
      }
    >
      <CarbonationCalculator />
    </Suspense>
  );
};

export default LazyCarbonationCalculator;
