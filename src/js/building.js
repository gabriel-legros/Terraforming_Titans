// Building Class (Core Game Logic)
class Building extends EffectableEntity {
  constructor(config, buildingName) {
    super(config); // Call the base class constructor

    // Destructure configuration object to set properties specific to Building
    this.initializeFromConfig(config, buildingName);

    //Everything above can change through updates

    this.count = 0;
    this.active = 0;
    this.productivity = 0;
    this.isHidden = false; // track whether the building is hidden in the UI

    this.autoBuildEnabled = false;
    this.autoBuildPercent = 0.1;
    this.autoBuildPriority = false;

    this.maintenanceCost = this.calculateMaintenanceCost();
    this.currentProduction = {};
    this.currentConsumption = {};
    this.currentMaintenance = {};
  }

    // Method to initialize configurable properties
    initializeFromConfig(config, buildingName) {
      const {
        name,
        category,
        description,
        cost,
        consumption,
        production,
        storage,
        dayNightActivity,
        canBeToggled,
        maintenanceFactor,
        requiresMaintenance,
        requiresDeposit,
        requiresWorker, // Added requiresWorker to the destructured properties
        unlocked,
        surfaceArea,
        requiresProductivity,
        requiresLand
      } = config;
  
      this.name = buildingName;
      this.displayName = name;
      this.category = category;
      this.description = description;
      this.cost = cost;
      this.consumption = consumption;
      this.production = production;
      this.storage = storage;
      this.dayNightActivity = dayNightActivity;
      this.canBeToggled = canBeToggled;
      this.requiresMaintenance = requiresMaintenance;
      this.maintenanceFactor = requiresMaintenance ? maintenanceFactor : 0;
      this.requiresDeposit = requiresDeposit;
      this.requiresWorker = requiresWorker || 0; // Set default to 0 if not provided
      this.unlocked = unlocked;
      this.surfaceArea = surfaceArea;
      this.requiresProductivity = typeof requiresProductivity !== 'undefined' ? requiresProductivity : true;
      this.requiresLand = requiresLand;
      this.powerPerBuilding = config.powerPerBuilding;

      this.updateResourceStorage();
    }

  // Method to get the effective production multiplier
  getEffectiveProductionMultiplier() {
    let multiplier = 1; // Start with default multiplier
    this.activeEffects.forEach(effect => {
      if (effect.type === 'productionMultiplier') {
        multiplier *= effect.value;
      }
    });
    return multiplier;
  }

  // Method to get the effective production multiplier
  getEffectiveConsumptionMultiplier() {
    let multiplier = 1; // Start with default multiplier
    this.activeEffects.forEach(effect => {
      if (effect.type === 'consumptionMultiplier') {
        multiplier *= effect.value;
      }
    });
    return multiplier;
  }

  // Method to get the effective production multiplier
  getEffectiveWorkerMultiplier() {
    let multiplier = 1; // Start with default multiplier
    this.activeEffects.forEach(effect => {
      if (effect.type === 'workerMultiplier') {
        multiplier *= effect.value;
      }
    });
    return multiplier;
  }

  // Method to get additional worker requirements from effects
  getAddedWorkerNeed() {
    let added = 0;
    this.activeEffects.forEach(effect => {
      if (effect.type === 'addedWorkerNeed') {
        added += effect.value;
      }
    });
    return added;
  }

  getTotalWorkerNeed() {
    return this.requiresWorker + this.getAddedWorkerNeed();
  }

  // Method to get the effective storage multiplier
  getEffectiveStorageMultiplier() {
    let multiplier = 1; // Start with default multiplier
    this.activeEffects.forEach(effect => {
      if (effect.type === 'storageMultiplier') {
        multiplier *= effect.value;
      }
    });
    return multiplier;
  }

  getEffectiveResourceConsumptionMultiplier(category, resource){
    let multiplier = 1; // Start with default multiplier
    this.activeEffects.forEach(effect => {
      if (effect.type === 'resourceConsumptionMultiplier' && effect.resourceCategory === category && effect.resourceTarget === resource) {
        multiplier *= effect.value;
      }
    });
    return multiplier;
  }

  getEffectiveResourceProductionMultiplier(category, resource){
    let multiplier = 1; // Start with default multiplier
    this.activeEffects.forEach(effect => {
      if (effect.type === 'resourceProductionMultiplier' && effect.resourceCategory === category && effect.resourceTarget === resource) {
        multiplier *= effect.value;
      }
    });
    return multiplier;
  }

  // Get modified production values based on effective multipliers
  getModifiedProduction() {
    const modifiedProduction = {};

    for (const category in this.production) {
      modifiedProduction[category] = {};
      for (const resource in this.production[category]) {
        const baseProduction = this.production[category][resource];
        const productionMultiplier = this.getEffectiveProductionMultiplier() * this.getEffectiveResourceProductionMultiplier(category, resource);
        modifiedProduction[category][resource] = baseProduction * productionMultiplier;
      }
    }

    return modifiedProduction;
  }

