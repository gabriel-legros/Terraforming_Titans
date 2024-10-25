// Building Class (Core Game Logic)
class Building extends EffectableEntity {
  constructor(config, buildingName) {
    super(config); // Call the base class constructor

    // Destructure configuration object to set properties specific to Building
    this.initializeFromConfig(config, buildingName);

    //Everything above can change through updates

    this.count = 0;
    this.active = 0;
    this.productivity = 1;

    this.maintenanceCost = this.calculateMaintenanceCost();
    this.currentProduction = {};
    this.currentConsumption = {};
    this.currentMaintenance = {};
  }

    // Method to initialize configurable properties
    initializeFromConfig(config, buildingName) {
      const {
        name,
        category,
        description,
        cost,
        consumption,
        production,
        storage,
        dayNightActivity,
        canBeToggled,
        maintenanceFactor,
        requiresMaintenance,
        requiresDeposit,
        requiresWorker, // Added requiresWorker to the destructured properties
        unlocked,
        surfaceArea
      } = config;
  
      this.name = buildingName;
      this.displayName = name;
      this.category = category;
      this.description = description;
      this.cost = cost;
      this.consumption = consumption;
      this.production = production;
      this.storage = storage;
      this.dayNightActivity = dayNightActivity;
      this.canBeToggled = canBeToggled;
      this.requiresMaintenance = requiresMaintenance;
      this.maintenanceFactor = requiresMaintenance ? maintenanceFactor : 0;
      this.requiresDeposit = requiresDeposit;
      this.requiresWorker = requiresWorker || 0; // Set default to 0 if not provided
      this.unlocked = unlocked;
      this.surfaceArea = surfaceArea;

      this.updateResourceStorage();
    }

  // Method to get the effective production multiplier
  getEffectiveProductionMultiplier() {
    let multiplier = 1; // Start with default multiplier
    this.activeEffects.forEach(effect => {
      if (effect.type === 'productionMultiplier') {
        multiplier *= effect.value;
      }
    });
    return multiplier;
  }

  // Method to get the effective production multiplier
  getEffectiveConsumptionMultiplier() {
    let multiplier = 1; // Start with default multiplier
    this.activeEffects.forEach(effect => {
      if (effect.type === 'consumptionMultiplier') {
        multiplier *= effect.value;
      }
    });
    return multiplier;
  }

  // Method to get the effective production multiplier
  getEffectiveWorkerMultiplier() {
    let multiplier = 1; // Start with default multiplier
    this.activeEffects.forEach(effect => {
      if (effect.type === 'workerMultiplier') {
        multiplier *= effect.value;
      }
    });
    return multiplier;
  }

  // Method to get the effective storage multiplier
  getEffectiveStorageMultiplier() {
    let multiplier = 1; // Start with default multiplier
    this.activeEffects.forEach(effect => {
      if (effect.type === 'storageMultiplier') {
        multiplier *= effect.value;
      }
    });
    return multiplier;
  }

  getEffectiveResourceConsumptionMultiplier(category, resource){
    let multiplier = 1; // Start with default multiplier
    this.activeEffects.forEach(effect => {
      if (effect.type === 'resourceConsumptionMultiplier' && effect.resourceCategory === category && effect.resourceTarget === resource) {
        multiplier *= effect.value;
      }
    });
    return multiplier;
  }

  getEffectiveResourceProductionMultiplier(category, resource){
    let multiplier = 1; // Start with default multiplier
    this.activeEffects.forEach(effect => {
      if (effect.type === 'resourceProductionMultiplier' && effect.resourceCategory === category && effect.resourceTarget === resource) {
        multiplier *= effect.value;
      }
    });
    return multiplier;
  }

  getConsumptionRatio(){
    return 1;
  }

  calculateMaintenanceCost() {
    const maintenanceCost = {};
    for (const resource in this.cost['colony']) {
      const resourceCost = this.cost['colony'][resource];
      maintenanceCost[resource] = resourceCost * maintenanceFraction * this.maintenanceFactor;
    }
    return maintenanceCost;
  }

