import React from 'react';
import {
  Paper,
  Title,
  Text,
  Box,
  MultiSelect,
  Badge,
} from '@mantine/core';

const HopSelector = ({ 
  hopData, 
  selectedHops, 
  onHopSelection
}) => {
  // Create unique hop entries with combined name and source for uniqueness
  const uniqueHops = hopData.map(hop => ({
    ...hop,
    uniqueId: `${hop.name} (${hop.source})`,
    displayName: hop.name
  }));

  // Sort by display name for better UX
  const availableHops = uniqueHops.sort((a, b) => a.displayName.localeCompare(b.displayName));

  const getHopInfo = (hopUniqueId) => {
    return uniqueHops.find(hop => hop.uniqueId === hopUniqueId);
  };

  return (
    <Paper shadow="sm" p="lg">
      <Title order={3} mb="md">
        Select Hops
      </Title>
      
      <Box mb="md">
        <MultiSelect
          label="Hops"
          placeholder="Select up to 5 hops to compare..."
          value={selectedHops}
          searchable
          clearable
          maxValues={5}
          data={availableHops.map((hop) => ({
            value: hop.uniqueId,
            label: hop.uniqueId
          }))}
          onChange={onHopSelection}
          mb="md"
        />
      </Box>

      {selectedHops.length > 0 && (
        <Box>
          {selectedHops.map((hopName, index) => (
            <Box key={hopName} mb="md">
              {(() => {
                const hopInfo = getHopInfo(hopName);
                return hopInfo ? (
                  <Box p="md" style={{ backgroundColor: '#f8f9fa', borderRadius: 8 }}>
                    <Text fw={500} c="blue">
                      {hopInfo.displayName}
                    </Text>
                    <Text size="sm" c="dimmed">
                      Origin: {hopInfo.country} | Source: {hopInfo.source}
                    </Text>
                    <Text size="sm" c="dimmed">
                      Alpha Acid: {hopInfo.alpha_from}% - {hopInfo.alpha_to}%
                    </Text>
                    {hopInfo.notes && hopInfo.notes.length > 0 && (
                      <Box mt="sm">
                        {hopInfo.notes.slice(0, 3).map((note, i) => (
                          <Badge 
                            key={i} 
                            variant="light" 
                            size="sm" 
                            mr="xs" 
                            mb="xs"
                          >
                            {note}
                          </Badge>
                        ))}
                      </Box>
                    )}
                  </Box>
                ) : null;
              })()}
            </Box>
          ))}
        </Box>
      )}
    </Paper>
  );
};

export default HopSelector;
