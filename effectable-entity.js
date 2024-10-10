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
  
    // Method to remove an effect by its source ID
    removeEffect(sourceId) {
      this.activeEffects = this.activeEffects.filter((effect) => effect.sourceId !== sourceId);
      console.log(`Removed effects from source: ${sourceId} on ${this.name}`);
      // Optionally, you could reapply all remaining active effects after removing
      this.applyActiveEffects();
    }
  
    // Method to apply all active effects
    applyActiveEffects(firstTime = true) {
      this.activeEffects.forEach((effect) => this.applyEffect(effect));
    }
  
  // Method to apply a specific effect
  applyEffect(effect) {
    switch (effect.type) {
      case 'increaseResourceGain':
        this.applyIncreaseResourceGain(effect);
        break;
      case 'productionMultiplier':
        this.applyProductionMultiplier(effect.value);
        break;
      case 'enable':
        this.enable(effect.targetId);
        break;
      case 'enableContent':
        this.enableContent(effect.targetId);
        break;
      case 'booleanFlag':  // New effect type to handle boolean flags
        this.applyBooleanFlag(effect);
      case 'oneTimeStart':
        this.applyOneTimeStart(effect);
      break;
      // Add other effect types here as needed
      default:
        console.log(`Effect type "${effect.type}" is not supported for ${this.name}.`);
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

    // Method to apply a boolean flag effect
    applyBooleanFlag(effect) {
      const { targetId, value } = effect;
      if (value) {
        this.booleanFlags.add(targetId); // Add the flag to the Set
        console.log(`Boolean flag "${targetId}" set to true for ${this.name}.`);
      } else {
        this.booleanFlags.delete(targetId); // Remove the flag from the Set
        console.log(`Boolean flag "${targetId}" set to false for ${this.name}.`);
      }
    }

    // Method to check if a boolean flag is set
    isBooleanFlagSet(flag) {
      return this.booleanFlags.has(flag);
    }
}

function addEffect(effect){
  if (effect.target === 'building') {
    const building = buildings[effect.targetId];
    if (building) {
      building.addEffect(effect);
    }
  } else if (effect.target === 'project') {
    const project = projectManager.projects[effect.targetId];
    if (project) {
      project.addEffect(effect);
    }
  }  else if (effect.target === 'colony') {
    const colony = colonies[effect.targetId];
    if (colony) {
      colony.addEffect(effect);
    }
  } else if (effect.target === 'resource') {
    const resourceType = effect.resourceType;
    const resource = resources[resourceType][effect.targetId];
    if (resource){
      resource.addEffect(effect);
    }
  } else if (effect.target === 'projectManager') {
    // Apply effect to the project manager
    projectManager.addEffect(effect);
  } else if (effect.target === 'tab' || effect.target === 'tabContent') {
    // Apply effect to the tab manager
    tabManager.addEffect(effect);
  }
}