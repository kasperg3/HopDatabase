import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import {
  Container,
  Paper,
  Stack,
  Group,
  Title,
  Text,
  Box,
  SegmentedControl,
  NumberInput,
  Slider,
  Alert,
  Badge,
  SimpleGrid,
  ThemeIcon,
  Divider,
  useMantineColorScheme,
  UnstyledButton,
} from '@mantine/core';
import {
  IconChartBubble,
  IconTemperature,
  IconMountain,
  IconClock,
  IconGauge,
  IconBottle,
  IconAlertTriangle,
  IconBolt,
} from '@tabler/icons-react';
import {
  VESSEL_PRESETS,
  CO2_STYLE_PRESETS,
  V_INITIAL,
  K_STATIC,
  K_SHAKE,
  atmosphericPressure,
  surfaceArea,
  absorptionRatio,
  equilibriumVolumes,
  equilibriumPressure,
  timeForTarget,
  pressureForTarget,
  shakingTime,
} from './carbonationUtils';

const MIN_TIME = 0.5;      // hours
const MAX_TIME = 168;      // 1 week
const TIME_STEP = 0.5;

const MIN_PRESSURE = 0;    // bar gauge
const MAX_PRESSURE = 4;
const PRESSURE_STEP = 0.05;

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const round2 = (v) => Math.round(v * 100) / 100;
const round1 = (v) => Math.round(v * 10) / 10;

function formatTime(hours) {
  if (!Number.isFinite(hours)) return '—';
  if (hours < 1) return `${Math.round(hours * 60)} min`;
  if (hours < 24) return `${round1(hours)} h`;
  const days = hours / 24;
  return `${round1(days)} days`;
}

