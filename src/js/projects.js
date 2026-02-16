// projects.js

const IMPORT_RESOURCE_PROJECT_NAMES = [
  'oreSpaceMining',
  'siliconSpaceMining',
  'carbonSpaceMining',
  'waterSpaceMining',
  'nitrogenSpaceMining',
  'hydrogenSpaceMining',
];

const MEGA_PROJECT_RESOURCE_MODES = {
  SPACE_FIRST: 'space-first',
  COLONY_FIRST: 'colony-first',
  SPACE_ONLY: 'space-only',
  COLONY_ONLY: 'colony-only',
};

const EARTH_RADIUS_KM = 6371;

const MEGA_PROJECT_RESOURCE_MODE_OPTIONS = [
  { value: MEGA_PROJECT_RESOURCE_MODES.SPACE_FIRST, label: 'Prioritize space resources for mega+ projects' },
  { value: MEGA_PROJECT_RESOURCE_MODES.COLONY_FIRST, label: 'Prioritize colony resources for mega+ projects' },
  { value: MEGA_PROJECT_RESOURCE_MODES.SPACE_ONLY, label: 'Only use space resources for mega+ projects' },
  { value: MEGA_PROJECT_RESOURCE_MODES.COLONY_ONLY, label: 'Only use colony resources for mega+ projects' },
];

const MEGA_PROJECT_RESOURCE_MODE_MAP = {
  [MEGA_PROJECT_RESOURCE_MODES.SPACE_FIRST]: true,
  [MEGA_PROJECT_RESOURCE_MODES.COLONY_FIRST]: true,
  [MEGA_PROJECT_RESOURCE_MODES.SPACE_ONLY]: true,
  [MEGA_PROJECT_RESOURCE_MODES.COLONY_ONLY]: true,
};

function resolveMegaProjectResourceMode(storageProj) {
  const mode = storageProj?.megaProjectResourceMode;
  if (MEGA_PROJECT_RESOURCE_MODE_MAP[mode]) {
    return mode;
  }
  const legacy = storageProj?.prioritizeMegaProjects;
  if (legacy === false) {
    return MEGA_PROJECT_RESOURCE_MODES.COLONY_FIRST;
  }
  if (legacy === true) {
    return MEGA_PROJECT_RESOURCE_MODES.SPACE_FIRST;
  }
  return MEGA_PROJECT_RESOURCE_MODES.SPACE_FIRST;
}

function getMegaProjectResourceAvailability(storageProj, storageKey, colonyAvailable) {
  const storageAvailable = storageProj?.getAvailableStoredResource?.(storageKey) || 0;
  const mode = storageProj ? resolveMegaProjectResourceMode(storageProj) : MEGA_PROJECT_RESOURCE_MODES.COLONY_ONLY;
  if (mode === MEGA_PROJECT_RESOURCE_MODES.SPACE_ONLY) {
    return storageAvailable;
  }
  if (mode === MEGA_PROJECT_RESOURCE_MODES.COLONY_ONLY) {
    return colonyAvailable;
  }
  return colonyAvailable + storageAvailable;
}

function getMegaProjectResourceAllocation(storageProj, storageKey, amount, colonyAvailable) {
  const storageAvailable = storageProj?.getAvailableStoredResource?.(storageKey) || 0;
  const mode = storageProj ? resolveMegaProjectResourceMode(storageProj) : MEGA_PROJECT_RESOURCE_MODES.COLONY_ONLY;
  let fromStorage = 0;
  let fromColony = 0;
  if (mode === MEGA_PROJECT_RESOURCE_MODES.SPACE_ONLY) {
    fromStorage = Math.min(storageAvailable, amount);
    return { fromStorage, fromColony };
  }
  if (mode === MEGA_PROJECT_RESOURCE_MODES.COLONY_ONLY) {
    fromColony = Math.min(colonyAvailable, amount);
    return { fromStorage, fromColony };
  }
  if (mode === MEGA_PROJECT_RESOURCE_MODES.SPACE_FIRST) {
    fromStorage = Math.min(storageAvailable, amount);
    fromColony = amount - fromStorage;
    return { fromStorage, fromColony };
  }
  fromColony = Math.min(colonyAvailable, amount);
  fromStorage = amount - fromColony;
  return { fromStorage, fromColony };
}

class Project extends EffectableEntity {
  constructor(config, name) {
    super(config); // Call the base class constructor

    this.initializeFromConfig(config, name);

    this.startingDuration = this.duration;
    this.remainingTime = config.duration; // Time left to complete the project
    this.isActive = false; // Whether the project is currently active
    this.isCompleted = false; // Whether the project has been completed
    this.repeatCount = 0; // Track the current number of times the project has been repeated
    this.shownStorySteps = new Set(); // Track which story steps have been displayed
    this.autoStart = false;
    this.autoStartUncheckOnTravel = false;
    this.isPaused = false; // Whether the project is paused due to missing sustain cost
    this.shortfallLastTick = false; // Tracks if resource consumption failed last tick
    this.alertedWhenUnlocked = this.unlocked ? true : false;
    this.permanentlyDisabled = false;
    this.kesslerRollElapsed = 0;
    this.kesslerRollPending = false;
    this.kesslerStartCost = null;
    if (this.attributes?.canUseDysonOverflow) {
      this.allowColonyEnergyUse = false;
    }
  }

  initializeFromConfig(config, name) {
    // Reinitialize properties from configuration
    this.name = name;
    this.displayName = config.name;
    this.cost = config.cost;
    this.sustainCost = config.sustainCost || null; // Per-second resource cost while active
    this.production = config.production;
    this.duration = config.duration;
    this.description = config.description;
    this.attributes = config.attributes || {}; // Load attributes, e.g., scanner-related details
    this.repeatable = config.repeatable || false; // Flag indicating if the project can be repeated
    this.maxRepeatCount = config.maxRepeatCount || Infinity; // Maximum times the project can be repeated
    this.unlocked = config.unlocked;
    this.category = config.category;
    this.treatAsBuilding = config.treatAsBuilding || false;
    this.requireStar = config.requireStar === true;
    this.kesslerDebrisSize = config.kesslerDebrisSize || null;


    // Do not reinitialize state properties like isActive, isCompleted, repeatCount, etc.
  }

  applyEffects() {}


