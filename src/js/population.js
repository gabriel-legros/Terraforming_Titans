class PopulationModule extends EffectableEntity {
    constructor(resources, populationParameters) {
      super({config : 'population module'})

      this.populationResource = resources.colony.colonists; // Reference to the population resource
      this.workerResource = resources.colony.workers; // Reference to the worker resource
      this.baseWorkerRatio = populationParameters.workerRatio;
      this.workerRatio = this.baseWorkerRatio; // Current ratio of colonists that become workers
      this.growthRate = 0; // Population growth rate, e.g., 0.01 for 1% per second
      this.totalWorkersRequired = 0;
      this.totalWorkersRequiredHigh = 0;
      this.totalWorkersRequiredNormal = 0;
      this.totalWorkersRequiredLow = 0;
      this.lastGrowthPerSecond = 0; // Tracks actual population change per second
      this.starvationShortage = 0;
      this.energyShortage = 0;
      this.componentsCoverage = 1;
      this.starvationDecayRate = 0;
      this.energyDecayRate = 0;
      this.gravityDecayRate = 0;
      this.gravityMitigation = 0;
    }

  getEffectiveGrowthMultiplier(){
    let multiplier = 1; // Start with default multiplier
    this.activeEffects.forEach(effect => {
      if (effect.type === 'growthMultiplier') {
        multiplier *= effect.value;
      }
    });
    return multiplier;
  }

  getEffectiveWorkerRatio(){
    let ratio = this.baseWorkerRatio;
    this.activeEffects.forEach(effect => {
      if(effect.type === 'workerRatio'){
        ratio = effect.value;
      }
    });
    return ratio;
  }

  getCurrentGrowthPerSecond(){
    return this.lastGrowthPerSecond;
  }

  getCurrentGrowthPercent(){
    const currentPopulation = this.populationResource.value;
    if(currentPopulation === 0) return 0;
    return (this.lastGrowthPerSecond / currentPopulation) * 100;
  }

  getWeightedNeedFulfillment(needKey) {
    let weightedFulfillment = 0;
    let totalCapacity = 0;

    for (const colonyName in colonies) {
      const colony = colonies[colonyName];
      const capacity = colony.active * colony.storage.colony.colonists;
      if (capacity <= 0) {
        continue;
      }

      const filledNeeds = colony.filledNeeds || {};
      const fulfillment = filledNeeds[needKey] ?? 0;

      weightedFulfillment += fulfillment * capacity;
      totalCapacity += capacity;
    }

    if (totalCapacity === 0) {
      return 1;
    }

    const averageFulfillment = weightedFulfillment / totalCapacity;
    return Math.min(1, Math.max(0, averageFulfillment));
  }

  calculateCapacityFactor(population, populationCap) {
    if (populationCap <= 0) {
      return 0;
    }
    const ratio = population / populationCap;
    if (ratio >= 1) {
      return 0;
    }
    return 1 - ratio;
  }
  
    calculateGrowthRate() {
      let totalWeightedHappiness = 0;
      let totalCapacity = 0;
      let growthRateDivider = 300;
    
      // Iterate through all colonies and sum their weighted happiness based on capacity
      for (const colonyName in colonies) {
        const colony = colonies[colonyName];
        const capacity = colony.active*colony.storage.colony.colonists; // Use capacity as weight
    
        // Only consider colonies with a valid capacity
        if (capacity > 0) {
          totalWeightedHappiness += colony.happiness * capacity;
          totalCapacity += capacity;
        }
      }
    
      // Calculate the weighted average happiness
      const weightedAverageHappiness = totalCapacity > 0 ? totalWeightedHappiness / totalCapacity : 0;
    
      // Calculate growth rate by subtracting 0.5 from the weighted average happiness
      const growthRate = (weightedAverageHappiness - 0.5) / growthRateDivider;
    
      return growthRate;
    }
  
    updatePopulation(deltaTime) {
      // Get the current population and population cap
      let currentPopulation = this.populationResource.value;
      const populationCap = this.populationResource.cap;

      // Crop tiny overages to the cap to avoid unnecessary decay
      if (
        currentPopulation > populationCap &&
        currentPopulation - populationCap < 0.01
      ) {
        this.populationResource.value = populationCap;
        currentPopulation = populationCap;
      }

      this.growthRate = Math.max(0, this.calculateGrowthRate());

      // Calculate logistic growth/decay
      const growthMultiplier = this.getEffectiveGrowthMultiplier();
      const capacityFactor = this.calculateCapacityFactor(currentPopulation, populationCap);
      const baseGrowthRate = Math.max(0, this.growthRate);
      const growthPerSecond = baseGrowthRate * currentPopulation * capacityFactor * growthMultiplier;

      // Calculate decay from shortages
      const seconds = deltaTime > 0 ? deltaTime / 1000 : 0;
      const starvationCoverage = this.getWeightedNeedFulfillment('food');
      const energyCoverage = this.getWeightedNeedFulfillment('energy');
      const componentsCoverage = this.getWeightedNeedFulfillment('components');

      this.starvationShortage = 1 - starvationCoverage;
      this.energyShortage = 1 - energyCoverage;
      this.componentsCoverage = componentsCoverage;

      this.starvationDecayRate = this.starvationShortage / 360;
      this.energyDecayRate = this.energyShortage / 90;

      const starvationDecayPerSecond = this.starvationDecayRate * currentPopulation;
      const energyDecayPerSecond = this.energyDecayRate * currentPopulation;

      const gravityValue = terraforming?.celestialParameters?.gravity ?? 0;
      const gravityExcess = Math.max(0, gravityValue - 20);
      const gravityRatePerSecond = gravityExcess === 0 ? 0 : (0.0001 * gravityExcess);
      const mechanicalAssistance = colonySliderSettings?.mechanicalAssistance ?? 0;
      const mitigation = Math.min(0.5, mechanicalAssistance * componentsCoverage * 0.5);
      this.gravityMitigation = mitigation;
      this.gravityDecayRate = gravityRatePerSecond * (1 - mitigation);
      const gravityDecayPerSecond = this.gravityDecayRate * currentPopulation;

      const totalDecayPerSecond = starvationDecayPerSecond + energyDecayPerSecond + gravityDecayPerSecond;
      const netPerSecond = growthPerSecond - totalDecayPerSecond;

      this.lastGrowthPerSecond = netPerSecond;
      const populationChange = netPerSecond * seconds;

      if (growthPerSecond > 0) {
        this.populationResource.modifyRate(growthPerSecond, 'Population Growth', 'population');
      }
      if (starvationDecayPerSecond > 0) {
        this.populationResource.modifyRate(-starvationDecayPerSecond, 'Starvation', 'population');
      }
      if (energyDecayPerSecond > 0) {
        this.populationResource.modifyRate(-energyDecayPerSecond, 'Energy Shortage', 'population');
      }
      if (gravityDecayPerSecond > 0) {
        this.populationResource.modifyRate(-gravityDecayPerSecond, 'Gravity Strain', 'population');
      }

      // Apply the population change and update production/consumption rates
      if (populationChange > 0) {
        this.populationResource.increase(populationChange);
      } else if (populationChange < 0) {
        this.populationResource.decrease(-populationChange);
      }

      if(currentPopulation < 1)
      {
        this.populationResource.value = 0;
      }
    // Update worker requirements based on active buildings
    this.updateWorkerRequirements();

    // Update worker cap based on current population and worker ratio
    this.updateWorkerCap();

    this.workerResource.value = this.workerResource.cap - this.totalWorkersRequired;
  }

  updateWorkerCap() {
    // Set the worker cap based on the current population and worker ratio
    const ratio = this.getEffectiveWorkerRatio();
    const storedAndroids = resources.colony.androids.value;
    const androidCap = resources.colony.androids.cap;
    let effectiveAndroids = Math.min(storedAndroids, androidCap);

    let assignedAndroids = (typeof projectManager !== 'undefined' && typeof projectManager.getAssignedAndroids === 'function') ? projectManager.getAssignedAndroids() : 0;

    if (typeof projectManager !== 'undefined' && typeof projectManager.forceUnassignAndroids === 'function') {
      if (assignedAndroids > effectiveAndroids) {
        const toUnassign = Math.ceil(assignedAndroids - effectiveAndroids);
        projectManager.forceUnassignAndroids(toUnassign);
        assignedAndroids = projectManager.getAssignedAndroids();
      }
    }

    const availableAndroids = Math.max(0, effectiveAndroids - assignedAndroids);

    const workerCap =
      Math.floor(ratio * this.populationResource.value) +
      availableAndroids +
      this.getBioworkerContribution();
    this.workerResource.cap = workerCap;

    // Adjust the worker value if it exceeds the cap
    if (this.workerResource.value > workerCap) {
      this.workerResource.value = workerCap;
    }

  }

  updateWorkerRequirements() {
    let totalWorkersRequired = 0;
    const totals = { high: 0, normal: 0, low: 0 };

    // Calculate total workers required based on active buildings
    for (const buildingName in buildings) {
      const building = buildings[buildingName];
      if (building.active > 0 && building.getTotalWorkerNeed() > 0) {
        const req = building.active * (building.getTotalWorkerNeed()) * building.getEffectiveWorkerMultiplier();
        totalWorkersRequired += req;
        const level = building.workerPriority > 0 ? 'high' : building.workerPriority < 0 ? 'low' : 'normal';
        totals[level] += req;
      }
    }

    this.totalWorkersRequired = totalWorkersRequired; // Store the total workers required
    this.totalWorkersRequiredHigh = totals.high;
    this.totalWorkersRequiredNormal = totals.normal;
    this.totalWorkersRequiredLow = totals.low;
  }

  // Method to return the ratio of available workers to required workers
  getWorkerAvailabilityRatio(priority) {
    if (this.totalWorkersRequired === 0) {
      return 1; // If no workers are required, ratio is 1 (everything is fulfilled)
    }

    const tiers = [
      { req: this.totalWorkersRequiredHigh, match: priority > 0 },
      { req: this.totalWorkersRequiredNormal, match: priority === 0 },
      { req: this.totalWorkersRequiredLow, match: priority < 0 }
    ];

    let remaining = this.workerResource.cap;
    for (const t of tiers) {
      if (t.match) {
        return t.req === 0 ? 1 : Math.min(1, remaining / t.req);
      }
      remaining = Math.max(0, remaining - t.req);
    }
    return 1;
  }

  applyWorkerRatio(effect){
    this.workerRatio = effect.value;
  }

  getBioworkerContribution() {
    try {
      const design = lifeDesigner.currentDesign;
      if (!design || !design.bioworkforce) {
        return 0;
      }
      const points = design.bioworkforce.value;
      if (points <= 0) {
        return 0;
      }
      const biomass = resources.surface?.biomass;
      if (!biomass || biomass.value <= 0) {
        return 0;
      }
      return Math.floor(biomass.value * points * 0.00001);
    } catch (error) {
      return 0;
    }
  }
}
