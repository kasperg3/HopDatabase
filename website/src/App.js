import React, { useState, useEffect } from 'react';
import {
  Container,
  Title,
  Text,
  Box,
  AppShell,
  Alert,
  Paper,
  Loader,
  Center,
  Switch,
  Group,
  MantineProvider,
  createTheme,
  useMantineColorScheme,
  ActionIcon,
  Tooltip,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { Notifications } from '@mantine/notifications';
import { IconSun, IconMoon, IconShare, IconCheck, IconCopy } from '@tabler/icons-react';
import HopSelector from './components/HopSelector';
import SpiderChart from './components/SpiderChart';
import SelectedHops from './components/SelectedHops';
import { loadHopData, processHopData } from './utils/dataLoader';

const theme = createTheme({
  colors: {
    hop: [
      '#f0f9f0',
      '#d8f0d8',
      '#b8e6b8',
      '#92d692',
      '#6bb86b',
      '#2e7d32', // Main hop green
      '#1c5e20',
      '#0e4c14',
      '#053a0a',
      '#002900'
    ],
    amber: [
      '#fff8e1',
      '#ffecb3',
      '#ffe082',
      '#ffd54f',
      '#ffca28',
      '#ff8f00', // Main amber
      '#ff6f00',
      '#e65100',
      '#bf360c',
      '#8f2a00'
    ]
  },
  primaryColor: 'hop',
  defaultRadius: 'md',
  fontFamily: 'Roboto, sans-serif',
});

function AppContent() {
  const [hopData, setHopData] = useState([]);
  const [selectedHops, setSelectedHops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { colorScheme, toggleColorScheme } = useMantineColorScheme();

  // URL sharing functionality
  const updateURL = (hops) => {
    const url = new URL(window.location);
    if (hops && hops.length > 0) {
      url.searchParams.set('hops', hops.join(','));
    } else {
      url.searchParams.delete('hops');
    }
    window.history.replaceState({}, '', url);
  };

  const loadFromURL = () => {
    const url = new URL(window.location);
    const hopsParam = url.searchParams.get('hops');
    if (hopsParam) {
      return hopsParam.split(',').filter(hop => hop.trim());
    }
    return [];
  };

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
        const data = await loadHopData();
        const processedData = processHopData(data);
        setHopData(processedData);
        
        // Load selected hops from URL after data is loaded
        const urlHops = loadFromURL();
        if (urlHops.length > 0) {
          setSelectedHops(urlHops);
        }
      } catch (err) {
        setError('Failed to load hop data: ' + err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleHopSelection = (selectedHopArray) => {
    const newSelection = selectedHopArray || [];
    setSelectedHops(newSelection);
    updateURL(newSelection);
  };

  const getSelectedHopData = () => {
    return selectedHops
      .filter(hopUniqueId => hopUniqueId !== null && hopUniqueId !== undefined)
      .map(hopUniqueId => hopData.find(hop => `${hop.name} (${hop.source})` === hopUniqueId))
      .filter(hop => hop !== undefined);
  };

  if (loading) {
    return (
      <Center style={{ height: '100vh' }}>
        <Box ta="center">
          <Loader size="lg" />
          <Text mt="md">Loading hop data...</Text>
        </Box>
      </Center>
    );
  }

return (
    <AppShell header={{ height: 60 }} padding="md">
        <AppShell.Header>
            <Box style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '100%', paddingLeft: 16, paddingRight: 16 }}>
                <Title order={3}>
                    🍺 Hop Comparison Tool
                </Title>
                <Group gap="sm">
                    {selectedHops.length > 0 && (
                        <Tooltip label="Share comparison">
                            <ActionIcon
                                variant="light"
                                color="hop"
                                onClick={shareComparison}
                                size="lg"
                            >
                                <IconShare size={16} />
                            </ActionIcon>
                        </Tooltip>
                    )}
                    <Switch
                        checked={colorScheme === 'dark'}
                        onChange={toggleColorScheme}
                        size="md"
                        color="hop"
                        thumbIcon={
                            colorScheme === 'dark' ? (
                                <IconMoon size={12} color="lightblue" />
                            ) : (
                                <IconSun size={12} color="orange" />
                            )
                        }
                    />
                </Group>
            </Box>
        </AppShell.Header>

        <AppShell.Main>
            <Container size="lg">
                {error && (
                    <Alert color="red" mb="md">
                        {error}
                    </Alert>
                )}

                {/* 1. Hop Selection & Filtering - Full Width */}
                <Box mb="xl">
                    <HopSelector
                        hopData={hopData}
                        selectedHops={selectedHops}
                        onHopSelection={handleHopSelection}
                    />
                </Box>

                {/* 2. Aroma Profile Comparison - Full Width */}
                <Box mb="xl">
                    <SpiderChart hopData={getSelectedHopData()} />
                </Box>

                {/* 3. Selected Hops Display - Full Width */}
                <Box mb="xl">
                    <SelectedHops
                        hopData={hopData}
                        selectedHops={selectedHops}
                    />
                </Box>

                <Paper shadow="sm" p="md" mt="xl" style={{ borderTop: '2px solid var(--mantine-color-default-border)' }} bg={colorScheme === 'dark' ? 'dark.6' : 'gray.1'}>
                    <Text size="sm" c="dimmed" ta="center" mt="sm">
                         Data sourced from Hopsteiner, BarthHaas, Yakima Chief Hops, and Crosby Hops. Source links:&nbsp;
                        <a href="https://www.hopsteiner.com/variety-data-sheets/" target="_blank" rel="noopener noreferrer">Hopsteiner</a>
                        {' | '}
                        <a href="https://www.barthhaas.com/hops-and-products/hop-varieties-overview" target="_blank" rel="noopener noreferrer">BarthHaas</a>
                        {' | '}
                        <a href="https://www.yakimachief.com/commercial/hop-varieties.html" target="_blank" rel="noopener noreferrer">Yakima Chief Hops</a>
                        {' | '}
                        <a href="https://www.crosbyhops.com/shop-hops/hop-catalog/" target="_blank" rel="noopener noreferrer">Crosby Hops</a>
                    </Text>

                    <Text size="sm" ta="center" c="dimmed">
                        This project is open source and contributions are always welcome! 
                        <br />
                        <a 
                            href="https://github.com/kasperg3/HopDatabase" 
                            target="_blank" 
                            rel="noopener noreferrer"
                            style={{ color: 'var(--mantine-color-blue-filled)', textDecoration: 'none', fontWeight: 500 }}
                        >
                            View on GitHub →
                        </a>
                    </Text>
                </Paper>
            </Container>
        </AppShell.Main>
    </AppShell>
);
}

function App() {
  return (
    <MantineProvider theme={theme} defaultColorScheme="light">
      <Notifications position="top-right" />
      <AppContent />
    </MantineProvider>
  );
}

export default App;
