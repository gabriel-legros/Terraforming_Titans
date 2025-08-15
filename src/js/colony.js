// Assuming Building class is defined globally (from building.js)

// Define the luxuryResources object
const luxuryResources = {
  electronics: true,
  androids: true
};

class Colony extends Building {
  constructor(config, colonyName) {
    // Call the Building constructor to initialize common properties using the config object
    super(config, colonyName);

    // Set baseComfort for the colony
    this.baseComfort = config.baseComfort || 0;  // Default to 0 if not provided in the config
    this.filledNeeds = {};
    this.obsolete = false;

    // Initialize luxury resource flags
    this.luxuryResourcesEnabled = {};
    for (const resource in luxuryResources) {
      this.luxuryResourcesEnabled[resource] = true;  // Set the flag to true by default
    }

    // Initialize filledNeeds based on the consumption defined in the config
    for (const category in this.consumption) {
      for (const resource in this.consumption[category]) {
        this.filledNeeds[resource] = 1;
      }
    }
    this.happiness = 0.5;
  }

  initializeFromConfig(config, colonyName) {
    super.initializeFromConfig(config, colonyName);
    this.baseComfort = config.baseComfort;
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
    const effectiveMultiplier = this.getEffectiveConsumptionMultiplier();
    const popConsumptionRatio = this.getConsumptionRatio();
  
    for (const category in this.consumption) {
      if (!this.currentConsumption[category]) {
        this.currentConsumption[category] = {};
      }
  
      for (const resource in this.consumption[category]) {
        const isLuxuryResource = luxuryResources[resource] !== undefined;
  
        if (isLuxuryResource && !this.luxuryResourcesEnabled[resource]) {
          // If the luxury resource is not enabled, set the filledNeeds value to 0
          this.filledNeeds[resource] = 0;
          continue;
        }
  
        const { amount } = this.getConsumptionResource(category, resource);
        const baseConsumption = this.active * amount * effectiveMultiplier * this.getEffectiveResourceConsumptionMultiplier(category, resource);
        const scaledConsumption = baseConsumption * popConsumptionRatio * (deltaTime / 1000);
  
        const availableAmount = resources[category][resource].value;
  
        let consumptionRatio = 1;
        if (availableAmount < scaledConsumption) {
          const consumptionRate = resources[category][resource].consumptionRate;
          if (consumptionRate === 0) {
            consumptionRatio = 1;
          } else {
            consumptionRatio = resources[category][resource].productionRate / consumptionRate;
          }
        }
  
        // Adjust filledNeeds for the consumed resource
        this.adjustNeedRatio(resource, consumptionRatio, deltaTime);
      }
    }
  }
  

