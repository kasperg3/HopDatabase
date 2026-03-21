import { Group, Text, Badge, Box, useMantineColorScheme } from '@mantine/core';

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
  oilRange,
}) => {
  const { colorScheme } = useMantineColorScheme();
  const isDark = colorScheme === 'dark';
  const hasFilters = getAllSelectedAromas().length > 0 || useAlphaFilter || useCohumuloneFilter || useOilFilter;
  const pct = uniqueHops.length > 0 ? Math.round((availableHops.length / uniqueHops.length) * 100) : 100;

  return (
    <Group gap="xs" align="center" wrap="wrap">
      <Text size="sm" fw={500} c={hasFilters ? 'hop' : 'dimmed'}>
        {availableHops.length}
        <Text component="span" c="dimmed" fw={400}> / {uniqueHops.length} hops</Text>
        {hasFilters && (
          <Text component="span" size="xs" c="dimmed" fw={400}>
            {' '}({pct}%)
          </Text>
        )}
      </Text>

      {getSelectedAromasHigh().length > 0 && getSelectedAromasHigh().map(a => (
        <Badge key={a} size="xs" color="green" variant="light" radius="sm">
          {a} HIGH
        </Badge>
      ))}
      {getSelectedAromasLow().length > 0 && getSelectedAromasLow().map(a => (
        <Badge key={a} size="xs" color="red" variant="light" radius="sm">
          {a} LOW
        </Badge>
      ))}
      {useAlphaFilter && (
        <Badge size="xs" color="orange" variant="light" radius="sm">
          α {alphaRange[0]}–{alphaRange[1]}%
        </Badge>
      )}
      {useCohumuloneFilter && (
        <Badge size="xs" color="yellow" variant="light" radius="sm">
          Coh {cohumuloneRange[0]}–{cohumuloneRange[1]}%
        </Badge>
      )}
      {useOilFilter && (
        <Badge size="xs" color="violet" variant="light" radius="sm">
          Oil {oilRange[0]}–{oilRange[1]}
        </Badge>
      )}
    </Group>
  );
};

export default FilterSummary;
