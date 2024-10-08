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
      case 'enable':
        this.enable();
        break;
      case 'booleanFlag':  // New effect type to handle boolean flags
        this.applyBooleanFlag(effect);
      break;
      // Add other effect types here as needed
      default:
        console.log(`Effect type "${effect.type}" is not supported for ${this.name}.`);
    }
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