  canAfford(buildCount = 1) {
    for (const category in this.cost) {
      for (const resource in this.cost[category]) {
        if (resources[category][resource].value < this.cost[category][resource] * buildCount) {
          return false;
        }
      }
    }
    if (this.requiresDeposit) {
      for (const deposit in this.requiresDeposit.underground) {
        if (!resources.underground[deposit] || resources.underground[deposit].value - resources.underground[deposit].reserved < this.requiresDeposit.underground[deposit] * buildCount) {
          return false;
        }
      }
    }
    return true;
  }

  build(buildCount = 1) {
    if (this.canAfford(buildCount)) {
      for (const category in this.cost) {
        for (const resource in this.cost[category]) {
          resources[category][resource].decrease(this.cost[category][resource] * buildCount);
        }
      }
      if (this.requiresDeposit) {
        for (const deposit in this.requiresDeposit.underground) {
          resources['underground'][deposit].reserve(this.requiresDeposit.underground[deposit] * buildCount);
        }
      }
      this.count += buildCount;
      this.active += buildCount;
      this.updateResourceStorage();
      return true;
    }
    return false;
  }

  buildStructure(buildCount = 1) {
    if (this.build(buildCount)) {
      this.updateResourceStorage();
    } else {
      console.log(`Insufficient resources to build ${buildCount} ${this.name}(s)`);
    }
  }

  releaseDeposit(resources, releaseCount = 1) {
    if (this.requiresDeposit) {
      for (const deposit in this.requiresDeposit.underground) {
        resources.underground[deposit].release(this.requiresDeposit.underground[deposit] * releaseCount);
      }
    }
  }

  // Method to calculate the base minRatio based on resource consumption and worker availability
  calculateBaseMinRatio(resources, deltaTime) {
    let minRatio = Infinity;

    // Calculate minRatio based on resource consumption
    for (const category in this.consumption) {
      for (const resource in this.consumption[category]) {
        const requiredAmount = resources[category][resource].consumptionRate * (deltaTime / 1000);
        if (requiredAmount === 0) continue;
        const availableAmount = resources[category][resource].value + resources[category][resource].productionRate*(deltaTime / 1000);
        if (availableAmount < requiredAmount) {
          minRatio = Math.min(minRatio, Math.max(availableAmount / requiredAmount,0));
        } else {
          minRatio = Math.min(minRatio, 1);
        }
      }
    }

    // Calculate minRatio based on worker availability if applicable
    if (this.requiresWorker) {
      const workerRatio = populationModule.getWorkerAvailabilityRatio();
      minRatio = Math.min(minRatio, workerRatio);
    }

    return minRatio;
  }

  updateProductivity(resources, deltaTime) {
    const targetProductivity = Math.max(0, Math.min(1, this.calculateBaseMinRatio(resources, deltaTime)));
    if(Math.abs(targetProductivity - this.productivity) < 0.001){
      this.productivity = targetProductivity;
    }
    else {
      const difference = Math.abs(targetProductivity - this.productivity);
      const dampingFactor = difference < 0.2 ? 0.01 : 0.1; // Use smaller damping if close to target
      this.productivity += dampingFactor * (targetProductivity - this.productivity);
    }
  }

  // Updated produce function to track production rates
  produce(accumulatedChanges, deltaTime) {
    const effectiveMultiplier = this.getEffectiveProductionMultiplier();

    // Calculate production using effectiveMultiplier and accumulate changes
    for (const category in this.production) {
      if (!this.currentProduction[category]) {
        this.currentProduction[category] = {};
      }

      for (const resource in this.production[category]) {
        const baseProduction = this.active * this.production[category][resource] * effectiveMultiplier * this.getEffectiveResourceProductionMultiplier(category, resource);
        const scaledProduction = baseProduction * this.productivity * (deltaTime / 1000);

        // Track actual production in the building
        this.currentProduction[category][resource] = scaledProduction;

        // Accumulate production changes
        accumulatedChanges[category][resource] = (accumulatedChanges[category][resource] || 0) + scaledProduction;

        // Update production rate for the resource
        resources[category][resource].productionRate = (resources[category][resource].productionRate || 0) + (scaledProduction * (1000 / deltaTime));
      }
    }
  }

