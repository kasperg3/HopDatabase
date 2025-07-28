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
} from '@mantine/core';
import HopSelector from './components/HopSelector';
import SpiderChart from './components/SpiderChart';
import DetailedComparison from './components/DetailedComparison';
import { loadHopData, processHopData } from './utils/dataLoader';

function App() {
  const [hopData, setHopData] = useState([]);
  const [selectedHops, setSelectedHops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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
            <Box style={{ display: 'flex', alignItems: 'center', height: '100%', paddingLeft: 16 }}>
                <Title order={3} c="white">
                    🍺 Hop Comparison Tool
                </Title>
            </Box>
        </AppShell.Header>

        <AppShell.Main>
            <Container size="lg">
                {error && (
                    <Alert color="red" mb="md">
                        {error}
                    </Alert>
                )}

                <Paper shadow="md" p="lg" mb="lg">
                    <Title order={1} ta="center" mb="md">
                        Compare Hop Aroma Profiles
                    </Title>
                    <Text size="md" c="dimmed" ta="center">
                        Select up to 5 hops to compare their aroma characteristics using an interactive spider chart.
                        Data sourced from Hopsteiner, BarthHaas, and Yakima Chief Hops.
                    </Text>
                    <Text size="sm" c="dimmed" ta="center" mt="sm">
                        Source links:&nbsp;
                        <a href="https://www.hopsteiner.com/variety-data-sheets/" target="_blank" rel="noopener noreferrer">Hopsteiner</a>
                        {' | '}
                        <a href="https://www.barthhaas.com/hops-and-products/hop-varieties-overview" target="_blank" rel="noopener noreferrer">BarthHaas</a>
                        {' | '}
                        <a href="https://www.yakimachief.com/commercial/hop-varieties.html" target="_blank" rel="noopener noreferrer">Yakima Chief Hops</a>
                    </Text>
                </Paper>

                <Grid>
                    <Grid.Col span={{ base: 12, md: 6 }}>
                        <HopSelector
                            hopData={hopData}
                            selectedHops={selectedHops}
                            onHopSelection={handleHopSelection}
                        />
                    </Grid.Col>
                    
                    <Grid.Col span={{ base: 12, md: 6 }}>
                        <SpiderChart hopData={getSelectedHopData()} />
                    </Grid.Col>
                </Grid>

                {getSelectedHopData().length > 0 && (
                    <Box mt="lg">
                        <DetailedComparison hopData={getSelectedHopData()} />
                    </Box>
                )}

                <Paper shadow="sm" p="md" mt="xl" style={{ backgroundColor: '#f8f9fa', borderTop: '2px solid #e9ecef' }}>
                    <Text size="sm" ta="center" c="dimmed">
                        This project is open source and contributions are always welcome! 
                        <br />
                        <a 
                            href="https://github.com/kasperg3/HopDatabase" 
                            target="_blank" 
                            rel="noopener noreferrer"
                            style={{ color: '#228be6', textDecoration: 'none', fontWeight: 500 }}
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

export default App;