  getKesslerSuccessChance() {
    if (!this.kesslerDebrisSize) {
      return 1;
    }
    try {
      const hazard = hazardManager.kesslerHazard;
      return hazard.getSuccessChance(this.kesslerDebrisSize === 'large');
    } catch (error) {
      return 1;
    }
  }

  getKesslerFailureChance() {
    return 1 - this.getKesslerSuccessChance();
  }

  _getKesslerFailureCost() {
    if (this.kesslerStartCost) {
      return this.kesslerStartCost;
    }
    return this.getScaledCost();
  }

  _getKesslerDebrisAmount() {
    const cost = this._getKesslerFailureCost();
    let total = 0;
    for (const category in cost) {
      for (const resource in cost[category]) {
        if (resource === 'energy') {
          continue;
        }
        total += cost[category][resource];
      }
    }
    return total * 0.5;
  }

  _applyKesslerFailure() {
    const debris = this._getKesslerDebrisAmount();
    if (debris > 0) {
      try {
        hazardManager.kesslerHazard.addDebris(debris);
      } catch (error) {
        // no-op
      }
    }
    this.isActive = false;
    this.isPaused = false;
    this.isCompleted = false;
    this.kesslerRollPending = false;
    this.kesslerRollElapsed = 0;
    this.kesslerStartCost = null;
    this.remainingTime = this.getEffectiveDuration();
    this.startingDuration = this.remainingTime;
  }

  _checkKesslerFailure(deltaTime) {
    if (!this.kesslerRollPending) {
      return false;
    }
    this.kesslerRollElapsed += deltaTime;
    if (this.kesslerRollElapsed < 1000) {
      return false;
    }
    this.kesslerRollPending = false;
    const successChance = this.getKesslerSuccessChance();
    if (Math.random() > successChance) {
      this._applyKesslerFailure();
      return true;
    }
    this.kesslerStartCost = null;
    return false;
  }

  getDisableHazards() {
    if (this.attributes.disableWhenHazard) {
      return this.attributes.disableWhenHazard;
    }
    if (this.attributes.disableWhenKessler) {
      return ['kessler'];
    }
    return [];
  }

  isHazardActiveForDisable(hazardKey) {
    if (hazardKey === 'kessler') {
      return hazardManager.parameters.kessler && !hazardManager.kesslerHazard.isCleared();
    }
    if (hazardKey === 'pulsar') {
      let terraformingState = null;
      try {
        terraformingState = terraforming;
      } catch (error) {
        terraformingState = null;
      }
      return hazardManager.parameters.pulsar && !hazardManager.pulsarHazard.isCleared(terraformingState, hazardManager.parameters.pulsar);
    }
    return false;
  }

  getActiveDisableHazard() {
    const disableHazards = this.getDisableHazards();
    for (let i = 0; i < disableHazards.length; i += 1) {
      const hazardKey = disableHazards[i];
      if (this.isHazardActiveForDisable(hazardKey)) {
        return hazardKey;
      }
    }
    return null;
  }

  isHazardDisabled() {
    return this.getActiveDisableHazard() !== null;
  }

  getHazardDisableLabel() {
    const hazardKey = this.getActiveDisableHazard();
    if (hazardKey === 'kessler') {
      return 'Kessler';
    }
    if (hazardKey === 'pulsar') {
      return 'Pulsar';
    }
    return '';
  }

