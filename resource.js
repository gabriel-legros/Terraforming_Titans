// Resource Class and Core Logic
class Resource {
  constructor(resourceData) {
    this.name = resourceData.name || '';
    this.displayName = resourceData.displayName || resourceData.name || '';
    this.value = resourceData.initialValue || 0;
    this.hasCap = resourceData.hasCap || false;
    this.baseCap = resourceData.baseCap || 0; // Store the base capacity of the resource
    this.cap = this.hasCap ? this.baseCap : Infinity; // Set the initial cap
    this.baseProductionRate = 0;
    this.productionRate = 0; // Rate of production per second
    this.consumptionRate = 0; // Rate of consumption per second
    this.reserved = resourceData.reserved || 0;
  }

  increase(amount) {
    if(amount > 0){
      this.value = Math.min(this.value + amount, this.cap);
    }
  }

  decrease(amount) {
    this.value = Math.max(this.value - amount, 0);
  }

  isAvailable(amount) {
    return this.value - this.reserved >= amount;
  }

  reserve(amount) {
    if (this.isAvailable(amount)) {
      this.reserved += amount;
      return true;
    }
    return false;
  }

  release(amount) {
    this.reserved = Math.max(this.reserved - amount, 0);
  }

  addDeposit(amount = 1) {
    this.increase(amount);
  }

  resetBaseProductionRate() {
    this.baseProductionRate = 0;
  }

  // Method to update the storage cap based on active buildings
  updateStorageCap(buildings) {
    let newCap = this.baseCap; // Start with the base capacity
    for (const buildingName in buildings) {
      const building = buildings[buildingName];
      if (building.storage && building.active > 0) {
        if (building.storage.colony && building.storage.colony[this.name]) {
          newCap += building.active * building.storage.colony[this.name];
        }
      }
    }

    this.cap = this.hasCap ? newCap : Infinity;
  }
}

function checkResourceAvailability(category, resource, requiredAmount) {
  return resources[category][resource].isAvailable(requiredAmount);
}

function checkDepositAvailability(depositType, requiredAmount) {
  return resources.underground[depositType].isAvailable(requiredAmount);
}

function createResources(resourcesData) {
  const resources = {};
  for (const category in resourcesData) {
    resources[category] = {};
    for (const resourceName in resourcesData[category]) {
      const resourceData = resourcesData[category][resourceName];
      resourceData.displayName = resourceData.name; // Assign resource name to the resourceData object
      resourceData.name = resourceName;
      resources[category][resourceName] = new Resource(resourceData);
    }
  }
  return resources;
}

function calculateProductionRates(deltaTime, buildings) {
  // Reset production and consumption rates for all resources
  for (const category in resources) {
    for (const resourceName in resources[category]) {
      const resource = resources[category][resourceName];
      resource.productionRate = 0;
      resource.consumptionRate = 0;
    }
  }

  for (const buildingName in buildings) {
    const building = buildings[buildingName];

    // Calculate scaled production rates
    for (const category in building.production) {
      for (const resource in building.production[category]) {
        const actualProduction = (building.currentProduction[category][resource] || 0) * (1000 / deltaTime);
        resources[category][resource].productionRate = (resources[category][resource].productionRate || 0) + actualProduction;
      }
    }

    // Calculate scaled consumption rates
    for (const category in building.consumption) {
      for (const resource in building.consumption[category]) {
        const actualConsumption = (building.currentConsumption[category][resource] || 0) * (1000 / deltaTime);
        resources[category][resource].consumptionRate = (resources[category][resource].consumptionRate || 0) + actualConsumption;
      }
    }

    // Calculate scaled maintenance rates and add to consumption
    if (building.requiresMaintenance) {
      for (const resource in building.currentMaintenance) {
        const actualMaintenance = (building.currentMaintenance[resource] || 0) * (1000 / deltaTime);
        resources['colony'][resource].consumptionRate = (resources['colony'][resource].consumptionRate || 0) + actualMaintenance;
      }
    }
  }

  // Add funding rate to the production of funding resource
  if (fundingModule) {
    const fundingIncreaseRate = fundingModule.fundingRate; // Get funding rate from funding module
    resources.colony.funding.productionRate = fundingIncreaseRate; // Update funding production rate
  }
}

function produceResources(deltaTime, buildings, resources) {
  const isDay = dayNightCycle.isDay();

  for (const buildingName in buildings) {
    const building = buildings[buildingName];

    // Set productivity to 0 if it's nighttime and the building is inactive during the night
    if (!isDay && building.dayNightActivity) {
      building.productivity = 0;
    } else {
      // Otherwise, update productivity as usual
      building.updateProductivity(resources, deltaTime);
    }

    // Always call these methods to track the production/consumption rates even if productivity is 0
    building.produce(resources, deltaTime);
    building.consume(resources, deltaTime);
    building.applyMaintenance(resources, deltaTime);
  }

  // Calculate production and consumption rates from buildings
  calculateProductionRates(deltaTime, buildings);
}
