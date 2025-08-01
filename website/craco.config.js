const path = require('path');

module.exports = {
  webpack: {
    configure: (webpackConfig, { env, paths }) => {
      // Only apply optimizations in production
      if (env === 'production') {
        // Enable aggressive chunk splitting for better caching and loading
        webpackConfig.optimization = {
          ...webpackConfig.optimization,
          splitChunks: {
            chunks: 'all',
            minSize: 20000,
            maxSize: 244000,
            cacheGroups: {
              // Create separate chunk for plotly (it's large)
              plotly: {
                test: /[\\/]node_modules[\\/](plotly\.js|react-plotly\.js)/,
                name: 'plotly',
                chunks: 'all',
                priority: 30,
                enforce: true,
              },
              // Create separate chunk for recharts
              recharts: {
                test: /[\\/]node_modules[\\/](recharts)/,
                name: 'recharts', 
                chunks: 'all',
                priority: 25,
                enforce: true,
              },
              // Create separate chunk for Mantine UI
              mantine: {
                test: /[\\/]node_modules[\\/](@mantine)/,
                name: 'mantine',
                chunks: 'all',
                priority: 20,
                enforce: true,
              },
              // Create separate chunk for Tabler icons
              icons: {
                test: /[\\/]node_modules[\\/](@tabler)/,
                name: 'icons',
                chunks: 'all',
                priority: 15,
                enforce: true,
              },
              // Default vendor chunk for other node_modules
              vendor: {
                test: /[\\/]node_modules[\\/]/,
                name: 'vendor',
                chunks: 'all',
                priority: 10,
              },
              // Common chunk for shared code
              common: {
                name: 'common',
                minChunks: 2,
                chunks: 'all',
                priority: 5,
                reuseExistingChunk: true,
              },
            },
          },
        };

        // Minimize and optimize
        webpackConfig.optimization.minimize = true;
        
        // Add module concatenation for better tree shaking
        webpackConfig.optimization.concatenateModules = true;
        
        // Remove console logs in production
        if (webpackConfig.optimization.minimizer && webpackConfig.optimization.minimizer[0] && webpackConfig.optimization.minimizer[0].options) {
          const terserOptions = webpackConfig.optimization.minimizer[0].options.terserOptions || {};
          webpackConfig.optimization.minimizer[0].options.terserOptions = {
            ...terserOptions,
            compress: {
              ...(terserOptions.compress || {}),
              drop_console: true,
              drop_debugger: true,
            },
          };
        }
      }

      return webpackConfig;
    },
  },
};