  isKesslerDisabled() {
    return this.getActiveDisableHazard() === 'kessler';
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

  applyDurationEffects(baseDuration) {
    return baseDuration * this.getDurationMultiplier();
  }

  getEffectiveDuration(){
    const base = this.getBaseDuration();
    return this.applyDurationEffects(base);
  }

  getBaseDuration(){
    if (this.attributes.ignoreDurationModifiers) {
      return this.duration;
    }
    if(this.isBooleanFlagSet('instantDuration')){
      return 1000;
    } else if(this.attributes.spaceMining || this.attributes.spaceExport){
      return this.calculateSpaceshipAdjustedDuration();
    } else {
      return this.duration;
    }
  }

  getDurationMultiplier() {
    if (this.attributes.ignoreDurationModifiers) {
      return 1;
    }
    let multiplier = 1;
    if (
      typeof projectManager !== 'undefined' &&
      typeof projectManager.getDurationMultiplier === 'function'
    ) {
      multiplier *= projectManager.getDurationMultiplier(this);
    }
    for (const effect of this.activeEffects) {
      if (effect.type === 'projectDurationMultiplier') {
        multiplier *= effect.value;
      }
    }
    return multiplier;
  }

  getWorldBonus() {
    let bonus = 0;
    for (const effect of this.activeEffects) {
      if (effect.type === 'effectiveTerraformedWorlds') {
        bonus += effect.value || 0;
      }
    }
    return bonus;
  }

  updateDurationFromEffects() {
    const base = this.getBaseDuration();
    const newDuration = base * this.getDurationMultiplier();
    if (this.isActive && this.isContinuous()) {
      this.startingDuration = Infinity;
      this.remainingTime = Infinity;
      return;
    }
    if (this.isActive) {
      const canCarryProgress =
        Number.isFinite(this.startingDuration) &&
        Number.isFinite(this.remainingTime) &&
        this.startingDuration > 0;
      if (!canCarryProgress) {
        this.startingDuration = newDuration;
        this.remainingTime = newDuration;
        return;
      }
      const progressRatio =
        (this.startingDuration - this.remainingTime) / this.startingDuration;
      this.startingDuration = newDuration;
      this.remainingTime = newDuration * (1 - progressRatio);
    } else {
      this.startingDuration = newDuration;
    }
  }

  applyProjectDurationMultiplier(effect) {
    this.updateDurationFromEffects();
  }

  applyActiveEffects(firstTime = true) {
    super.applyActiveEffects(firstTime);
    this.updateDurationFromEffects();
  }

  applyPermanentProjectDisable(effect) {
    const shouldDisable = effect?.value !== false;
    this.permanentlyDisabled = shouldDisable;
    if (shouldDisable) {
      this.isActive = false;
      this.isPaused = false;
    }
    globalThis?.updateProjectUI?.(this.name);
  }

  isContinuous() {
    return false;
  }

  // Method to calculate scaled cost if costScaling is enabled
  getScaledCost() {
    const cost = this.getEffectiveCost();
    let multiplier = 1;

    if (this.attributes.costDoubling) {
      multiplier *= Math.pow(2, this.repeatCount);
    }
    if (this.attributes.costScaling) {
      multiplier *= this.repeatCount + 1;
    }
    if (this.attributes.landCostScaling) {
      const radiusKm = terraforming.celestialParameters.radius || 0;
      multiplier *= Math.max(radiusKm / EARTH_RADIUS_KM, 1);
    }
    if (multiplier === 1) {
      return cost;
    }

    const scaledCost = {};
    for (const resourceCategory in cost) {
      scaledCost[resourceCategory] = {};
      for (const resource in cost[resourceCategory]) {
        scaledCost[resourceCategory][resource] = cost[resourceCategory][resource] * multiplier;
      }
    }
    return scaledCost;
  }

  canStart() {
    if (this.isPermanentlyDisabled()) {
      return false;
    }
    if (!this.unlocked){
      return false;
    }

    if(this.repeatCount && this.maxRepeatCount && this.repeatCount >= this.maxRepeatCount){
      return false;
    }

    if (this.isActive) {
      return false;
    }

    if (this.isPaused) {
      return this.hasSustainResources();
    }

    if (this.isHazardDisabled()) {
      return false;
    }

    if (
      this.category === 'story' &&
      this.attributes.planet &&
      spaceManager.getCurrentPlanetKey() !== this.attributes.planet
    ) {
      return false;
    }

    const cost = this.getScaledCost();
    const storageProj = this.attributes.canUseSpaceStorage && projectManager?.projects?.spaceStorage;
    for (const category in cost) {
      for (const resource in cost[category]) {
        const required = cost[category][resource];
        const key = resource === 'water' ? 'liquidWater' : resource;
        const colonyAvailable = resources[category][resource].value;
        const available = getMegaProjectResourceAvailability(storageProj, key, colonyAvailable);
        if (available < required) {
          return false;
        }
      }
    }

    return true;
  }

  shouldHideStartBar() {
    return false;
  }

  getSpecializationLockedText() {
    return '';
  }

  deductResources(resources) {
    const cost = this.getScaledCost();
    const storageProj = this.attributes.canUseSpaceStorage && projectManager?.projects?.spaceStorage;

    for (const category in cost) {
      for (const resource in cost[category]) {
        const amount = cost[category][resource];
        if (storageProj) {
          const key = resource === 'water' ? 'liquidWater' : resource;
          const colonyAvailable = resources[category][resource].value;
          const allocation = getMegaProjectResourceAllocation(storageProj, key, amount, colonyAvailable);
          if (allocation.fromColony > 0) {
            resources[category][resource].decrease(allocation.fromColony);
          }
          if (allocation.fromStorage > 0) {
            storageProj.resourceUsage[key] -= allocation.fromStorage;
            storageProj.usedStorage = Math.max(0, storageProj.usedStorage - allocation.fromStorage);
            if (storageProj.resourceUsage[key] <= 0) delete storageProj.resourceUsage[key];
          }
        } else {
          resources[category][resource].decrease(amount);
        }
      }
    }

    if (storageProj && typeof updateSpaceStorageUI === 'function') {
      updateSpaceStorageUI(storageProj);
    }
  }

  hasSustainResources(deltaTime = 1000) {
    if (!this.sustainCost) return true;
    const seconds = deltaTime / 1000;
    for (const category in this.sustainCost) {
      for (const resource in this.sustainCost[category]) {
        const costRate = this.sustainCost[category][resource];
        const res = resources[category][resource];
        const prod = res.productionRate || 0;
        const cons = res.consumptionRate || 0;
        const available = res.value + prod * seconds;
        const required = (cons + costRate) * seconds;
        if (available < required) {
          return false;
        }
      }
    }
    return true;
  }

  deductSustainResources(deltaTime) {
    if (!this.sustainCost) return;
    const seconds = deltaTime / 1000;
    for (const category in this.sustainCost) {
      for (const resource in this.sustainCost[category]) {
        const rate = this.sustainCost[category][resource];
        const res = resources[category][resource];
        const netProduction = Math.max(res.productionRate - res.consumptionRate, 0);
        const fromProduction = Math.min(netProduction, rate);
        const fromStorage = (rate - fromProduction) * seconds;
        if (fromStorage > 0) {
          res.decrease(fromStorage);
        }
        if (res.modifyRate && this.showsInResourcesRate()) {
          res.modifyRate(-rate, this.displayName, 'project');
        }
      }
    }
  }

  start(resources) {
    if (this.canStart(resources)) {
      // Deduct the required resources if this isn't a resume
      if (!this.isPaused) {
        this.deductResources(resources);
        this.remainingTime = this.getEffectiveDuration();
        this.startingDuration = this.remainingTime;
        if (this.kesslerDebrisSize) {
          this.kesslerRollElapsed = 0;
          this.kesslerRollPending = true;
          this.kesslerStartCost = this.getScaledCost();
        } else {
          this.kesslerRollPending = false;
          this.kesslerRollElapsed = 0;
          this.kesslerStartCost = null;
        }
      }

      // Set the project as active
      this.isActive = true;
      this.isPaused = false;
  
  
      return true;
    } else {
      return false;
    }
  }

  resume() {
    if (this.isPermanentlyDisabled()) {
      return false;
    }
    if (this.isPaused && !this.isCompleted && this.hasSustainResources()) {
      this.isActive = true;
      this.isPaused = false;
      return true;
    }
    return false;
  }

  update(deltaTime) {
    if (this.isPermanentlyDisabled()) {
      this.isActive = false;
      this.isPaused = false;
      return;
    }
    if (!this.isActive || this.isCompleted || this.isPaused) return;

    if (
      this.category === 'story' &&
      this.attributes.planet &&
      spaceManager.getCurrentPlanetKey() !== this.attributes.planet
    ) {
      this.isActive = false;
      return;
    }

    if (!this.hasSustainResources(deltaTime)) {
      this.isActive = false;
      this.isPaused = true;
      return;
    }

    const kesslerDelta = this.kesslerRollPending
      ? Math.min(deltaTime, this.remainingTime)
      : deltaTime;
    if (this._checkKesslerFailure(kesslerDelta)) {
      return;
    }

    this.deductSustainResources(deltaTime);

    this.remainingTime -= deltaTime;

    if (this.remainingTime <= 0) {
      if (this.kesslerRollPending) {
        this.kesslerRollPending = false;
        const successChance = this.getKesslerSuccessChance();
        if (Math.random() > successChance) {
          this._applyKesslerFailure();
          return;
        }
        this.kesslerStartCost = null;
      }
      this.complete();
    }
  }

  complete() {
    this.isCompleted = true;
    this.isActive = false;

    if (this.repeatable && (this.maxRepeatCount === Infinity || this.repeatCount < this.maxRepeatCount)) {
      this.repeatCount++;
      this.resetProject();
    }

    if (this.attributes && this.attributes.resourceGain) {
      this.applyResourceGain();
    }


    if (this.attributes && this.attributes.completionEffect) {
      this.applyCompletionEffect();
    }

    if (this.attributes && Array.isArray(this.attributes.storySteps)) {
      const stepIndex = this.repeatCount - 1;
      const step = this.attributes.storySteps[stepIndex];
      if (step && typeof addJournalEntry === 'function' && !this.shownStorySteps.has(stepIndex)) {
        addJournalEntry(step, null, { type: 'project', id: this.name, step: stepIndex });
        this.shownStorySteps.add(stepIndex);
      }
    }

  }

  applyResourceGain() {
    // Get the effective resource gain, considering all active effects
    const effectiveResourceGain = this.getEffectiveResourceGain();
    const ignoreCap = !!this.attributes.ignoreStorageCap;
    
    // Apply the effective resource gain to the resources
    for (const resourceCategory in effectiveResourceGain) {
      for (const resource in effectiveResourceGain[resourceCategory]) {
        const amount = effectiveResourceGain[resourceCategory][resource];
        resources[resourceCategory][resource].increase(amount, ignoreCap);
      }
    }
  }

  getEffectiveResourceGain() {
    // Start with the base resource gain values
    const baseResourceGain = this.attributes.resourceGain || {};
    const effectiveResourceGain = JSON.parse(JSON.stringify(baseResourceGain));

    // Apply active effects to modify resource gain
    this.activeEffects.forEach((effect) => {
      if (effect.type === 'increaseResourceGain') {
        const { resourceCategory, resourceId, value } = effect;
        if (effectiveResourceGain[resourceCategory] && effectiveResourceGain[resourceCategory][resourceId] !== undefined) {
          effectiveResourceGain[resourceCategory][resourceId] += value;
        }
      }
    });

    return effectiveResourceGain;
  }


  applyCompletionEffect() {
    this.attributes.completionEffect.forEach((effect) => {
      const scaledEffect = { ...effect };

      // Apply effect scaling if the attribute is enabled
      if (this.attributes.effectScaling) {
        const baseValue = effect.value; // Use the base value from the project definition
        const n = this.repeatCount; // Total completions
        scaledEffect.value = (baseValue) * n + 1; // Compute scaled value

        // Use addAndReplace to replace any existing effect with the same effectId
        addEffect({ ...scaledEffect, sourceId: this });
      } else {
        // If effectScaling is not enabled, add the effect normally
        addEffect({ ...effect, sourceId: this });
      }
    });
  }

  resetProject() {
    this.isCompleted = false;
    this.remainingTime = this.getEffectiveDuration();
  }

  getProgress() {
    if (!this.isActive) return 0;
    return Math.max(0, ((this.startingDuration - this.remainingTime) / this.startingDuration) * 100).toFixed(2);
  }

  // Determines if the project should be shown in the UI.
  // By default projects are visible when unlocked, but subclasses
  // can override this to remain visible in other states.
  isVisible() {
    return this.unlocked && !this.isPermanentlyDisabled();
  }

  isPermanentlyDisabled() {
    return this.permanentlyDisabled === true;
  }

  enable() {
    if(this.permanentlyDisabled){
      return;
    }
    const first = !this.unlocked;
    this.unlocked = true;
    if (first && !this.alertedWhenUnlocked) {
      const cat = this.category || 'resources';
      if (typeof registerProjectUnlockAlert === 'function') {
        registerProjectUnlockAlert(`${cat}-projects`);
      }
    }
    if (this.attributes?.completedWhenUnlocked && !this.isCompleted) {
      this.complete();
    }
  }

  showsInResourcesRate() {
    return this.repeatable && this.attributes?.showInResourcesRate !== false;
  }

  applyCompleteProject(effect) {
    if (this.isCompleted) {
      return;
    }
    this.complete();
  }

  usesSpaceStorageForResource(category, resource, amount, accumulatedChanges = null) {
    if (!this.attributes.canUseSpaceStorage) return false;
    const storageProj = projectManager?.projects?.spaceStorage;
    if (!storageProj) return false;
    const key = resource === 'water' ? 'liquidWater' : resource;
    const usable = storageProj.getAvailableStoredResource(key);
    const mode = resolveMegaProjectResourceMode(storageProj);
    if (mode === MEGA_PROJECT_RESOURCE_MODES.SPACE_ONLY) {
      return true;
    }
    if (mode === MEGA_PROJECT_RESOURCE_MODES.COLONY_ONLY) {
      return false;
    }
    if (mode === MEGA_PROJECT_RESOURCE_MODES.SPACE_FIRST) {
      return usable >= amount;
    }
    const pending = accumulatedChanges?.[category]?.[resource] ?? 0;
    const colonyAvailable = (resources[category]?.[resource]?.value || 0) + pending;
    if (colonyAvailable >= amount) return false;
    return usable >= amount - colonyAvailable;
  }



  estimateProjectCostAndGain(deltaTime = 1000, applyRates = true, productivity = 1, accumulatedChanges = null) {
    const totals = { cost: {}, gain: {} };
    if (this.isActive) {
      const duration = this.getEffectiveDuration();
      const rate = 1000 / duration; // per-second rate for display
      const timeFraction = deltaTime / duration; // fraction of project processed this tick

      const cost = this.getScaledCost();
      for (const category in cost) {
        if (!totals.cost[category]) totals.cost[category] = {};
        for (const resource in cost[category]) {
          const rateValue = cost[category][resource] * rate * (applyRates ? productivity : 1);
          const amountThisTick = cost[category][resource] * timeFraction * (applyRates ? productivity : 1);
          const usingStorage = this.usesSpaceStorageForResource(
            category,
            resource,
            amountThisTick,
            accumulatedChanges
          );
          if (applyRates && resources[category] && resources[category][resource] && !usingStorage && this.showsInResourcesRate()) {
            resources[category][resource].modifyRate(
              -rateValue,
              this.displayName,
              'project'
            );
          }
          totals.cost[category][resource] =
            (totals.cost[category][resource] || 0) + cost[category][resource] * timeFraction;
        }
      }

      if (this.attributes && this.attributes.resourceGain) {
        const gain = this.getEffectiveResourceGain();
        for (const category in gain) {
          if (!totals.gain[category]) totals.gain[category] = {};
          for (const resource in gain[category]) {
            const rateValue = gain[category][resource] * rate * (applyRates ? productivity : 1);
            if (applyRates && resources[category] && resources[category][resource] && this.showsInResourcesRate()) {
              resources[category][resource].modifyRate(
                rateValue,
                this.displayName,
                'project'
              );
            }
            totals.gain[category][resource] =
              (totals.gain[category][resource] || 0) + gain[category][resource] * timeFraction;
          }
        }
      }
    }
    return totals;
  }

  estimateCostAndGain(deltaTime = 1000, applyRates = true, productivity = 1, accumulatedChanges = null) {
    return this.estimateProjectCostAndGain(deltaTime, applyRates, productivity, accumulatedChanges);
  }

  applyCostAndGain(deltaTime = 1000) {}

  saveState() {
    const state = {
      isActive: this.isActive,
      isPaused: this.isPaused,
      isCompleted: this.isCompleted,
      remainingTime: this.remainingTime,
      startingDuration: this.startingDuration,
      repeatCount: this.repeatCount,
      pendingResourceGains: this.pendingResourceGains || [],
      autoStart: this.autoStart,
      autoStartUncheckOnTravel: this.autoStartUncheckOnTravel === true,
      shownStorySteps: Array.from(this.shownStorySteps),
      alertedWhenUnlocked: this.alertedWhenUnlocked,
    };
    if (this.kesslerDebrisSize) {
      state.kesslerRollElapsed = this.kesslerRollElapsed;
      state.kesslerRollPending = this.kesslerRollPending === true;
      state.kesslerStartCost = this.kesslerStartCost;
    }
    if (this.attributes?.canUseDysonOverflow) {
      state.allowColonyEnergyUse = this.allowColonyEnergyUse === true;
    }
    return state;
  }

  saveTravelState() {
    const state = {};
    if (this.attributes?.preserveProgressOnTravel) {
      state.remainingTime = this.remainingTime;
      state.startingDuration = this.startingDuration;
      state.isActive = this.isActive;
      state.isCompleted = this.isCompleted;
      state.repeatCount = this.repeatCount;
    }
    return state;
  }

  loadState(state) {
    this.isActive = state.isActive;
    this.isPaused = state.isPaused || false;
    this.isCompleted = state.isCompleted;
    this.remainingTime = state.remainingTime;
    this.startingDuration = state.startingDuration || this.getEffectiveDuration();
    this.repeatCount = state.repeatCount;

    // If the project is repeatable and has not hit its max repeats, a saved
    // completed flag may be stale. Clear it so the project can run again.
    if (this.isCompleted && this.repeatable && this.repeatCount < this.maxRepeatCount) {
      this.isCompleted = false;
    }
    this.pendingResourceGains = state.pendingResourceGains;
    if (this.pendingResourceGains) {
      this.oneTimeResourceGainsDisplay = this.pendingResourceGains;
    }
    this.effects = [];
    this.autoStart = state.autoStart;
    this.autoStartUncheckOnTravel = state.autoStartUncheckOnTravel === true;
    this.shownStorySteps = new Set(state.shownStorySteps || []);
    this.alertedWhenUnlocked = state.alertedWhenUnlocked || false;
    if (this.kesslerDebrisSize) {
      this.kesslerRollElapsed = state.kesslerRollElapsed || 0;
      this.kesslerRollPending = state.kesslerRollPending === true;
      this.kesslerStartCost = state.kesslerStartCost || null;
    }
    if (this.attributes?.canUseDysonOverflow) {
      this.allowColonyEnergyUse = state.allowColonyEnergyUse === true;
    }
    if (this.attributes.completionEffect && (this.isCompleted || this.repeatCount > 0)) {
      this.applyCompletionEffect();
    }
  }

  loadTravelState(state = {}) {
    if (!this.attributes?.preserveProgressOnTravel) {
      return;
    }
    if (typeof state.remainingTime === 'number') {
      this.remainingTime = state.remainingTime;
    }
    if (typeof state.startingDuration === 'number') {
      this.startingDuration = state.startingDuration;
    }
    if (state.isActive === true) {
      this.isActive = true;
    }
    if (state.isCompleted) {
      this.isCompleted = true;
    }
    if (typeof state.repeatCount === 'number') {
      this.repeatCount = state.repeatCount;
    }
  }

  setAllowColonyEnergyUse(allow) {
    if (!this.attributes?.canUseDysonOverflow) {
      return;
    }
    const next = allow === true;
    if (this.allowColonyEnergyUse === next) {
      return;
    }
    this.allowColonyEnergyUse = next;
  }

  isColonyEnergyAllowed() {
    if (!this.attributes?.canUseDysonOverflow) {
      return true;
    }
    return this.allowColonyEnergyUse === true;
  }
  
}

class ProjectManager extends EffectableEntity {
  constructor() {
    super({description: 'Manages all special projects'});

    this.projects = {};
    this.projectOrder = [];
  }

