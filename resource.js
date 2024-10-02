// Resource Class and Core Logic
class Resource {
  constructor(name, displayName, initialValue, reserved = 0, hasCap = false) {
    this.name = name;
    this.displayName = displayName;
    this.value = initialValue;
    this.hasCap = hasCap;
    this.cap = hasCap ? 0 : Infinity;

    this.baseProductionRate = 0;

    this.reserved = reserved;
  }

  increase(amount) {
    this.value = Math.min(this.value + amount, this.cap);
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
      const displayName = resourceData.name || resourceName;
      const initialValue = resourceData.initialValue;
      const hasCap = resourceData.hasCap || false;
      const reserved = resourceData.reserved || 0;
      resources[category][resourceName] = new Resource(resourceName, displayName, initialValue, reserved, hasCap);
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
