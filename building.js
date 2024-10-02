// Building Class (Core Game Logic)
class Building {
  constructor(name, description, cost, consumption, production, storage, dayNightActivity, canBeToggled, maintenanceFraction, maintenanceFactor, requiresMaintenance, requiresDeposit, unlocked) {
    this.name = name;
    this.description = description;
    this.cost = cost;
    this.consumption = consumption;
    this.production = production;
    this.storage = storage;
    this.dayNightActivity = dayNightActivity;
    this.canBeToggled = canBeToggled;
    this.requiresMaintenance = requiresMaintenance;
    this.maintenanceFraction = maintenanceFraction; // Fraction of the original cost used for maintenance
    this.maintenanceFactor = maintenanceFactor; // Additional factor applied to the maintenance
    this.requiresDeposit = requiresDeposit;
    this.unlocked = unlocked; // New property to track building availability
    this.count = 0;
    this.active = 0;
    this.productivity = 0;

    this.maintenanceCost = this.calculateMaintenanceCost();
    this.currentProduction = {};
    this.currentConsumption = {};
    this.currentMaintenance = {}; // Track current maintenance cost

    this.productionMultiplier = 1; // Default production multiplier is 1
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

  produce(resources, deltaTime) {
    this.currentProduction = {}; // Reset current production

    for (const category in this.production) {
      if (!this.currentProduction[category]) {
        this.currentProduction[category] = {};
      }

      for (const resource in this.production[category]) {
        const baseProduction = this.active * this.production[category][resource] * this.productionMultiplier;
        const scaledProduction = baseProduction * this.productivity * (deltaTime / 1000);
        const remainingCapacity = resources[category][resource].cap - resources[category][resource].value;
        const actualProduction = Math.min(scaledProduction, remainingCapacity);
        
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

  // Method to apply a production multiplier from research effects
  applyProductionMultiplier(multiplier) {
    this.productionMultiplier *= multiplier;
    console.log(`Applied production multiplier of ${multiplier} to ${this.name}. New multiplier: ${this.productionMultiplier}`);
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
    buildings[buildingName] = new Building(
      buildingData.name,
      buildingData.description,
      buildingData.cost,
      buildingData.consumption,
      buildingData.production,
      buildingData.storage,
      buildingData.dayNightActivity,
      buildingData.canBeToggled,
      maintenanceFraction,
      buildingData.maintenanceFactor,
      buildingData.requiresMaintenance,
      buildingData.requiresDeposit,
      buildingData.unlocked // New property to track if building is unlocked from the start
    );
  }
  return buildings;
}
