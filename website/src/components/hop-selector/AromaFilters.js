import { 
  Text, 
  Group, 
  Button, 
  Tooltip,
} from '@mantine/core';
import { IconHelp } from '@tabler/icons-react';

const AromaFilters = ({ 
  availableAromaCategories, 
  aromaStates, 
  handleAromaClick 
}) => {
  return (
    <>
      <Group gap="xs" mb="xs">
        <Text size="sm" fw={500}>
          Filter by Aroma Categories:
        </Text>
        <Tooltip 
          label="Green filters show hops with the aroma in top 3, while Red filters show hops with the aroma in bottom 3 (including 0 intensity). Sorting intelligently balances both priorities: when green differences are large (>1.5), green takes precedence; when red differences are significant (>1.0) and green differences are small, red takes precedence; otherwise uses weighted scoring. Click chips to cycle through: Unselected → Green (sort by highest intensity) → Red (sort by lowest intensity) → Unselected"
          multiline
          w={300}
          withArrow
        >
          <IconHelp size="1rem" style={{ cursor: 'help', color: 'var(--mantine-color-dimmed)' }} />
        </Tooltip>
      </Group>
      
      <Group gap="xs">
        {availableAromaCategories.map((aroma) => {
          const currentState = aromaStates[aroma] || 'none';
          
          return (
            <Button
              key={aroma}
              size="sm"
              variant={currentState === 'none' ? 'light' : 'filled'}
              color={currentState === 'high' ? 'green' : currentState === 'low' ? 'red' : 'gray'}
              onClick={() => handleAromaClick(aroma)}
              style={{
                borderWidth: 2,
                borderStyle: 'solid',
                borderColor: currentState === 'high' ? 'var(--mantine-color-green-5)' : 
                           currentState === 'low' ? 'var(--mantine-color-red-5)' : 
                           'var(--mantine-color-gray-4)'
              }}
            >
              {aroma}
              {currentState === 'high' && ' ↑'}
              {currentState === 'low' && ' ↓'}
            </Button>
          );
        })}
      </Group>
    </>
  );
};

export default AromaFilters;
