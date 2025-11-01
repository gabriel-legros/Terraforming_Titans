let produceAntimatterHelper = globalThis.produceAntimatter || null;
let updateAntimatterStorageCapHelper = globalThis.updateAntimatterStorageCap || null;

if (typeof module !== 'undefined' && module.exports) {
  ({
    produceAntimatter: produceAntimatterHelper,
    updateAntimatterStorageCap: updateAntimatterStorageCapHelper,
  } = require('./special/antimatter.js'));
}

// Resource Class and Core Logic
class Resource extends EffectableEntity {
  constructor(resourceData) {
    super(resourceData);

    this.name = resourceData.name || '';
    this.category = resourceData.category;
    this.displayName = resourceData.displayName || resourceData.name || '';
    this.unit = resourceData.unit || null;
    this.initialValue = resourceData.initialValue || 0;
    this.value = resourceData.initialValue || 0;
    this.hasCap = resourceData.hasCap || false;
    this.baseCap = resourceData.baseCap || 0; // Store the base capacity of the resource
    this.cap = this.hasCap ? this.baseCap : Infinity; // Set the initial cap
    this.baseProductionRate = 0; // Keep for potential base calculations if needed later
    // Store rates by type { type: { sourceName: rate } } e.g., { 'building': { 'Mine': 10 }, 'terraforming': { 'Evaporation': -5 } }
    this.productionRateByType = {};
    this.consumptionRateByType = {};
    // Keep overall rates for potential display/compatibility, calculated by summing typed rates
    this.productionRate = 0;
    this.consumptionRate = 0;
    this.reserved = resourceData.reserved || 0;
    this.reservedSources = {};
    this.unlocked = resourceData.unlocked;
    this.maintenanceConversion = resourceData.maintenanceConversion || {}; // Stores any maintenance conversion mapping
    this.maintenanceMultiplier = resourceData.maintenanceMultiplier !== undefined ? resourceData.maintenanceMultiplier : 1; // Multiplier for maintenance costs
    this.conversionValue = resourceData.conversionValue || 1; // Default to 1 if not provided
    this.hideWhenSmall = resourceData.hideWhenSmall || false; // Flag to hide when value is very small
    this.hideRate = resourceData.hideRate || false; // Flag to hide rate display in UI
    this.overflowRate = 0; // Track overflow/leakage rate for tooltip display
    this.rateHistory = []; // Keep history of recent net rates
    this.marginTop = resourceData.marginTop || 0;
    this.marginBottom = resourceData.marginBottom || 0;
    this.autobuildShortage = false; // Flagged when autobuild cannot use this resource this tick
  }

  // Method to initialize configurable properties
  initializeFromConfig(name, config) {
    if (config.initialValue !== undefined) {
      this.initialValue = config.initialValue;
    }

    if (config.displayName !== undefined) {
      this.displayName = config.displayName || config.name || this.displayName;
    }
    if (config.category !== undefined) {
      this.category = config.category;
    }
    if (config.hasCap !== undefined) {
      this.hasCap = config.hasCap;
    }
    if (config.baseCap !== undefined) {
      this.baseCap = config.baseCap;
    }
    if (config.unlocked !== undefined) {
      this.unlocked = config.unlocked;
    }
    if (config.unit !== undefined) {
      this.unit = config.unit;
    }
    if (config.maintenanceConversion !== undefined) {
      this.maintenanceConversion = config.maintenanceConversion || {};
    }
    if (config.maintenanceMultiplier !== undefined) {
      this.maintenanceMultiplier = config.maintenanceMultiplier;
    }
    if (config.conversionValue !== undefined) {
      this.conversionValue = config.conversionValue || 1;
    }
    if (config.hideWhenSmall !== undefined) {
      this.hideWhenSmall = config.hideWhenSmall;
    }
    if (config.hideRate !== undefined) {
      this.hideRate = config.hideRate;
    }
    if (config.marginTop !== undefined) {
      this.marginTop = config.marginTop;
    }
    if (config.marginBottom !== undefined) {
      this.marginBottom = config.marginBottom;
    }

    if (this.name === 'land' && config.initialValue !== undefined) {
      this.value = Math.max(this.value, config.initialValue);
    }
  }

