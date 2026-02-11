class OrbitalManager extends EffectableEntity {
  constructor() {
    super({ description: 'Manages orbital colony systems' });
    this.enabled = false;
    this.currentWorldHabitatCount = 0;
  }

  enable() {
    this.enabled = true;
    this.updateUI();
  }

  resetCurrentWorldState() {
    this.currentWorldHabitatCount = 0;
  }

  prepareTravelState() {
    const travelState = {
      currentWorldHabitatCount: this.currentWorldHabitatCount
    };
    this.resetCurrentWorldState();
    return travelState;
  }

  restoreTravelState() {
    this.resetCurrentWorldState();
    this.updateUI();
  }

  updateUI() {
    updateColonySubtabsVisibility();
    updateOrbitalUI();
  }

  reapplyEffects() {
    this.updateUI();
  }

  saveState() {
    return {
      enabled: this.enabled,
      currentWorldHabitatCount: this.currentWorldHabitatCount,
      booleanFlags: Array.from(this.booleanFlags)
    };
  }

  loadState(data = {}) {
    this.enabled = !!data.enabled;
    this.currentWorldHabitatCount = Number.isFinite(data.currentWorldHabitatCount)
      ? Math.max(0, data.currentWorldHabitatCount)
      : 0;
    this.booleanFlags = new Set(Array.isArray(data.booleanFlags) ? data.booleanFlags : []);
    this.reapplyEffects();
  }
}
