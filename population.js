class PopulationModule {
    constructor(resources) {
      this.populationResource = resources.colony.colonists; // Reference to the population resource
      this.growthRate = 0; // Population growth rate, e.g., 0.01 for 1% per second
    }
  
    setGrowthRate(growthRate) {
      this.growthRate = growthRate;
    }
  
    updatePopulation(deltaTime) {
      // Get the current population and population cap
      const currentPopulation = this.populationResource.value;
      const populationCap = this.populationResource.cap;
  
      // Calculate logistic growth/decay
      let populationChange = 0;
  
      if (this.growthRate > 0 && populationCap > 0) {
        // Logistic growth formula: dP/dt = r * P * (1 - P / K)
        const logisticGrowth = this.growthRate * currentPopulation * (1 - currentPopulation / populationCap);
        populationChange = logisticGrowth * (deltaTime / 1000);
      } else if (this.growthRate < 0) {
        // Decay even if population is above the cap
        const decayRate = this.growthRate * currentPopulation;
        populationChange = decayRate * (deltaTime / 1000);
      } else if (populationCap === 0 && currentPopulation > 0) {
        // Decay when cap is 0
        const decayRate = -0.1 * currentPopulation;
        populationChange = decayRate * (deltaTime / 1000);
      }
  
      // Apply the population change and update production/consumption rates
      if (populationChange > 0) {
        this.populationResource.increase(populationChange);
        this.populationResource.productionRate = populationChange * (1000 / deltaTime);
        this.populationResource.consumptionRate = 0; // No consumption if increasing
      } else if (populationChange < 0) {
        this.populationResource.decrease(-populationChange);
        this.populationResource.consumptionRate = -populationChange * (1000 / deltaTime);
        this.populationResource.productionRate = 0; // No production if decreasing
      }

      if(currentPopulation < 1)
      {
        this.populationResource.value = 0;
      }
    }
  }