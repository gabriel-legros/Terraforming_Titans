let SpaceshipAutomationRef = typeof SpaceshipAutomation !== 'undefined' ? SpaceshipAutomation : null;
if (!SpaceshipAutomationRef && typeof require === 'function') {
  try {
    SpaceshipAutomationRef = require('./spaceship-automation.js').SpaceshipAutomation;
  } catch (e) {}
}

class AutomationManager extends EffectableEntity {
  constructor() {
    super({ description: 'Automation Manager' });
    this.enabled = false;
    this.features = {
      automationShipAssignment: false
    };
    this.spaceshipAutomation = SpaceshipAutomationRef ? new SpaceshipAutomationRef() : null;
  }

  enable() {
    this.enabled = true;
    this.updateUI();
  }

  applyBooleanFlag(effect) {
    super.applyBooleanFlag(effect);
    if (effect.flagId === 'automationShipAssignment') {
      this.setFeature('automationShipAssignment', !!effect.value);
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
      spaceshipAutomation: this.spaceshipAutomation ? this.spaceshipAutomation.saveState() : null
    };
  }

  loadState(data = {}) {
    this.enabled = !!data.enabled;
    this.features = Object.assign({ automationShipAssignment: false }, data.features || {});
    const flags = Array.isArray(data.booleanFlags) ? data.booleanFlags : [];
    this.booleanFlags = new Set(flags);
    if (data.spaceshipAutomation && this.spaceshipAutomation) {
      this.spaceshipAutomation.loadState(data.spaceshipAutomation);
    }
    this.reapplyEffects();
  }

  update(delta) {
    if (this.spaceshipAutomation) {
      this.spaceshipAutomation.update(delta || 0);
    }
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { AutomationManager };
}
