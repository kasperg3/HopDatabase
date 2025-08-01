import { Box, Text } from '@mantine/core';

const ParametersLegend = () => {
  return (
    <Box mt="md">
      <Text size="xs" c="dimmed">
        <strong>Advanced Classifications:</strong> Based on modern hop chemistry research. 
        Super-Alpha (≥11% AA), High Alpha (8-11%), Noble/Aroma (≤3% AA + Low Oil), Modern Aroma (≤5% AA + High Oil).
        <br />
        <strong>Cohumulone Impact:</strong> High (&gt;34%) yields 15-25% more IBUs than predicted. Low (&lt;25%) may yield fewer IBUs.
        <br />
        <strong>β/α Ratio:</strong> Indicates storage stability. ≥0.8 = Stable, ≥0.9 = May develop pleasant aged character.
      </Text>
    </Box>
  );
};

export default ParametersLegend;
