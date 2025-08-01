import React from 'react';
import { MantineProvider, createTheme } from '@mantine/core';
import { Notifications } from '@mantine/notifications';
import { HopFilterProvider } from './contexts/HopFilterContext';
import AppContent from './components/AppContent';

const theme = createTheme({
  colors: {
    hop: [
      '#f0f9f0', '#d8f0d8', '#b8e6b8', '#92d692', '#6bb86b',
      '#2e7d32', '#1c5e20', '#0e4c14', '#053a0a', '#002900'
    ],
    amber: [
      '#fff8e1', '#ffecb3', '#ffe082', '#ffd54f', '#ffca28',
      '#ff8f00', '#ff6f00', '#e65100', '#bf360c', '#8f2a00'
    ]
  },
  primaryColor: 'hop',
  defaultRadius: 'md',
  fontFamily: 'Roboto, sans-serif',
});

function App() {
  return (
    <MantineProvider theme={theme} defaultColorScheme="light">
      <Notifications position="top-right" />
      <HopFilterProvider>
        <AppContent />
      </HopFilterProvider>
    </MantineProvider>
  );
}

export default App;