  increase(amount) {
    if(amount > 0){
      this.value = Math.min(this.value + amount, this.cap);
    }
  }

  // Reset display-related properties to defaults from planet parameters
  reinitializeDisplayElements() {
    const defaultResource =
      defaultPlanetParameters &&
      defaultPlanetParameters.resources &&
      defaultPlanetParameters.resources[this.category] &&
      defaultPlanetParameters.resources[this.category][this.name];

    if (defaultResource) {
      this.displayName =
        defaultResource.displayName || defaultResource.name || this.name;
      this.marginTop = defaultResource.marginTop || 0;
      this.marginBottom = defaultResource.marginBottom || 0;
    } else {
      this.displayName = this.displayName || this.name;
      this.marginTop = this.marginTop || 0;
      this.marginBottom = this.marginBottom || 0;
    }
  }

  decrease(amount) {
    this.value = Math.max(this.value - amount, 0);
  }

  isAvailable(amount) {
    return this.value - this.reserved >= amount;
  }

  reserve(amount) {
    if (this.isAvailable(amount)) {
      this.reserved += amount;
      return true;
    }
    return false;
  }

  release(amount) {
    this.reserved = Math.max(this.reserved - amount, 0);
  }

  setReservedAmountForSource(source, amount) {
    const key = source || 'default';
    const previous = this.reservedSources[key] || 0;
    const sanitized = Number.isFinite(amount) && amount > 0 ? amount : 0;

    this.reserved = Math.max(0, this.reserved - previous);

    if (sanitized > 0) {
      this.reservedSources[key] = sanitized;
      this.reserved += sanitized;
    } else {
      delete this.reservedSources[key];
    }
  }

  getReservedAmountForSource(source) {
    return this.reservedSources[source] || 0;
  }

  addDeposit(amount = 1) {
    this.value += amount;
  }

  resetBaseProductionRate() {
    this.baseProductionRate = 0;
  }

  // Record a net production rate and keep only the last 10 entries
  recordNetRate(rate) {
    this.rateHistory.push(rate);
    if (this.rateHistory.length > 10) {
      this.rateHistory.shift();
    }
  }

  // Method to update the storage cap based on active structures
  updateStorageCap() {
    let newCap = this.baseCap; // Start with the base capacity
    const bonus = this.activeEffects
      ? this.activeEffects
          .filter(e => e.type === 'baseStorageBonus')
          .reduce((sum, e) => sum + e.value, 0)
      : 0;
    newCap += bonus;

    for (const structureName in structures) {
      const structure = structures[structureName];
      if (!structure.storage || structure.active <= 0) continue;

      const storageByCategory = structure.storage[this.category];
      if (!storageByCategory || storageByCategory[this.name] === undefined) continue;

      newCap += structure.active * storageByCategory[this.name] * structure.getEffectiveStorageMultiplier();
    }
    this.cap = this.hasCap ? newCap : Infinity;
  }

  // Modify rate, now requires a rateType (e.g., 'building', 'terraforming', 'life', 'funding')
  modifyRate(value, source, rateType) {
    if (source === undefined) {
      source = 'Unknown'; // Assign a default source if undefined
    }
    if (rateType === undefined) {
        rateType = 'unknown'; // Assign a default type if undefined - THIS IS AN ERROR
    }

    if (value > 0) {
      this.productionRate += value;
      // Initialize type if not present
      if (!this.productionRateByType[rateType]) {
        this.productionRateByType[rateType] = {};
      }
      // Initialize source within type if not present
      if (!this.productionRateByType[rateType][source]) {
        this.productionRateByType[rateType][source] = 0;
      }
      this.productionRateByType[rateType][source] += value;
    } else if (value < 0) { // Only process negative values for consumption
      this.consumptionRate += -value;
      // Initialize type if not present
      if (!this.consumptionRateByType[rateType]) {
        this.consumptionRateByType[rateType] = {};
      }
      // Initialize source within type if not present
      if (!this.consumptionRateByType[rateType][source]) {
        this.consumptionRateByType[rateType][source] = 0;
      }
      // Store consumption as a positive value
      this.consumptionRateByType[rateType][source] -= value;
    }
    // Note: We will recalculate total production/consumption rates later if needed
  }