  currentWorldHasStar() {
    const params =
      this.spaceManager?.currentPlanetParameters ||
      spaceManager?.currentPlanetParameters ||
      currentPlanetParameters;
    if (!params) return false;
    if (params.celestialParameters?.rogue) return false;
    return Boolean(params.star);
  }

  isProjectRelevantToCurrentPlanet(project) {
    if (project?.requireStar && !this.currentWorldHasStar()) {
      return false;
    }

    const targetPlanet = project?.category === 'story' ? project.attributes?.planet : null;
    const globalContext = typeof globalThis !== 'undefined' ? globalThis : {};
    const manager = this.spaceManager || globalContext.spaceManager;
    const fallbackParameters = manager?.currentPlanetParameters || globalContext.currentPlanetParameters;
    const currentPlanetKey =
      manager?.getCurrentPlanetKey?.() ??
      manager?.currentPlanetKey ??
      fallbackParameters?.key ??
      fallbackParameters?.planetKey ??
      null;

    return !targetPlanet || !currentPlanetKey || targetPlanet === currentPlanetKey;
  }

  getDurationMultiplier(project) {
    let multiplier = 1;
    const isSpaceshipProject = project.attributes.spaceMining || project.attributes.spaceExport;
    for (const effect of this.activeEffects) {
      if (effect.excludeSpaceships && isSpaceshipProject) {
        continue;
      }
      if (effect.type === 'projectDurationReduction') {
        multiplier *= 1 - effect.value;
      } else if (effect.type === 'projectDurationMultiplier') {
        multiplier *= effect.value;
      }
    }
    return multiplier;
  }

