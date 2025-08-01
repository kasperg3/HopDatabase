import { 
  Text, 
  Group, 
  Button, 
  ThemeIcon, 
  Tooltip,
  Stack,
  Box,
  RangeSlider,
  Collapse,
} from '@mantine/core';
import { IconFlask, IconHelp } from '@tabler/icons-react';
import { 
  ALPHA_THRESHOLDS, 
  COHUMULONE_THRESHOLDS, 
  OIL_THRESHOLDS
} from './constants';

const BrewingParameterFilters = ({
  alphaThreshold,
  cohumuloneThreshold,
  oilThreshold,
  alphaRange,
  cohumuloneRange,
  oilRange,
  showCustomRanges,
  setShowCustomRanges,
  cycleAlphaThreshold,
  cycleCohumuloneThreshold,
  cycleOilThreshold,
  setAlphaRange,
  setCohumuloneRange,
  setOilRange,
  setAlphaThreshold,
  setCohumuloneThreshold,
  setOilThreshold,
  setUseAlphaFilter,
  setUseCohumuloneFilter,
  setUseOilFilter,
}) => {
  // Helper functions to get chip display info
  const getAlphaChipInfo = () => {
    switch (alphaThreshold) {
      case 'SUPER_ALPHA':
        return { label: `Super-Alpha (≥${ALPHA_THRESHOLDS.SUPER_ALPHA}%)`, color: 'red' };
      case 'HIGH':
        return { label: `High (${ALPHA_THRESHOLDS.HIGH}-${ALPHA_THRESHOLDS.SUPER_ALPHA - 0.1}%)`, color: 'orange' };
      case 'MEDIUM':
        return { label: `Medium (${ALPHA_THRESHOLDS.MEDIUM}-${ALPHA_THRESHOLDS.HIGH - 0.1}%)`, color: 'yellow' };
      case 'LOW':
        return { label: `Low (${ALPHA_THRESHOLDS.VERY_LOW}-${ALPHA_THRESHOLDS.MEDIUM - 0.1}%)`, color: 'blue' };
      case 'VERY_LOW':
        return { label: `Very Low (<${ALPHA_THRESHOLDS.VERY_LOW}%)`, color: 'teal' };
      default:
        return { label: 'Alpha Acids', color: 'gray' };
    }
  };

  const getCohumuloneChipInfo = () => {
    switch (cohumuloneThreshold) {
      case 'HIGH':
        return { label: `High IBU (≥${COHUMULONE_THRESHOLDS.HIGH}%)`, color: 'yellow' };
      case 'STANDARD':
        return { label: `Standard (${COHUMULONE_THRESHOLDS.LOW}-${COHUMULONE_THRESHOLDS.HIGH - 0.1}%)`, color: 'green' };
      case 'LOW':
        return { label: `Low IBU (<${COHUMULONE_THRESHOLDS.LOW}%)`, color: 'blue' };
      default:
        return { label: 'Cohumulone', color: 'gray' };
    }
  };

  const getOilChipInfo = () => {
    switch (oilThreshold) {
      case 'VERY_HIGH':
        return { label: `Very High (≥${OIL_THRESHOLDS.VERY_HIGH})`, color: 'grape' };
      case 'HIGH':
        return { label: `High (${OIL_THRESHOLDS.HIGH}-${OIL_THRESHOLDS.VERY_HIGH - 0.1})`, color: 'violet' };
      case 'MEDIUM':
        return { label: `Medium (${OIL_THRESHOLDS.MEDIUM}-${OIL_THRESHOLDS.HIGH - 0.1})`, color: 'blue' };
      case 'LOW':
        return { label: `Low (${OIL_THRESHOLDS.LOW}-${OIL_THRESHOLDS.MEDIUM - 0.1})`, color: 'cyan' };
      case 'VERY_LOW':
        return { label: `Very Low (<${OIL_THRESHOLDS.LOW})`, color: 'gray' };
      default:
        return { label: 'Oil Content', color: 'gray' };
    }
  };

  return (
    <>
      <Group gap="xs" mb="xs">
        <ThemeIcon size="sm" variant="light" color="orange">
          <IconFlask size="0.8rem" />
        </ThemeIcon>
        <Text size="sm" fw={500}>
          Filter by Brewing Parameters:
        </Text>
        <Tooltip 
          label="Click chips to cycle through preset ranges based on brewing science thresholds. Each click advances to the next category, then back to 'off'."
          multiline
          w={300}
          withArrow
        >
          <IconHelp size="1rem" style={{ cursor: 'help', color: 'var(--mantine-color-dimmed)' }} />
        </Tooltip>
      </Group>
      
      <Group gap="xs" mb="md" wrap="wrap">
        {/* Alpha Acids Chip */}
        <Button
          size="sm"
          variant={alphaThreshold ? 'filled' : 'light'}
          color={getAlphaChipInfo().color}
          onClick={cycleAlphaThreshold}
          style={{
            borderWidth: 2,
            borderStyle: 'solid',
            borderColor: alphaThreshold ? `var(--mantine-color-${getAlphaChipInfo().color}-5)` : 'var(--mantine-color-gray-4)'
          }}
        >
          {getAlphaChipInfo().label}
          {alphaThreshold && ' ✓'}
        </Button>

        {/* Cohumulone Chip */}
        <Button
          size="sm"
          variant={cohumuloneThreshold ? 'filled' : 'light'}
          color={getCohumuloneChipInfo().color}
          onClick={cycleCohumuloneThreshold}
          style={{
            borderWidth: 2,
            borderStyle: 'solid',
            borderColor: cohumuloneThreshold ? `var(--mantine-color-${getCohumuloneChipInfo().color}-5)` : 'var(--mantine-color-gray-4)'
          }}
        >
          {getCohumuloneChipInfo().label}
          {cohumuloneThreshold && ' ✓'}
        </Button>

        {/* Oil Content Chip */}
        <Button
          size="sm"
          variant={oilThreshold ? 'filled' : 'light'}
          color={getOilChipInfo().color}
          onClick={cycleOilThreshold}
          style={{
            borderWidth: 2,
            borderStyle: 'solid',
            borderColor: oilThreshold ? `var(--mantine-color-${getOilChipInfo().color}-5)` : 'var(--mantine-color-gray-4)'
          }}
        >
          {getOilChipInfo().label}
          {oilThreshold && ' ✓'}
        </Button>

        {/* Custom Ranges Chip - Always visible */}
        <Button
          size="sm"
          variant={showCustomRanges ? 'filled' : 'light'}
          color="indigo"
          onClick={() => setShowCustomRanges(!showCustomRanges)}
          style={{
            borderWidth: 2,
            borderStyle: 'solid',
            borderColor: showCustomRanges ? 'var(--mantine-color-indigo-5)' : 'var(--mantine-color-gray-4)'
          }}
        >
          Custom Ranges
          {showCustomRanges && ' ✓'}
        </Button>
      </Group>

      {/* Custom Range Sliders (shown only when Custom Ranges chip is active) */}
      <Collapse in={showCustomRanges}>
        <Stack gap="md" mt="md">
          <Text size="xs" c="dimmed" fw={500}>Custom range adjustments:</Text>
          
          {/* Alpha Acids Range */}
          <Box>
            <Text size="xs" fw={500} mb="sm">
              Alpha Acids: {alphaRange[0]}% - {alphaRange[1]}%
              {alphaThreshold && (
                <Text component="span" c="dimmed" size="xs"> (preset: {getAlphaChipInfo().label})</Text>
              )}
            </Text>
            <Box mb="lg">
              <RangeSlider
                size="sm"
                min={0}
                max={25}
                step={0.5}
                value={alphaRange}
                onChange={(value) => {
                  setAlphaRange([Math.round(value[0] * 2) / 2, Math.round(value[1] * 2) / 2]);
                  setAlphaThreshold(''); // Clear threshold when manually adjusting
                  setUseAlphaFilter(true); // Enable filter when adjusting
                }}
                marks={[
                  { value: ALPHA_THRESHOLDS.VERY_LOW, label: `${ALPHA_THRESHOLDS.VERY_LOW}%` },
                  { value: ALPHA_THRESHOLDS.MEDIUM, label: `${ALPHA_THRESHOLDS.MEDIUM}%` },
                  { value: ALPHA_THRESHOLDS.HIGH, label: `${ALPHA_THRESHOLDS.HIGH}%` },
                  { value: ALPHA_THRESHOLDS.SUPER_ALPHA, label: `${ALPHA_THRESHOLDS.SUPER_ALPHA}%` }
                ]}
              />
            </Box>
          </Box>

          {/* Cohumulone Range */}
          <Box>
            <Text size="xs" fw={500} mb="sm">
              Cohumulone: {cohumuloneRange[0]}% - {cohumuloneRange[1]}%
              {cohumuloneThreshold && (
                <Text component="span" c="dimmed" size="xs"> (preset: {getCohumuloneChipInfo().label})</Text>
              )}
            </Text>
            <Box mb="lg">
              <RangeSlider
                size="sm"
                min={0}
                max={50}
                step={1}
                value={cohumuloneRange}
                onChange={(value) => {
                  setCohumuloneRange([Math.round(value[0]), Math.round(value[1])]);
                  setCohumuloneThreshold(''); // Clear threshold when manually adjusting
                  setUseCohumuloneFilter(true); // Enable filter when adjusting
                }}
                marks={[
                  { value: COHUMULONE_THRESHOLDS.LOW, label: `${COHUMULONE_THRESHOLDS.LOW}%` },
                  { value: COHUMULONE_THRESHOLDS.HIGH, label: `${COHUMULONE_THRESHOLDS.HIGH}%` }
                ]}
              />
            </Box>
          </Box>

          {/* Oil Content Range */}
          <Box>
            <Text size="xs" fw={500} mb="sm">
              Oil Content: {oilRange[0]} - {oilRange[1]} ml/100g
              {oilThreshold && (
                <Text component="span" c="dimmed" size="xs"> (preset: {getOilChipInfo().label})</Text>
              )}
            </Text>
            <Box mb="lg">
              <RangeSlider
                size="sm"
                min={0}
                max={4}
                step={0.1}
                value={oilRange}
                onChange={(value) => {
                  setOilRange([Math.round(value[0] * 10) / 10, Math.round(value[1] * 10) / 10]);
                  setOilThreshold(''); // Clear threshold when manually adjusting
                  setUseOilFilter(true); // Enable filter when adjusting
                }}
                marks={[
                  { value: OIL_THRESHOLDS.LOW, label: `${OIL_THRESHOLDS.LOW}` },
                  { value: OIL_THRESHOLDS.MEDIUM, label: `${OIL_THRESHOLDS.MEDIUM}` },
                  { value: OIL_THRESHOLDS.HIGH, label: `${OIL_THRESHOLDS.HIGH}` },
                  { value: OIL_THRESHOLDS.VERY_HIGH, label: `${OIL_THRESHOLDS.VERY_HIGH}` }
                ]}
              />
            </Box>
          </Box>
        </Stack>
      </Collapse>
    </>
  );
};

export default BrewingParameterFilters;
