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

  getEffectiveDuration(){
    const base = this.getBaseDuration();
    const multiplier = (typeof projectManager !== 'undefined' && projectManager.durationMultiplier !== undefined) ? projectManager.durationMultiplier : 1;
    return base * multiplier;
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
    if (this.isActive) {
      return false;
    }

    if (this.isPaused) {
      return this.hasSustainResources();
    }

    const cost = this.getScaledCost();
    for (const category in cost) {
      for (const resource in cost[category]) {
        if (resources[category][resource].value < cost[category][resource]) {
          return false;
        }
      }
    }

    return true;
  }

  deductResources(resources) {
    const cost = this.getScaledCost();

    for (const category in cost) {
      for (const resource in cost[category]) {
        resources[category][resource].decrease(cost[category][resource]);
      }
    }
  }

  hasSustainResources(deltaTime = 1000) {
    if (!this.sustainCost) return true;
    const seconds = 1;
    for (const category in this.sustainCost) {
      for (const resource in this.sustainCost[category]) {
        const required = this.sustainCost[category][resource] * seconds;
        if (resources[category][resource].value < required) {
          return false;
        }
      }
    }
    return true;
  }

  deductSustainResources(deltaTime) {
    if (!this.sustainCost) return;
    const seconds = 1;
    for (const category in this.sustainCost) {
      for (const resource in this.sustainCost[category]) {
        const amount = this.sustainCost[category][resource] * seconds;
        const rate = this.sustainCost[category][resource];
        resources[category][resource].decrease(amount);
        if (resources[category][resource].modifyRate) {
          resources[category][resource].modifyRate(-rate, this.displayName, 'project');
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
  
  
      console.log(`Project ${this.name} started.`);
      return true;
    } else {
      console.log(`Not enough resources to start ${this.name}.`);
      return false;
    }
  }

  resume() {
    if (this.isPaused && !this.isCompleted && this.hasSustainResources()) {
      this.isActive = true;
      this.isPaused = false;
      console.log(`Project ${this.name} resumed.`);
      return true;
    }
    return false;
  }

  update(deltaTime) {
    if (!this.isActive || this.isCompleted || this.isPaused) return;

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
    console.log(`Project ${this.name} completed! Production effect initiated.`);

    if (this.repeatable && (this.maxRepeatCount === Infinity || this.repeatCount < this.maxRepeatCount)) {
      this.repeatCount++;
      this.resetProject();
      console.log(`Project ${this.name} is repeatable and will restart. Repeat count: ${this.repeatCount}`);
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
        console.log(`Increased ${resource} by ${amount} in category ${resourceCategory}`);
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

  enable() {
    this.unlocked = true;
  }



  estimateProjectCostAndGain() {
    // Default implementation intentionally left blank
  }
  
}

class ProjectManager extends EffectableEntity {
  constructor() {
    super({description: 'Manages all special projects'});

    this.projects = {};
    this.projectOrder = [];
    this.durationMultiplier = 1;
  }

  applyActiveEffects(firstTime = true) {
    this.durationMultiplier = 1;
    super.applyActiveEffects(firstTime);
  }

  // New method to activate automation
  activateSpecialProjectsAutomation() {
    this.automateSpecialProjects = true;
    console.log("Special projects automation activated.");
  }

  initializeProjects(projectParameters) {
    const storyProjects = [];
    const otherProjects = [];

    for (const projectName in projectParameters) {
      const projectData = projectParameters[projectName];
      const type = projectData.type || 'Project';
      const globalObj = typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : {});
      const Ctor = globalObj && globalObj[type] ? globalObj[type] : Project;
      this.projects[projectName] = new Ctor(projectData, projectName);

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
      console.log(`Started project: ${projectName}`);
      updateProjectUI(projectName);
    } else {
      console.log(`Failed to start project: ${projectName}`);
    }
  }

  updateProjects(deltaTime) {
    for (const projectName in this.projects) {
      const project = this.projects[projectName];
  
      if (typeof project.autoAssign === 'function') {
        project.autoAssign();
      }
  
      // Update each project if it is active
      if (project.isActive) {
        project.update(deltaTime);
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

  estimateProjects() {
    for (const projectName in this.projects){
      const project = this.projects[projectName];
      if (typeof project.estimateCostAndGain === 'function') {
        project.estimateCostAndGain();
      }
    }
  }

  applyProjectDurationReduction(effect) {
    this.durationMultiplier = 1 - effect.value;

    for (const name in this.projects) {
      const project = this.projects[name];
      const baseDuration = project.getBaseDuration ? project.getBaseDuration() : project.duration;
      const newDuration = baseDuration * this.durationMultiplier;

      if (project.isActive) {
        const progressRatio = (project.startingDuration - project.remainingTime) / project.startingDuration;
        project.startingDuration = newDuration;
        project.remainingTime = newDuration * (1 - progressRatio);
      }
    }
  }

  // Save the state of all projects
  saveState() {
    const projectState = {};
    for (const projectName in this.projects) {
      const project = this.projects[projectName];
      const state = {
        isActive: project.isActive,
        isPaused: project.isPaused,
        isCompleted: project.isCompleted,
        remainingTime: project.remainingTime,
        startingDuration: project.startingDuration,
        repeatCount: project.repeatCount,
        pendingResourceGains: project.pendingResourceGains || [],
        autoStart : project.autoStart,
        shownStorySteps: Array.from(project.shownStorySteps),
      };

      if (typeof SpaceshipProject !== 'undefined' && project instanceof SpaceshipProject) {
        state.assignedSpaceships = project.assignedSpaceships;
        state.autoAssignSpaceships = project.autoAssignSpaceships;
        state.selectedDisposalResource = project.selectedDisposalResource;
        state.waitForCapacity = project.waitForCapacity;
        if (typeof SpaceMiningProject !== 'undefined' && project instanceof SpaceMiningProject) {
          state.disableAbovePressure = project.disableAbovePressure;
          state.disablePressureThreshold = project.disablePressureThreshold;
        }
      }

      projectState[projectName] = state;
    }
    return {
        projects: projectState,
        order: this.projectOrder
    };
  }

  // Load a previously saved state into the projects
  loadState(savedState) {
    this.activeEffects = [];
    this.booleanFlags = new Set();

    const projectState = savedState.projects || savedState;
    this.projectOrder = savedState.order || Object.keys(this.projects);

    for (const projectName in projectState) {
      const savedProject = projectState[projectName];
      const project = this.projects[projectName];

      if (project) {
        project.isActive = savedProject.isActive;
        project.isPaused = savedProject.isPaused || false;
        project.isCompleted = savedProject.isCompleted;
        project.remainingTime = savedProject.remainingTime;
        project.startingDuration = savedProject.startingDuration || project.getEffectiveDuration();
        project.repeatCount = savedProject.repeatCount;
        project.pendingResourceGains = savedProject.pendingResourceGains;
        if(project.pendingResourceGains){
          project.oneTimeResourceGainsDisplay = project.pendingResourceGains;
        }
        project.effects = [];
        project.autoStart = savedProject.autoStart;
        project.shownStorySteps = new Set(savedProject.shownStorySteps || []);
        if (typeof SpaceshipProject !== 'undefined' && project instanceof SpaceshipProject) {
          project.assignedSpaceships = savedProject.assignedSpaceships;
          project.autoAssignSpaceships = savedProject.autoAssignSpaceships;
          project.selectedDisposalResource = savedProject.selectedDisposalResource || project.attributes.defaultDisposal;
          if(savedProject.waitForCapacity !== undefined){
            project.waitForCapacity = savedProject.waitForCapacity;
          }
          if (typeof SpaceMiningProject !== 'undefined' && project instanceof SpaceMiningProject) {
            project.disableAbovePressure = savedProject.disableAbovePressure || false;
            project.disablePressureThreshold = savedProject.disablePressureThreshold || 0;
          }
        }
        if(project.attributes.completionEffect && (project.isCompleted || project.repeatCount > 0)){
          project.applyCompletionEffect();
        }
      }
    }

    if (typeof initializeProjectsUI === 'function') {
      initializeProjectsUI();
    }
    if (typeof renderProjects === 'function') {
      renderProjects();
    }
  }
}