  // Updated consume function to track consumption rates
  consume(accumulatedChanges, deltaTime) {
    this.currentConsumption = {}; // Reset current consumption

    // Calculate consumption and accumulate changes
    for (const category in this.consumption) {
      if (!this.currentConsumption[category]) {
        this.currentConsumption[category] = {};
      }

      for (const resource in this.consumption[category]) {
        const baseConsumption = this.active * this.consumption[category][resource] * this.getEffectiveResourceConsumptionMultiplier(category, resource);
        const scaledConsumption = baseConsumption * this.productivity * (deltaTime / 1000);

        // Track actual consumption in the building
        this.currentConsumption[category][resource] = scaledConsumption;

        // Accumulate consumption changes (as negative values)
        accumulatedChanges[category][resource] = (accumulatedChanges[category][resource] || 0) - scaledConsumption;

        // Update consumption rate for the resource
        resources[category][resource].consumptionRate = (resources[category][resource].consumptionRate || 0) + (scaledConsumption * (1000 / deltaTime));
      }
    }
  }

  applyMaintenance(accumulatedChanges, accumulatedMaintenance, deltaTime) {
    this.maintenanceCost = this.calculateMaintenanceCost();
    this.currentMaintenance = {}; // Reset current maintenance

    // Calculate maintenance and accumulate changes
    for (const resource in this.maintenanceCost) {
      if (resources.colony[resource]) {
        const baseMaintenanceCost = this.maintenanceCost[resource] * this.active;
        const maintenanceCost = baseMaintenanceCost * (deltaTime / 1000) * this.productivity;

        // Track current maintenance in the building
        this.currentMaintenance[resource] = maintenanceCost;

        // Accumulate maintenance changes (as negative values)
        accumulatedChanges['colony'][resource] = (accumulatedChanges['colony'][resource] || 0) - maintenanceCost;

        // Update consumption rate for maintenance costs
        resources['colony'][resource].consumptionRate = (resources['colony'][resource].consumptionRate || 0) + (maintenanceCost * (1000 / deltaTime));

        // Accumulate maintenance costs in the accumulatedMaintenance object
        accumulatedMaintenance[resource] = (accumulatedMaintenance[resource] || 0) + maintenanceCost;

        // If the resource is water, also add the maintenance cost to the atmospheric water resource
        if (resource === 'water') {
          accumulatedChanges['atmospheric']['atmosphericWater'] = (accumulatedChanges['atmospheric']['atmosphericWater'] || 0) + maintenanceCost;
          resources['atmospheric']['atmosphericWater'].productionRate = (resources['atmospheric']['atmosphericWater'].productionRate || 0) + (maintenanceCost * (1000 / deltaTime));
        }
      }
    }
  }

  // Method to update storage capacity in resources after building changes
  updateResourceStorage() {
    for (const category in this.storage) {
      for (const resource in this.storage[category]) {
        resources[category][resource].updateStorageCap(buildings);
      }
    }
  }

  enable() {
    this.unlocked = true;
  }
}

function initializeBuildings(buildingsParameters) {
  const buildings = {};
  for (const buildingName in buildingsParameters) {
    const buildingData = buildingsParameters[buildingName];

    // Add maintenanceFraction to the building configuration
    const buildingConfig = {
      ...buildingData
    };

    buildings[buildingName] = new Building(buildingConfig, buildingName);
  }
  initializeBuildingTabs();
  return buildings;
}