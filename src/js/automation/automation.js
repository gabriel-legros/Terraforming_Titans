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

let ResearchAutomationRef;
try {
  ResearchAutomationRef = ResearchAutomation;
} catch (error) {}
try {
  ResearchAutomationRef = ResearchAutomationRef || require('./research-automation.js').ResearchAutomation;
} catch (error) {}

let ScriptAutomationRef;
try {
  ScriptAutomationRef = ScriptAutomation;
} catch (error) {}
try {
  ScriptAutomationRef = ScriptAutomationRef || require('./script-automation.js').ScriptAutomation;
} catch (error) {}

class AutomationManager extends EffectableEntity {
  constructor() {
    super({ description: 'Automation Manager' });
    this.enabled = false;
    this.automationCardOrder = [
      'scripts',
      'ships',
      'life',
      'research',
      'buildings',
      'projects',
      'colony'
    ];
    this.features = {
      automationShipAssignment: false,
      automationLifeDesign: false,
      automationResearch: false,
      automationBuildings: false,
      automationProjects: false,
      automationColony: false,
      automationScripts: false
    };
    this.spaceshipAutomation = SpaceshipAutomationRef ? new SpaceshipAutomationRef() : null;
    this.lifeAutomation = LifeAutomationRef ? new LifeAutomationRef() : null;
    this.buildingsAutomation = BuildingAutomationRef ? new BuildingAutomationRef() : null;
    this.projectsAutomation = ProjectAutomationRef ? new ProjectAutomationRef() : null;
    this.colonyAutomation = ColonyAutomationRef ? new ColonyAutomationRef() : null;
    this.researchAutomation = ResearchAutomationRef ? new ResearchAutomationRef() : null;
    this.scriptAutomation = ScriptAutomationRef ? new ScriptAutomationRef() : null;
  }

  normalizeAutomationCardOrder(order) {
    const defaultOrder = [
      'scripts',
      'ships',
      'life',
      'research',
      'buildings',
      'projects',
      'colony'
    ];
    const normalized = [];
    const seen = new Set();
    const source = Array.isArray(order) ? order : [];
    for (let index = 0; index < source.length; index += 1) {
      const key = source[index];
      if (!defaultOrder.includes(key) || seen.has(key)) {
        continue;
      }
      seen.add(key);
      normalized.push(key);
    }
    for (let index = 0; index < defaultOrder.length; index += 1) {
      const key = defaultOrder[index];
      if (seen.has(key)) {
        continue;
      }
      normalized.push(key);
    }
    return normalized;
  }

  getAutomationCardOrder() {
    this.automationCardOrder = this.normalizeAutomationCardOrder(this.automationCardOrder);
    return this.automationCardOrder.slice();
  }

  moveAutomationCard(cardKey, direction, visibleCardKeys) {
    const order = this.normalizeAutomationCardOrder(this.automationCardOrder);
    const visible = Array.isArray(visibleCardKeys)
      ? visibleCardKeys.filter(key => order.includes(key))
      : [];
    let swapKey = null;

    if (visible.length > 0) {
      const visibleIndex = visible.indexOf(cardKey);
      const nextVisibleIndex = visibleIndex + direction;
      if (visibleIndex >= 0 && nextVisibleIndex >= 0 && nextVisibleIndex < visible.length) {
        swapKey = visible[nextVisibleIndex];
      }
    }

    if (!swapKey) {
      const index = order.indexOf(cardKey);
      const nextIndex = index + direction;
      if (index < 0 || nextIndex < 0 || nextIndex >= order.length) {
        return false;
      }
      swapKey = order[nextIndex];
    }

    const index = order.indexOf(cardKey);
    const swapIndex = order.indexOf(swapKey);
    if (index < 0 || swapIndex < 0 || index === swapIndex) {
      return false;
    }

    order[index] = swapKey;
    order[swapIndex] = cardKey;
    this.automationCardOrder = order;
    return true;
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
    } else if (effect.flagId === 'automationResearch') {
      this.setFeature('automationResearch', !!effect.value);
    } else if (effect.flagId === 'automationBuildings') {
      this.setFeature('automationBuildings', !!effect.value);
    } else if (effect.flagId === 'automationProjects') {
      this.setFeature('automationProjects', !!effect.value);
    } else if (effect.flagId === 'automationColony') {
      this.setFeature('automationColony', !!effect.value);
    } else if (effect.flagId === 'automationScripts') {
      this.setFeature('automationScripts', !!effect.value);
      if (this.scriptAutomation) {
        if (effect.value) this.scriptAutomation.enable();
        else this.scriptAutomation.disable();
      }
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
    this.setFeature('automationResearch', this.isBooleanFlagSet('automationResearch'));
    this.setFeature('automationBuildings', this.isBooleanFlagSet('automationBuildings'));
    this.setFeature('automationProjects', this.isBooleanFlagSet('automationProjects'));
    this.setFeature('automationColony', this.isBooleanFlagSet('automationColony'));
    this.setFeature('automationScripts', this.isBooleanFlagSet('automationScripts'));
    if (this.scriptAutomation) {
      if (this.hasFeature('automationScripts')) this.scriptAutomation.enable();
      else this.scriptAutomation.disable();
    }
    if (this.buildingsAutomation) {
      this.buildingsAutomation.recordCurrentlyAvailableBuildings();
    }
    if (this.projectsAutomation) {
      this.projectsAutomation.recordCurrentlyAvailableProjects();
    }
    if (this.spaceshipAutomation) {
      this.spaceshipAutomation.recordCurrentlyAvailableTargets();
      this.spaceshipAutomation.unlockManualControls();
    }
    if (this.enabled) {
      this.updateUI();
    }
  }