  // Recalculates total production and consumption rates by summing typed rates
  recalculateTotalRates() {
    this.productionRate = 0;
    this.consumptionRate = 0;
    this.productionRateBySource = {}; // Keep this for potential UI use, sum across types
    this.consumptionRateBySource = {}; // Keep this for potential UI use, sum across types

    for (const type in this.productionRateByType) {
      for (const source in this.productionRateByType[type]) {
        const rate = this.productionRateByType[type][source];
        this.productionRate += rate; // Exclude overflow from total production
        if (!this.productionRateBySource[source]) this.productionRateBySource[source] = 0;
        this.productionRateBySource[source] += rate;
      }
    }

    for (const type in this.consumptionRateByType) {
      for (const source in this.consumptionRateByType[type]) {
        const rate = this.consumptionRateByType[type][source];
        if (type !== 'overflow') {
          this.consumptionRate += rate; // Exclude overflow from total consumption
        }
        if (!this.consumptionRateBySource[source]) this.consumptionRateBySource[source] = 0;
        this.consumptionRateBySource[source] += rate;
      }
    }
  }

  // Resets all rate trackers
  resetRates() {
      this.productionRate = 0;
      this.consumptionRate = 0;
      this.productionRateByType = {};
      this.consumptionRateByType = {};
      this.productionRateBySource = {}; // Also reset the aggregated source map
      this.consumptionRateBySource = {}; // Also reset the aggregated source map
      this.overflowRate = 0;
  }

  enable() {
    this.unlocked = true;
    unlockResource(this);
  }
}

function checkResourceAvailability(category, resource, requiredAmount) {
  return resources[category][resource].isAvailable(requiredAmount);
}

function checkDepositAvailability(depositType, requiredAmount) {
  return resources.underground[depositType].isAvailable(requiredAmount);
}

function createResources(resourcesData) {
  const resources = {};
  for (const category in resourcesData) {
    resources[category] = {};
    for (const resourceName in resourcesData[category]) {
      const resourceData = resourcesData[category][resourceName];
      resourceData.displayName = resourceData.displayName || resourceData.name; // Assign resource name to the resourceData object
      resourceData.name = resourceName;
      resourceData.category = category;

      if (
        resourceData.maxDeposits !== undefined &&
        resourceData.baseCap === undefined
      ) {
        resourceData.baseCap = resourceData.maxDeposits;
      }

      resources[category][resourceName] = new Resource(resourceData);
    }
  }
  return resources;
}

function reconcileLandResourceValue() {
  const landResource = resources?.surface?.land;
  if (!landResource) {
    return;
  }

  const tf = typeof terraforming !== 'undefined' ? terraforming : (typeof globalThis !== 'undefined' ? globalThis.terraforming : null);
  const params = typeof currentPlanetParameters !== 'undefined'
    ? currentPlanetParameters
    : (typeof globalThis !== 'undefined' ? globalThis.currentPlanetParameters : null);

  const baseCandidates = [
    tf?.initialLand,
    landResource.initialValue,
    params?.resources?.surface?.land?.initialValue,
  ];

  let baseLand = 0;
  for (const candidate of baseCandidates) {
    if (typeof candidate === 'number' && isFinite(candidate) && candidate > 0) {
      baseLand = candidate;
      break;
    }
  }

  if (!(baseLand > 0)) {
    const reserved = Math.max(0, landResource.reserved || 0);
    landResource.value = Math.max(landResource.value, reserved);
    return;
  }

  let totalLand = baseLand;

  const manager =
    typeof spaceManager !== 'undefined'
      ? spaceManager
      : (typeof globalThis !== 'undefined' ? globalThis.spaceManager : null);
  const projectMgr =
    typeof projectManager !== 'undefined'
      ? projectManager
      : (typeof globalThis !== 'undefined' ? globalThis.projectManager : null);
  const ringProject = projectMgr?.projects?.orbitalRing;
  const hasRingFromManager = typeof manager?.currentWorldHasOrbitalRing === 'function'
    ? manager.currentWorldHasOrbitalRing()
    : false;
  const hasRing = hasRingFromManager || !!(ringProject && ringProject.currentWorldHasRing);
  if (hasRing) {
    totalLand += baseLand;
  }

  const undergroundProject = projectMgr?.projects?.undergroundExpansion;
  if (undergroundProject) {
    const perCompletion = baseLand / 10000;
    if (perCompletion > 0) {
      const maxRepeats = Number.isFinite(undergroundProject.maxRepeatCount)
        ? undergroundProject.maxRepeatCount
        : Infinity;
      let completions = Math.max(0, undergroundProject.repeatCount || 0);
      if (undergroundProject.isActive && undergroundProject.startingDuration) {
        const duration = undergroundProject.startingDuration;
        if (duration > 0) {
          const remaining = Math.max(0, undergroundProject.remainingTime ?? duration);
          const ratio = Math.max(0, Math.min(1, remaining / duration));
          completions += 1 - ratio;
        }
      }
      if (Number.isFinite(maxRepeats)) {
        completions = Math.min(completions, maxRepeats);
      }
      const extraLand = Math.min(completions * perCompletion, baseLand);
      totalLand += extraLand;
    }
  }

  const reserved = Math.max(0, landResource.reserved || 0);
  landResource.value = Math.max(totalLand, reserved);
}