function CarbonationCalculator() {
  const { colorScheme } = useMantineColorScheme();
  const isDark = colorScheme === 'dark';

  // Core inputs
  const [vesselId, setVesselId] = useState(VESSEL_PRESETS[0].id);
  const [targetVolumes, setTargetVolumes] = useState(2.5);
  const [temperature, setTemperature] = useState(4);
  const [altitude, setAltitude] = useState(0);

  // Linked slider state
  const [time, setTime] = useState(48);          // hours
  const [pressure, setPressure] = useState(1.0); // bar gauge

  // Which slider the user last drove manually
  const lastChangedRef = useRef('time');
  // Prevents ping-pong when we programmatically update the "other" slider
  const internalUpdateRef = useRef(false);

  const vessel = useMemo(
    () => VESSEL_PRESETS.find((v) => v.id === vesselId) || VESSEL_PRESETS[0],
    [vesselId]
  );

  const P_atm = useMemo(() => atmosphericPressure(altitude), [altitude]);
  const SA = useMemo(() => surfaceArea(vessel.diameter), [vessel]);
  const R = useMemo(() => absorptionRatio(SA, vessel.volume), [SA, vessel.volume]);

  // Equilibrium pressure at target volumes and temperature
  const P_equilibrium = useMemo(
    () => equilibriumPressure(targetVolumes, temperature, P_atm),
    [targetVolumes, temperature, P_atm]
  );

  // Current V_eq at the applied pressure
  const V_eq_current = useMemo(
    () => equilibriumVolumes(pressure + P_atm, temperature),
    [pressure, P_atm, temperature]
  );

  // Shaking method result
  const shakeMinutes = useMemo(
    () => shakingTime(targetVolumes, V_eq_current, V_INITIAL, K_SHAKE),
    [targetVolumes, V_eq_current]
  );

  // Warnings
  const isUnreachable = !Number.isFinite(
    timeForTarget(targetVolumes, V_eq_current, V_INITIAL, K_STATIC, R)
  ) && pressure <= P_equilibrium;
  const pressureTooLow = pressure < P_equilibrium;

  // Handlers for linked sliders
  const handleTimeChange = useCallback(
    (newTime) => {
      lastChangedRef.current = 'time';
      setTime(newTime);
      const newPressure = pressureForTarget(
        targetVolumes,
        V_INITIAL,
        K_STATIC,
        R,
        newTime,
        temperature,
        P_atm
      );
      internalUpdateRef.current = true;
      setPressure(clamp(round2(newPressure), MIN_PRESSURE, MAX_PRESSURE));
    },
    [targetVolumes, R, temperature, P_atm]
  );

  const handlePressureChange = useCallback(
    (newPressure) => {
      lastChangedRef.current = 'pressure';
      setPressure(newPressure);
      const V_eq = equilibriumVolumes(newPressure + P_atm, temperature);
      const newTime = timeForTarget(targetVolumes, V_eq, V_INITIAL, K_STATIC, R);
      internalUpdateRef.current = true;
      if (Number.isFinite(newTime)) {
        setTime(clamp(round1(newTime), MIN_TIME, MAX_TIME));
      } else {
        setTime(MAX_TIME);
      }
    },
    [targetVolumes, temperature, P_atm, R]
  );

  // Recalculate the non-driving slider when inputs change
  useEffect(() => {
    if (internalUpdateRef.current) {
      internalUpdateRef.current = false;
      return;
    }
    if (lastChangedRef.current === 'time') {
      const newPressure = pressureForTarget(
        targetVolumes,
        V_INITIAL,
        K_STATIC,
        R,
        time,
        temperature,
        P_atm
      );
      setPressure(clamp(round2(newPressure), MIN_PRESSURE, MAX_PRESSURE));
    } else {
      const V_eq = equilibriumVolumes(pressure + P_atm, temperature);
      const newTime = timeForTarget(targetVolumes, V_eq, V_INITIAL, K_STATIC, R);
      if (Number.isFinite(newTime)) {
        setTime(clamp(round1(newTime), MIN_TIME, MAX_TIME));
      }
    }
    // Only react to input changes — not slider changes (those are handled above)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetVolumes, temperature, altitude, vesselId]);

  const cardBg = isDark ? 'var(--mantine-color-dark-6)' : 'white';

  return (
    <Container size="md" py="md">
      <Stack gap="lg">
        {/* Header */}
        <Paper shadow="sm" radius="lg" p="lg" style={{ background: cardBg }}>
          <Group gap="md" align="center">
            <ThemeIcon size={44} radius="md" variant="light" color="cyan">
              <IconChartBubble size={26} />
            </ThemeIcon>
            <Box>
              <Title order={2} style={{ fontFamily: 'Space Grotesk, Inter, sans-serif' }}>
                Carbonation Calculator
              </Title>
              <Text size="sm" c="dimmed">
                Force-carbonation planner using the Vail/Glass equation (metric units)
              </Text>
            </Box>
          </Group>
        </Paper>

        {/* Vessel preset selector */}
        <Paper shadow="sm" radius="lg" p="lg" style={{ background: cardBg }}>
          <Group gap="xs" mb="sm" align="center">
            <IconBottle size={16} style={{ color: 'var(--mantine-color-cyan-6)' }} />
            <Text size="sm" fw={600}>Vessel</Text>
          </Group>
          <SegmentedControl
            fullWidth
            color="cyan"
            value={vesselId}
            onChange={setVesselId}
            data={VESSEL_PRESETS.map((v) => ({ value: v.id, label: v.label }))}
          />
          <Group gap="lg" mt="sm">
            <Text size="xs" c="dimmed">
              Volume: <b>{vessel.volume} L</b>
            </Text>
            <Text size="xs" c="dimmed">
              Internal diameter: <b>{vessel.diameter} cm</b>
            </Text>
            <Text size="xs" c="dimmed">
              Surface area: <b>{Math.round(SA)} cm²</b>
            </Text>
          </Group>
        </Paper>

        {/* Inputs */}
        <Paper shadow="sm" radius="lg" p="lg" style={{ background: cardBg }}>
          <Text size="sm" fw={600} mb="md">Target & Environment</Text>
          <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="md">
            <NumberInput
              label="Target CO₂ (volumes)"
              value={targetVolumes}
              onChange={(v) => setTargetVolumes(Number(v) || 0)}
              min={1.0}
              max={5.0}
              step={0.1}
              decimalScale={2}
              leftSection={<IconChartBubble size={16} />}
            />
            <NumberInput
              label="Temperature (°C)"
              value={temperature}
              onChange={(v) => setTemperature(Number(v) || 0)}
              min={-2}
              max={30}
              step={0.5}
              decimalScale={1}
              leftSection={<IconTemperature size={16} />}
            />
            <NumberInput
              label="Altitude (m)"
              value={altitude}
              onChange={(v) => setAltitude(Number(v) || 0)}
              min={0}
              max={5000}
              step={50}
              leftSection={<IconMountain size={16} />}
            />
          </SimpleGrid>

          <Text size="xs" fw={600} c="dimmed" mt="md" mb="xs">
            Beer style quick presets
          </Text>
          <Group gap="xs" wrap="wrap">
            {CO2_STYLE_PRESETS.map((p) => {
              const active = Math.abs(targetVolumes - p.vol) < 0.05;
              return (
                <UnstyledButton
                  key={p.label}
                  onClick={() => setTargetVolumes(p.vol)}
                  style={{
                    padding: '4px 10px',
                    borderRadius: 8,
                    background: active
                      ? (isDark ? 'rgba(21,170,191,0.25)' : 'rgba(21,170,191,0.12)')
                      : (isDark ? 'var(--mantine-color-dark-5)' : 'var(--mantine-color-gray-1)'),
                    border: `1.5px solid ${
                      active
                        ? 'var(--mantine-color-cyan-5)'
                        : (isDark ? 'var(--mantine-color-dark-3)' : 'var(--mantine-color-gray-3)')
                    }`,
                    fontSize: 12,
                    fontWeight: active ? 600 : 400,
                    color: active ? 'var(--mantine-color-cyan-7)' : 'inherit',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {p.label} · {p.vol}
                </UnstyledButton>
              );
            })}
          </Group>
        </Paper>

        {/* Linked sliders */}
        <Paper shadow="sm" radius="lg" p="lg" style={{ background: cardBg }}>
          <Group justify="space-between" mb="xs">
            <Text size="sm" fw={600}>Static Force Carbonation</Text>
            <Badge variant="light" color="cyan" size="sm">
              Equilibrium: {round2(P_equilibrium)} bar
            </Badge>
          </Group>
          <Text size="xs" c="dimmed" mb="lg">
            Adjust either slider — the other recalculates to hit your target CO₂ at the current
            temperature and vessel geometry.
          </Text>

          {/* Time slider */}
          <Box mb="xl">
            <Group gap="xs" mb={6} align="center">
              <IconClock size={14} style={{ color: 'var(--mantine-color-blue-6)' }} />
              <Text size="xs" fw={600}>Time: {formatTime(time)}</Text>
            </Group>
            <Slider
              color="blue"
              min={MIN_TIME}
              max={MAX_TIME}
              step={TIME_STEP}
              value={time}
              onChange={handleTimeChange}
              label={(v) => formatTime(v)}
              marks={[
                { value: 12, label: '12h' },
                { value: 24, label: '1d' },
                { value: 72, label: '3d' },
                { value: 168, label: '7d' },
              ]}
              mb="lg"
            />
          </Box>

          {/* Pressure slider */}
          <Box mb="md">
            <Group gap="xs" mb={6} align="center">
              <IconGauge size={14} style={{ color: 'var(--mantine-color-orange-6)' }} />
              <Text size="xs" fw={600}>Pressure: {round2(pressure)} bar gauge</Text>
            </Group>
            <Slider
              color="orange"
              min={MIN_PRESSURE}
              max={MAX_PRESSURE}
              step={PRESSURE_STEP}
              value={pressure}
              onChange={handlePressureChange}
              label={(v) => `${round2(v)} bar`}
              marks={[
                { value: 1, label: '1' },
                { value: 2, label: '2' },
                { value: 3, label: '3' },
                { value: 4, label: '4' },
              ]}
              mb="lg"
            />
          </Box>

          {isUnreachable && (
            <Alert color="orange" icon={<IconAlertTriangle size={16} />} mt="md" radius="md">
              Target CO₂ of {targetVolumes} vol is unreachable at {round2(pressure)} bar and{' '}
              {temperature} °C. Increase pressure above {round2(P_equilibrium)} bar.
            </Alert>
          )}
          {!isUnreachable && pressureTooLow && (
            <Alert color="yellow" icon={<IconAlertTriangle size={16} />} mt="md" radius="md">
              Applied pressure is below equilibrium. Target will never be reached — raise pressure.
            </Alert>
          )}
        </Paper>

        {/* Shaking method */}
        <Paper shadow="sm" radius="lg" p="lg" style={{ background: cardBg }}>
          <Group gap="xs" mb="xs" align="center">
            <IconBolt size={16} style={{ color: 'var(--mantine-color-grape-6)' }} />
            <Text size="sm" fw={600}>Shaking / Rolling Method</Text>
          </Group>
          <Text size="xs" c="dimmed" mb="md">
            Rapid agitation massively accelerates CO₂ absorption. Apply the pressure above,
            then shake/rock the keg for:
          </Text>
          <Group gap="lg" align="baseline">
            <Title order={3} c={Number.isFinite(shakeMinutes) ? 'grape' : 'dimmed'}>
              {Number.isFinite(shakeMinutes) ? `~${Math.max(1, Math.ceil(shakeMinutes))} min` : '—'}
            </Title>
            <Text size="xs" c="dimmed">
              at {round2(pressure)} bar, {temperature} °C
            </Text>
          </Group>
        </Paper>

        {/* Summary */}
        <Paper shadow="sm" radius="lg" p="lg" style={{ background: cardBg }}>
          <Text size="sm" fw={600} mb="md">Summary</Text>
          <SimpleGrid cols={{ base: 2, sm: 4 }} spacing="md">
            <SummaryStat label="Target" value={`${targetVolumes} vol CO₂`} />
            <SummaryStat label="Static" value={`${round2(pressure)} bar / ${formatTime(time)}`} />
            <SummaryStat label="Shaking" value={Number.isFinite(shakeMinutes) ? `~${Math.max(1, Math.ceil(shakeMinutes))} min` : '—'} />
            <SummaryStat label="Atm. pressure" value={`${round2(P_atm)} bar`} />
          </SimpleGrid>
          <Divider my="md" />
          <Text size="xs" c="dimmed">
            Based on the Vail/Glass equation. Absorption constants are empirical defaults
            (k = {K_STATIC}, k_shake = {K_SHAKE}). Actual times depend on keg geometry,
            temperature stability, and CO₂ purity.
          </Text>
        </Paper>
      </Stack>
    </Container>
  );
}

function SummaryStat({ label, value }) {
  return (
    <Box>
      <Text size="xs" c="dimmed" tt="uppercase" fw={600}>
        {label}
      </Text>
      <Text size="md" fw={700}>
        {value}
      </Text>
    </Box>
  );
}

export default CarbonationCalculator;