  applyTravelCombinationPresets() {
    const travelAutomations = [
      this.buildingsAutomation,
      this.projectsAutomation,
      this.colonyAutomation
    ];
    let appliedTravelAutomation = false;

    for (let index = 0; index < travelAutomations.length; index += 1) {
      const automation = travelAutomations[index];
      if (!automation || !automation.nextTravelCombinationId) {
        continue;
      }
      automation.applyCombinationPresets(automation.nextTravelCombinationId);
      if (!automation.nextTravelCombinationPersistent) {
        automation.nextTravelCombinationId = null;
      }
      appliedTravelAutomation = true;
    }

    if (this.researchAutomation) {
      const appliedResearchPreset = this.researchAutomation.applyTravelPreset();
      appliedTravelAutomation = appliedTravelAutomation || appliedResearchPreset;
    }

    if (this.scriptAutomation) {
      const appliedTravelScript = this.scriptAutomation.applyTravelScript();
      appliedTravelAutomation = appliedTravelAutomation || appliedTravelScript;
    }

    if (appliedTravelAutomation) {
      queueAutomationUIRefresh();
      updateAutomationUI();
      if (typeof updateResearchUI === 'function') {
        updateResearchUI();
      }
    }

    return appliedTravelAutomation;
  }

  saveState() {
    return {
      enabled: this.enabled,
      automationCardOrder: this.getAutomationCardOrder(),
      features: { ...this.features },
      booleanFlags: Array.from(this.booleanFlags),
      spaceshipAutomation: this.spaceshipAutomation ? this.spaceshipAutomation.saveState() : null,
      lifeAutomation: this.lifeAutomation ? this.lifeAutomation.saveState() : null,
      buildingsAutomation: this.buildingsAutomation ? this.buildingsAutomation.saveState() : null,
      projectsAutomation: this.projectsAutomation ? this.projectsAutomation.saveState() : null,
      colonyAutomation: this.colonyAutomation ? this.colonyAutomation.saveState() : null,
      researchAutomation: this.researchAutomation ? this.researchAutomation.saveState() : null,
      scriptAutomation: this.scriptAutomation ? this.scriptAutomation.saveState() : null
    };
  }

  loadState(data = {}, legacyResearchState = null) {
    this.enabled = !!data.enabled;
    this.automationCardOrder = this.normalizeAutomationCardOrder(data.automationCardOrder);
    this.features = Object.assign({
      automationShipAssignment: false,
      automationLifeDesign: false,
      automationResearch: false,
      automationBuildings: false,
      automationProjects: false,
      automationColony: false,
      automationScripts: false
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
    if (this.researchAutomation) {
      this.researchAutomation.loadState(data.researchAutomation || {}, legacyResearchState);
    }
    if (this.scriptAutomation) {
      this.scriptAutomation.loadState(data.scriptAutomation || {});
    }
    this.reapplyEffects();
  }

  update(delta) {
    if (this.scriptAutomation) {
      this.scriptAutomation.update(delta || 0);
    }
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
    if (this.researchAutomation) {
      this.researchAutomation.update(delta || 0);
    }
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { AutomationManager };
}