if (typeof globalThis !== 'undefined') {
  globalThis.reconcileLandResourceValue = reconcileLandResourceValue;
}

function calculateProductionRates(deltaTime, buildings) {
  //Here we calculate production and consumption rates at 100% productivity ignoring maintenance
  // Reset production and consumption rates for all resources
  // Reset rates using the new method
  for (const category in resources) {
    for (const resourceName in resources[category]) {
      resources[category][resourceName].resetRates();
    }
  }

  for (const buildingName in buildings) {
    const building = buildings[buildingName];
    const automationMultiplier = building.getAutomationActivityMultiplier?.() ?? 1;

    // Calculate scaled production rates
    for (const category in building.production) {
      for (const resource in building.production[category]) {
        const actualProduction = (building.production[category][resource] || 0) * building.active * building.getProductionRatio() * building.getEffectiveProductionMultiplier() * building.getEffectiveResourceProductionMultiplier(category, resource) * automationMultiplier;
        // Specify 'building' as the rateType
        resources[category][resource].modifyRate(actualProduction, building.displayName, 'building');
      }
    }

    // Calculate scaled consumption rates
    for (const category in building.consumption) {
      for (const resource in building.consumption[category]) {
        const entry = building.getConsumptionResource ? building.getConsumptionResource(category, resource) : { amount: building.consumption[category][resource] };
        const amount = entry.amount || 0;
        const actualConsumption = amount * building.active * building.getConsumptionRatio() * building.getEffectiveConsumptionMultiplier() * building.getEffectiveResourceConsumptionMultiplier(category, resource) * automationMultiplier;
        // Specify 'building' as the rateType
        resources[category][resource].modifyRate(-actualConsumption, building.displayName, 'building');
      }
    }

    // Include production from maintenance conversions but ignore maintenance costs
    const maintenanceCost = typeof building.calculateMaintenanceCost === 'function' ? building.calculateMaintenanceCost() : {};
    for (const resource in maintenanceCost) {
      const sourceData = resources.colony[resource];
      if (!sourceData || !sourceData.maintenanceConversion) continue;
      const base = maintenanceCost[resource] * building.active * building.productivity * automationMultiplier;
      const conversionValue = sourceData.conversionValue || 1;
      for (const targetCategory in sourceData.maintenanceConversion) {
        const targetResource = sourceData.maintenanceConversion[targetCategory];
        resources[targetCategory][targetResource].modifyRate(
          base * conversionValue,
          building.displayName,
          'building'
        );
      }
    }
  }

  if (projectManager) {
    for (const name in projectManager.projects) {
      const project = projectManager.projects[name];
      if (projectManager.isProjectRelevantToCurrentPlanet?.(project) === false) {
        continue;
      }
      if (project && project.treatAsBuilding && typeof project.estimateCostAndGain === 'function') {
        project.estimateCostAndGain(deltaTime, true);
      }
    }
  }

  // Add funding rate to the production of funding resource
  if (fundingModule) {
    const fundingIncreaseRate = fundingModule.getEffectiveFunding(); // Get funding rate from funding module
    // Specify 'funding' as the rateType
    resources.colony.funding.modifyRate(fundingIncreaseRate, 'Funding', 'funding'); // Update funding production rate
  }
}

