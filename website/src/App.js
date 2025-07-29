import React, { useState, useEffect } from 'react';
import {
  Container,
  Title,
  Text,
  Box,
  AppShell,
  Alert,
  Paper,
  Grid,
  Loader,
  Center,
  Tabs,
  Switch,
  Group,
  MantineProvider,
  createTheme,
  useMantineColorScheme,
} from '@mantine/core';
import { IconSun, IconMoon } from '@tabler/icons-react';
import HopSelector from './components/HopSelector';
import SpiderChart from './components/SpiderChart';
import BrewingParametersComparison from './components/BrewingParametersComparison';
import BrewingSummary from './components/BrewingSummary';
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

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const data = await loadHopData();
        const processedData = processHopData(data);
        setHopData(processedData);
      } catch (err) {
        setError('Failed to load hop data: ' + err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleHopSelection = (selectedHopArray) => {
    setSelectedHops(selectedHopArray || []);
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
                    <IconSun size={16} />
                    <Switch
                        checked={colorScheme === 'dark'}
                        onChange={toggleColorScheme}
                        size="md"
                        color="hop"
                        thumbIcon={
                            colorScheme === 'dark' ? (
                                <IconMoon size={12} color="white" />
                            ) : (
                                <IconSun size={12} color="orange" />
                            )
                        }
                    />
                    <IconMoon size={16} />
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

                <Grid>
                    <Grid.Col span={{ base: 12, md: 5 }}>
                        <HopSelector
                            hopData={hopData}
                            selectedHops={selectedHops}
                            onHopSelection={handleHopSelection}
                        />
                    </Grid.Col>
                    
                    <Grid.Col span={{ base: 12, md: 7 }}>
                        <SpiderChart hopData={getSelectedHopData()} />
                    </Grid.Col>
                </Grid>

                {getSelectedHopData().length > 0 && (
                    <Box mt="lg">
                        <Tabs defaultValue="brewing-parameters" variant="outline">
                            <Tabs.List>
                                <Tabs.Tab value="brewing-parameters">
                                    Brewing Parameters
                                </Tabs.Tab>
                                <Tabs.Tab value="brewing-summary">
                                    Brewing Summary
                                </Tabs.Tab>
                            </Tabs.List>
                            <Tabs.Panel value="brewing-parameters" pt="lg">
                                <BrewingParametersComparison hopData={getSelectedHopData()} />
                            </Tabs.Panel>

                            <Tabs.Panel value="brewing-summary" pt="lg">
                                <BrewingSummary hopData={getSelectedHopData()} />
                            </Tabs.Panel>

                        </Tabs>
                    </Box>
                )}

                <Paper shadow="sm" p="md" mt="xl" style={{ borderTop: '2px solid var(--mantine-color-default-border)' }} bg={colorScheme === 'dark' ? 'dark.6' : 'gray.1'}>
                    <Text size="sm" c="dimmed" ta="center" mt="sm">
                         Data sourced from Hopsteiner, BarthHaas, and Yakima Chief Hops. Source links:&nbsp;
                        <a href="https://www.hopsteiner.com/variety-data-sheets/" target="_blank" rel="noopener noreferrer">Hopsteiner</a>
                        {' | '}
                        <a href="https://www.barthhaas.com/hops-and-products/hop-varieties-overview" target="_blank" rel="noopener noreferrer">BarthHaas</a>
                        {' | '}
                        <a href="https://www.yakimachief.com/commercial/hop-varieties.html" target="_blank" rel="noopener noreferrer">Yakima Chief Hops</a>
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
      <AppContent />
    </MantineProvider>
  );
}

export default App;
