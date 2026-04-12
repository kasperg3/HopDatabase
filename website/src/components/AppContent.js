import React, { useState, useEffect, useCallback } from 'react';
import {
  Container,
  Title,
  Text,
  Box,
  AppShell,
  Alert,
  Loader,
  Center,
  Group,
  useMantineColorScheme,
  ActionIcon,
  Tooltip,
  Stack,
  Anchor,
  Divider,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import {
  IconSun,
  IconMoon,
  IconShare,
  IconCheck,
  IconCopy,
  IconBrandGithub,
  IconLeaf,
  IconChartBubble,
} from '@tabler/icons-react';
import HopSelector from './hop-selector/HopSelector';
import LazySpiderChart, { preloadSpiderChart } from './LazySpiderChart';
import LazyCarbonationCalculator, { preloadCarbonationCalculator } from './LazyCarbonationCalculator';
import SelectedHops from './SelectedHops';
import { useSEO } from '../hooks/useSEO';
import { updateURL, loadFromURL } from '../utils';
import HopDataService from '../services/HopDataService';
import { useHopFilter } from '../contexts/HopFilterContext';

function AppContent() {
  const [hopData, setHopData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentView, setCurrentView] = useState('main'); // 'main' | 'calculator'
  const { colorScheme, toggleColorScheme } = useMantineColorScheme();
  const isDark = colorScheme === 'dark';

  const { state, dispatch } = useHopFilter();
  const { selectedHops } = state;

  useSEO(selectedHops, hopData);

  const shareComparison = async () => {
    try {
      if (navigator.share && selectedHops.length > 0) {
        await navigator.share({
          title: 'Hop Comparison',
          text: `Compare ${selectedHops.join(', ')} hops`,
          url: window.location.href,
        });
        notifications.show({
          title: 'Shared successfully',
          message: 'Hop comparison has been shared',
          color: 'hop',
          icon: <IconCheck size={16} />,
          autoClose: 3000,
        });
      } else {
        await navigator.clipboard.writeText(window.location.href);
        notifications.show({
          title: 'Link copied',
          message: 'Comparison link has been copied to clipboard',
          color: 'hop',
          icon: <IconCopy size={16} />,
          autoClose: 3000,
        });
      }
    } catch (err) {
      console.error('Error sharing:', err);
      notifications.show({
        title: 'Share failed',
        message: 'Unable to share comparison. Please try again.',
        color: 'red',
        autoClose: 4000,
      });
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const hopDataService = HopDataService.getInstance();
        const processedData = await hopDataService.loadHopData();
        setHopData(processedData);

        const urlHops = loadFromURL();
        if (urlHops.length > 0) {
          dispatch({ type: 'SET_SELECTED_HOPS', payload: urlHops });
        }

        setTimeout(() => {
          preloadSpiderChart();
        }, 1000);
      } catch (err) {
        setError('Failed to load hop data: ' + err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [dispatch]);

  const handleHopSelection = (selectedHopArray) => {
    const newSelection = selectedHopArray || [];
    dispatch({ type: 'SET_SELECTED_HOPS', payload: newSelection });
    updateURL(newSelection);
  };

  const getSelectedHopData = useCallback(() => {
    return selectedHops
      .filter(hopUniqueId => hopUniqueId !== null && hopUniqueId !== undefined)
      .map(hopUniqueId => hopData.find(hop => `${hop.name} (${hop.source})` === hopUniqueId))
      .filter(hop => hop !== undefined);
  }, [selectedHops, hopData]);

  if (loading) {
    return (
      <Center style={{ height: '100vh' }}>
        <Stack align="center" gap="md">
          <Box
            style={{
              width: 64,
              height: 64,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #2ea82e 0%, #52c752 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <IconLeaf size={32} color="white" />
          </Box>
          <Loader size="sm" color="hop" />
          <Text size="sm" c="dimmed" fw={500}>Loading hop data...</Text>
        </Stack>
      </Center>
    );
  }

  const headerBg = isDark
    ? 'linear-gradient(135deg, var(--mantine-color-dark-7) 0%, var(--mantine-color-dark-6) 100%)'
    : 'linear-gradient(135deg, #1a5c1a 0%, #2ea82e 60%, #52c752 100%)';

  return (
    <AppShell header={{ height: 64 }} padding="md">
      <AppShell.Header
        style={{
          background: headerBg,
          borderBottom: isDark ? '1px solid var(--mantine-color-dark-5)' : 'none',
          boxShadow: '0 2px 16px rgba(0,0,0,0.18)',
        }}
      >
        <Box
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            height: '100%',
            paddingLeft: 20,
            paddingRight: 20,
          }}
        >
          <Group gap="sm" align="center">
            <Box
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                background: 'rgba(255,255,255,0.18)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <IconLeaf size={20} color="white" />
            </Box>
            <Box>
              <Title
                order={3}
                style={{
                  color: 'white',
                  fontFamily: 'Space Grotesk, Inter, sans-serif',
                  fontWeight: 700,
                  lineHeight: 1.1,
                  letterSpacing: '-0.02em',
                }}
              >
                HopBase
              </Title>
              <Text
                size="xs"
                style={{ color: 'rgba(255,255,255,0.72)', lineHeight: 1 }}
              >
                Hop Comparison Tool
              </Text>
            </Box>
          </Group>

          <Group gap="xs">
            <Tooltip
              label={currentView === 'main' ? 'Carbonation Calculator' : 'Back to HopBase'}
              position="bottom"
            >
              <ActionIcon
                variant="subtle"
                size="lg"
                radius="md"
                onMouseEnter={currentView === 'main' ? preloadCarbonationCalculator : undefined}
                onClick={() =>
                  setCurrentView((prev) => (prev === 'main' ? 'calculator' : 'main'))
                }
                style={{ color: 'rgba(255,255,255,0.85)' }}
              >
                {currentView === 'main' ? (
                  <IconChartBubble size={18} />
                ) : (
                  <IconLeaf size={18} />
                )}
              </ActionIcon>
            </Tooltip>
            {selectedHops.length > 0 && currentView === 'main' && (
              <Tooltip label="Share comparison" position="bottom">
                <ActionIcon
                  variant="subtle"
                  size="lg"
                  radius="md"
                  onClick={shareComparison}
                  style={{ color: 'rgba(255,255,255,0.85)' }}
                >
                  <IconShare size={18} />
                </ActionIcon>
              </Tooltip>
            )}
            <Tooltip label={isDark ? 'Switch to light mode' : 'Switch to dark mode'} position="bottom">
              <ActionIcon
                variant="subtle"
                size="lg"
                radius="md"
                onClick={toggleColorScheme}
                style={{ color: 'rgba(255,255,255,0.85)' }}
              >
                {isDark ? <IconSun size={18} /> : <IconMoon size={18} />}
              </ActionIcon>
            </Tooltip>
          </Group>
        </Box>
      </AppShell.Header>

      <AppShell.Main style={{ background: isDark ? 'var(--mantine-color-dark-8)' : '#f7f9f7' }}>
        {currentView === 'calculator' ? (
          <LazyCarbonationCalculator />
        ) : (
        <Container size="lg" py="md">
          {error && (
            <Alert color="red" mb="md" radius="lg">
              {error}
            </Alert>
          )}

          <Stack gap="lg">
            <HopSelector
              hopData={hopData}
              selectedHops={selectedHops}
              onHopSelection={handleHopSelection}
            />

            <LazySpiderChart hopData={getSelectedHopData()} />

            <SelectedHops
              hopData={hopData}
              selectedHops={selectedHops}
            />
          </Stack>

          {/* Footer */}
          <Box
            mt="xl"
            pt="lg"
            style={{
              borderTop: `1px solid ${isDark ? 'var(--mantine-color-dark-5)' : 'var(--mantine-color-gray-3)'}`,
            }}
          >
            <Stack gap="xs" align="center">
              <Group gap="lg" justify="center" wrap="wrap">
                <Text size="xs" c="dimmed">Data from:</Text>
                {[
                  { label: 'Hopsteiner', href: 'https://www.hopsteiner.com/variety-data-sheets/' },
                  { label: 'BarthHaas', href: 'https://www.barthhaas.com/hops-and-products/hop-varieties-overview' },
                  { label: 'Yakima Chief', href: 'https://www.yakimachief.com/commercial/hop-varieties.html' },
                  { label: 'Crosby Hops', href: 'https://www.crosbyhops.com/shop-hops/hop-catalog/' },
                ].map(({ label, href }) => (
                  <Anchor key={label} href={href} target="_blank" rel="noopener noreferrer" size="xs" c="dimmed">
                    {label}
                  </Anchor>
                ))}
              </Group>
              <Divider w={60} />
              <Anchor
                href="https://github.com/kasperg3/HopDatabase"
                target="_blank"
                rel="noopener noreferrer"
                size="xs"
                c="dimmed"
              >
                <Group gap={4} align="center">
                  <IconBrandGithub size={13} />
                  Open source — contributions welcome
                </Group>
              </Anchor>
            </Stack>
          </Box>
        </Container>
        )}
      </AppShell.Main>
    </AppShell>
  );
}

export default AppContent;