  // Get modified consumption values based on effective multipliers
  getModifiedConsumption() {
    const modifiedConsumption = {};

    for (const category in this.consumption) {
      modifiedConsumption[category] = {};
      for (const resource in this.consumption[category]) {
        const baseConsumption = this.consumption[category][resource];
        const consumptionMultiplier = this.getEffectiveConsumptionMultiplier() * this.getEffectiveResourceConsumptionMultiplier(category, resource);
        modifiedConsumption[category][resource] = baseConsumption * consumptionMultiplier;
      }
    }

    return modifiedConsumption;
  }

  // Get modified storage values based on effective multipliers
  getModifiedStorage() {
    const modifiedStorage = {};

    for (const category in this.storage) {
      modifiedStorage[category] = {};
      for (const resource in this.storage[category]) {
        const baseStorage = this.storage[category][resource];
        const storageMultiplier = this.getEffectiveStorageMultiplier();
        modifiedStorage[category][resource] = baseStorage * storageMultiplier;
      }
    }

    return modifiedStorage;
  }

  // Calculates the effective cost for building, factoring in all active cost multipliers
  getEffectiveCost(buildCount = 1) {
    const effectiveCost = {};

    for (const category in this.cost) {
      effectiveCost[category] = {};
      for (const resource in this.cost[category]) {
        const baseCost = this.cost[category][resource];
        const multiplier = this.getEffectiveCostMultiplier(category, resource);
        const finalCost = baseCost * multiplier * buildCount;

        if (finalCost > 0) { // Only include costs greater than 0
          effectiveCost[category][resource] = finalCost;
        }
      }

      // Remove the category if it has no resources with non-zero cost
      if (Object.keys(effectiveCost[category]).length === 0) {
        delete effectiveCost[category];
      }
    }

    return effectiveCost;
  }

  getProductionRatio(){
    const isDay = dayNightCycle.isDay();
    if(this.dayNightActivity && !isDay){
      return 0;
    } else{
      return 1;
    }
  }

  getConsumptionRatio(){
    return 1;
  }

  calculateMaintenanceCost() {
    const maintenanceCost = {};
    const effectiveCost = this.getEffectiveCost();
    for (const resource in effectiveCost.colony) {
      const resourceCost = effectiveCost.colony[resource];
      const multiplier = this.getEffectiveMaintenanceCostMultiplier('colony', resource);
      maintenanceCost[resource] = resourceCost * maintenanceFraction * this.maintenanceFactor * multiplier;
    }
    return maintenanceCost;
  }

  // Adjusted canAfford method to use effective cost
  canAfford(buildCount = 1) {
    const effectiveCost = this.getEffectiveCost(buildCount);

    for (const category in effectiveCost) {
      for (const resource in effectiveCost[category]) {
        if (resources[category][resource].value < effectiveCost[category][resource]) {
          return false;
        }
      }
    }

    return this.canAffordDeposit(buildCount) && this.canAffordLand(buildCount);
  }

  canAffordDeposit(amount = 1){
    if (this.requiresDeposit) {
      for (const deposit in this.requiresDeposit.underground) {
        if (!resources.underground[deposit] || resources.underground[deposit].value - resources.underground[deposit].reserved < this.requiresDeposit.underground[deposit] * amount) {
          return false;
        }
      }
    }

    return true;
  }

  canAffordLand(amount = 1){
    if (this.requiresLand) {
      if(resources.surface.land.value - resources.surface.land.reserved < this.requiresLand * amount){
        return false;
      }
    }

    return true;    
  }

  landAffordCount(){
    return Math.floor((resources.surface.land.value - resources.surface.land.reserved) / this.requiresLand);  
  }

  adjustLand(amount){
    if(amount > 0){
      resources.surface.land.reserve(amount * this.requiresLand);
    } else {
      resources.surface.land.release(-amount * this.requiresLand);
    }
  }

  maxBuildable() {
    let maxByResource = Infinity;

    // Check effective cost resources
    for (const category in this.getEffectiveCost(1)) {
        for (const resource in this.getEffectiveCost(1)[category]) {
            const available = resources[category][resource].value;
            const costPerUnit = this.getEffectiveCost(1)[category][resource];

            if (costPerUnit > 0) {
                const possibleCount = Math.floor(available / costPerUnit);
                maxByResource = Math.min(maxByResource, possibleCount);
            }
        }
    }

    // Check deposit requirements
    if (this.requiresDeposit) {
        for (const deposit in this.requiresDeposit.underground) {
            const availableDeposit = resources.underground[deposit]?.value ?? 0;
            const reservedDeposit = resources.underground[deposit]?.reserved ?? 0;
            const depositPerUnit = this.requiresDeposit.underground[deposit];

            const available = availableDeposit - reservedDeposit;
            if (depositPerUnit > 0) {
                const possibleCount = Math.floor(available / depositPerUnit);
                maxByResource = Math.min(maxByResource, possibleCount);
            }
        }
    }

    return Math.max(maxByResource, 0); // Ensure non-negative result
}

