class EffectableEntity {
    constructor(config) {
      this.description = config.description;
      this.activeEffects = []; // Array to store active effects
      this.booleanFlags = new Set(); // Set to store boolean flags
    }
  
    // Method to add an effect to the entity
    addEffect(effect) {
      this.activeEffects.push(effect);
      console.log(`Added effect: ${effect.type} with value ${effect.value} to ${this.name}`);
      this.applyEffect(effect);
    }

    // Method to replace an existing effect based on effectId
    replaceEffect(effect) {
      const existingEffectIndex = this.activeEffects.findIndex(
        (activeEffect) => activeEffect.effectId === effect.effectId
      );

      if (existingEffectIndex !== -1) {
        this.activeEffects[existingEffectIndex] = effect;
        this.applyEffect(effect);
      } else {
        console.log(`Effect with effectId "${effect.effectId}" not found, nothing replaced on ${this.name}`);
      }
    }
  
    removeEffect(effect) {
      const sourceId = effect.sourceId;
      if (!sourceId) {
        console.warn("No sourceId provided to removeEffect");
        return;
      }
    
      // Identify effects to be removed
      const effectsToRemove = this.activeEffects.filter(effect => effect.sourceId === sourceId);
    
      if (effectsToRemove.length === 0) {
        console.log(`No effects found for source: ${sourceId}`);
      } else {
        console.log(`Removed effects from source: ${sourceId} on ${this.name}`);
        
        // Remove boolean flags associated with the effects
        effectsToRemove.forEach(effect => {
          if (effect.type === 'booleanFlag') {
            this.booleanFlags.delete(effect.flagId);
          }
        });
    
        // Update the active effects array
        this.activeEffects = this.activeEffects.filter(effect => effect.sourceId !== sourceId);
      }
    
      try {
        this.applyActiveEffects();
      } catch (error) {
        console.error("Error applying active effects:", error);
      }
    
      return this; // Enables chaining
    }
  
    // Method to apply all active effects
    applyActiveEffects(firstTime = true) {
      this.activeEffects.forEach((effect) => this.applyEffect(effect));
    }

    // New method to add or replace an effect
    addAndReplace(effect) {
      const existingEffect = this.activeEffects.find((activeEffect) => activeEffect.effectId === effect.effectId);

      if (existingEffect && effect.effectId) {
        this.replaceEffect(effect);
      } else {
        this.addEffect(effect);
      }
    }
  
  // Method to apply a specific effect
  applyEffect(effect) {
    if(!('onLoad' in effect && effect.onLoad == false && globalGameIsLoadingFromSave))
    {
      switch (effect.type) {
        case 'increaseResourceGain':
          this.applyIncreaseResourceGain(effect);
          break;
        case 'productionMultiplier':
          this.applyProductionMultiplier(effect.value);
          break;
        case 'resourceConsumptionMultiplier':
          this.applyProductionMultiplier(effect);
          break;
        case 'resourceProductionMultiplier':
          this.applyProductionMultiplier(effect);
          break;
        case 'resourceCostMultiplier':
          this.applyResourceCostMultiplier(effect);
          break;
        case 'maintenanceCostMultiplier':
          this.applyMaintenanceCostMultiplier(effect);
          break;
        case 'addedWorkerNeed':
          this.applyAddedWorkerNeed(effect);
          break;
        case 'workerMultiplier':
          this.applyWorkerMultiplier(effect);
          break;
        case 'workerRatio':
          this.applyWorkerRatio(effect);
          break;
        case 'enable':
          this.enable(effect.targetId);
          break;
        case 'enableContent':
          this.enableContent(effect.targetId);
          break;
        case 'activateTab':
          this.activateTab(effect.targetId)
          break;
        case 'booleanFlag':  // New effect type to handle boolean flags
          this.applyBooleanFlag(effect);
          break;
        case 'oneTimeStart':
          this.applyOneTimeStart(effect);
          break;
        // Add other effect types here as needed
        default:
          console.log(`Effect type "${effect.type}" is not supported for ${this.name}.`);
      }
    }
  }