  consume(accumulatedChanges, deltaTime) {
    const effectiveMultiplier = this.getEffectiveConsumptionMultiplier();
    const consumptionRatio = this.getConsumptionRatio();
  
    this.currentConsumption = {}; // Reset current consumption
  
    // Calculate consumption and accumulate changes
    for (const category in this.consumption) {
      if (!this.currentConsumption[category]) {
        this.currentConsumption[category] = {};
      }
  
      for (const resource in this.consumption[category]) {
        const isLuxuryResource = luxuryResources[resource] !== undefined;
  
        if (isLuxuryResource && !this.luxuryResourcesEnabled[resource]) {
          // If the luxury resource is not enabled, skip consumption
          continue;
        }
  
        const { amount } = this.getConsumptionResource(category, resource);
        const baseConsumption = this.active * amount * effectiveMultiplier * this.getEffectiveResourceConsumptionMultiplier(category, resource);
        const scaledConsumption = baseConsumption * consumptionRatio * (deltaTime / 1000);
  
        // Track actual consumption in the building
        this.currentConsumption[category][resource] = scaledConsumption;
  
        // Accumulate consumption changes (as negative values)
        accumulatedChanges[category][resource] = (accumulatedChanges[category][resource] || 0) - scaledConsumption;
  
        // Update consumption rate for the resource
        resources[category][resource].modifyRate(
          - (scaledConsumption * (1000 / deltaTime)),
          this.displayName,
          'building'
        );
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
    this.updateNeedsRatio(resources, deltaTime);
  
    // Calculate non-luxury happiness based on the minimum of food and energy needs
    const foodNeed = this.filledNeeds.food || 0;
    const energyNeed = this.filledNeeds.energy || 0;
    const nonLuxuryHappiness = Math.min(foodNeed, energyNeed) * 50;
  
    // Calculate happiness from comfort
    const comfortHappiness = this.baseComfort * 20;
  
    // Calculate total luxury happiness
    let totalLuxuryHappiness = 0;
    for (const resource in this.filledNeeds) {
      if (['food', 'energy'].includes(resource)) continue;
      const need = this.filledNeeds[resource] || 0;
      totalLuxuryHappiness += need * 10;
    }
  
    // Cap total luxury happiness based on the ratio of non-luxury happiness
    totalLuxuryHappiness = Math.min(foodNeed, energyNeed) * totalLuxuryHappiness;

    const milestoneHappiness = milestonesManager.getHappinessBonus();
  
    // Calculate the target happiness
    const targetHappiness = nonLuxuryHappiness + comfortHappiness + totalLuxuryHappiness + milestoneHappiness;
  
    // Adjust the happiness towards the target value
    this.happiness = this.adjustToTarget(this.happiness, targetHappiness / 100, deltaTime);
  }

  // Override calculateBaseMinRatio to exclude luxury resources from productivity calculation
  calculateBaseMinRatio(resources, deltaTime) {
      let minRatio = Infinity;

      // Calculate minRatio based on NON-LUXURY resource consumption
      for (const category in this.consumption) {
          for (const resource in this.consumption[category]) {
              // Skip luxury resources
              if (luxuryResources[resource]) {
                  continue;
              }

              // Original logic from Building class for non-luxury resources
              const requiredAmount = resources[category][resource].consumptionRate * (deltaTime / 1000);
              if (requiredAmount === 0) continue;
              // Use available value directly, production rate during the tick shouldn't affect availability *for* consumption in the same tick
              const availableAmount = resources[category][resource].value;
              if (availableAmount < requiredAmount) {
                  // If consumption rate is zero (e.g., due to other shortages), ratio is effectively infinite (or 1 if available > 0)
                  // Avoid division by zero or negative rates.
                  const consumptionRate = resources[category][resource].consumptionRate;
                  if (consumptionRate <= 0) {
                     minRatio = Math.min(minRatio, 1); // Can't be limited by zero or negative consumption
                  } else {
                     // Calculate ratio based on production vs consumption *rates* if available amount is insufficient
                     const productionRate = resources[category][resource].productionRate;
                     const ratio = productionRate / consumptionRate;
                     minRatio = Math.min(minRatio, Math.max(ratio, 0)); // Ensure ratio isn't negative
                  }

              } else {
                  minRatio = Math.min(minRatio, 1); // Not limited by this resource
              }
          }
      }

      // Worker check is NOT needed here because Colony's overridden updateProductivity handles population ratio separately.

      // If no non-luxury resources are consumed, or if all needs are met, return 1.
      return minRatio === Infinity ? 1 : minRatio;
  }

  getNextTierName() {
    const tiers = ['t1_colony', 't2_colony', 't3_colony', 't4_colony', 't5_colony', 't6_colony', 't7_colony'];
    const index = tiers.indexOf(this.name);
    return index >= 0 && index < tiers.length - 1 ? tiers[index + 1] : null;
  }

  getUpgradeCost(upgradeCount = 1) {
    const nextName = this.getNextTierName();
    if (!nextName) return null;
    const next = colonies[nextName];
    if (!next) return null;

    const nextCost = next.getEffectiveCost(1);
    const cost = {};
    const amount = upgradeCount * 10;
    const removeCount = Math.min(amount, this.count);
    const missingRatio = (amount - removeCount) / amount;

    for (const category in nextCost) {
      for (const resource in nextCost[category]) {
        const baseAmount = nextCost[category][resource] * upgradeCount;
        let value = 0;
        if (nextName === 't7_colony' && resource === 'superalloys') {
          value = baseAmount;
        } else if (resource === 'metal' || resource === 'glass') {
          value = baseAmount * (0.5 + 0.5 * missingRatio);
        } else if (resource === 'water') {
          value = baseAmount * missingRatio;
        }
        if (value > 0) {
          if (!cost[category]) cost[category] = {};
          cost[category][resource] = value;
        }
      }
    }

    const landNeeded = upgradeCount * next.requiresLand - removeCount * (this.requiresLand || 0);
    if (landNeeded > 0) {
      if (!cost.surface) cost.surface = {};
      cost.surface.land = landNeeded;
    }

    return cost;
  }

  canAffordUpgrade(upgradeCount = 1) {
    const maxUpgrades = Math.ceil(this.count / 10);
    if (maxUpgrades === 0 || upgradeCount > maxUpgrades) return false;
    const cost = this.getUpgradeCost(upgradeCount);
    if (!cost) return false;
    for (const category in cost) {
      for (const resource in cost[category]) {
        if (resource === 'land') {
          const available = resources[category][resource].value - resources[category][resource].reserved;
          if (available < cost[category][resource]) {
            return false;
          }
        } else if (resources[category][resource].value < cost[category][resource]) {
          return false;
        }
      }
    }
    return true;
  }

  upgrade(upgradeCount = 1) {
    const nextName = this.getNextTierName();
    if (!nextName) return false;
    const next = colonies[nextName];
    if (!next || !next.unlocked) return false;
    if (!this.canAffordUpgrade(upgradeCount)) return false;
    const cost = this.getUpgradeCost(upgradeCount);
    const amount = upgradeCount * 10;
    const removeCount = Math.min(amount, this.count);

    // Pay cost
    for (const category in cost) {
      for (const resource in cost[category]) {
        if (resource === 'land') continue;
        resources[category][resource].decrease(cost[category][resource]);
      }
    }

    // Adjust land usage
    if (this.requiresLand) this.adjustLand(-removeCount);
    if (next.requiresLand) next.adjustLand(upgradeCount);

    // Remove lower tier buildings
    this.count -= removeCount;
    this.active -= removeCount;
    this.updateResourceStorage();

    // Add upgraded building
    next.count += upgradeCount;
    next.active += upgradeCount;
    next.updateResourceStorage();

    return true;
  }

  enable(tierName){
    const tiers = ['t1_colony', 't2_colony', 't3_colony', 't4_colony', 't5_colony', 't6_colony', 't7_colony'];

    // Unlock the new tier
    colonies[tierName].unlocked = true;

    // Find the index of the new tier
    const newTierIndex = tiers.indexOf(tierName);

    // Set obsolete to true for all previous tiers
    for (let i = 0; i < newTierIndex; i++) {
      const obsoleteTierName = tiers[i];
      colonies[obsoleteTierName].obsolete = true;
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

 
  function updateColonyDisplay(colonies) {
    updateStructureDisplay(colonies);
  }