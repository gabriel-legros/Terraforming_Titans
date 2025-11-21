class AutomationManager extends EffectableEntity {
  constructor() {
    super({ description: 'Automation Manager' });
    this.enabled = false;
    this.features = {
      automationShipAssignment: false
    };
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
    this.updateUI();
  }

  hasFeature(flagId) {
    return !!this.features[flagId];
  }

  updateUI() {
    updateAutomationVisibility();
    updateAutomationUI();
  }

  reapplyEffects() {
    this.setFeature('automationShipAssignment', this.isBooleanFlagSet('automationShipAssignment'));
    if (this.enabled) {
      this.updateUI();
    }
  }

  saveState() {
    return {
      enabled: this.enabled,
      features: { ...this.features },
      booleanFlags: Array.from(this.booleanFlags)
    };
  }

  loadState(data = {}) {
    this.enabled = !!data.enabled;
    this.features = Object.assign({ automationShipAssignment: false }, data.features || {});
    const flags = Array.isArray(data.booleanFlags) ? data.booleanFlags : [];
    this.booleanFlags = new Set(flags);
    this.reapplyEffects();
  }

  update() {}
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { AutomationManager };
}
