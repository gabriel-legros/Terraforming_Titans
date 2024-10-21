// Assuming Building class is defined globally (from building.js)

class Colony extends Building {
  constructor(config, colonyName) {
    // Call the Building constructor to initialize common properties using the config object
    super(config, colonyName);

    // Set baseComfort for the colony
    this.baseComfort = config.baseComfort || 0;  // Default to 0 if not provided in the config
    this.filledNeeds = {};

    // Initialize filledNeeds based on the consumption defined in the config
    for (const category in this.consumption) {
      for (const resource in this.consumption[category]) {
        this.filledNeeds[resource] = 1;
      }
    }
    this.happiness = 0.5;
  }

  updateProductivity(resources, deltaTime) {
    let minRatio = this.calculateBaseMinRatio(resources, deltaTime);

    // Calculate minRatio based on colonist availability
    const colonists = resources.colony.colonists.value;
    const colonistsCapacity = resources.colony.colonists.cap;
    const populationRatio = colonistsCapacity > 0 ? colonists / colonistsCapacity : 0;

    minRatio = Math.min(minRatio, populationRatio);

    const targetProductivity = Math.max(0, Math.min(1, minRatio));
    const difference = Math.abs(targetProductivity - this.productivity);
    const dampingFactor = difference < 0.05 ? 0.01 : 1; // Use smaller damping if close to target
    this.productivity += dampingFactor * (targetProductivity - this.productivity);
  }
  
  // Override canAfford if colonies have unique costs or conditions
  canAfford(resources) {
    // Add unique colony-specific conditions
    return super.canAfford(resources);
  }

// Extend the consume function in Colony to manage filledNeeds
consume(accumulatedChanges, deltaTime) {
  const colonists = resources.colony.colonists.value;
  const colonistsCapacity = resources.colony.colonists.cap;
  const populationRatio = colonistsCapacity > 0 ? colonists / colonistsCapacity : 0;

  this.currentConsumption = {};

  for (const category in this.consumption) {
    if (!this.currentConsumption[category]) {
      this.currentConsumption[category] = {};
    }

    for (const resource in this.consumption[category]) {
      const baseConsumption = this.active * this.consumption[category][resource];
      const scaledConsumption = baseConsumption * populationRatio * (deltaTime / 1000);

      const availableAmount = resources[category][resource].value;

      let actualConsumption = scaledConsumption;
      let consumptionRatio = 1;

      if (availableAmount < scaledConsumption) {
        actualConsumption = availableAmount;
        consumptionRatio = availableAmount / scaledConsumption;
      }

      this.currentConsumption[category][resource] = actualConsumption;
      accumulatedChanges[category][resource] = (accumulatedChanges[category][resource] || 0) - actualConsumption;
      resources[category][resource].consumptionRate = (resources[category][resource].consumptionRate || 0) + (actualConsumption * (1000 / deltaTime));

      // Adjust filledNeeds for the consumed resource
      this.adjustNeedRatio(resource, consumptionRatio, deltaTime);
    }
  }
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