function produceResources(deltaTime, buildings) {
  const isDay = dayNightCycle.isDay();

  reconcileLandResourceValue();

  calculateProductionRates(deltaTime, buildings);

  if (updateAntimatterStorageCapHelper) {
    updateAntimatterStorageCapHelper(resources);
  }

  // Update storage cap for all resources except workers
  for (const category in resources) {
    for (const resourceName in resources[category]) {
      const resource = resources[category][resourceName];
      if(resource.name != 'workers'){
        resource.updateStorageCap();
      }
    }
  }

  for (const buildingName in buildings) {
    const building = buildings[buildingName];

    if (building && typeof building.update === 'function') {
      building.update(deltaTime);
    }

    // Set productivity to 0 if it's nighttime and the building is inactive during the night
    if (!isDay && building.dayNightActivity) {
      building.productivity = 0;
    } else {
      // Otherwise, update productivity as usual
      building.updateProductivity(resources, deltaTime);
    }
  }

  //Productivity has now been calculated and applied

  //Reset production and consumption rates for all resources because we want to display actuals
  // Reset rates again using the new method before accumulating actual changes
  for (const category in resources) {
    for (const resourceName in resources[category]) {
      const resource = resources[category][resourceName];
      resource.resetRates(); // Reset typed rates
      if(resource.name != 'workers'){
        resource.updateStorageCap();
      }
    }
  }

  // Temporary object to store changes
  const accumulatedChanges = {};
  const accumulatedMaintenance = {}; // Object to store accumulated maintenance costs
    // Initialize accumulated changes and maintenance
  for (const category in resources) {
    accumulatedChanges[category] = {};
    for (const resourceName in resources[category]) {
      accumulatedChanges[category][resourceName] = 0;
      
      if (category === 'colony') {
        accumulatedMaintenance[resourceName] = 0; // Initialize accumulated maintenance costs for colony resources
      }
    }
  }

  //Productivity is now calculated, let's actually produce and consume

  for(const buildingName in buildings){
    const building = buildings[buildingName];
    // Accumulate production, consumption, and maintenance changes
    building.produce(accumulatedChanges, deltaTime);
    building.consume(accumulatedChanges, deltaTime);
    building.applyMaintenance(accumulatedChanges, accumulatedMaintenance, deltaTime);
  }

  if (projectManager) {
    for (const name in projectManager.projects) {
      const project = projectManager.projects[name];
      if (projectManager.isProjectRelevantToCurrentPlanet?.(project) === false) {
        continue;
      }
      if (project && project.treatAsBuilding && typeof project.applyCostAndGain === 'function') {
        if (typeof project.estimateCostAndGain === 'function') {
          project.estimateCostAndGain(deltaTime, true, 1);
        }
        project.applyCostAndGain(deltaTime, accumulatedChanges, 1);
      }
    }
  }

  // Apply funding rate to the accumulated changes
  if (fundingModule) {
    const fundingIncreaseRate = fundingModule.getEffectiveFunding(); // Get funding rate from funding module
    // Accumulate funding change directly into accumulatedChanges, no need to call modifyRate here again
    if (accumulatedChanges.colony && accumulatedChanges.colony.funding !== undefined) {
        accumulatedChanges.colony.funding += fundingIncreaseRate * deltaTime / 1000;
    }
    fundingModule.update(deltaTime); // Update funding module state if needed
  }

  // Call terraforming.updateResources AFTER accumulating building/funding changes
  // but BEFORE applying accumulatedChanges to resource values.
  // terraforming.updateResources will call modifyRate with type 'terraforming'.
  if(terraforming) {
    terraforming.updateResources(deltaTime);
    terraforming.distributeGlobalChangesToZones(deltaTime);
  }

  // Call lifeManager.updateLife AFTER buildings but potentially before or after terraforming,
  // depending on desired interaction. Assuming it runs after buildings and before applying changes.
  // It should call modifyRate with type 'life'.
  if(lifeManager){
    lifeManager.updateLife(deltaTime);
  }

  if(researchManager && typeof researchManager.update === 'function'){
    researchManager.update(deltaTime);
  }

  if (typeof updateShipReplication === 'function') {
    updateShipReplication(deltaTime, resources, globalEffects, accumulatedChanges);
  }

  if (typeof updateAndroidResearch === 'function') {
    updateAndroidResearch(deltaTime, resources, globalEffects, accumulatedChanges);
  }

  if (produceAntimatterHelper) {
    produceAntimatterHelper(deltaTime, resources, accumulatedChanges);
  }

  if (projectManager) {
    const names = projectManager.projectOrder || Object.keys(projectManager.projects || {});
    const projectData = {};
    for (const name of names) {
      const project = projectManager.projects?.[name];
      if (!project || project.treatAsBuilding) continue;
      if (projectManager.isProjectRelevantToCurrentPlanet?.(project) === false) {
        continue;
      }
      if (typeof project.estimateCostAndGain !== 'function' || typeof project.applyCostAndGain !== 'function') {
        continue;
      }
      const { cost = {}, gain = {} } = project.estimateCostAndGain(deltaTime, false) || {};
      projectData[name] = { project, cost, gain };
    }
    const productivityMap = calculateProjectProductivities(resources, accumulatedChanges, projectData);
    for (const name of names) {
      const data = projectData[name];
      if (!data || data.project.treatAsBuilding) continue;
      const { project } = data;
      if (projectManager.isProjectRelevantToCurrentPlanet?.(project) === false) {
        continue;
      }
//      const productivity = productivityMap[name] ?? 1;
      const productivity = 1;
      if (project.autoStart === false) {
        project.applyCostAndGain(deltaTime, accumulatedChanges, productivity);
        continue;
      }
      project.estimateCostAndGain(deltaTime, true, productivity);
      project.applyCostAndGain(deltaTime, accumulatedChanges, productivity);
    }
  }

  if (typeof nanotechManager !== 'undefined' && typeof nanotechManager.produceResources === 'function') {
    nanotechManager.produceResources(deltaTime, accumulatedChanges);
  }

  // Apply accumulated changes to resources
  for (const category in resources) {
    for (const resourceName in resources[category]) {
      const resource = resources[category][resourceName];
      const previousValue = resource.value; // Track the previous value before changes

      // Apply the accumulated changes
      const newValue = resource.value + accumulatedChanges[category][resourceName];
      let finalValue = newValue;
      let overflow = 0;

      // If the resource was at the cap, flatten back to cap but allow temporary excess
      if (resource.hasCap) {
        const limit = previousValue >= resource.cap ? previousValue : resource.cap;
        if (newValue > limit) overflow = newValue - limit;
        finalValue = Math.min(newValue, limit);
      }

      resource.value = Math.max(finalValue, 0); // Ensure non-negative

      if (overflow > 0 && category === 'colony' && resourceName === 'water' && terraforming && terraforming.zonalWater) {
        const zones = ['tropical', 'temperate', 'polar'];
        const zoneTemp = zone => terraforming.temperature?.zones?.[zone]?.value ?? 0;
        const warmZones = zones.filter(zone => zoneTemp(zone) > 273.15);
        const targetZones = warmZones.length > 0 ? warmZones : zones;
        const warmArea = warmZones.reduce((sum, zone) => sum + ((typeof getZonePercentage === 'function') ? getZonePercentage(zone) : 1 / zones.length), 0) || 1;
        const seconds = deltaTime / 1000;
        const rate = seconds > 0 ? overflow / seconds : 0;
        const allZonesHot = zones.every(zone => zoneTemp(zone) > 373.15);
        let liquidRate = 0;
        let iceRate = 0;
        let atmosphericRate = 0;

        if (allZonesHot && resources.atmospheric?.atmosphericWater) {
          resources.atmospheric.atmosphericWater.value += overflow;
          atmosphericRate = rate;
        } else {
          targetZones.forEach(zone => {
            const zoneArea = (typeof getZonePercentage === 'function') ? getZonePercentage(zone) : 1 / zones.length;
            const proportion = warmZones.length > 0 ? zoneArea / warmArea : zoneArea; // ensure proportions sum to 1 among warm zones
            const amount = overflow * proportion;

            if (warmZones.length > 0) {
              terraforming.zonalWater[zone].liquid += amount;
              resources.surface.liquidWater.value += amount;
              liquidRate += seconds > 0 ? amount / seconds : 0;
            } else {
              terraforming.zonalWater[zone].ice += amount;
              resources.surface.ice.value += amount;
              iceRate += seconds > 0 ? amount / seconds : 0;
            }
          });
        }

        // Record overflow separately for tooltip display without affecting totals
        resource.modifyRate?.(-rate, 'Overflow (not summed)', 'overflow');
        if (liquidRate > 0) {
          resources.surface?.liquidWater?.modifyRate?.(liquidRate, 'Overflow', 'overflow');
        }
        if (iceRate > 0) {
          resources.surface?.ice?.modifyRate?.(iceRate, 'Overflow', 'overflow');
        }
        if (atmosphericRate > 0) {
          resources.atmospheric?.atmosphericWater?.modifyRate?.(atmosphericRate, 'Overflow', 'overflow');
        }
      }
    }
  }

  recalculateTotalRates();
}

