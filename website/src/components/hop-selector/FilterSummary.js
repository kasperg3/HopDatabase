import { Box, Text, useMantineColorScheme } from '@mantine/core';

const FilterSummary = ({ 
  availableHops, 
  uniqueHops, 
  getSelectedAromasHigh, 
  getSelectedAromasLow, 
  getAllSelectedAromas, 
  useAlphaFilter, 
  useCohumuloneFilter, 
  useOilFilter, 
  alphaRange, 
  cohumuloneRange, 
  oilRange 
}) => {
  const { colorScheme } = useMantineColorScheme();

  return (
    <Box p="sm" style={{ borderRadius: 6 }} bg={colorScheme === 'dark' ? 'dark.5' : 'gray.1'}>
      <Text size="sm" fw={500}>
        Showing {availableHops.length} of {uniqueHops.length} hops
        {(getAllSelectedAromas().length > 0 || useAlphaFilter || useCohumuloneFilter || useOilFilter) && (
          <Text component="span" c="dimmed" size="sm">
            {' '}• filtered by: 
            {getAllSelectedAromas().length > 0 && (
              <>
                {getSelectedAromasHigh().length > 0 && (
                  <Text component="span" c="green" size="sm">
                    {' '}HIGH: {getSelectedAromasHigh().join(', ')} (in top 3)
                  </Text>
                )}
                {getSelectedAromasLow().length > 0 && (
                  <Text component="span" c="red" size="sm">
                    {getSelectedAromasHigh().length > 0 ? ' | ' : ' '}LOW: {getSelectedAromasLow().join(', ')} (in bottom 3, including 0)
                  </Text>
                )}
              </>
            )}
            {(useAlphaFilter || useCohumuloneFilter || useOilFilter) && (
              <Text component="span" c="orange" size="sm">
                {getAllSelectedAromas().length > 0 ? ' | ' : ' '}
                {useAlphaFilter && `Alpha: ${alphaRange[0]}-${alphaRange[1]}%`}
                {useCohumuloneFilter && (useAlphaFilter ? ', ' : '') + `Cohumulone: ${cohumuloneRange[0]}-${cohumuloneRange[1]}%`}
                {useOilFilter && ((useAlphaFilter || useCohumuloneFilter) ? ', ' : '') + `Oil: ${oilRange[0]}-${oilRange[1]} ml/100g`}
              </Text>
            )}
          </Text>
        )}
      </Text>
    </Box>
  );
};

export default FilterSummary;
