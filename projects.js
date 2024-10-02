// projects.js

class Project {
  constructor(name, displayName, cost, production, duration, description, attributes = {}, repeatable = false, maxRepeatCount = Infinity) {
    this.name = name;
    this.displayName = displayName;
    this.cost = cost;
    this.production = production;
    this.duration = duration;
    this.description = description;
    this.attributes = attributes;  // Load attributes, e.g., scanner-related details
    this.remainingTime = duration;  // Time left to complete the project
    this.isActive = false;  // Whether the project is currently active
    this.isCompleted = false;  // Whether the project has been completed
    this.repeatable = repeatable;  // Flag indicating if the project can be repeated
    this.maxRepeatCount = maxRepeatCount;  // Maximum times the project can be repeated
    this.repeatCount = 0;  // Track the current number of times the project has been repeated
  }

  canStart(resources) {
    for (const resourceCategory in this.cost) {
      for (const resource in this.cost[resourceCategory]) {
        if (resources[resourceCategory][resource].value < this.cost[resourceCategory][resource]) {
          return false;  // Not enough resources
        }
      }
    }
    return true;  // All resources are available
  }

  deductResources(resources) {
    for (const resourceCategory in this.cost) {
      for (const resource in this.cost[resourceCategory]) {
        resources[resourceCategory][resource].decrease(this.cost[resourceCategory][resource]);
      }
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

    if (this.repeatable && (this.maxRepeatCount === Infinity || this.repeatCount < this.maxRepeatCount)) {
      this.repeatCount++;
      this.resetProject();
      console.log(`Project ${this.name} is repeatable and will restart. Repeat count: ${this.repeatCount}`);
    }
  }

  applyResourceGain() {
    for (const resourceCategory in this.attributes.resourceGain) {
      for (const resource in this.attributes.resourceGain[resourceCategory]) {
        resources[resourceCategory][resource].increase(this.attributes.resourceGain[resourceCategory][resource]);
        console.log(`Increased ${resource} by ${this.attributes.resourceGain[resourceCategory][resource]} in category ${resourceCategory}.`);
      }
    }
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
    projects[projectName] = new Project(
      projectName,
      projectData.name,
      projectData.cost,
      projectData.production,
      projectData.duration,
      projectData.description,
      projectData.attributes,
      projectData.repeatable || false,
      projectData.maxRepeatCount || Infinity
    );
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
  const projectStatuses = [];
  for (const projectName in projects) {
    const project = projects[projectName];
    projectStatuses.push({
      name: project.name,
      description: project.description,
      cost: project.cost,
      progress: project.getProgress(),
      isActive: project.isActive,
      isCompleted: project.isCompleted
    });
  }
  return projectStatuses;
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