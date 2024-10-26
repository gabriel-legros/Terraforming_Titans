// Assuming Building class is defined globally (from building.js)

class Colony extends Building {
  constructor(config, colonyName) {
    // Call the Building constructor to initialize common properties using the config object
    super(config, colonyName);

    // Set baseComfort for the colony
    this.baseComfort = config.baseComfort || 0;  // Default to 0 if not provided in the config
    this.filledNeeds = {};
    this.obsolete = false;

    // Initialize filledNeeds based on the consumption defined in the config
    for (const category in this.consumption) {
      for (const resource in this.consumption[category]) {
        this.filledNeeds[resource] = 1;
      }
    }
    this.happiness = 0.5;
  }

  getConsumptionRatio(){
    // Calculate minRatio based on colonist availability
    const colonists = resources.colony.colonists.value;
    const colonistsCapacity = resources.colony.colonists.cap;
    const populationRatio = colonistsCapacity > 0 ? colonists / colonistsCapacity : 0;

    return populationRatio;
  }

  updateProductivity(resources, deltaTime) {
    let minRatio = this.calculateBaseMinRatio(resources, deltaTime);
    const populationRatio = this.getConsumptionRatio();

    minRatio = Math.min(minRatio, populationRatio);

    const targetProductivity = Math.max(0, Math.min(1, minRatio));
    const difference = Math.abs(targetProductivity - this.productivity);
    const dampingFactor = difference < 0.05 ? 0.01 : 1; // Use smaller damping if close to target
    this.productivity += dampingFactor * (targetProductivity - this.productivity);
  }

  updateNeedsRatio(resources, deltaTime) {
    const populationRatio = this.getConsumptionRatio();

    for (const category in this.consumption) {
      if (!this.currentConsumption[category]) {
        this.currentConsumption[category] = {};
      }
  
      for (const resource in this.consumption[category]) {
        const baseConsumption = this.active * this.consumption[category][resource] * this.getEffectiveResourceConsumptionMultiplier(category, resource);
        const scaledConsumption = baseConsumption * populationRatio * (deltaTime / 1000);

        const availableAmount = resources[category][resource].value + resources[category][resource].productionRate*(deltaTime / 1000);
        const requiredAmount = resources[category][resource].consumptionRate * (deltaTime / 1000);

        let actualConsumption = scaledConsumption;

        let consumptionRatio = 1;
        if (availableAmount < requiredAmount) {
          actualConsumption = availableAmount;
          consumptionRatio = Math.max(availableAmount / requiredAmount,0);
        }

        // Adjust filledNeeds for the consumed resource
        this.adjustNeedRatio(resource, consumptionRatio, deltaTime);
      }
    }
  }
  
  // Override canAfford if colonies have unique costs or conditions
  canAfford(resources) {
    // Add unique colony-specific conditions
    return super.canAfford(resources);
  }

  adjustNeedRatio(resource, ratio, deltaTime) {
    const adjustmentSpeed = 0.1; // Rate of change per second
    const maxChange = adjustmentSpeed * (deltaTime / 1000); // Max change based on deltaTime
    const targetRatio = Math.min(Math.max(ratio, 0), 1); // Ensure targetRatio is between 0 and 1

    // Adjust the filledNeeds for the specific resource
    this.filledNeeds[resource] = this.adjustToTarget(this.filledNeeds[resource], targetRatio, maxChange);
  }

  // Helper function to adjust value toward the target at a constant rate
  adjustToTarget(currentValue, targetValue, maxChange) {
    if (currentValue < targetValue) {
        return Math.min(currentValue + maxChange, targetValue); // Increase by maxChange but don't exceed target
    } else if (currentValue > targetValue) {
        return Math.max(currentValue - maxChange, targetValue); // Decrease by maxChange but don't go below target
    }
    return currentValue; // No change if already at the target
  }


  updateHappiness(deltaTime) {
    // Calculate the average of all filledNeeds values
    const needsValues = Object.values(this.filledNeeds);
    const averageNeeds = needsValues.reduce((sum, value) => sum + value, 0) / needsValues.length;

    // Target happiness is the baseComfort multiplied by the average of needs
    const targetHappiness = averageNeeds * (0.5 + this.baseComfort / 2);

    // Adjust the happiness towards the target value using the adjustNeedRatio logic
    this.happiness = this.adjustToTarget(this.happiness, targetHappiness, deltaTime);
  }

  enable(tierName){
    const tiers = ['t1_colony', 't2_colony', 't3_colony', 't4_colony'];

    // Unlock the new tier
    colonies[tierName].unlocked = true;

    // Find the index of the new tier
    const newTierIndex = tiers.indexOf(tierName);

    // Set obsolete to true for all previous tiers
    for (let i = 0; i < newTierIndex; i++) {
      const obsoleteTierName = tiers[i];
      colonies[obsoleteTierName].obsolete = true;
    }

    // Refresh the colony buildings UI
    createColonyButtons(colonies);
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

 
  function updateColonyDisplay(colonies) {
    updateStructureDisplay(colonies);
  }