    applyOneTimeStart(effect) {
      //No logic needed for now
    }
  
    // Placeholder for potential future use
    applyIncreaseResourceGain(effect) {
        // No logic needed for now. Placeholder method.
    }
  
    applyProductionMultiplier(value) {
        // No logic needed for now. Placeholder method.
    }

    applyResourceConsumptionMultiplier(effect) {
      //No logic needed for now
    }

    applyResourceCostMultiplier(effect) {

    }

    applyMaintenanceCostMultiplier(effect) {

    }

    applyAddedWorkerNeed(effect) {

    }

    applyWorkerMultiplier(effect) {

    }

    applyWorkerRatio(effect) {

    }

    // Method to apply a boolean flag effect
    applyBooleanFlag(effect) {
      const { flagId, value } = effect;
      if (value) {
        this.booleanFlags.add(flagId); // Add the flag to the Set
        console.log(`Boolean flag "${flagId}" set to true for ${this.name}.`);
      } else {
        this.booleanFlags.delete(flagId); // Remove the flag from the Set
        console.log(`Boolean flag "${flagId}" set to false for ${this.name}.`);
      }
    }

    // Method to check if a boolean flag is set
    isBooleanFlagSet(flag) {
      return this.booleanFlags.has(flag);
    }

    // Retrieves the effective cost multiplier for a specific resource based on active effects
    getEffectiveCostMultiplier(resourceCategory, resourceId) {
      // Default multiplier is 1 (no change to cost)
      let multiplier = 1;

      // Check all active effects to see if any modify the cost for the given resource
      this.activeEffects.forEach((effect) => {
        if (
          effect.type === 'resourceCostMultiplier' &&
          effect.resourceCategory === resourceCategory &&
          effect.resourceId === resourceId
        ) {
          // Apply the effect multiplier
          multiplier *= effect.value;
        }
      });

      return multiplier;
    }

    getEffectiveMaintenanceCostMultiplier(resourceCategory, resourceId) {
      let multiplier = 1;

      this.activeEffects.forEach((effect) => {
        if (
          effect.type === 'maintenanceCostMultiplier' &&
          effect.resourceCategory === resourceCategory &&
          effect.resourceId === resourceId
        ) {
          multiplier *= effect.value;
        }
      });

      return multiplier;
    }
}

function addOrRemoveEffect(effect, action) {
  const targetHandlers = {
    'fundingModule': fundingModule,
    'population': populationModule,
    'projectManager': projectManager,
    'tab': tabManager,
    'tabContent': tabManager,
    'global': globalEffects,
    'terraforming': terraforming,
    'lifeDesigner': lifeDesigner,
    'lifeManager': lifeManager,
    'oreScanner': oreScanner
  };

  if (effect.target in targetHandlers) {
    targetHandlers[effect.target][action](effect);
  } else if (effect.target === 'building') {
    const building = buildings[effect.targetId];
    if (building) {
      building[action](effect);
    }
  } else if (effect.target === 'project') {
    const project = projectManager.projects[effect.targetId];
    if (project) {
      project[action](effect);
    }
  } else if (effect.target === 'colony') {
    const colony = colonies[effect.targetId];
    if (colony) {
      colony[action](effect);
    }
  } else if (effect.target === 'resource') {
    const resourceType = effect.resourceType;
    const resource = resources[resourceType][effect.targetId];
    if (resource) {
      resource[action](effect);
    }
  }
}

function addEffect(effect) {
  addOrRemoveEffect(effect, 'addAndReplace');
}

function removeEffect(effect) {
  addOrRemoveEffect(effect, 'removeEffect');
}
if (typeof module !== "undefined" && module.exports) {
  module.exports = EffectableEntity;
}