  build(buildCount = 1) {
    if (this.canAfford(buildCount)) {
      const effectiveCost = this.getEffectiveCost(buildCount);
      for (const category in effectiveCost) {
        for (const resource in effectiveCost[category]) {
          resources[category][resource].decrease(effectiveCost[category][resource]);
        }
      }
      if (this.requiresDeposit) {
        for (const deposit in this.requiresDeposit.underground) {
          resources['underground'][deposit].reserve(this.requiresDeposit.underground[deposit]*buildCount);
        }
      }
      if(this.requiresLand){
        resources.surface.land.reserve(this.requiresLand*buildCount);
      }
      const oldActive = this.active;
      const oldProductivity = this.productivity;
      this.count += buildCount;
      this.active += buildCount;
      if(this.active > 0){
        this.productivity = oldProductivity * (oldActive / this.active);
      } else {
        this.productivity = 0;
      }
      this.updateResourceStorage();
      return true;
    }
    return false;
  }

  buildStructure(buildCount = 1) {
    if (this.build(buildCount)) {
      this.updateResourceStorage();
    } else {
      console.log(`Insufficient resources to build ${buildCount} ${this.name}(s)`);
    }
  }

  releaseDeposit(resources, releaseCount = 1) {
    if (this.requiresDeposit) {
      for (const deposit in this.requiresDeposit.underground) {
        resources.underground[deposit].release(this.requiresDeposit.underground[deposit] * releaseCount);
      }
    }
  }

  // Method to calculate the base minRatio based on resource consumption and worker availability
  calculateBaseMinRatio(resources, deltaTime) {
    let minRatio = Infinity;

    // Calculate minRatio based on resource consumption
    for (const category in this.consumption) {
      for (const resource in this.consumption[category]) {
        const requiredAmount = resources[category][resource].consumptionRate * (deltaTime / 1000);
        if (requiredAmount === 0) continue;
        const availableAmount = resources[category][resource].value + resources[category][resource].productionRate*(deltaTime / 1000);
        if (availableAmount < requiredAmount) {
          minRatio = Math.min(minRatio, Math.max(availableAmount / requiredAmount,0));
        } else {
          minRatio = Math.min(minRatio, 1);
        }
      }
    }

    // Calculate minRatio based on worker availability if applicable
    if (this.getTotalWorkerNeed() > 0) {
      const workerRatio = populationModule.getWorkerAvailabilityRatio();
      minRatio = Math.min(minRatio, workerRatio);
    }

    return minRatio;
  }

  updateProductivity(resources, deltaTime) {
    if(this.active === 0){
      this.productivity = 0;
    } else{
      let targetProductivity = Math.max(0, Math.min(1, this.calculateBaseMinRatio(resources, deltaTime)));

      // Automatically disable GHG factory if temperature exceeds threshold
      if(
        this.name === 'ghgFactory' &&
        this.isBooleanFlagSet('terraformingBureauFeature') &&
        ghgFactorySettings.autoDisableAboveTemp &&
        terraforming && terraforming.temperature
      ){
        if(terraforming.temperature.value > ghgFactorySettings.disableTempThreshold){
          targetProductivity = 0;
          ghgFactorySettings.restartCap = 0;
          ghgFactorySettings.restartTimer = 0;
        } else {
          if(ghgFactorySettings.restartCap < 1){
            ghgFactorySettings.restartTimer += deltaTime;
            const progress = Math.min(ghgFactorySettings.restartTimer, 5000);
            ghgFactorySettings.restartCap = Math.log10(1+progress / 5000) / Math.log1p(2);
          } else {
            ghgFactorySettings.restartCap = 1;
          }
          targetProductivity *= ghgFactorySettings.restartCap;
        }
      }

      if(Math.abs(targetProductivity - this.productivity) < 0.001){
        this.productivity = targetProductivity;
      }
      else {
        const difference = Math.abs(targetProductivity - this.productivity);
        const dampingFactor = difference < 0.01 ? 0.01 : 0.1; // Use smaller damping if close to target
        this.productivity += dampingFactor * (targetProductivity - this.productivity);
      }
    }
  }

