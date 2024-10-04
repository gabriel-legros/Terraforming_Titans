// projects.js

class Project extends EffectableEntity {
  constructor(config, name) {
    super(config); // Call the base class constructor
    this.name = config.projectName;
    this.displayName = config.name;
    this.cost = config.cost;
    this.production = config.production;
    this.duration = config.duration;
    this.description = config.description;
    this.attributes = config.attributes || {}; // Load attributes, e.g., scanner-related details
    this.remainingTime = config.duration; // Time left to complete the project
    this.isActive = false; // Whether the project is currently active
    this.isCompleted = false; // Whether the project has been completed
    this.repeatable = config.repeatable || false; // Flag indicating if the project can be repeated
    this.maxRepeatCount = config.maxRepeatCount || Infinity; // Maximum times the project can be repeated
    this.repeatCount = 0; // Track the current number of times the project has been repeated
  }

  canStart(resources) {
    // Check if all resources required to start the project are available
    for (const resourceCategory in this.cost) {
      for (const resource in this.cost[resourceCategory]) {
        if (resources[resourceCategory][resource].value < this.cost[resourceCategory][resource]) {
          return false;  // Not enough resources
        }
      }
    }

    // Check if there is enough funding if there is a resource choice gain cost
    if (this.attributes && this.attributes.resourceChoiceGainCost) {
      const selectedResource = this.attributes.resourceChoiceGainCost.selectedResource;
      const quantity = this.attributes.resourceChoiceGainCost.quantity;
      const pricePerUnit = this.attributes.resourceChoiceGainCost.colony[selectedResource];
      const totalCost = pricePerUnit * quantity;

      if (resources.colony.funding.value < totalCost) {
        return false;  // Not enough funding
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
    if (this.attributes && this.attributes.resourceChoiceGainCost) {
      console.log("Reducing funding");
      const selectedResource = this.selectedResource;
      const quantity = this.selectedQuantity;
      const pricePerUnit = this.attributes.resourceChoiceGainCost.colony[selectedResource];
      const totalCost = pricePerUnit * quantity;

      resources.colony.funding.decrease(totalCost);
      // Store the pending resource gain for use when the project completes
      this.pendingResourceGain = { resource: selectedResource, quantity };
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
    if (this.pendingResourceGain) {
      this.applyResourceChoiceGain(this.pendingResourceGain.resource, this.pendingResourceGain.quantity);
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

  applyResourceChoiceGain(selectedResource, quantity) {
    // Apply resource gain based on the selected resource and quantity
    resources.colony[selectedResource].increase(quantity);
    console.log(`Increased ${selectedResource} by ${quantity}`);
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

const projects = {};


function initializeProjects() {
  for (const projectName in projectParameters) {
    const projectData = projectParameters[projectName];
    // Add projectName to the config object
    console.log(projectName);
    const projectConfig = {
      ...projectData,
      projectName: projectName
    };
    projects[projectName] = new Project(projectConfig);
  }
}

function startProject(projectName) {
  const project = projects[projectName];
  if (project && project.start(resources)) {
    console.log(`Started project: ${projectName}`);
    updateProjectUI(projectName);  // Update the UI after starting the project
  } else {
    console.log(`Failed to start project: ${projectName}`);
  }
}

function updateProjects(deltaTime) {
  for (const projectName in projects) {
    const project = projects[projectName];
    if (project.isActive) {
      project.update(deltaTime);
    }
  }
}

function getProjectStatuses() {
  return Object.values(projects);
}

function projectCanStart(projectCost) {
  for (const category in projectCost) {
    const categoryCost = projectCost[category];
    for (const resource in categoryCost) {
      const requiredAmount = categoryCost[resource];
      if (resources[category][resource].value < requiredAmount) {
        return false;  // Not enough resources
      }
    }
  }
  return true;  // All resources are available
}