import {
  Group,
  ThemeIcon,
  Text,
  Button,
  Flex,
} from '@mantine/core';
import { IconBeer, IconBook } from '@tabler/icons-react';

const QuickStylePresets = ({ 
  getPopularPresets, 
  applyPreset, 
  setPresetsModalOpen 
}) => {
  return (
    <>
      <Group justify="space-between" mb="xs">
        <Group gap="xs">
          <ThemeIcon size="sm" variant="light" color="blue">
            <IconBeer size="0.8rem" />
          </ThemeIcon>
          <Text size="sm" fw={500}>Quick Style Presets:</Text>
        </Group>
        <Button
          size="xs"
          variant="subtle"
          leftSection={<IconBook size="0.8rem" />}
          onClick={() => setPresetsModalOpen(true)}
        >
          Browse All (37)
        </Button>
      </Group>
      
      <Flex gap="xs" wrap="wrap">
        {getPopularPresets().map((preset, index) => (
          <Button
            key={index}
            size="xs"
            variant="light"
            color="blue"
            onClick={() => applyPreset(preset)}
          >
            {preset.style}
          </Button>
        ))}
      </Flex>
    </>
  );
};

export default QuickStylePresets;
