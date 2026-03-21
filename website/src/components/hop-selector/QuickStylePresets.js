import {
  Group,
  Text,
  Button,
  Flex,
  UnstyledButton,
  useMantineColorScheme,
} from '@mantine/core';
import { IconBook } from '@tabler/icons-react';


const QuickStylePresets = ({
  getPopularPresets,
  applyPreset,
  setPresetsModalOpen,
}) => {
  const { colorScheme } = useMantineColorScheme();
  const isDark = colorScheme === 'dark';

  return (
    <>
      <Group justify="space-between" mb="sm" align="center">
        <Text size="sm" fw={600} style={{ fontFamily: 'Space Grotesk, Inter, sans-serif' }}>
          Style Presets
        </Text>
        <Button
          size="xs"
          variant="subtle"
          color="blue"
          leftSection={<IconBook size={12} />}
          onClick={() => setPresetsModalOpen(true)}
          radius="md"
        >
          Browse All (37)
        </Button>
      </Group>

      <Flex gap="xs" wrap="wrap">
        {getPopularPresets().map((preset, index) => (
          <UnstyledButton
            key={index}
            onClick={() => applyPreset(preset)}
            style={{
              padding: '5px 11px',
              borderRadius: 8,
              background: isDark ? 'var(--mantine-color-dark-5)' : 'var(--mantine-color-gray-1)',
              border: `1.5px solid ${isDark ? 'var(--mantine-color-dark-3)' : 'var(--mantine-color-gray-3)'}`,
              fontFamily: 'Inter, sans-serif',
              fontSize: 13,
              fontWeight: 500,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              userSelect: 'none',
              color: isDark ? 'var(--mantine-color-gray-3)' : 'var(--mantine-color-gray-8)',
            }}
          >
            {preset.style}
          </UnstyledButton>
        ))}
      </Flex>
    </>
  );
};

export default QuickStylePresets;
