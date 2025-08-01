class HopDataService {
  static instance = null;
  static cachedData = null;

  static getInstance() {
    if (!HopDataService.instance) {
      HopDataService.instance = new HopDataService();
    }
    return HopDataService.instance;
  }

  async loadHopData() {
    if (HopDataService.cachedData) {
      return HopDataService.cachedData;
    }

    try {
      const response = await fetch('/HopDatabase/data/hops.json');
      if (!response.ok) {
        throw new Error(`Failed to fetch: ${response.status}`);
      }
      
      const rawData = await response.json();
      const processedData = this.processHopData(rawData);
      
      HopDataService.cachedData = processedData;
      return processedData;
    } catch (error) {
      console.error('Error loading hop data:', error);
      return [];
    }
  }

  processHopData(rawData) {
    return rawData.map(hop => ({
      ...hop,
      uniqueId: `${hop.name} (${hop.source})`,
      avgAlpha: this.getAverage(hop.alpha_from, hop.alpha_to),
      avgBeta: this.getAverage(hop.beta_from, hop.beta_to),
      avgOil: this.getAverage(hop.oil_from, hop.oil_to),
      avgCohumulone: this.getAverage(hop.co_h_from, hop.co_h_to),
    }));
  }

  getAverage(from, to) {
    const fromVal = this.parseValue(from);
    const toVal = this.parseValue(to);
    if (fromVal === 0 && toVal === 0) return 0;
    return (fromVal + toVal) / 2;
  }

  parseValue(value) {
    if (typeof value === 'number') return value;
    if (typeof value === 'string') {
      const cleaned = value.replace(/[^\d.]/g, '');
      const parsed = parseFloat(cleaned);
      return isNaN(parsed) ? 0 : parsed;
    }
    return 0;
  }
}

export default HopDataService;
