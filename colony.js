// Assuming Building class is defined globally (from building.js)

class Colony extends Building {
  constructor(config, colonyName) {
    // Call the Building constructor to initialize common properties using the config object
    super(config, colonyName);

    // Add unique properties for the Colony class
    this.uniqueAttributes = config.uniqueAttributes || {};  // Attributes specific to colonies (e.g., population)
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

    if(this.requiresWorker){
    // Get worker ratio from populationModule
    const workerRatio = populationModule.getWorkerAvailabilityRatio();
    minRatio = Math.min(minRatio, workerRatio);
    }

    const colonists = resources.colony.colonists.value;
    const colonistsCapacity = resources.colony.colonists.cap;
    const populationRatio = colonistsCapacity > 0 ? colonists / colonistsCapacity : 0;

    minRatio = Math.min(minRatio, populationRatio);

    this.productivity = Math.max(0, Math.min(1, minRatio));
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