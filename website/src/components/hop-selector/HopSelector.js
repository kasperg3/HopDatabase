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
} from '@mantine/core';
import {
  IconX,
  IconChevronDown,
  IconChevronUp,
} from '@tabler/icons-react';

// Import subcomponents
import AromaFilters from './AromaFilters';
import BrewingParameterFilters from './BrewingParameterFilters';
import QuickStylePresets from './QuickStylePresets';
import StylePresetsModal from './StylePresetsModal';
import FilterSummary from './FilterSummary';

// Import hooks and utilities
import { useHopFilteringWithContext } from '../../hooks/useHopFilteringWithContext';
import { getAllAromaCombinations, getPopularPresets } from './presets';

const HopSelector = ({ 
  hopData, 
  selectedHops, 
  onHopSelection
}) => {
  // UI state
  const [filtersExpanded, setFiltersExpanded] = useState(false);
  const [presetsModalOpen, setPresetsModalOpen] = useState(false);
  
  // Use the context-aware filtering hook
  const {
    // State
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
    
    // Setters
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
    
    // Computed values
    uniqueHops,
    filteredHops,
    availableAromaCategories,
    
    // Helper functions
    getSelectedAromasHigh,
    getSelectedAromasLow,
    getAllSelectedAromas,
    handleAromaClick,
    cycleAlphaThreshold,
    cycleCohumuloneThreshold,
    cycleOilThreshold,
    clearAllFilters,
  } = useHopFilteringWithContext(hopData);

  // Helper function to apply a preset combination
  const applyPreset = (preset) => {
    const newAromaStates = {};
    if (preset.type === 'mixed') {
      preset.aromasHigh?.forEach(aroma => {
        newAromaStates[aroma] = 'high';
      });
      preset.aromasLow?.forEach(aroma => {
        newAromaStates[aroma] = 'low';
      });
    } else {
      preset.aromas.forEach(aroma => {
        newAromaStates[aroma] = preset.type === 'low' ? 'low' : 'high';
      });
    }
    setAromaStates(newAromaStates);
  };

  return (
    <Paper shadow="sm" p="lg">
      {/* Search and Filter Section */}
      <Box mb="md">
        <Group justify="space-between" mb="md">
          <Title order={4}>Hop Selection & Filtering</Title>
          <Button
            variant="subtle"
            size="sm"
            leftSection={filtersExpanded ? <IconChevronUp size="1rem" /> : <IconChevronDown size="1rem" />}
            onClick={() => setFiltersExpanded(!filtersExpanded)}
          >
            {filtersExpanded ? 'Hide' : 'Show'} Filters
          </Button>
        </Group>

        <Collapse in={filtersExpanded}>
          <Stack gap="md" mb="md">
            {/* Quick Style Presets */}
            <Box>
              <QuickStylePresets 
                getPopularPresets={getPopularPresets}
                applyPreset={applyPreset}
                setPresetsModalOpen={setPresetsModalOpen}
              />
            </Box>

            {/* Aroma Categories Filter */}
            <Box>
              <AromaFilters 
                availableAromaCategories={availableAromaCategories}
                aromaStates={aromaStates}
                handleAromaClick={handleAromaClick}
              />
            </Box>

            {/* Brewing Parameters Filter */}
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

            {/* Clear All Filters Button */}
            {(getAllSelectedAromas().length > 0 || useAlphaFilter || useCohumuloneFilter || useOilFilter || showCustomRanges) && (
              <Group justify="center" mt="md">
                <Button
                  variant="light"
                  color="red"
                  size="sm"
                  leftSection={<IconX size="0.8rem" />}
                  onClick={clearAllFilters}
                >
                  Clear all filters
                </Button>
              </Group>
            )}

            {/* Filter Results Summary */}
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
          </Stack>
        </Collapse>

        {/* Hop Selection MultiSelect */}
        <MultiSelect
          placeholder="Search and choose hops..."
          value={selectedHops}
          searchable
          clearable
          maxValues={5}
          data={filteredHops.map((hop) => ({
            value: hop.uniqueId,
            label: hop.name
          }))}
          onChange={onHopSelection}
          mb="md"
        />
      </Box>

      {/* Browse All Combinations Modal */}
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
