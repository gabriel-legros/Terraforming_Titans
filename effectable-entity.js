class EffectableEntity {
    constructor(config) {
      this.name = config.name;
      this.description = config.description;
      this.activeEffects = []; // Array to store active effects
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
    applyActiveEffects() {
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
      case 'enableBuilding':
        this.applyEnableBuilding(effect);
        break;
      // Add other effect types here as needed
      default:
        console.log(`Effect type "${effect.type}" is not supported for ${this.name}.`);
    }
  }

  // Method to apply enableBuilding effect
  applyEnableBuilding(effect) {
    const { targetId } = effect;
    const building = buildings[targetId];

    if (building) {
      building.enable(); // Assuming Building class has an enable() method to unlock it
      console.log(`Building "${building.name}" enabled by effect from ${this.name}.`);
    } else {
      console.log(`Building with ID "${targetId}" not found for enabling.`);
    }
  }
  
    // Placeholder for potential future use
    applyIncreaseResourceGain(effect) {
        // No logic needed for now. Placeholder method.
    }
  
    applyProductionMultiplier(value) {
        // No logic needed for now. Placeholder method.
    }
}