class PopulationModule {
    constructor(resources, populationParameters) {
      this.populationResource = resources.colony.colonists; // Reference to the population resource
      this.workerResource = resources.colony.workers; // Reference to the worker resource
      this.workerRatio = populationParameters.workerRatio; // Ratio of colonists that become workers
      this.growthRate = 0; // Population growth rate, e.g., 0.01 for 1% per second
      this.totalWorkersRequired = 0;
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
      } else if (currentPopulation > populationCap && currentPopulation > 0) {
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
    // Update worker requirements based on active buildings
    this.updateWorkerRequirements();

    // Update worker cap based on current population and worker ratio
    this.updateWorkerCap();

    this.workerResource.value = Math.max(0, this.workerResource.cap - this.totalWorkersRequired);
  }

  updateWorkerCap() {
    // Set the worker cap based on the current population and worker ratio
    const workerCap = Math.floor(this.workerRatio * this.populationResource.value);
    this.workerResource.cap = workerCap;

    // Adjust the worker value if it exceeds the cap
    if (this.workerResource.value > workerCap) {
      this.workerResource.value = workerCap;
    }

  }

  updateWorkerRequirements() {
    let totalWorkersRequired = 0;

    // Calculate total workers required based on active buildings
    for (const buildingName in buildings) {
      const building = buildings[buildingName];
      if (building.active > 0 && building.requiresWorker > 0) {
        totalWorkersRequired += building.active * building.requiresWorker;
      }
    }

    this.totalWorkersRequired = totalWorkersRequired; // Store the total workers required
  }

  // Method to return the ratio of available workers to required workers
  getWorkerAvailabilityRatio() {
    if (this.totalWorkersRequired === 0) {
      return 1; // If no workers are required, ratio is 1 (everything is fulfilled)
    }
    return this.workerResource.cap / this.totalWorkersRequired;
  }
}
