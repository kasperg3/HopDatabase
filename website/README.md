# Hop Comparison Tool

A modern React-based web application for comparing hop aroma profiles using interactive spider charts. Built with Material-UI and Plotly.js.

## 🚀 Live Demo

Visit the live application at: [https://kasperg3.github.io/HopDatabase](https://kasperg3.github.io/HopDatabase)

## ✨ Features

- **Interactive Spider Charts**: Compare up to 5 hops simultaneously with beautiful radar charts
- **Material-UI Design**: Modern, responsive interface with clean design
- **Comprehensive Data**: Sourced from Hopsteiner, BarthHaas, and Yakima Chief Hops
- **Detailed Comparisons**: View side-by-side comparisons of hop properties
- **Mobile Responsive**: Works seamlessly on desktop, tablet, and mobile devices

## 🔧 Technology Stack

- **React 18**: Modern React with hooks
- **Material-UI (MUI)**: Beautiful, accessible component library
- **Plotly.js**: Interactive charting library for spider/radar charts
- **GitHub Pages**: Automatic deployment via GitHub Actions

## 🏗️ Development

### Prerequisites

- Node.js 18 or higher
- npm

### Local Development

1. Clone the repository:
```bash
git clone https://github.com/kasperg3/HopDatabase.git
cd HopDatabase/website
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm start
```

4. Open [http://localhost:3000](http://localhost:3000) to view it in the browser.

### Building for Production

```bash
npm run build
```

This builds the app for production to the `build` folder.

## 📊 Data Sources

The application uses hop data from three major sources:

- **Hopsteiner**: Premium hop varieties with detailed aroma profiles
- **BarthHaas**: Comprehensive hop database with global varieties
- **Yakima Chief Hops**: American hop varieties with detailed specifications

## 🎯 Aroma Categories

The spider chart compares hops across 9 key aroma categories:

- Citrus
- Resin/Pine
- Spice
- Herbal
- Grassy
- Floral
- Berry
- Stone Fruit
- Tropical Fruit

Each category is rated on a scale of 0-5, allowing for precise comparison of hop characteristics.

## 🚀 Deployment

The application is automatically deployed to GitHub Pages using GitHub Actions. Any push to the main branch triggers a new deployment.

## 📱 Mobile Support

The application is fully responsive and provides an excellent experience on:
- Desktop computers
- Tablets
- Mobile phones

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](../LICENSE) file for details.

## 🙏 Acknowledgments

- Data providers: Hopsteiner, BarthHaas, and Yakima Chief Hops
- React and Material-UI communities
- Plotly.js for excellent charting capabilities
