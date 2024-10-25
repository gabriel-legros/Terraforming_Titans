// Resource Class and Core Logic
class Resource extends EffectableEntity {
  constructor(resourceData) {
    super(resourceData);

    this.name = resourceData.name || '';
    this.category = resourceData.category;
    this.displayName = resourceData.displayName || resourceData.name || '';
    this.value = resourceData.initialValue || 0;
    this.hasCap = resourceData.hasCap || false;
    this.baseCap = resourceData.baseCap || 0; // Store the base capacity of the resource
    this.cap = this.hasCap ? this.baseCap : Infinity; // Set the initial cap
    this.baseProductionRate = 0;
    this.productionRate = 0; // Rate of production per second
    this.consumptionRate = 0; // Rate of consumption per second
    this.reserved = resourceData.reserved || 0;
    this.unlocked = resourceData.unlocked;
  }

    // Method to initialize configurable properties
  initializeFromConfig(config) {
    this.name = config.name;
    this.displayName = config.displayName;
    this.category = config.category;
    this.hasCap = config.hasCap || 0;
    this.baseCap = config.baseCap || 0;
    this.unlocked = config.unlocked;
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
    this.value += amount;
  }

  resetBaseProductionRate() {
    this.baseProductionRate = 0;
  }

  // Method to update the storage cap based on active structures
  updateStorageCap() {
    let newCap = this.baseCap; // Start with the base capacity
    for (const structureName in structures) {
      const structure = structures[structureName];
      if (structure.storage && structure.active > 0) {
        if (structure.storage.colony && structure.storage.colony[this.name]) {
          newCap += structure.active * structure.storage.colony[this.name] * structure.getEffectiveStorageMultiplier();
        }
      }
    }

    this.cap = this.hasCap ? newCap : Infinity;
  }

  enable() {
    this.unlocked = true;
    unlockResource(this);
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
      resourceData.category = category;
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
        const actualProduction = (building.production[category][resource] || 0) * building.active * building.getEffectiveProductionMultiplier() * building.getEffectiveResourceProductionMultiplier(category, resource);
        resources[category][resource].productionRate = (resources[category][resource].productionRate || 0) + actualProduction;
      }
    }

    // Calculate scaled consumption rates
    for (const category in building.consumption) {
      for (const resource in building.consumption[category]) {
        const actualConsumption = (building.consumption[category][resource] || 0) * building.active * building.getConsumptionRatio() * building.getEffectiveConsumptionMultiplier() * building.getEffectiveResourceConsumptionMultiplier(category, resource);
        resources[category][resource].consumptionRate = (resources[category][resource].consumptionRate || 0) + actualConsumption;
      }
    }
  }

  // Add funding rate to the production of funding resource
  if (fundingModule) {
    const fundingIncreaseRate = fundingModule.fundingRate; // Get funding rate from funding module
    resources.colony.funding.productionRate = fundingIncreaseRate; // Update funding production rate
  }
}

function produceResources(deltaTime, buildings) {
  const isDay = dayNightCycle.isDay();

  calculateProductionRates(deltaTime, buildings);

  // Reset production and consumption rates for all resources
  for (const category in resources) {
    for (const resourceName in resources[category]) {
      const resource = resources[category][resourceName];
      if(resource.name != 'workers'){
        resource.updateStorageCap();
      }
    }
  }

  // Temporary object to store changes
  const accumulatedChanges = {};
  const accumulatedMaintenance = {}; // Object to store accumulated maintenance costs
  

  // Initialize accumulated changes and maintenance
  for (const category in resources) {
    accumulatedChanges[category] = {};
    for (const resourceName in resources[category]) {
      accumulatedChanges[category][resourceName] = 0;
      
      if (category === 'colony') {
        accumulatedMaintenance[resourceName] = 0; // Initialize accumulated maintenance costs for colony resources
      }
    }
  }

  for (const buildingName in buildings) {
    const building = buildings[buildingName];

    // Set productivity to 0 if it's nighttime and the building is inactive during the night
    if (!isDay && building.dayNightActivity) {
      building.productivity = 0;
    } else {
      // Otherwise, update productivity as usual
      building.updateProductivity(resources, deltaTime);
      if(building.filledNeeds){
        building.updateNeedsRatio(resources, deltaTime);
      }
    }
  }

  // Reset production and consumption rates for all resources
  for (const category in resources) {
    for (const resourceName in resources[category]) {
      const resource = resources[category][resourceName];
      resource.productionRate = 0;
      resource.consumptionRate = 0;
      if(resource.name != 'workers'){
        resource.updateStorageCap();
      }
    }
  }

  for(const buildingName in buildings){
    const building = buildings[buildingName];
    // Accumulate production, consumption, and maintenance changes
    building.produce(accumulatedChanges, deltaTime);
    building.consume(accumulatedChanges, deltaTime);
    building.applyMaintenance(accumulatedChanges, accumulatedMaintenance, deltaTime);
  }

  // Apply funding rate to the accumulated changes
  if (fundingModule) {
    const fundingIncreaseRate = fundingModule.fundingRate; // Get funding rate from funding module
    accumulatedChanges.colony.funding += fundingIncreaseRate * (deltaTime / 1000);

    // Update production rate for funding resource
    resources.colony.funding.productionRate = fundingIncreaseRate;
  }

  if(terraforming) {
    terraforming.updateResources(accumulatedChanges, deltaTime);
  }

  // Apply accumulated changes to resources
  for (const category in resources) {
    for (const resourceName in resources[category]) {
      const resource = resources[category][resourceName];
      const previousValue = resource.value; // Track the previous value before changes

      // Apply the accumulated changes
      resource.value += accumulatedChanges[category][resourceName];

      // If the resource was at the cap, flatten back to cap but allow temporary excess
      if (resource.hasCap) {
        if (previousValue >= resource.cap) {
          resource.value = Math.min(resource.value, previousValue); // Flatten back to previous capped value
        } else {
          resource.value = Math.min(resource.value, resource.cap); // Otherwise, just apply the cap normally
        }
      }

      // Ensure the resource value doesn't drop below zero
      resource.value = Math.max(resource.value, 0);
    }
  }
}