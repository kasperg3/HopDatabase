import React from 'react';
import { MantineProvider, createTheme } from '@mantine/core';
import { Notifications } from '@mantine/notifications';
import { HopFilterProvider } from './contexts/HopFilterContext';
import AppContent from './components/AppContent';

const theme = createTheme({
  colors: {
    hop: [
      '#f0faf0', '#d6f5d6', '#adebad', '#7ddb7d', '#52c752',
      '#2ea82e', '#228a22', '#186d18', '#0f510f', '#083608'
    ],
    amber: [
      '#fff9e6', '#ffeeb3', '#ffe180', '#ffd44d', '#ffc61a',
      '#e6a800', '#b38300', '#805e00', '#4d3800', '#1a1300'
    ],
    gold: [
      '#fffbf0', '#fff3cc', '#ffe999', '#ffdf66', '#ffd433',
      '#f0bc00', '#bd9400', '#8a6c00', '#574400', '#241c00'
    ],
  },
  primaryColor: 'hop',
  defaultRadius: 'md',
  fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
  fontFamilyMonospace: 'ui-monospace, SFMono-Regular, monospace',
  headings: {
    fontFamily: 'Space Grotesk, Inter, sans-serif',
    fontWeight: '600',
  },
  components: {
    Paper: {
      defaultProps: {
        radius: 'lg',
      },
    },
    Card: {
      defaultProps: {
        radius: 'lg',
      },
    },
    Button: {
      defaultProps: {
        radius: 'md',
      },
    },
    Badge: {
      defaultProps: {
        radius: 'sm',
      },
    },
    MultiSelect: {
      defaultProps: {
        radius: 'md',
      },
    },
  },
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
