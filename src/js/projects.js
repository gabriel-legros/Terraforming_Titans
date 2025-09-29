// projects.js


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
    this.isPaused = false; // Whether the project is paused due to missing sustain cost
    this.shortfallLastTick = false; // Tracks if resource consumption failed last tick
    this.alertedWhenUnlocked = this.unlocked ? true : false;
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


    // Do not reinitialize state properties like isActive, isCompleted, repeatCount, etc.
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
    if(this.isBooleanFlagSet('instantDuration')){
      return 1000;
    } else if(this.attributes.spaceMining || this.attributes.spaceExport){
      return this.calculateSpaceshipAdjustedDuration();
    } else {
      return this.duration;
    }
  }

  getDurationMultiplier() {
    let multiplier = 1;
    if (
      typeof projectManager !== 'undefined' &&
      typeof projectManager.getDurationMultiplier === 'function'
    ) {
      multiplier *= projectManager.getDurationMultiplier();
    }
    for (const effect of this.activeEffects) {
      if (effect.type === 'projectDurationMultiplier') {
        multiplier *= effect.value;
      }
    }
    return multiplier;
  }

  updateDurationFromEffects() {
    const base = this.getBaseDuration();
    const newDuration = base * this.getDurationMultiplier();
    if (this.isActive) {
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

  isContinuous() {
    return false;
  }

  // Method to calculate scaled cost if costScaling is enabled
  getScaledCost() {
    const cost = this.getEffectiveCost();
    if (this.attributes.costDoubling) {
      const multiplier = Math.pow(2, this.repeatCount);
      const scaledCost = {};
      for (const resourceCategory in cost) {
        scaledCost[resourceCategory] = {};
        for (const resource in cost[resourceCategory]) {
          scaledCost[resourceCategory][resource] = cost[resourceCategory][resource] * multiplier;
        }
      }
      return scaledCost;
    }
    if (this.attributes.costScaling) {
      const multiplier = this.repeatCount + 1;
      const scaledCost = {};

      for (const resourceCategory in cost) {
        scaledCost[resourceCategory] = {};
        for (const resource in cost[resourceCategory]) {
          scaledCost[resourceCategory][resource] = cost[resourceCategory][resource] * multiplier;
        }
      }

      return scaledCost;
    }
    return cost;
  }

  canStart() {
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
        if (storageProj) {
          const key = resource === 'water' ? 'liquidWater' : resource;
          const stored = storageProj.resourceUsage[key] || 0;
          const reserve = storageProj.strategicReserve || 0;
          const usable = Math.max(0, stored - reserve);
          const available = resources[category][resource].value + usable;
          if (available < required) {
            return false;
          }
        } else if (resources[category][resource].value < required) {
          return false;
        }
      }
    }

    return true;
  }

  deductResources(resources) {
    const cost = this.getScaledCost();
    const storageProj = this.attributes.canUseSpaceStorage && projectManager?.projects?.spaceStorage;

    for (const category in cost) {
      for (const resource in cost[category]) {
        let remaining = cost[category][resource];
        if (storageProj) {
          const key = resource === 'water' ? 'liquidWater' : resource;
          const reserve = storageProj.strategicReserve || 0;
          const availableFromStorage = Math.max(0, (storageProj.resourceUsage[key] || 0) - reserve);
          if (storageProj.prioritizeMegaProjects) {
            const fromStorage = Math.min(availableFromStorage, remaining);
            if (fromStorage > 0) {
              storageProj.resourceUsage[key] -= fromStorage;
              storageProj.usedStorage = Math.max(0, storageProj.usedStorage - fromStorage);
              if (storageProj.resourceUsage[key] <= 0) delete storageProj.resourceUsage[key];
              remaining -= fromStorage;
            }
            if (remaining > 0) {
              resources[category][resource].decrease(remaining);
            }
          } else {
            const fromColony = Math.min(resources[category][resource].value, remaining);
            if (fromColony > 0) {
              resources[category][resource].decrease(fromColony);
              remaining -= fromColony;
            }
            if (remaining > 0) {
              const fromStorage = Math.min(availableFromStorage, remaining);
              if (fromStorage > 0) {
                storageProj.resourceUsage[key] -= fromStorage;
                storageProj.usedStorage = Math.max(0, storageProj.usedStorage - fromStorage);
                if (storageProj.resourceUsage[key] <= 0) delete storageProj.resourceUsage[key];
                remaining -= fromStorage;
              }
            }
          }
        } else {
          resources[category][resource].decrease(remaining);
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
        if (res.modifyRate) {
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
    if (this.isPaused && !this.isCompleted && this.hasSustainResources()) {
      this.isActive = true;
      this.isPaused = false;
      return true;
    }
    return false;
  }

  update(deltaTime) {
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

    this.deductSustainResources(deltaTime);

    this.remainingTime -= deltaTime;

    if (this.remainingTime <= 0) {
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
    
    // Apply the effective resource gain to the resources
    for (const resourceCategory in effectiveResourceGain) {
      for (const resource in effectiveResourceGain[resourceCategory]) {
        const amount = effectiveResourceGain[resourceCategory][resource];
        resources[resourceCategory][resource].increase(amount);
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
    return this.unlocked;
  }

  enable() {
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

  usesSpaceStorageForResource(category, resource, amount) {
    if (!this.attributes.canUseSpaceStorage) return false;
    const storageProj = projectManager?.projects?.spaceStorage;
    if (!storageProj) return false;
    const key = resource === 'water' ? 'liquidWater' : resource;
    const stored = storageProj.resourceUsage[key] || 0;
    const reserve = storageProj.strategicReserve || 0;
    const usable = Math.max(0, stored - reserve);
    if (storageProj.prioritizeMegaProjects) {
      return usable >= amount;
    }
    const colonyAvailable = resources[category]?.[resource]?.value || 0;
    if (colonyAvailable >= amount) return false;
    return usable >= amount - colonyAvailable;
  }



  estimateProjectCostAndGain(deltaTime = 1000, applyRates = true, productivity = 1) {
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
          const usingStorage = this.usesSpaceStorageForResource(category, resource, cost[category][resource]);
          if (applyRates && resources[category] && resources[category][resource] && !usingStorage) {
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
            if (applyRates && resources[category] && resources[category][resource]) {
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

  estimateCostAndGain(deltaTime = 1000, applyRates = true, productivity = 1) {
    return this.estimateProjectCostAndGain(deltaTime, applyRates, productivity);
  }

  applyCostAndGain(deltaTime = 1000) {}

  saveState() {
    return {
      isActive: this.isActive,
      isPaused: this.isPaused,
      isCompleted: this.isCompleted,
      remainingTime: this.remainingTime,
      startingDuration: this.startingDuration,
      repeatCount: this.repeatCount,
      pendingResourceGains: this.pendingResourceGains || [],
      autoStart: this.autoStart,
      shownStorySteps: Array.from(this.shownStorySteps),
      alertedWhenUnlocked: this.alertedWhenUnlocked,
    };
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
    this.shownStorySteps = new Set(state.shownStorySteps || []);
    this.alertedWhenUnlocked = state.alertedWhenUnlocked || false;
    if (this.attributes.completionEffect && (this.isCompleted || this.repeatCount > 0)) {
      this.applyCompletionEffect();
    }
  }
  
}

class ProjectManager extends EffectableEntity {
  constructor() {
    super({description: 'Manages all special projects'});

    this.projects = {};
    this.projectOrder = [];
  }

  isProjectRelevantToCurrentPlanet(project) {
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

  getDurationMultiplier() {
    let multiplier = 1;
    for (const effect of this.activeEffects) {
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
      if (!this.isProjectRelevantToCurrentPlanet(project)) {
        continue;
      }
      if (typeof project.applyCostAndGain === 'function') {
        project.applyCostAndGain(deltaTime, accumulatedChanges, productivity);
      }
    }
  }

  getProjectStatuses() {
    return this.projectOrder.map(projectName => this.projects[projectName]);
  }

  reorderProject(fromIndex, toIndex, category) {
    const categoryProjects = this.projectOrder.filter(name => (this.projects[name].category || 'general') === category);

    const [movedProject] = categoryProjects.splice(fromIndex, 1);
    categoryProjects.splice(toIndex, 0, movedProject);

    const newOrder = [];
    let categoryProjectsAdded = false;
    for (const projectName of this.projectOrder) {
        if ((this.projects[projectName].category || 'general') === category) {
            if (!categoryProjectsAdded) {
                newOrder.push(...categoryProjects);
                categoryProjectsAdded = true;
            }
        } else {
            newOrder.push(projectName);
        }
    }
    this.projectOrder = newOrder;
  }

  estimateProjects(deltaTime = 1000) {
    const totals = { cost: {}, gain: {} };
    for (const projectName in this.projects) {
      const project = this.projects[projectName];
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
      if (typeof project.assignedSpaceships === 'number') {
        total += project.assignedSpaceships;
      }
    }
    return total;
  }

  getAssignedAndroids(exclude) {
    let total = 0;
    for (const name in this.projects) {
      const project = this.projects[name];
      if (project === exclude) continue;
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
    const travelState = {};
    const preserveAuto = typeof gameSettings !== 'undefined' && gameSettings.preserveProjectAutoStart;
    for (const name in this.projects) {
      const project = this.projects[name];
      const state = {};
      if (preserveAuto) {
        state.autoStart = project.autoStart;
      }
      if (typeof project.saveTravelState === 'function') {
        Object.assign(state, project.saveTravelState());
      }
      if (Object.keys(state).length > 0) {
        travelState[name] = state;
      }
    }
    return travelState;
  }

  loadTravelState(travelState = {}) {
    const preserveAuto = typeof gameSettings !== 'undefined' && gameSettings.preserveProjectAutoStart;
    for (const name in travelState) {
      const project = this.projects[name];
      if (!project) continue;
      const state = travelState[name] || {};
      if (preserveAuto && typeof state.autoStart !== 'undefined') {
        project.autoStart = state.autoStart;
      }
      if (typeof project.loadTravelState === 'function') {
        const { autoStart, ...projectState } = state;
        project.loadTravelState(projectState);
      }
    }
  }
}

