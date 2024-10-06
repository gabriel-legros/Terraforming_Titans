// projects.js

class Project extends EffectableEntity {
  constructor(config, name) {
    super(config); // Call the base class constructor

    this.initializeFromConfig(config, name);

    this.remainingTime = config.duration; // Time left to complete the project
    this.isActive = false; // Whether the project is currently active
    this.isCompleted = false; // Whether the project has been completed
    this.repeatCount = 0; // Track the current number of times the project has been repeated
  }

  initializeFromConfig(config, name) {
    // Reinitialize properties from configuration
    this.name = name;
    this.displayName = config.name;
    this.cost = config.cost;
    this.production = config.production;
    this.duration = config.duration;
    this.description = config.description;
    this.attributes = config.attributes || {}; // Load attributes, e.g., scanner-related details
    this.repeatable = config.repeatable || false; // Flag indicating if the project can be repeated
    this.maxRepeatCount = config.maxRepeatCount || Infinity; // Maximum times the project can be repeated
    // Do not reinitialize state properties like isActive, isCompleted, repeatCount, etc.
  }

  canStart() {
    // Check if all resources required to start the project are available
    for (const resourceCategory in this.cost) {
      for (const resource in this.cost[resourceCategory]) {
        if (resources[resourceCategory][resource].value < this.cost[resourceCategory][resource]) {
          return false;  // Not enough resources
        }
      }
    }

    // Check if there is enough funding for all selected resources
    if (this.selectedResources && this.selectedResources.length > 0) {
      let totalCost = 0;
      this.selectedResources.forEach(({ resource, quantity }) => {
        const pricePerUnit = this.attributes.resourceChoiceGainCost.colony[resource];
        totalCost += pricePerUnit * quantity;
      });

      if (resources.colony.funding.value < totalCost) {
        return false; // Not enough funding
      }
    }

    return true;  // All resources are available
  }

  deductResources(resources) {
    // Deduct the resources required to start the project
    for (const resourceCategory in this.cost) {
      for (const resource in this.cost[resourceCategory]) {
        resources[resourceCategory][resource].decrease(this.cost[resourceCategory][resource]);
      }
    }

    // Deduct the funding for resource choice gain, if applicable
    if (this.selectedResources.length > 0) {
      let totalCost = 0;
      this.selectedResources.forEach(({ resource, quantity }) => {
        const pricePerUnit = this.attributes.resourceChoiceGainCost.colony[resource];
        totalCost += pricePerUnit * quantity;
      });

      resources.colony.funding.decrease(totalCost);
      // Store the pending resource gains for use when the project completes
      this.pendingResourceGains = [...this.selectedResources];
    }
  }

  start(resources) {
    if (this.canStart(resources)) {
      this.deductResources(resources);
      this.isActive = true;
      console.log(`Project ${this.name} started.`);
      return true;
    } else {
      console.log(`Not enough resources to start ${this.name}.`);
      return false;
    }
  }

  update(deltaTime) {
    if (!this.isActive || this.isCompleted) return;

    this.remainingTime -= deltaTime;

    if (this.remainingTime <= 0) {
      this.complete();
    }
  }

  complete() {
    this.isCompleted = true;
    this.isActive = false;
    console.log(`Project ${this.name} completed! Production effect initiated.`);

    if (this.attributes && this.attributes.resourceGain) {
      this.applyResourceGain();
    }

    if (this.attributes && this.attributes.scanner && this.attributes.scanner.canSearchForDeposits) {
      this.applyScannerEffect();
    }

    // Apply resource choice gain effect if applicable
    if (this.pendingResourceGains) {
      this.applyResourceChoiceGain();
    }

    if (this.repeatable && (this.maxRepeatCount === Infinity || this.repeatCount < this.maxRepeatCount)) {
      this.repeatCount++;
      this.resetProject();
      console.log(`Project ${this.name} is repeatable and will restart. Repeat count: ${this.repeatCount}`);
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

  applyResourceChoiceGain() {
    // Apply resource gain based on the selected resources and their quantities
    this.pendingResourceGains.forEach(({ resource, quantity }) => {
      resources.colony[resource].increase(quantity);
      console.log(`Increased ${resource} by ${quantity}`);
    });
  }

  applyScannerEffect() {
    if (this.attributes.scanner && this.attributes.scanner.searchValue && this.attributes.scanner.depositType) {
      const depositType = this.attributes.scanner.depositType;
      const additionalStrength = this.attributes.scanner.searchValue;

      oreScanner.adjustScanningStrength(depositType, oreScanner.scanData[depositType].currentScanningStrength + additionalStrength);

      console.log(`Scanner strength for ${depositType} increased by ${additionalStrength}. New scanning strength: ${oreScanner.scanData[depositType].currentScanningStrength}`);
      oreScanner.startScan(depositType);
      console.log(`Scanning for ${depositType} started after applying scanner effect from ${this.name}`);
    }
  }

  resetProject() {
    this.isCompleted = false;
    this.remainingTime = this.duration;
  }

  getProgress() {
    if (!this.isActive) return 0;
    return Math.max(0, ((this.duration - this.remainingTime) / this.duration) * 100).toFixed(2);
  }
}

class ProjectManager extends EffectableEntity {
  constructor() {
    super({description: 'Manages all special projects'});

    this.projects = {};
  }

  // New method to activate automation
  activateSpecialProjectsAutomation() {
    this.automateSpecialProjects = true;
    console.log("Special projects automation activated.");
  }

  initializeProjects(projectParameters) {
    for (const projectName in projectParameters) {
      const projectData = projectParameters[projectName];
      this.projects[projectName] = new Project(projectData, projectName);
    }
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
      if (project.isActive) {
        project.update(deltaTime);
      }
    }
  }

  getProjectStatuses() {
    return Object.values(this.projects);
  }

  // Save the state of all projects
  saveState() {
    const projectState = {};
    for (const projectName in this.projects) {
      const project = this.projects[projectName];
      projectState[projectName] = {
        isActive: project.isActive,
        isCompleted: project.isCompleted,
        remainingTime: project.remainingTime,
        repeatCount: project.repeatCount,
        selectedResources: project.selectedResources || [],
      };
    }
    return projectState;
  }

  // Load a previously saved state into the projects
  loadState(projectState) {
    for (const projectName in projectState) {
      const savedProject = projectState[projectName];
      const project = this.projects[projectName];

      if (project) {
        project.isActive = savedProject.isActive;
        project.isCompleted = savedProject.isCompleted;
        project.remainingTime = savedProject.remainingTime;
        project.repeatCount = savedProject.repeatCount;
        project.selectedResources = savedProject.selectedResources;

        project.effects = [];
      }
    }
  }
}