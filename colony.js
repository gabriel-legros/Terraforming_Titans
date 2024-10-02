// Assuming Building class is defined globally (from building.js)

class Colony extends Building {
  constructor(name, description, cost, consumption, production, storage, dayNightActivity, canBeToggled, maintenanceFraction, maintenanceFactor, requiresMaintenance, requiresDeposit, unlocked, uniqueAttributes = {}) {
    // Call the Building constructor to initialize common properties
    super(name, description, cost, consumption, production, storage, dayNightActivity, canBeToggled, maintenanceFraction, maintenanceFactor, requiresMaintenance, requiresDeposit, unlocked);

    // Add unique properties for the Colony class
    this.uniqueAttributes = uniqueAttributes;  // Attributes specific to colonies (e.g., population)
    this.population = uniqueAttributes.population || 0;  // Initial population
    this.growthRate = uniqueAttributes.growthRate || 0;  // Population growth rate
  }
  
    // Method to handle colony-specific behavior like population growth
    updatePopulation(deltaTime) {
      if (this.growthRate > 0) {
        const populationIncrease = this.growthRate * deltaTime;
        this.population += populationIncrease;
        console.log(`Colony ${this.name} population increased by ${populationIncrease.toFixed(2)} to ${this.population.toFixed(2)}.`);
      }
    }
  
  // Override produce method for colony-specific production logic
  produce(resources, deltaTime) {

    for (const category in this.production) {
      if (!this.currentProduction[category]) {
        this.currentProduction[category] = {};
      }
    }

    for (const category in this.production) {
      for (const resource in this.production[category]) {
        // Determine base production rate for this resource
        let baseProduction = this.production[category][resource];
        let productionModifier = 1;

        // Adjust production based on colonists and storage capacity for colonies
        if (resource === 'research') {
          const colonists = resources.colony.colonists.value;
          const colonistsCapacity = resources.colony.colonists.cap;
          const populationRatio = colonistsCapacity > 0 ? colonists / colonistsCapacity : 0;
          productionModifier = populationRatio;
        }

        // Calculate total production scaled with deltaTime
        const scaledProduction = this.active * baseProduction * this.productivity * productionModifier * (deltaTime / 1000) * this.productionMultiplier;

        // Ensure we don't exceed the remaining capacity of the resource
        const remainingCapacity = resources[category][resource].cap - resources[category][resource].value;
        const actualProduction = Math.min(scaledProduction, remainingCapacity);

        // Increase resource value
        resources[category][resource].increase(actualProduction);

        // Track actual production
        this.currentProduction[category][resource] = actualProduction;
      }
    }
  }
  
    // Override canAfford if colonies have unique costs or conditions
    canAfford(resources) {
      // Add unique colony-specific conditions
      return super.canAfford(resources);
    }
    
    // Override applyMaintenance for unique maintenance behavior if required
    applyMaintenance(resources, deltaTime) {
      super.applyMaintenance(resources, deltaTime);
      // Colony-specific maintenance logic, if any
    }

  buildStructure(resources) {
    if (this.build(resources)) {
      this.setStorage(resources);
      updateResourceDisplay(resources);  // Resource updates now handled in resource.js
      updateColonyDisplay(colonies);  // Updated to pass buildings
    } else {
      console.log(`Insufficient resources to build ${this.name}`);
    }
  }
}

function initializeColonies(coloniesParameters, maintenanceFraction) {
  const colonies = {};
  for (const colonyName in coloniesParameters) {
    const colonyData = coloniesParameters[colonyName];
    colonies[colonyName] = new Colony(
      colonyData.name,
      colonyData.description,
      colonyData.cost,
      colonyData.consumption,
      colonyData.production,
      colonyData.storage,
      colonyData.dayNightActivity,
      colonyData.canBeToggled,
      maintenanceFraction,
      colonyData.maintenanceFactor,
      colonyData.requiresMaintenance,
      colonyData.requiresDeposit,
      colonyData.unlocked,
      colonyData.uniqueAttributes || {} // Pass unique attributes, if any
    );

    // Set whether the colony is unlocked from the start
    colonies[colonyName].unlocked = colonyData.unlocked ?? false; // Default to false if not specified
  }
  return colonies;
}

  function createColonyButtons(colonies) {
    createStructureButtons(
      colonies,
      'colony-buttons',
      (colonyName) => colonies[colonyName].buildStructure(resources),
      adjustStructureActivation
    );
  }
  
  function updateColonyDisplay(colonies) {
    updateStructureDisplay(colonies);
  }