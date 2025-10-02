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
            if (typeof this[effect.flagId] === 'boolean') {
              this[effect.flagId] = false;
            }
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
        case 'consumptionMultiplier':
          this.applyConsumptionMultiplier(effect.value);
          break;
        case 'maintenanceMultiplier':
          this.applyMaintenanceMultiplier(effect.value);
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
        case 'spaceshipCostMultiplier':
          this.applySpaceshipCostMultiplier(effect);
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
        case 'addResourceConsumption':
          if (typeof this.applyAddResourceConsumption === 'function') {
            this.applyAddResourceConsumption(effect);
          }
          break;
        case 'addComfort':
          this.applyAddComfort?.(effect);
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
        case 'activateSubtab':
          if (typeof activateSubtab === 'function') {
            activateSubtab(
              effect.subtabClass,
              effect.contentClass,
              effect.targetId,
              effect.unhide
            );
          }
          break;
        case 'booleanFlag':  // New effect type to handle boolean flags
          this.applyBooleanFlag(effect);
          break;
        case 'enableReversal':
          // Enable reversal on effectable entities that support it (e.g., Building)
          if (typeof this.enableReversal === 'function') {
            this.enableReversal(effect);
          }
          break;
        case 'solisTabAlert':
          if (typeof this.setSolisTabAlert === 'function') {
            this.setSolisTabAlert(effect.value);
          }
          break;
        case 'oneTimeStart':
          if (typeof CargoRocketProject !== 'undefined' && this instanceof CargoRocketProject) {
            this.applyOneTimeStart(effect);
          }
          break;
        case 'instantResourceGain':
          this.applyInstantResourceGain(effect);
          break;
        case 'setFundingRate':
          this.applySetFundingRate(effect);
          break;
        case 'fundingBonus':
          this.applyFundingBonus(effect);
          break;
        case 'baseStorageBonus':
          this.applyBaseStorageBonus(effect);
          break;
        case 'globalCostReduction':
          this.applyGlobalCostReduction(effect);
          break;
        case 'globalPopulationGrowth':
          this.applyGlobalPopulationGrowth(effect);
          break;
        case 'globalWorkerReduction':
          this.applyGlobalWorkerReduction(effect);
          break;
        case 'globalResearchBoost':
          this.applyGlobalResearchBoost(effect);
          break;
        case 'globalMaintenanceReduction':
          this.applyGlobalMaintenanceReduction(effect);
          break;
        case 'scanningSpeedMultiplier':
          this.applyScanningSpeedMultiplier(effect);
          break;
        case 'shipEfficiency':
          this.applyShipEfficiency(effect);
          break;
        case 'shipCapacityMultiplier':
          this.applyShipCapacityMultiplier(effect);
          break;
        case 'projectDurationReduction':
          this.applyProjectDurationReduction(effect);
          break;
        case 'projectDurationMultiplier':
          if (typeof this.applyProjectDurationMultiplier === 'function') {
            this.applyProjectDurationMultiplier(effect);
          }
          break;
        case 'researchCostMultiplier':
          this.applyResearchCostMultiplier(effect);
          break;
        case 'completeResearch':
          this.applyCompleteResearch(effect);
          break;
        case 'lifeDesignPointBonus':
          this.applyLifeDesignPointBonus(effect);
          break;
        case 'lifeGrowthMultiplier':
          this.applyLifeGrowthMultiplier(effect);
          break;
        // Add other effect types here as needed
        default:
          break;
      }
    }
  }

    applyOneTimeStart(effect) {
      //No logic needed for now
    }

    applyInstantResourceGain(effect) {
      const amount = effect.quantity !== undefined ? effect.quantity : effect.value;
      if (typeof amount === 'number' && typeof this.increase === 'function') {
        this.increase(amount);
      }
      // Remove the effect immediately to prevent reapplication
      this.activeEffects = this.activeEffects.filter(e => e !== effect);
    }
  
    // Placeholder for potential future use
    applyIncreaseResourceGain(effect) {
        // No logic needed for now. Placeholder method.
    }
  
    applyProductionMultiplier(value) {
        // No logic needed for now. Placeholder method.
    }

    applyConsumptionMultiplier(value) {
        // No logic needed for now. Placeholder method.
    }

    applyMaintenanceMultiplier(value) {
        // No logic needed for now. Placeholder method.
    }

    applyResourceConsumptionMultiplier(effect) {
      //No logic needed for now
    }

    applyResourceCostMultiplier(effect) {

    }

    applySpaceshipCostMultiplier(effect) {

    }

    applyMaintenanceCostMultiplier(effect) {

    }

    applyAddedWorkerNeed(effect) {

    }

    applyWorkerMultiplier(effect) {

    }

    applyWorkerRatio(effect) {

    }

    applyAddResourceConsumption(effect) {

    }

    applySetFundingRate(effect) {
      if (typeof this.fundingRate !== 'undefined' && typeof effect.value === 'number') {
        this.fundingRate += effect.value;
      }
    }

  applyFundingBonus(effect) {
    if (typeof this.fundingRate !== 'undefined' && typeof this.baseFundingRate !== 'undefined') {
      this.fundingRate = this.baseFundingRate + effect.value;
    }
  }

  applyBaseStorageBonus(effect) {
    if (typeof this.updateStorageCap === 'function') {
      this.updateStorageCap();
    }
  }

    applyGlobalCostReduction(effect) {
      const multiplier = 1 - effect.value;

      const costEntities = { building: buildings, colony: colonies };

      for (const target in costEntities) {
        const group = costEntities[target];
        for (const id in group) {
          const entity = group[id];
          if (!entity || !entity.cost) continue;
          for (const category in entity.cost) {
            for (const resource in entity.cost[category]) {
              const effectId = `${effect.effectId}-${id}-${category}-${resource}`;
              group[id].addAndReplace({
                type: 'resourceCostMultiplier',
                resourceCategory: category,
                resourceId: resource,
                value: multiplier,
                effectId,
                sourceId: effect.sourceId
              });
            }
          }
        }
      }
    }

  applyGlobalPopulationGrowth(effect) {
    const multiplier = 1 + effect.value;
    this.addAndReplace({
      type: 'growthMultiplier',
      value: multiplier,
      effectId: `${effect.effectId}-growthMultiplier`,
      sourceId: effect.sourceId,
      onLoad: effect.onLoad,
      name: effect.name
    });
  }

    applyGlobalWorkerReduction(effect) {
      const multiplier = 1 - effect.value;
      for (const id in buildings) {
        const building = buildings[id];
        if (!building) continue;
        const effectId = `${effect.effectId}-${id}`;
        building.addAndReplace({
          type: 'workerMultiplier',
          value: multiplier,
          effectId,
          sourceId: effect.sourceId
        });
      }
    }

    applyGlobalResearchBoost(effect) {
      const multiplier = 1 + effect.value;
      for (const id in colonies) {
        const colony = colonies[id];
        if (
          colony &&
          colony.production &&
          colony.production.colony &&
          colony.production.colony.research !== undefined
        ) {
          const effectId = `${effect.effectId}-${id}`;
          colony.addAndReplace({
            type: 'resourceProductionMultiplier',
            resourceCategory: 'colony',
            resourceTarget: 'research',
            value: multiplier,
            effectId,
            sourceId: effect.sourceId
          });
        }
      }
      if (globalThis.androidResearch && typeof globalThis.androidResearch.addAndReplace === 'function') {
        const effectId = `${effect.effectId}-androidResearch`;
        globalThis.androidResearch.addAndReplace({
          type: 'productionMultiplier',
          value: multiplier,
          effectId,
          sourceId: effect.sourceId
        });
      }
    }

    applyGlobalMaintenanceReduction(effect) {
      const multiplier = 1 - effect.value;
      const targets = { building: buildings, colony: colonies };
      for (const groupName in targets) {
        const group = targets[groupName];
        for (const id in group) {
          const entity = group[id];
          if (!entity || !entity.cost) continue;
          for (const category in entity.cost) {
            for (const resource in entity.cost[category]) {
              const effectId = `${effect.effectId}-${id}-${category}-${resource}`;
              group[id].addAndReplace({
                type: 'maintenanceCostMultiplier',
                resourceCategory: category,
                resourceId: resource,
                value: multiplier,
                effectId,
                sourceId: effect.sourceId
              });
            }
          }
        }
      }
    }

    applyScanningSpeedMultiplier(effect) {
      if (this.scanningSpeedMultiplier !== undefined) {
        this.scanningSpeedMultiplier = effect.value;
      }
    }

    applyShipEfficiency(effect) {
      if (typeof shipEfficiency !== 'undefined') {
        shipEfficiency = 1 + effect.value;
      }
    }

    applyShipCapacityMultiplier(effect) {
      if (typeof this.shipCapacityMultiplier === 'number') {
        this.shipCapacityMultiplier *= effect.value;
      }
    }

    applyProjectDurationReduction(effect) {
      if (!this.projects) return;

      const multiplier =
        typeof this.getDurationMultiplier === 'function'
          ? this.getDurationMultiplier()
          : 1 - effect.value;

      for (const name in this.projects) {
        const project = this.projects[name];
        if (!project) continue;
        if (typeof project.updateDurationFromEffects === 'function') {
          project.updateDurationFromEffects();
        } else {
          const base = project.getBaseDuration ? project.getBaseDuration() : project.duration;
          const newDuration = base * multiplier;
          if (project.isActive) {
            const progressRatio =
              (project.startingDuration - project.remainingTime) /
              project.startingDuration;
            project.startingDuration = newDuration;
            project.remainingTime = newDuration * (1 - progressRatio);
          } else {
            project.startingDuration = newDuration;
          }
        }
      }
    }

    applyResearchCostMultiplier(effect) {
      if (!this.researches) return;

      for (const category in this.researches) {
        const research = this.researches[category].find(r => r.id === effect.targetId);
        if (!research) continue;

        if (!research.originalCost) {
          research.originalCost = JSON.parse(JSON.stringify(research.cost));
        } else {
          research.cost = JSON.parse(JSON.stringify(research.originalCost));
        }

        for (const key in research.cost) {
          research.cost[key] *= effect.value;
        }
      }

      if (typeof this.sortAllResearches === 'function') {
        this.sortAllResearches();
      }
    }

    applyCompleteResearch(effect) {
      if (typeof this.completeResearchInstant === 'function') {
        this.completeResearchInstant(effect.targetId);
      }
    }

      applyLifeDesignPointBonus(effect) {
        if (typeof this.designPointBonus !== 'undefined') {
          this.designPointBonus += effect.value;
        }
      }

      applyLifeGrowthMultiplier(effect) {
        // multiplier effects are computed on demand in LifeManager
      }


    // Method to apply a boolean flag effect
    applyBooleanFlag(effect) {
      const { flagId, value } = effect;
      const prevValue = this[flagId];

      if (value) {
        this.booleanFlags.add(flagId);
      } else {
        this.booleanFlags.delete(flagId);
      }

      if (typeof prevValue === 'boolean') {
        this[flagId] = value;
      }

      if (typeof this.sortAllResearches === 'function') {
        this.sortAllResearches();
      }

      if (flagId === 'dayNightActivity' && prevValue !== value) {
        if (typeof applyGameEffects === 'function') {
          applyGameEffects();
        } else if (typeof applyDayNightSettingEffects === 'function') {
          applyDayNightSettingEffects();
        }
      }

      console.log(`Boolean flag "${flagId}" set to ${value} for ${this.name}.`);
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

    getEffectiveSpaceshipCostMultiplier(resourceCategory, resourceId) {
      let multiplier = 1;

      this.activeEffects.forEach((effect) => {
        if (
          effect.type === 'spaceshipCostMultiplier' &&
          effect.resourceCategory === resourceCategory &&
          effect.resourceId === resourceId
        ) {
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
    'oreScanner': oreScanner,
    'researchManager' : researchManager,
    'solisManager' : solisManager,
    'spaceManager' : spaceManager,
    'warpGateCommand' : warpGateCommand,
    'rwgManager': typeof rwgManager !== 'undefined' ? rwgManager : undefined,
    'nanotechManager': typeof nanotechManager !== 'undefined' ? nanotechManager : undefined,
    'galaxyManager': typeof galaxyManager !== 'undefined' ? galaxyManager : undefined,
    'colonySliders': typeof colonySliderSettings !== 'undefined' ? colonySliderSettings : undefined
  };

  if (effect.target in targetHandlers &&
      targetHandlers[effect.target] &&
      typeof targetHandlers[effect.target][action] === 'function') {
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
if (typeof globalThis !== "undefined") {
  globalThis.EffectableEntity = EffectableEntity;
}
if (typeof module !== "undefined" && module.exports) {
  module.exports = EffectableEntity;
}