  updateProjectDurations() {
    for (const name in this.projects) {
      const project = this.projects[name];
      if (typeof project.updateDurationFromEffects === 'function') {
        project.updateDurationFromEffects();
      }
    }
  }

  applyActiveEffects(firstTime = true) {
    super.applyActiveEffects(firstTime);
    this.updateProjectDurations();
  }

  applyEffects() {
    for (const name in this.projects) {
      const project = this.projects[name];
      if (project && project.applyEffects) {
        project.applyEffects();
      }
    }
  }

  applySpaceshipCostMultiplier(effect) {
    const resourceCategory = effect.resourceCategory;
    const resourceId = effect.resourceId;
    const value = effect.value;
    const sourceId = effect.sourceId || 'planet-parameters';
    const baseEffectId = effect.effectId || `${sourceId}-${resourceCategory}-${resourceId}-spaceship-cost`;
    for (const name in this.projects) {
      const project = this.projects[name];
      if (!project.attributes.spaceMining && !project.attributes.spaceExport) {
        continue;
      }
      project.addAndReplace({
        type: 'spaceshipCostMultiplier',
        resourceCategory,
        resourceId,
        value,
        effectId: `${baseEffectId}-${name}`,
        sourceId,
        name: effect.name
      });
    }
  }

  applySpaceshipCostPerTon(effect) {
    const resourceCategory = effect.resourceCategory;
    const resourceId = effect.resourceId;
    const value = effect.value;
    const sourceId = effect.sourceId || 'planet-parameters';
    const baseEffectId = effect.effectId || `${sourceId}-${resourceCategory}-${resourceId}-spaceship-cost-ton`;
    for (const name in this.projects) {
      const project = this.projects[name];
      if (!project.attributes.spaceMining && !project.attributes.spaceExport) {
        continue;
      }
      project.addAndReplace({
        type: 'spaceshipCostPerTon',
        resourceCategory,
        resourceId,
        value,
        effectId: `${baseEffectId}-${name}`,
        sourceId,
        name: effect.name
      });
    }
  }