function calculateProjectProductivities(resources, accumulatedChanges, projectData = {}) {
  const totalNet = {};
  const production = {};
  for (const name in projectData) {
    const project = projectData[name].project;
    if (!project.isContinuous()) {
      continue;
    }
    const { cost = {}, gain = {} } = projectData[name];
    let hasCost = false;
    for (const category in cost) {
      for (const resource in cost[category]) {
        const required = cost[category][resource] || 0;
        const produced = gain[category]?.[resource] || 0;
        const net = Math.max(required - produced, 0);
        if (net > 0) {
          hasCost = true;
          if (!totalNet[category]) totalNet[category] = {};
          totalNet[category][resource] = (totalNet[category][resource] || 0) + net;
        }
      }
    }
    if (hasCost) {
      for (const category in gain) {
        for (const resource in gain[category]) {
          const produced = gain[category]?.[resource] || 0;
          if (produced > 0) {
            if (!production[category]) production[category] = {};
            production[category][resource] = (production[category][resource] || 0) + produced;
          }
        }
      }
    }
  }

  const ratios = {};
  for (const category in totalNet) {
    for (const resource in totalNet[category]) {
      const available =
        (resources[category]?.[resource]?.value || 0) +
        (production[category]?.[resource] || 0) +
        (accumulatedChanges[category]?.[resource] || 0);
      const net = totalNet[category][resource];
      const ratio = net > 0 ? Math.min(available / net, 1) : 1;
      if (!ratios[category]) ratios[category] = {};
      ratios[category][resource] = Math.max(0, ratio);
    }
  }

  const productivityMap = {};
  for (const name in projectData) {
    const { cost = {}, gain = {}, project } = projectData[name];
    if (!project.isContinuous()) {
      continue;
    }
    let productivity = 1;
    for (const category in cost) {
      for (const resource in cost[category]) {
        const required = cost[category][resource] || 0;
        const produced = gain[category]?.[resource] || 0;
        const net = Math.max(required - produced, 0);
        if (net > 0) {
          const ratio = ratios[category]?.[resource] ?? 1;
          productivity = Math.min(productivity, ratio);
        }
      }
    }
    productivityMap[name] = Math.max(0, Math.min(1, productivity));
  }

  return productivityMap;
}

function recalculateTotalRates(){
  // After all changes are applied, recalculate total rates for UI display
  for (const category in resources) {
    for (const resourceName in resources[category]) {
      resources[category][resourceName].recalculateTotalRates();
    }
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    Resource,
    checkResourceAvailability,
    createResources,
    produceResources,
    calculateProjectProductivities,
    recalculateTotalRates,
    reconcileLandResourceValue,
  };
}

