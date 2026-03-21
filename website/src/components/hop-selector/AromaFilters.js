import {
  Text,
  Group,
  Tooltip,
  UnstyledButton,
  Box,
  useMantineColorScheme,
} from '@mantine/core';
import { IconHelp } from '@tabler/icons-react';

const AROMA_ICONS = {
  'Citrus':        '🍋',
  'Resin/Pine':    '🌲',
  'Spice':         '🌶️',
  'Herbal':        '🌿',
  'Grassy':        '🌱',
  'Floral':        '🌸',
  'Berry':         '🫐',
  'Stone Fruit':   '🍑',
  'Tropical Fruit':'🍍',
};

const AromaFilters = ({
  availableAromaCategories,
  aromaStates,
  handleAromaClick,
}) => {
  const { colorScheme } = useMantineColorScheme();
  const isDark = colorScheme === 'dark';

  return (
    <>
      <Group gap="xs" mb="sm" align="center">
        <Text size="sm" fw={600} style={{ fontFamily: 'Space Grotesk, Inter, sans-serif' }}>
          Aroma Profile
        </Text>
        <Tooltip
          label="Green = must be in top 3 aromas. Red = must be in bottom 3 (or absent). Click to cycle: off → high ↑ → low ↓ → off"
          multiline
          w={280}
          withArrow
          position="top"
        >
          <IconHelp
            size={14}
            style={{ cursor: 'help', color: 'var(--mantine-color-dimmed)', flexShrink: 0 }}
          />
        </Tooltip>
      </Group>

      <Group gap="xs" wrap="wrap">
        {availableAromaCategories.map((aroma) => {
          const state = aromaStates[aroma] || 'none';
          const isHigh = state === 'high';
          const isLow = state === 'low';
          const isActive = isHigh || isLow;

          const bg = isHigh
            ? isDark ? 'rgba(46,168,46,0.22)' : 'rgba(46,168,46,0.12)'
            : isLow
            ? isDark ? 'rgba(250,82,82,0.22)' : 'rgba(250,82,82,0.10)'
            : isDark ? 'var(--mantine-color-dark-5)' : 'var(--mantine-color-gray-1)';

          const borderColor = isHigh
            ? 'var(--mantine-color-green-5)'
            : isLow
            ? 'var(--mantine-color-red-5)'
            : isDark
            ? 'var(--mantine-color-dark-3)'
            : 'var(--mantine-color-gray-3)';

          const textColor = isHigh
            ? 'var(--mantine-color-green-7)'
            : isLow
            ? 'var(--mantine-color-red-7)'
            : 'inherit';

          return (
            <UnstyledButton
              key={aroma}
              onClick={() => handleAromaClick(aroma)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                padding: '5px 10px',
                borderRadius: 8,
                background: bg,
                border: `1.5px solid ${borderColor}`,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                fontFamily: 'Inter, sans-serif',
                fontSize: 13,
                fontWeight: isActive ? 600 : 400,
                color: textColor,
                userSelect: 'none',
              }}
            >
              <span style={{ fontSize: 15, lineHeight: 1 }}>
                {AROMA_ICONS[aroma] || '●'}
              </span>
              <span>{aroma}</span>
              {isHigh && (
                <Box
                  component="span"
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    color: 'var(--mantine-color-green-6)',
                    marginLeft: 2,
                  }}
                >
                  HIGH
                </Box>
              )}
              {isLow && (
                <Box
                  component="span"
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    color: 'var(--mantine-color-red-6)',
                    marginLeft: 2,
                  }}
                >
                  LOW
                </Box>
              )}
            </UnstyledButton>
          );
        })}
      </Group>
    </>
  );
};

export default AromaFilters;
