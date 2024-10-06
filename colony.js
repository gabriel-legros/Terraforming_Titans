// Assuming Building class is defined globally (from building.js)

class Colony extends Building {
  constructor(config, colonyName) {
    // Call the Building constructor to initialize common properties using the config object
    super(config, colonyName);

    // Add unique properties for the Colony class
    this.uniqueAttributes = config.uniqueAttributes || {};  // Attributes specific to colonies (e.g., population)
  }
  
    produce(resources, deltaTime) {
      // Ensure the production data structure is properly initialized
      for (const category in this.production) {
        if (!this.currentProduction[category]) {
          this.currentProduction[category] = {};
        }
      }
    
      // Use effective multiplier from active effects
      const effectiveMultiplier = this.getEffectiveProductionMultiplier();
    
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
    
          // Calculate total production scaled with deltaTime and effective multiplier
          const scaledProduction = this.active * baseProduction * this.productivity * productionModifier * (deltaTime / 1000) * effectiveMultiplier;
    
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

function initializeColonies(coloniesParameters) {
  const colonies = {};
  for (const colonyName in coloniesParameters) {
    const colonyData = coloniesParameters[colonyName];

    // Add maintenanceFraction to the colony configuration
    const colonyConfig = {
      ...colonyData
    };

    colonies[colonyName] = new Colony(colonyConfig, colonyName);
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