  // New method to activate automation
  activateSpecialProjectsAutomation() {
    this.automateSpecialProjects = true;
  }

  initializeProjects(projectParameters) {
    const storyProjects = [];
    const otherProjects = [];

    for (const projectName in projectParameters) {
      const projectData = projectParameters[projectName];
      const type = projectData.type || 'Project';
      const globalObj = typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : {});
      const Ctor = globalObj && globalObj[type] ? globalObj[type] : Project;
      const proj = new Ctor(projectData, projectName);
      this.projects[projectName] = proj;

      if (typeof proj.initializeScanner === 'function' && typeof currentPlanetParameters !== 'undefined') {
        proj.initializeScanner(currentPlanetParameters);
        if (proj.attributes && proj.attributes.scanner && proj.attributes.scanner.depositType === 'ore') {
          if (typeof globalThis !== 'undefined') {
            globalThis.oreScanner = proj;
          }
        }
      }

      if (projectData.category === 'story') {
        storyProjects.push(projectName);
      } else {
        otherProjects.push(projectName);
      }
    }

    this.projectOrder = storyProjects.reverse().concat(otherProjects);
    this.normalizeImportProjectOrder();
    this.normalizeGroupedProjectOrder();
  }

  startProject(projectName) {
    const project = this.projects[projectName];
    if (project && project.start(resources)) {
      updateProjectUI(projectName);
    } else {
    }
  }

  updateProjects(deltaTime) {
    for (const projectName in this.projects) {
      const project = this.projects[projectName];

      if (project?.isPermanentlyDisabled?.()) {
        continue;
      }

      if (!this.isProjectRelevantToCurrentPlanet(project)) {
        continue;
      }

      if (typeof project.autoAssign === 'function') {
        project.autoAssign();
      }

      // Always update so subclasses can run logic after completion
      project.update(deltaTime);

      if (
        project.isContinuous() &&
        !project.autoStart &&
        project.isActive
      ) {
        project.isActive = false;
        project.lastActiveTime = 0;
      }

      if (
        this.isBooleanFlagSet('automateSpecialProjects') &&
        project.autoStart &&
        !project.isActive &&
        !project.isCompleted &&
        project.canStart()
      ) {
        if (project.isPaused) {
          if (project.resume() && typeof updateProjectUI === 'function') {
            updateProjectUI(project.name);
          }
        } else {
          this.startProject(project.name);
        }
      }
    }
  }

  applyCostAndGain(deltaTime = 1000, accumulatedChanges, productivity = 1) {
    for (const projectName in this.projects) {
      const project = this.projects[projectName];
      if (project?.isPermanentlyDisabled?.()) {
        continue;
      }
      if (!this.isProjectRelevantToCurrentPlanet(project)) {
        continue;
      }
      if (typeof project.applyCostAndGain === 'function') {
        project.applyCostAndGain(deltaTime, accumulatedChanges, productivity);
      }
    }
  }

  getProjectStatuses() {
    return this.projectOrder
      .map(projectName => this.projects[projectName])
      .filter(project => project && this.isProjectRelevantToCurrentPlanet(project));
  }

  getImportProjectNames() {
    return IMPORT_RESOURCE_PROJECT_NAMES.slice();
  }

