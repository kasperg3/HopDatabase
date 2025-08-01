import { useMemo } from 'react';
import {
  normalizeAlpha,
  normalizeBeta,
  normalizeOil,
  normalizeCohumulone,
  normalizeBetaAlpha,
} from '../../utils/hopUtils';

export const useRadarChartData = (processedHops) => {
  const radarData = useMemo(() => {
    const categories = ['Alpha Acid', 'Beta Acid', 'Oil Content', 'Cohumulone', 'β/α Ratio'];
    
    return categories.map(category => {
      const dataPoint = { category };
      
      processedHops.forEach((hop) => {
        let normalizedValue = 0;
        
        switch (category) {
          case 'Alpha Acid':
            normalizedValue = normalizeAlpha(hop.avgAlpha);
            break;
          case 'Beta Acid':
            normalizedValue = normalizeBeta(hop.avgBeta);
            break;
          case 'Oil Content':
            normalizedValue = normalizeOil(hop.avgOil);
            break;
          case 'Cohumulone':
            normalizedValue = normalizeCohumulone(hop.avgCohumulone);
            break;
          case 'β/α Ratio':
            normalizedValue = normalizeBetaAlpha(hop.betaAlphaRatio);
            break;
          default:
            normalizedValue = 0;
            break;
        }
        
        dataPoint[hop.name] = Math.round(normalizedValue * 10) / 10;
      });
      
      return dataPoint;
    });
  }, [processedHops]);

  return radarData;
};
