let SpaceshipAutomationRef = typeof SpaceshipAutomation !== 'undefined' ? SpaceshipAutomation : null;
if (!SpaceshipAutomationRef && typeof require === 'function') {
  try {
    SpaceshipAutomationRef = require('./spaceship-automation.js').SpaceshipAutomation;
  } catch (e) {}
}

let LifeAutomationRef;
try {
  LifeAutomationRef = LifeAutomation;
} catch (error) {}
try {
  LifeAutomationRef = LifeAutomationRef || require('./life-automation.js').LifeAutomation;
} catch (error) {}

let BuildingAutomationRef;
try {
  BuildingAutomationRef = BuildingAutomation;
} catch (error) {}
try {
  BuildingAutomationRef = BuildingAutomationRef || require('./building-automation.js').BuildingAutomation;
} catch (error) {}

let ProjectAutomationRef;
try {
  ProjectAutomationRef = ProjectAutomation;
} catch (error) {}
try {
  ProjectAutomationRef = ProjectAutomationRef || require('./project-automation.js').ProjectAutomation;
} catch (error) {}

let ColonyAutomationRef;
try {
  ColonyAutomationRef = ColonyAutomation;
} catch (error) {}
try {
  ColonyAutomationRef = ColonyAutomationRef || require('./colony-automation.js').ColonyAutomation;
} catch (error) {}

class AutomationManager extends EffectableEntity {
  constructor() {
    super({ description: 'Automation Manager' });
    this.enabled = false;
    this.features = {
      automationShipAssignment: false,
      automationLifeDesign: false,
      automationBuildings: false,
      automationProjects: false,
      automationColony: false
    };
    this.spaceshipAutomation = SpaceshipAutomationRef ? new SpaceshipAutomationRef() : null;
    this.lifeAutomation = LifeAutomationRef ? new LifeAutomationRef() : null;
    this.buildingsAutomation = BuildingAutomationRef ? new BuildingAutomationRef() : null;
    this.projectsAutomation = ProjectAutomationRef ? new ProjectAutomationRef() : null;
    this.colonyAutomation = ColonyAutomationRef ? new ColonyAutomationRef() : null;
  }

  enable() {
    this.enabled = true;
    this.updateUI();
  }

  applyBooleanFlag(effect) {
    super.applyBooleanFlag(effect);
    if (effect.flagId === 'automationShipAssignment') {
      this.setFeature('automationShipAssignment', !!effect.value);
    } else if (effect.flagId === 'automationLifeDesign') {
      this.setFeature('automationLifeDesign', !!effect.value);
    } else if (effect.flagId === 'automationBuildings') {
      this.setFeature('automationBuildings', !!effect.value);
    } else if (effect.flagId === 'automationProjects') {
      this.setFeature('automationProjects', !!effect.value);
    } else if (effect.flagId === 'automationColony') {
      this.setFeature('automationColony', !!effect.value);
    }
  }

  setFeature(flagId, value) {
    this.features[flagId] = !!value;
    if (typeof queueAutomationUIRefresh === 'function') {
      queueAutomationUIRefresh();
    }
    this.updateUI();
  }

  hasFeature(flagId) {
    return !!this.features[flagId];
  }

  updateUI() {
    if (typeof queueAutomationUIRefresh === 'function') {
      queueAutomationUIRefresh();
    }
    updateAutomationVisibility();
    updateAutomationUI();
  }

  reapplyEffects() {
    this.setFeature('automationShipAssignment', this.isBooleanFlagSet('automationShipAssignment'));
    this.setFeature('automationLifeDesign', this.isBooleanFlagSet('automationLifeDesign'));
    this.setFeature('automationBuildings', this.isBooleanFlagSet('automationBuildings'));
    this.setFeature('automationProjects', this.isBooleanFlagSet('automationProjects'));
    this.setFeature('automationColony', this.isBooleanFlagSet('automationColony'));
    if (this.buildingsAutomation) {
      this.buildingsAutomation.recordCurrentlyAvailableBuildings();
    }
    if (this.projectsAutomation) {
      this.projectsAutomation.recordCurrentlyAvailableProjects();
    }
    if (this.spaceshipAutomation) {
      this.spaceshipAutomation.unlockManualControls();
    }
    if (this.enabled) {
      this.updateUI();
    }
  }

  saveState() {
    return {
      enabled: this.enabled,
      features: { ...this.features },
      booleanFlags: Array.from(this.booleanFlags),
      spaceshipAutomation: this.spaceshipAutomation ? this.spaceshipAutomation.saveState() : null,
      lifeAutomation: this.lifeAutomation ? this.lifeAutomation.saveState() : null,
      buildingsAutomation: this.buildingsAutomation ? this.buildingsAutomation.saveState() : null,
      projectsAutomation: this.projectsAutomation ? this.projectsAutomation.saveState() : null,
      colonyAutomation: this.colonyAutomation ? this.colonyAutomation.saveState() : null
    };
  }

  loadState(data = {}) {
    this.enabled = !!data.enabled;
    this.features = Object.assign({
      automationShipAssignment: false,
      automationLifeDesign: false,
      automationBuildings: false,
      automationProjects: false,
      automationColony: false
    }, data.features || {});
    const flags = Array.isArray(data.booleanFlags) ? data.booleanFlags : [];
    this.booleanFlags = new Set(flags);
    if (data.spaceshipAutomation && this.spaceshipAutomation) {
      this.spaceshipAutomation.loadState(data.spaceshipAutomation);
    }
    if (data.lifeAutomation && this.lifeAutomation) {
      this.lifeAutomation.loadState(data.lifeAutomation);
    }
    if (data.buildingsAutomation && this.buildingsAutomation) {
      this.buildingsAutomation.loadState(data.buildingsAutomation);
    }
    if (data.projectsAutomation && this.projectsAutomation) {
      this.projectsAutomation.loadState(data.projectsAutomation);
    }
    if (data.colonyAutomation && this.colonyAutomation) {
      this.colonyAutomation.loadState(data.colonyAutomation);
    }
    this.reapplyEffects();
  }

  update(delta) {
    if (this.spaceshipAutomation) {
      this.spaceshipAutomation.update(delta || 0);
    }
    if (this.lifeAutomation) {
      this.lifeAutomation.update(delta || 0);
    }
    if (this.buildingsAutomation) {
      this.buildingsAutomation.update(delta || 0);
    }
    if (this.projectsAutomation) {
      this.projectsAutomation.update(delta || 0);
    }
    if (this.colonyAutomation) {
      this.colonyAutomation.update(delta || 0);
    }
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { AutomationManager };
}