  normalizeImportProjectOrder(order = this.projectOrder) {
    if (!Array.isArray(order) || order.length === 0) {
      return order;
    }

    const importSet = new Set(IMPORT_RESOURCE_PROJECT_NAMES);
    let firstIndex = -1;
    const orderedImports = [];

    order.forEach((name, index) => {
      if (!importSet.has(name)) {
        return;
      }
      if (firstIndex === -1) {
        firstIndex = index;
      }
      if (!orderedImports.includes(name)) {
        orderedImports.push(name);
      }
    });

    if (firstIndex === -1) {
      return order;
    }

    const withoutImports = order.filter(name => !importSet.has(name));
    const insertIndex = firstIndex > withoutImports.length ? withoutImports.length : firstIndex;
    const merged = withoutImports
      .slice(0, insertIndex)
      .concat(orderedImports)
      .concat(withoutImports.slice(insertIndex));

    if (order === this.projectOrder) {
      this.projectOrder = merged;
    }

    return merged;
  }

  normalizeGroupedProjectOrder(order = this.projectOrder) {
    if (!Array.isArray(order) || order.length === 0) {
      return order;
    }

    const groupMap = new Map();
    order.forEach((name) => {
      const project = this.projects[name];
      if (!project) {
        return;
      }
      const groupId = project.attributes && project.attributes.projectGroup;
      if (!groupId) {
        return;
      }
      const category = project.category || 'general';
      const key = `${category}:${groupId}`;
      let entry = groupMap.get(key);
      if (!entry) {
        entry = { names: [], seen: new Set() };
        groupMap.set(key, entry);
      }
      if (!entry.seen.has(name)) {
        entry.seen.add(name);
        entry.names.push(name);
      }
    });

    if (groupMap.size === 0) {
      return order;
    }

    const inserted = new Set();
    const newOrder = [];
    order.forEach((name) => {
      const project = this.projects[name];
      if (!project) {
        return;
      }
      const groupId = project.attributes && project.attributes.projectGroup;
      if (!groupId) {
        newOrder.push(name);
        return;
      }
      const category = project.category || 'general';
      const key = `${category}:${groupId}`;
      if (inserted.has(key)) {
        return;
      }
      const entry = groupMap.get(key);
      if (!entry) {
        newOrder.push(name);
        return;
      }
      newOrder.push(...entry.names);
      inserted.add(key);
    });

    if (order === this.projectOrder) {
      this.projectOrder = newOrder;
    }

    return newOrder;
  }

  reorderCategoryProjects(category, orderedNames) {
    const categoryKey = category || 'general';
    const targetNames = Array.isArray(orderedNames) ? orderedNames : [];
    const newOrder = [];
    let inserted = false;

    for (const name of this.projectOrder) {
      const project = this.projects[name];
      const projectCategory = project && project.category ? project.category : 'general';
      if (projectCategory !== categoryKey) {
        newOrder.push(name);
        continue;
      }
      if (!inserted) {
        newOrder.push(...targetNames);
        inserted = true;
      }
    }

    this.projectOrder = newOrder;
    this.normalizeImportProjectOrder();
    this.normalizeGroupedProjectOrder();
  }

  reorderProject(fromIndex, toIndex, category) {
    const categoryProjects = this.projectOrder.filter(name => (this.projects[name].category || 'general') === category);

    const [movedProject] = categoryProjects.splice(fromIndex, 1);
    categoryProjects.splice(toIndex, 0, movedProject);

    if (!movedProject) {
      return;
    }

    this.reorderCategoryProjects(category, categoryProjects);
  }

  estimateProjects(deltaTime = 1000) {
    const totals = { cost: {}, gain: {} };
    for (const projectName in this.projects) {
      const project = this.projects[projectName];
      if (project?.isPermanentlyDisabled?.()) {
        continue;
      }
      if (typeof project.estimateCostAndGain === 'function') {
        const { cost = {}, gain = {} } = project.estimateCostAndGain(deltaTime) || {};
        for (const category in cost) {
          if (!totals.cost[category]) totals.cost[category] = {};
          for (const resource in cost[category]) {
            totals.cost[category][resource] =
              (totals.cost[category][resource] || 0) + cost[category][resource];
          }
        }
        for (const category in gain) {
          if (!totals.gain[category]) totals.gain[category] = {};
          for (const resource in gain[category]) {
            totals.gain[category][resource] =
              (totals.gain[category][resource] || 0) + gain[category][resource];
          }
        }
      }
    }
    return totals;
  }

  getAssignedSpaceships(exclude) {
    let total = 0;
    for (const name in this.projects) {
      const project = this.projects[name];
      if (project === exclude) continue;
      if (project?.isPermanentlyDisabled?.()) {
        continue;
      }
      if (typeof project.assignedSpaceships === 'number') {
        total += project.assignedSpaceships;
      }
    }
    return total;
  }

  getRunningAssignedSpaceships() {
    let total = 0;
    for (const name in this.projects) {
      const project = this.projects[name];
      if (project.isPermanentlyDisabled()) {
        continue;
      }
      if (!project.isActive || project.isPaused || project.isCompleted) {
        continue;
      }
      total += project.assignedSpaceships || 0;
    }
    return total;
  }

  getAssignedAndroids(exclude) {
    let total = 0;
    for (const name in this.projects) {
      const project = this.projects[name];
      if (project === exclude) continue;
      if (project?.isPermanentlyDisabled?.()) {
        continue;
      }
      if (typeof project.assignedAndroids === 'number') {
        total += project.assignedAndroids;
      }
    }
    return total;
  }

  getAndroidAssignments() {
    const assignments = [];
    for (const name in this.projects) {
      const project = this.projects[name];
      if (project?.isPermanentlyDisabled?.()) {
        continue;
      }
      if (project && project.assignedAndroids > 0) {
        assignments.push([project.displayName || name, project.assignedAndroids]);
      }
    }
    return assignments;
  }

  forceUnassignAndroids(count) {
    let remaining = count;
    for (const name in this.projects) {
      if (remaining <= 0) break;
      const project = this.projects[name];
      if (project.assignedAndroids > 0) {
        const toRemove = Math.min(project.assignedAndroids, remaining);
        project.assignedAndroids -= toRemove;
        remaining -= toRemove;
        if (typeof project.adjustActiveDuration === 'function') {
          project.adjustActiveDuration();
        }
        if (typeof updateProjectUI === 'function') {
          updateProjectUI(project.name);
        }
      }
    }
  }

