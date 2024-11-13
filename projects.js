// projects.js

let projectElements = {};

class Project extends EffectableEntity {
  constructor(config, name) {
    super(config); // Call the base class constructor

    this.initializeFromConfig(config, name);

    this.remainingTime = config.duration; // Time left to complete the project
    this.isActive = false; // Whether the project is currently active
    this.isCompleted = false; // Whether the project has been completed
    this.repeatCount = 0; // Track the current number of times the project has been repeated
    this.assignedSpaceships = 0;
    this.autoStart = false;
    this.autoAssignSpaceships = false;
    this.selectedDisposalResource = null;
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

  // Method to calculate scaled cost if costScaling is enabled
  getScaledCost() {
    const cost = this.getEffectiveCost();
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
    // Check the standard scaled cost
    const cost = this.getScaledCost();
    for (const resourceCategory in cost) {
      for (const resource in cost[resourceCategory]) {
        if (resources[resourceCategory][resource].value < cost[resourceCategory][resource]) {
          return false;  // Not enough resources for basic costs
        }
      }
    }
  
    // Check spaceship costs for space mining or export projects
    if (this.attributes.spaceMining || this.attributes.spaceExport) {
      if (this.assignedSpaceships === 0) {
        return false;  // No spaceships assigned
      }
      const totalSpaceshipCost = this.calculateSpaceshipTotalCost();
      for (const category in totalSpaceshipCost) {
        for (const resource in totalSpaceshipCost[category]) {
          if (resources[category][resource].value < totalSpaceshipCost[category][resource]) {
            return false; // Not enough resources for spaceship costs
          }
        }
      }
    }
  
    // Check funding for resource choice if applicable
    if (this.selectedResources && this.selectedResources.length > 0) {
      let totalFundingCost = 0;
      this.selectedResources.forEach(({ resource, quantity }) => {
        const pricePerUnit = this.attributes.resourceChoiceGainCost.colony[resource];
        totalFundingCost += pricePerUnit * quantity;
      });
  
      if (resources.colony.funding.value < totalFundingCost) {
        return false; // Not enough funding for selected resources
      }
    }
  
    return true;  // All resources are available
  }

  deductResources(resources) {
    const cost = this.getScaledCost();
  
    // Deduct the base scaled costs
    for (const resourceCategory in cost) {
      for (const resource in cost[resourceCategory]) {
        resources[resourceCategory][resource].decrease(cost[resourceCategory][resource]);
      }
    }
  
    // Deduct spaceship costs if applicable
    if (this.attributes.spaceMining || this.attributes.spaceExport) {
      const totalSpaceshipCost = this.calculateSpaceshipTotalCost();
      for (const category in totalSpaceshipCost) {
        for (const resource in totalSpaceshipCost[category]) {
          resources[category][resource].decrease(totalSpaceshipCost[category][resource]);
        }
      }
    }

    // Deduct scaled disposal resource amount if applicable
    if (this.attributes.spaceExport && this.selectedDisposalResource) {
      const scaledDisposalAmount = this.calculateSpaceshipTotalDisposal();
      const { category, resource } = this.selectedDisposalResource;
      resources[category][resource].decrease(scaledDisposalAmount[category][resource]);
    }
  
    // Deduct funding for selected resources if applicable
    if (this.selectedResources && this.selectedResources.length > 0) {
      let totalFundingCost = 0;
      this.pendingResourceGains = [];  // Track resources that will be gained later
      this.selectedResources.forEach(({ resource, quantity }) => {
        const pricePerUnit = this.attributes.resourceChoiceGainCost.colony[resource];
        totalFundingCost += pricePerUnit * quantity;
        this.pendingResourceGains.push({ resource, quantity });
      });
  
      resources.colony.funding.decrease(totalFundingCost);
    }
  }

  start(resources) {
    if (this.canStart(resources)) {
      // Deduct the required resources
      this.deductResources(resources);
  
      // Set the project as active and reset the remaining time
      this.isActive = true;
  
      // Calculate dynamic duration based on spaceship assignment for space mining or disposal projects
      if (this.attributes.spaceMining || this.attributes.spaceExport) {
        this.remainingTime = this.calculateSpaceshipAdjustedDuration(); // Adjust duration dynamically
      } else {
        this.remainingTime = this.duration; // Default duration for other projects
      }
  
      // If the project involves space mining, calculate spaceship resource gains
      if (this.attributes.spaceMining) {
        const spaceshipResourceGain = this.calculateSpaceshipTotalResourceGain();
        this.pendingResourceGains = this.pendingResourceGains || []; // Initialize if undefined
  
        for (const category in spaceshipResourceGain) {
          for (const resource in spaceshipResourceGain[category]) {
            const quantity = spaceshipResourceGain[category][resource];
            this.pendingResourceGains.push({ category, resource, quantity });
          }
        }
      }
  
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

    if (this.repeatable && (this.maxRepeatCount === Infinity || this.repeatCount < this.maxRepeatCount)) {
      this.repeatCount++;
      this.resetProject();
      console.log(`Project ${this.name} is repeatable and will restart. Repeat count: ${this.repeatCount}`);
    }

    if (this.attributes && this.attributes.resourceGain) {
      this.applyResourceGain();
    }

    if (this.attributes && this.attributes.scanner && this.attributes.scanner.canSearchForDeposits) {
      this.applyScannerEffect();
    }

    // Apply spaceship resource gains
    if (this.pendingResourceGains && this.attributes.spaceMining) {
      this.applySpaceshipResourceGain();
    }

    // Apply resource choice gain effect if applicable
    if (this.pendingResourceGains && this.attributes.resourceChoiceGainCost) {
      this.applyResourceChoiceGain();
    }

    // Apply completion effect if applicable
    if (this.attributes && this.attributes.completionEffect) {
      this.applyCompletionEffect();
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
    this.pendingResourceGains = false;
  }

  // New method to handle spaceship resource gain application
  applySpaceshipResourceGain() {
    this.pendingResourceGains.forEach(({ category, resource, quantity }) => {
      if (resources[category] && resources[category][resource]) {
        resources[category][resource].increase(quantity);
        console.log(`Gained ${quantity} ${resource} in category ${category} from spaceship assignments.`);
      }
    });
    this.pendingResourceGains = []; // Clear pending gains after applying them
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

  applyCompletionEffect() {
    this.attributes.completionEffect.forEach((effect) => {
      const scaledEffect = { ...effect };

      // Apply effect scaling if the attribute is enabled
      if (this.attributes.effectScaling) {
        const baseValue = effect.value; // Use the base value from the project definition
        const n = this.repeatCount; // Total completions
        scaledEffect.value = (baseValue - 1) * n + 1; // Compute scaled value

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
    this.remainingTime = this.duration;
  }

  getProgress() {
    if (!this.isActive) return 0;
    return Math.max(0, ((this.duration - this.remainingTime) / this.duration) * 100).toFixed(2);
  }

  enable() {
    this.unlocked = true;
  }

  applyOneTimeStart(effect){  //Only used at the beginning of the game
    console.log('Getting one time cargo rocket');
    this.pendingResourceGains = effect.pendingResourceGains;
    this.isActive = true;
    this.remainingTime = 30000;
  }

  calculateSpaceshipCost() {
    const costPerShip = this.attributes.costPerShip;
    const totalCost = {};
    for (const category in costPerShip) {
      totalCost[category] = {};
      for (const resource in costPerShip[category]) {
        const baseCost = costPerShip[category][resource];
        const multiplier = this.getEffectiveCostMultiplier(category, resource);
        const adjustedCost = baseCost * multiplier;

        if (adjustedCost > 0) { // Only include resources with a non-zero adjusted cost
          totalCost[category][resource] = adjustedCost;
        }
      }

      // Remove the category if it has no resources with non-zero cost
      if (Object.keys(totalCost[category]).length === 0) {
        delete totalCost[category];
      }
    }

    return totalCost;
  }

    // Calculates adjusted total cost based on assigned spaceships, scaling if assignedSpaceships > 100
    calculateSpaceshipTotalCost() {
    const totalCost = {};
    const costPerShip = this.calculateSpaceshipCost();
    const scalingFactor = this.assignedSpaceships > 100 ? this.assignedSpaceships / 100 : 1;

    for (const category in costPerShip) {
      totalCost[category] = {};
      for (const resource in costPerShip[category]) {
        totalCost[category][resource] = costPerShip[category][resource] * scalingFactor;
      }
    }

    return totalCost;
  }

  // Calculates adjusted resource gain per ship, scaling if assignedSpaceships > 100
  calculateSpaceshipTotalResourceGain() {
    const totalResourceGain = {};
    const resourceGainPerShip = this.attributes.resourceGainPerShip;
    const scalingFactor = this.assignedSpaceships > 100 ? this.assignedSpaceships / 100 : 1;

    for (const category in resourceGainPerShip) {
      totalResourceGain[category] = {};
      for (const resource in resourceGainPerShip[category]) {
        totalResourceGain[category][resource] = resourceGainPerShip[category][resource] * scalingFactor;
      }
    }

    return totalResourceGain;
  }

    // Calculates adjusted disposal amount per ship, scaling if assignedSpaceships > 100
  calculateSpaceshipTotalDisposal() {
    const totalDisposal = {};
    const disposalAmount = this.attributes.disposalAmount;
    const scalingFactor = this.assignedSpaceships > 100 ? this.assignedSpaceships / 100 : 1;
    const scaledDisposalAmount = disposalAmount * scalingFactor;

    if (this.selectedDisposalResource) {
        const { category, resource } = this.selectedDisposalResource;
        totalDisposal[category] = {
            [resource]: scaledDisposalAmount
        };
    }

    return totalDisposal;
  }

  // Calculates adjusted duration based on the number of assigned spaceships
  calculateSpaceshipAdjustedDuration() {
    // Ensure this calculation only applies to projects with space mining or space export
    if (!this.attributes.spaceMining && !this.attributes.spaceExport) return this.duration;

    const maxShipsForDurationReduction = 100;
    const duration = this.duration;

    // Clamp the number of assigned ships to be between 1 and maxShipsForDurationReduction
    const assignedShips = Math.min(Math.max(this.assignedSpaceships, 1), maxShipsForDurationReduction);

    // Calculate the adjusted duration based on the number of assigned spaceships
    return duration / assignedShips;
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
  
      // Auto-assign spaceships if the project has autoAssignSpaceships set to true and is a space mining project
      if ((project.attributes.spaceMining  || project.attributes.spaceExport) && project.autoAssignSpaceships) {
        const availableSpaceships = Math.floor(resources.special.spaceships.value);
        if (availableSpaceships > 0) {
          // Use the existing function to assign all available spaceships to this project
          assignSpaceshipsToProject(project, availableSpaceships, document.getElementById(`${project.name}-assigned-spaceships`));
        }
      }
  
      // Update each project if it is active
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
        pendingResourceGains: project.pendingResourceGains || [],
        assignedSpaceships: project.assignedSpaceships,
        autoStart : project.autoStart,
        autoAssignSpaceships : project.autoAssignSpaceships,
        selectedDisposalResource : project.selectedDisposalResource
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
        project.pendingResourceGains = savedProject.pendingResourceGains;
        project.effects = [];
        project.assignedSpaceships = savedProject.assignedSpaceships;
        project.autoStart = savedProject.autoStart;
        project.autoAssignSpaceships = savedProject.autoAssignSpaceships;
        project.selectedDisposalResource = savedProject.selectedDisposalResource || null; 
        if(project.attributes.completionEffect && (project.isCompleted || project.repeatCount > 0)){
          project.applyCompletionEffect();
        }
      }
    }
  }
}

function assignSpaceshipsToProject(project, count) {
  const availableSpaceships = Math.floor(resources.special.spaceships.value); // Round down to ensure whole values
  project.assignedSpaceships = project.assignedSpaceships || 0;

  // Calculate the new spaceship assignment, keeping it within valid bounds
  const adjustedCount = Math.max(-project.assignedSpaceships, Math.min(count, availableSpaceships));
  project.assignedSpaceships += adjustedCount;

  // Update resources and the UI
  resources.special.spaceships.value -= adjustedCount;
}
