// Building Class (Core Game Logic)
class Building extends EffectableEntity {
  constructor(config) {
    super(config); // Call the base class constructor

    // Destructure configuration object to set properties specific to Building
    const {
      cost,
      consumption,
      production,
      storage,
      dayNightActivity,
      canBeToggled,
      maintenanceFraction,
      maintenanceFactor,
      requiresMaintenance,
      requiresDeposit,
      unlocked,
    } = config;

    this.cost = cost;
    this.consumption = consumption;
    this.production = production;
    this.storage = storage;
    this.dayNightActivity = dayNightActivity;
    this.canBeToggled = canBeToggled;
    this.requiresMaintenance = requiresMaintenance;
    this.maintenanceFraction = maintenanceFraction;
    this.maintenanceFactor = maintenanceFactor;
    this.requiresDeposit = requiresDeposit;
    this.unlocked = unlocked;
    this.count = 0;
    this.active = 0;
    this.productivity = 0;

    this.maintenanceCost = this.calculateMaintenanceCost();
    this.currentProduction = {};
    this.currentConsumption = {};
    this.currentMaintenance = {};
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

  calculateMaintenanceCost() {
    const maintenanceCost = {};
    for (const resource in this.cost['colony']) {
      const resourceCost = this.cost['colony'][resource];
      maintenanceCost[resource] = resourceCost * this.maintenanceFraction * this.maintenanceFactor;
    }
    return maintenanceCost;
  }

  canAfford(resources) {
    for (const category in this.cost) {
      for (const resource in this.cost[category]) {
        if (resources[category][resource].value < this.cost[category][resource]) {
          return false;
        }
      }
    }
    if (this.requiresDeposit) {
      for (const deposit in this.requiresDeposit.underground) {
        if (!resources.underground[deposit] || resources.underground[deposit].value - resources.underground[deposit].reserved < this.requiresDeposit.underground[deposit]) {
          return false;
        }
      }
    }
    return true;
  }

  build(resources) {
    if (this.canAfford(resources)) {
      for (const category in this.cost) {
        for (const resource in this.cost[category]) {
          resources[category][resource].decrease(this.cost[category][resource]);
        }
      }
      if (this.requiresDeposit) {
        for (const deposit in this.requiresDeposit.underground) {
          resources['underground'][deposit].reserve(this.requiresDeposit.underground[deposit]);
        }
      }
      this.count++;
      this.active++;
      return true;
    }
    return false;
  }

  releaseDeposit(resources) {
    if (this.requiresDeposit) {
      for (const deposit in this.requiresDeposit.underground) {
        resources.underground[deposit].release(this.requiresDeposit.underground[deposit]);
      }
    }
  }

  updateProductivity(resources, deltaTime) {
    let minRatio = Infinity;
    for (const category in this.consumption) {
      for (const resource in this.consumption[category]) {
        const requiredAmount = this.consumption[category][resource] * this.active * (deltaTime / 1000);
        if (requiredAmount === 0) continue;
        const availableAmount = resources[category][resource].value;
        if (availableAmount < requiredAmount) {
          minRatio = Math.min(minRatio, availableAmount / requiredAmount);
        } else {
          minRatio = Math.min(minRatio, 1);
        }
      }
    }
    this.productivity = Math.max(0, Math.min(1, minRatio));
  }

  // Update production multiplier usage to dynamically calculate it
  produce(resources, deltaTime) {
    const effectiveMultiplier = this.getEffectiveProductionMultiplier();

    // Rest of production logic using effectiveMultiplier instead of a static value
    for (const category in this.production) {
      if (!this.currentProduction[category]) {
        this.currentProduction[category] = {};
      }

      for (const resource in this.production[category]) {
        const baseProduction = this.active * this.production[category][resource] * effectiveMultiplier;
        const scaledProduction = baseProduction * this.productivity * (deltaTime / 1000);
        const remainingCapacity = resources[category][resource].cap - resources[category][resource].value;
        const actualProduction = Math.max(Math.min(scaledProduction, remainingCapacity),0);

        // Track actual production
        this.currentProduction[category][resource] = actualProduction;

        // Increase resource value
        resources[category][resource].increase(actualProduction);
      }
    }
  }

  consume(resources, deltaTime) {
    this.currentConsumption = {}; // Reset current consumption

    for (const category in this.consumption) {
      if (!this.currentConsumption[category]) {
        this.currentConsumption[category] = {};
      }

      for (const resource in this.consumption[category]) {
        const baseConsumption = this.active * this.consumption[category][resource];
        const scaledConsumption = baseConsumption * this.productivity * (deltaTime / 1000);

        // Track actual consumption
        this.currentConsumption[category][resource] = scaledConsumption;

        // Decrease resource value
        resources[category][resource].decrease(scaledConsumption);
      }
    }
  }

  applyMaintenance(resources, deltaTime) {
    this.maintenanceCost = this.calculateMaintenanceCost();
    this.currentMaintenance = {}; // Reset current maintenance

    for (const resource in this.cost.colony) {
      if (resources.colony[resource]) {
        const baseMaintenanceCost = this.maintenanceCost[resource] * this.active;
        const maintenanceCost = baseMaintenanceCost * (deltaTime / 1000) * this.productivity;

        // Track current maintenance
        this.currentMaintenance[resource] = maintenanceCost;

        // Decrease resource value
        resources.colony[resource].decrease(maintenanceCost);
      }
    }
  }

  setStorage(resources) {
    for (const category in this.storage) {
      for (const resource in this.storage[category]) {
        resources[category][resource].cap = this.active * this.storage[category][resource];
      }
    }
  }

  buildStructure(resources) {
    if (this.build(resources)) {
      this.setStorage(resources);
    } else {
      console.log(`Insufficient resources to build ${this.name}`);
    }
  }

  enable() {
    this.unlocked = true;
  }
}

function initializeBuildings(buildingsParameters, maintenanceFraction) {
  const buildings = {};
  for (const buildingName in buildingsParameters) {
    const buildingData = buildingsParameters[buildingName];

    // Add maintenanceFraction to the building configuration
    const buildingConfig = {
      ...buildingData,
      maintenanceFraction: maintenanceFraction
    };

    buildings[buildingName] = new Building(buildingConfig);
  }
  return buildings;
}