  applyProjectDurationReduction(effect) {
    this.updateProjectDurations();
  }

  applyProjectDurationMultiplier(effect) {
    this.updateProjectDurations();
  }

  // Save the state of all projects
  saveState() {
    this.normalizeImportProjectOrder();
    this.normalizeGroupedProjectOrder();
    const projectState = {};
    for (const projectName in this.projects) {
      const project = this.projects[projectName];
      if (typeof project.saveState === 'function') {
        projectState[projectName] = project.saveState();
      }
    }
    return { projects: projectState, order: this.projectOrder };
  }

  // Load a previously saved state into the projects
  loadState(savedState) {
    this.activeEffects = [];
    this.booleanFlags = new Set();

    const projectState = savedState.projects || savedState;
    this.projectOrder = savedState.order || Object.keys(this.projects);

    // Filter out projects from the order that no longer exist
    this.projectOrder = this.projectOrder.filter(projectName => this.projects.hasOwnProperty(projectName));

    // Append any newly added projects that were not present in the saved order
    Object.keys(this.projects).forEach(name => {
      if (!this.projectOrder.includes(name)) {
        this.projectOrder.push(name);
      }
    });
    this.normalizeImportProjectOrder();
    this.normalizeGroupedProjectOrder();

    for (const projectName in projectState) {
      const savedProject = projectState[projectName];
      const project = this.projects[projectName];

      if (project && typeof project.loadState === 'function') {
        project.loadState(savedProject);
      }
    }

    const manager = typeof globalThis !== 'undefined' ? globalThis.spaceManager : (typeof spaceManager !== 'undefined' ? spaceManager : null);
    const ringProject = this.projects?.orbitalRing;
    if (ringProject && manager) {
      const expected = ringProject.ringCount || 0;
      if (typeof manager.countOrbitalRings === 'function' && typeof manager.assignOrbitalRings === 'function') {
        const existing = manager.countOrbitalRings();
        if (existing !== expected) {
          manager.assignOrbitalRings(expected);
        }
      }
      if (typeof manager.currentWorldHasOrbitalRing === 'function') {
        ringProject.currentWorldHasRing = manager.currentWorldHasOrbitalRing();
      }
    }

    if (typeof initializeProjectsUI === 'function') {
      initializeProjectsUI();
    }
    if (typeof renderProjects === 'function') {
      renderProjects();
    }
    if (typeof initializeProjectAlerts === 'function') {
      initializeProjectAlerts();
    }
  }

  saveTravelState() {
    this.normalizeImportProjectOrder();
    const travelState = { _order: this.projectOrder.slice() };
    const preserveAuto = typeof gameSettings !== 'undefined' && gameSettings.preserveProjectAutoStart;
    for (const name in this.projects) {
      const project = this.projects[name];
      const state = {};
      const resetAuto = project.autoStartUncheckOnTravel === true;
      if (typeof project.prepareTravelState === 'function') {
        project.prepareTravelState();
      }
      if (preserveAuto) {
        state.autoStart = resetAuto ? false : project.autoStart;
      }
      if (resetAuto) {
        state.autoStartUncheckOnTravel = true;
      }
      if (typeof project.saveTravelState === 'function') {
        Object.assign(state, project.saveTravelState());
      }
      if (resetAuto && ('autoContinuousOperation' in project || 'autoDeployCollectors' in project)) {
        state.autoContinuousOperation = false;
        if ('autoDeployCollectors' in project) {
          state.autoDeployCollectors = false;
        }
      }
      if (Object.keys(state).length > 0) {
        travelState[name] = state;
      }
    }
    return travelState;
  }

  loadTravelState(travelState = {}) {
    const preserveAuto = typeof gameSettings !== 'undefined' && gameSettings.preserveProjectAutoStart;
    if (Array.isArray(travelState._order)) {
      this.projectOrder = travelState._order.slice();
      this.projectOrder = this.projectOrder.filter(projectName => this.projects.hasOwnProperty(projectName));
      Object.keys(this.projects).forEach(name => {
        if (!this.projectOrder.includes(name)) {
          this.projectOrder.push(name);
        }
      });
    }
    this.normalizeImportProjectOrder();
    this.normalizeGroupedProjectOrder();
    for (const name in travelState) {
      const project = this.projects[name];
      if (!project) continue;
      const state = travelState[name] || {};
      if (preserveAuto && typeof state.autoStart !== 'undefined') {
        project.autoStart = state.autoStart;
      }
      if (typeof project.loadTravelState === 'function') {
        const { autoStart, autoStartUncheckOnTravel, ...projectState } = state;
        if (
          autoStartUncheckOnTravel === true ||
          project.autoStartUncheckOnTravel === true
        ) {
          if ('autoContinuousOperation' in projectState) {
            projectState.autoContinuousOperation = false;
          }
          if ('autoDeployCollectors' in projectState) {
            projectState.autoDeployCollectors = false;
          }
        }
        if (!('autoContinuousOperation' in projectState) && 'autoDeployCollectors' in projectState) {
          projectState.autoContinuousOperation = projectState.autoDeployCollectors === true;
        }
        if (
          !('autoDeployCollectors' in projectState) &&
          'autoContinuousOperation' in projectState &&
          'autoDeployCollectors' in project
        ) {
          projectState.autoDeployCollectors = projectState.autoContinuousOperation === true;
        }
        if (
          !('autoDeployCollectors' in projectState) &&
          !('autoContinuousOperation' in projectState) &&
          autoStartUncheckOnTravel === true
        ) {
          projectState.autoContinuousOperation = false;
        }
        project.loadTravelState(projectState);
      }
      if (Object.prototype.hasOwnProperty.call(state, 'autoStartUncheckOnTravel')) {
        project.autoStartUncheckOnTravel = state.autoStartUncheckOnTravel === true;
      }
      if (project.autoStartUncheckOnTravel) {
        if (project.autoStart) {
          project.autoStart = false;
        }
        if ('autoContinuousOperation' in project && project.autoContinuousOperation) {
          project.autoContinuousOperation = false;
        }
        if ('autoDeployCollectors' in project && project.autoDeployCollectors) {
          project.autoDeployCollectors = false;
        }
        if (typeof updateProjectUI === 'function') {
          updateProjectUI(name);
        }
      }
    }
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    Project,
    ProjectManager,
  };
}