  // Updated produce function to track production rates
  produce(accumulatedChanges, deltaTime) {
    const effectiveMultiplier = this.getEffectiveProductionMultiplier();

    // Calculate production using effectiveMultiplier and accumulate changes
    for (const category in this.production) {
      if (!this.currentProduction[category]) {
        this.currentProduction[category] = {};
      }

      for (const resource in this.production[category]) {
        const baseProduction = this.active * this.production[category][resource] * effectiveMultiplier * this.getEffectiveResourceProductionMultiplier(category, resource);
        const scaledProduction = baseProduction * this.productivity * (deltaTime / 1000);

        // Track actual production in the building
        this.currentProduction[category][resource] = scaledProduction;

        // Accumulate production changes
        accumulatedChanges[category][resource] = (accumulatedChanges[category][resource] || 0) + scaledProduction;

        // Update production rate for the resource
        resources[category][resource].modifyRate(
          scaledProduction * (1000 / deltaTime),
          this.displayName,
          'building'
        );
      }
    }
  }

  // Updated consume function to track consumption rates
  consume(accumulatedChanges, deltaTime) {
    const effectiveMultiplier = this.getEffectiveConsumptionMultiplier();

    this.currentConsumption = {}; // Reset current consumption

    // Calculate consumption and accumulate changes
    for (const category in this.consumption) {
      if (!this.currentConsumption[category]) {
        this.currentConsumption[category] = {};
      }

      for (const resource in this.consumption[category]) {
        const baseConsumption = this.active * this.consumption[category][resource] * effectiveMultiplier * this.getEffectiveResourceConsumptionMultiplier(category, resource);
        const scaledConsumption = baseConsumption * this.productivity * (deltaTime / 1000);

        // Track actual consumption in the building
        this.currentConsumption[category][resource] = scaledConsumption;

        // Accumulate consumption changes (as negative values)
        accumulatedChanges[category][resource] = (accumulatedChanges[category][resource] || 0) - scaledConsumption;

        // Update consumption rate for the resource
        resources[category][resource].modifyRate(
          -scaledConsumption * (1000 / deltaTime),
          this.displayName,
          'building'
        );
      }
    }
  }

  applyMaintenance(accumulatedChanges, accumulatedMaintenance, deltaTime) {
    this.maintenanceCost = this.calculateMaintenanceCost();
    this.currentMaintenance = {}; // Reset current maintenance

    // Calculate maintenance and accumulate changes
    for (const resource in this.maintenanceCost) {
      if (resources.colony[resource]) {
        const baseMaintenanceCost = this.maintenanceCost[resource] * this.active;
        const maintenanceCost = baseMaintenanceCost * (deltaTime / 1000) * this.productivity;

        // Track current maintenance in the building
        this.currentMaintenance[resource] = maintenanceCost;

        // Accumulate maintenance changes (as negative values)
        accumulatedChanges['colony'][resource] = (accumulatedChanges['colony'][resource] || 0) - maintenanceCost;

        // Update consumption rate for maintenance costs
        resources['colony'][resource].modifyRate(
          -(maintenanceCost * (1000 / deltaTime)),
          this.displayName,
          'building'
        );

        // Accumulate maintenance costs in the accumulatedMaintenance object
        accumulatedMaintenance[resource] = (accumulatedMaintenance[resource] || 0) + maintenanceCost;

        // Check for a maintenance conversion for this resource
        const resourceData = resources.colony[resource];
        if (resourceData.maintenanceConversion) {
          for (const targetCategory in resourceData.maintenanceConversion) {
            const targetResourceName = resourceData.maintenanceConversion[targetCategory];
            const conversionValue = resourceData.conversionValue || 1;

            // Apply conversion by adding the scaled maintenance cost to the target resource
            const convertedAmount = maintenanceCost * conversionValue;

            if (resources[targetCategory] && resources[targetCategory][targetResourceName]) {
              accumulatedChanges[targetCategory][targetResourceName] = 
                (accumulatedChanges[targetCategory][targetResourceName] || 0) + convertedAmount;

              // Update production rate for the converted resource
              resources[targetCategory][targetResourceName].modifyRate(
                convertedAmount * (1000 / deltaTime),
                this.displayName,
                'building'
              );
            }
          }
        }
      }
    }
  }

  // Method to update storage capacity in resources after building changes
  updateResourceStorage() {
    for (const category in this.storage) {
      for (const resource in this.storage[category]) {
        resources[category][resource].updateStorageCap(buildings);
      }
    }
  }

  enable() {
    this.unlocked = true;
  }
}

function initializeBuildings(buildingsParameters) {
  const buildings = {};
  for (const buildingName in buildingsParameters) {
    const buildingData = buildingsParameters[buildingName];

    // Add maintenanceFraction to the building configuration
    const buildingConfig = {
      ...buildingData
    };

    buildings[buildingName] = new Building(buildingConfig, buildingName);
  }
  initializeBuildingTabs();
  return buildings;
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = { Building, initializeBuildings };
}