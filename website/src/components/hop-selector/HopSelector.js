import { useState } from 'react';
import {
  Paper,
  Title,
  Box,
  MultiSelect,
  Stack,
  Group,
  Collapse,
  Button,
  Divider,
  useMantineColorScheme,
  Badge,
} from '@mantine/core';
import {
  IconX,
  IconChevronDown,
  IconChevronUp,
  IconFilter,
  IconSearch,
} from '@tabler/icons-react';

import AromaFilters from './AromaFilters';
import BrewingParameterFilters from './BrewingParameterFilters';
import QuickStylePresets from './QuickStylePresets';
import StylePresetsModal from './StylePresetsModal';
import FilterSummary from './FilterSummary';

import { useHopFilteringWithContext } from '../../hooks/useHopFilteringWithContext';
import { getAllAromaCombinations, getPopularPresets } from './presets';

const HopSelector = ({
  hopData,
  selectedHops,
  onHopSelection
}) => {
  const [filtersExpanded, setFiltersExpanded] = useState(false);
  const [presetsModalOpen, setPresetsModalOpen] = useState(false);
  const { colorScheme } = useMantineColorScheme();
  const isDark = colorScheme === 'dark';

  const {
    aromaStates,
    alphaRange,
    cohumuloneRange,
    oilRange,
    useAlphaFilter,
    useCohumuloneFilter,
    useOilFilter,
    alphaThreshold,
    cohumuloneThreshold,
    oilThreshold,
    showCustomRanges,
    setAlphaRange,
    setCohumuloneRange,
    setOilRange,
    setUseAlphaFilter,
    setUseCohumuloneFilter,
    setUseOilFilter,
    setAlphaThreshold,
    setCohumuloneThreshold,
    setOilThreshold,
    setShowCustomRanges,
    setAromaStates,
    uniqueHops,
    filteredHops,
    availableAromaCategories,
    getSelectedAromasHigh,
    getSelectedAromasLow,
    getAllSelectedAromas,
    handleAromaClick,
    cycleAlphaThreshold,
    cycleCohumuloneThreshold,
    cycleOilThreshold,
    clearAllFilters,
  } = useHopFilteringWithContext(hopData);

  const applyPreset = (preset) => {
    const newAromaStates = {};
    if (preset.type === 'mixed') {
      preset.aromasHigh?.forEach(aroma => { newAromaStates[aroma] = 'high'; });
      preset.aromasLow?.forEach(aroma => { newAromaStates[aroma] = 'low'; });
    } else {
      preset.aromas.forEach(aroma => {
        newAromaStates[aroma] = preset.type === 'low' ? 'low' : 'high';
      });
    }
    setAromaStates(newAromaStates);
  };

  const activeFilterCount =
    getAllSelectedAromas().length +
    (useAlphaFilter ? 1 : 0) +
    (useCohumuloneFilter ? 1 : 0) +
    (useOilFilter ? 1 : 0) +
    (showCustomRanges ? 1 : 0);

  const hasActiveFilters = activeFilterCount > 0;

  return (
    <Paper
      shadow="xs"
      p="lg"
      style={{
        background: isDark ? 'var(--mantine-color-dark-7)' : 'white',
        border: `1px solid ${isDark ? 'var(--mantine-color-dark-5)' : 'var(--mantine-color-gray-2)'}`,
      }}
    >
      {/* Search bar */}
      <Box mb={filtersExpanded ? 'md' : 0}>
        <Group gap="sm" mb="sm" align="center">
          <IconSearch size={16} style={{ color: 'var(--mantine-color-dimmed)', flexShrink: 0 }} />
          <Title order={5} style={{ fontFamily: 'Space Grotesk, Inter, sans-serif', flex: 1 }}>
            Find & Compare Hops
          </Title>
          <Button
            variant={filtersExpanded ? 'light' : 'subtle'}
            color={hasActiveFilters ? 'hop' : 'gray'}
            size="xs"
            radius="md"
            leftSection={<IconFilter size={13} />}
            rightSection={
              hasActiveFilters ? (
                <Badge size="xs" circle color="hop" variant="filled">
                  {activeFilterCount}
                </Badge>
              ) : filtersExpanded ? (
                <IconChevronUp size={12} />
              ) : (
                <IconChevronDown size={12} />
              )
            }
            onClick={() => setFiltersExpanded(!filtersExpanded)}
          >
            {filtersExpanded ? 'Hide Filters' : 'Filters'}
          </Button>
        </Group>

        <MultiSelect
          placeholder="Search and choose up to 5 hops to compare…"
          value={selectedHops}
          searchable
          clearable
          maxValues={5}
          data={filteredHops.map((hop) => ({
            value: hop.uniqueId,
            label: hop.name,
          }))}
          onChange={onHopSelection}
          size="md"
          leftSection={<IconSearch size={16} />}
          styles={{
            input: {
              fontWeight: 500,
            },
          }}
        />
      </Box>

      <Collapse in={filtersExpanded}>
        <Divider my="md" />

        <Stack gap="lg">
          <QuickStylePresets
            getPopularPresets={getPopularPresets}
            applyPreset={applyPreset}
            setPresetsModalOpen={setPresetsModalOpen}
          />

          <Box>
            <AromaFilters
              availableAromaCategories={availableAromaCategories}
              aromaStates={aromaStates}
              handleAromaClick={handleAromaClick}
            />
          </Box>

          <Box>
            <BrewingParameterFilters
              alphaThreshold={alphaThreshold}
              cohumuloneThreshold={cohumuloneThreshold}
              oilThreshold={oilThreshold}
              alphaRange={alphaRange}
              cohumuloneRange={cohumuloneRange}
              oilRange={oilRange}
              showCustomRanges={showCustomRanges}
              setShowCustomRanges={setShowCustomRanges}
              cycleAlphaThreshold={cycleAlphaThreshold}
              cycleCohumuloneThreshold={cycleCohumuloneThreshold}
              cycleOilThreshold={cycleOilThreshold}
              setAlphaRange={setAlphaRange}
              setCohumuloneRange={setCohumuloneRange}
              setOilRange={setOilRange}
              setAlphaThreshold={setAlphaThreshold}
              setCohumuloneThreshold={setCohumuloneThreshold}
              setOilThreshold={setOilThreshold}
              setUseAlphaFilter={setUseAlphaFilter}
              setUseCohumuloneFilter={setUseCohumuloneFilter}
              setUseOilFilter={setUseOilFilter}
            />
          </Box>

          <Group justify="space-between" align="center">
            <FilterSummary
              availableHops={filteredHops}
              uniqueHops={uniqueHops}
              getSelectedAromasHigh={getSelectedAromasHigh}
              getSelectedAromasLow={getSelectedAromasLow}
              getAllSelectedAromas={getAllSelectedAromas}
              useAlphaFilter={useAlphaFilter}
              useCohumuloneFilter={useCohumuloneFilter}
              useOilFilter={useOilFilter}
              alphaRange={alphaRange}
              cohumuloneRange={cohumuloneRange}
              oilRange={oilRange}
            />

            {hasActiveFilters && (
              <Button
                variant="subtle"
                color="red"
                size="xs"
                leftSection={<IconX size={12} />}
                onClick={clearAllFilters}
                style={{ flexShrink: 0 }}
              >
                Clear filters
              </Button>
            )}
          </Group>
        </Stack>
      </Collapse>

      <StylePresetsModal
        presetsModalOpen={presetsModalOpen}
        setPresetsModalOpen={setPresetsModalOpen}
        getAllAromaCombinations={getAllAromaCombinations}
        applyPreset={applyPreset}
      />
    </Paper>
  );
};

export default HopSelector;
