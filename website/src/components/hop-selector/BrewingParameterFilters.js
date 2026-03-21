import {
  Text,
  Group,
  Tooltip,
  Stack,
  Box,
  RangeSlider,
  Collapse,
  UnstyledButton,
  useMantineColorScheme,
} from '@mantine/core';
import { IconFlask, IconHelp } from '@tabler/icons-react';
import {
  ALPHA_THRESHOLDS,
  COHUMULONE_THRESHOLDS,
  OIL_THRESHOLDS
} from './constants';

const FilterChip = ({ label, active, color, onClick }) => {
  const { colorScheme } = useMantineColorScheme();
  const isDark = colorScheme === 'dark';

  const colorVars = {
    red:    { bg: isDark ? 'rgba(250,82,82,0.2)' : 'rgba(250,82,82,0.1)', border: 'var(--mantine-color-red-5)', text: 'var(--mantine-color-red-7)' },
    orange: { bg: isDark ? 'rgba(255,107,0,0.2)' : 'rgba(255,107,0,0.1)', border: 'var(--mantine-color-orange-5)', text: 'var(--mantine-color-orange-7)' },
    yellow: { bg: isDark ? 'rgba(250,176,5,0.2)' : 'rgba(250,176,5,0.1)', border: 'var(--mantine-color-yellow-5)', text: 'var(--mantine-color-yellow-8)' },
    blue:   { bg: isDark ? 'rgba(34,139,230,0.2)' : 'rgba(34,139,230,0.1)', border: 'var(--mantine-color-blue-5)', text: 'var(--mantine-color-blue-7)' },
    teal:   { bg: isDark ? 'rgba(18,184,134,0.2)' : 'rgba(18,184,134,0.1)', border: 'var(--mantine-color-teal-5)', text: 'var(--mantine-color-teal-7)' },
    green:  { bg: isDark ? 'rgba(46,168,46,0.2)' : 'rgba(46,168,46,0.1)', border: 'var(--mantine-color-green-5)', text: 'var(--mantine-color-green-7)' },
    violet: { bg: isDark ? 'rgba(132,94,194,0.2)' : 'rgba(132,94,194,0.1)', border: 'var(--mantine-color-violet-5)', text: 'var(--mantine-color-violet-7)' },
    grape:  { bg: isDark ? 'rgba(190,75,219,0.2)' : 'rgba(190,75,219,0.1)', border: 'var(--mantine-color-grape-5)', text: 'var(--mantine-color-grape-7)' },
    cyan:   { bg: isDark ? 'rgba(21,170,191,0.2)' : 'rgba(21,170,191,0.1)', border: 'var(--mantine-color-cyan-5)', text: 'var(--mantine-color-cyan-7)' },
    indigo: { bg: isDark ? 'rgba(76,110,245,0.2)' : 'rgba(76,110,245,0.1)', border: 'var(--mantine-color-indigo-5)', text: 'var(--mantine-color-indigo-7)' },
    gray:   { bg: isDark ? 'var(--mantine-color-dark-5)' : 'var(--mantine-color-gray-1)', border: isDark ? 'var(--mantine-color-dark-3)' : 'var(--mantine-color-gray-4)', text: 'inherit' },
  };

  const c = colorVars[color] || colorVars.gray;
  const inactiveBg = isDark ? 'var(--mantine-color-dark-5)' : 'var(--mantine-color-gray-1)';
  const inactiveBorder = isDark ? 'var(--mantine-color-dark-3)' : 'var(--mantine-color-gray-3)';

  return (
    <UnstyledButton
      onClick={onClick}
      style={{
        padding: '5px 10px',
        borderRadius: 8,
        background: active ? c.bg : inactiveBg,
        border: `1.5px solid ${active ? c.border : inactiveBorder}`,
        color: active ? c.text : 'inherit',
        fontFamily: 'Inter, sans-serif',
        fontSize: 13,
        fontWeight: active ? 600 : 400,
        transition: 'all 0.15s ease',
        cursor: 'pointer',
        userSelect: 'none',
        whiteSpace: 'nowrap',
      }}
    >
      {label}{active && ' ✓'}
    </UnstyledButton>
  );
};

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
  const getAlphaChipInfo = () => {
    switch (alphaThreshold) {
      case 'SUPER_ALPHA': return { label: `Super-Alpha ≥${ALPHA_THRESHOLDS.SUPER_ALPHA}%`, color: 'red' };
      case 'HIGH':        return { label: `High ${ALPHA_THRESHOLDS.HIGH}–${ALPHA_THRESHOLDS.SUPER_ALPHA - 0.1}%`, color: 'orange' };
      case 'MEDIUM':      return { label: `Medium ${ALPHA_THRESHOLDS.MEDIUM}–${ALPHA_THRESHOLDS.HIGH - 0.1}%`, color: 'yellow' };
      case 'LOW':         return { label: `Low ${ALPHA_THRESHOLDS.VERY_LOW}–${ALPHA_THRESHOLDS.MEDIUM - 0.1}%`, color: 'blue' };
      case 'VERY_LOW':    return { label: `Very Low <${ALPHA_THRESHOLDS.VERY_LOW}%`, color: 'teal' };
      default:            return { label: 'Alpha Acids', color: 'gray' };
    }
  };

  const getCohumuloneChipInfo = () => {
    switch (cohumuloneThreshold) {
      case 'HIGH':     return { label: `High IBU ≥${COHUMULONE_THRESHOLDS.HIGH}%`, color: 'yellow' };
      case 'STANDARD': return { label: `Standard ${COHUMULONE_THRESHOLDS.LOW}–${COHUMULONE_THRESHOLDS.HIGH - 0.1}%`, color: 'green' };
      case 'LOW':      return { label: `Low IBU <${COHUMULONE_THRESHOLDS.LOW}%`, color: 'blue' };
      default:         return { label: 'Cohumulone', color: 'gray' };
    }
  };

  const getOilChipInfo = () => {
    switch (oilThreshold) {
      case 'VERY_HIGH': return { label: `Very High ≥${OIL_THRESHOLDS.VERY_HIGH}`, color: 'grape' };
      case 'HIGH':      return { label: `High ${OIL_THRESHOLDS.HIGH}–${OIL_THRESHOLDS.VERY_HIGH - 0.1}`, color: 'violet' };
      case 'MEDIUM':    return { label: `Medium ${OIL_THRESHOLDS.MEDIUM}–${OIL_THRESHOLDS.HIGH - 0.1}`, color: 'blue' };
      case 'LOW':       return { label: `Low ${OIL_THRESHOLDS.LOW}–${OIL_THRESHOLDS.MEDIUM - 0.1}`, color: 'cyan' };
      case 'VERY_LOW':  return { label: `Very Low <${OIL_THRESHOLDS.LOW}`, color: 'gray' };
      default:          return { label: 'Oil Content', color: 'gray' };
    }
  };

  const alphaInfo = getAlphaChipInfo();
  const cohInfo = getCohumuloneChipInfo();
  const oilInfo = getOilChipInfo();

  return (
    <>
      <Group gap="xs" mb="sm" align="center">
        <IconFlask size={14} style={{ color: 'var(--mantine-color-orange-5)', flexShrink: 0 }} />
        <Text size="sm" fw={600} style={{ fontFamily: 'Space Grotesk, Inter, sans-serif' }}>
          Brewing Parameters
        </Text>
        <Tooltip
          label="Click chips to cycle through preset ranges. Each click advances to the next category, then resets."
          multiline
          w={260}
          withArrow
        >
          <IconHelp size={14} style={{ cursor: 'help', color: 'var(--mantine-color-dimmed)' }} />
        </Tooltip>
      </Group>

      <Group gap="xs" wrap="wrap">
        <FilterChip
          label={alphaInfo.label}
          active={!!alphaThreshold}
          color={alphaInfo.color}
          onClick={cycleAlphaThreshold}
        />
        <FilterChip
          label={cohInfo.label}
          active={!!cohumuloneThreshold}
          color={cohInfo.color}
          onClick={cycleCohumuloneThreshold}
        />
        <FilterChip
          label={oilInfo.label}
          active={!!oilThreshold}
          color={oilInfo.color}
          onClick={cycleOilThreshold}
        />
        <FilterChip
          label="Custom Ranges"
          active={showCustomRanges}
          color="indigo"
          onClick={() => setShowCustomRanges(!showCustomRanges)}
        />
      </Group>

      <Collapse in={showCustomRanges}>
        <Stack gap="md" mt="lg" px="xs">
          <Box>
            <Text size="xs" fw={600} mb="xs" c="dimmed">
              Alpha Acids: {alphaRange[0]}% – {alphaRange[1]}%
            </Text>
            <Box mb="xl">
              <RangeSlider
                size="xs"
                color="orange"
                min={0}
                max={25}
                step={0.5}
                value={alphaRange}
                onChange={(value) => {
                  setAlphaRange([Math.round(value[0] * 2) / 2, Math.round(value[1] * 2) / 2]);
                  setAlphaThreshold('');
                  setUseAlphaFilter(true);
                }}
                marks={[
                  { value: ALPHA_THRESHOLDS.VERY_LOW, label: `${ALPHA_THRESHOLDS.VERY_LOW}%` },
                  { value: ALPHA_THRESHOLDS.MEDIUM,   label: `${ALPHA_THRESHOLDS.MEDIUM}%` },
                  { value: ALPHA_THRESHOLDS.HIGH,     label: `${ALPHA_THRESHOLDS.HIGH}%` },
                  { value: ALPHA_THRESHOLDS.SUPER_ALPHA, label: `${ALPHA_THRESHOLDS.SUPER_ALPHA}%` },
                ]}
              />
            </Box>
          </Box>

          <Box>
            <Text size="xs" fw={600} mb="xs" c="dimmed">
              Cohumulone: {cohumuloneRange[0]}% – {cohumuloneRange[1]}%
            </Text>
            <Box mb="xl">
              <RangeSlider
                size="xs"
                color="yellow"
                min={0}
                max={50}
                step={1}
                value={cohumuloneRange}
                onChange={(value) => {
                  setCohumuloneRange([Math.round(value[0]), Math.round(value[1])]);
                  setCohumuloneThreshold('');
                  setUseCohumuloneFilter(true);
                }}
                marks={[
                  { value: COHUMULONE_THRESHOLDS.LOW,  label: `${COHUMULONE_THRESHOLDS.LOW}%` },
                  { value: COHUMULONE_THRESHOLDS.HIGH, label: `${COHUMULONE_THRESHOLDS.HIGH}%` },
                ]}
              />
            </Box>
          </Box>

          <Box>
            <Text size="xs" fw={600} mb="xs" c="dimmed">
              Oil Content: {oilRange[0]} – {oilRange[1]} ml/100g
            </Text>
            <Box mb="xl">
              <RangeSlider
                size="xs"
                color="violet"
                min={0}
                max={4}
                step={0.1}
                value={oilRange}
                onChange={(value) => {
                  setOilRange([Math.round(value[0] * 10) / 10, Math.round(value[1] * 10) / 10]);
                  setOilThreshold('');
                  setUseOilFilter(true);
                }}
                marks={[
                  { value: OIL_THRESHOLDS.LOW,       label: `${OIL_THRESHOLDS.LOW}` },
                  { value: OIL_THRESHOLDS.MEDIUM,    label: `${OIL_THRESHOLDS.MEDIUM}` },
                  { value: OIL_THRESHOLDS.HIGH,      label: `${OIL_THRESHOLDS.HIGH}` },
                  { value: OIL_THRESHOLDS.VERY_HIGH, label: `${OIL_THRESHOLDS.VERY_HIGH}` },
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
