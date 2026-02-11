class FollowersManager extends EffectableEntity {
  constructor() {
    super({ description: 'Manages followers systems' });
    this.enabled = false;
    this.currentWorldFollowers = 0;
  }

  enable() {
    this.enabled = true;
    this.updateUI();
  }

  resetCurrentWorldState() {
    this.currentWorldFollowers = 0;
  }

  prepareTravelState() {
    const travelState = {
      currentWorldFollowers: this.currentWorldFollowers
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
    updateFollowersUI();
  }

  reapplyEffects() {
    this.updateUI();
  }

  saveState() {
    return {
      enabled: this.enabled,
      currentWorldFollowers: this.currentWorldFollowers,
      booleanFlags: Array.from(this.booleanFlags)
    };
  }

  loadState(data = {}) {
    this.enabled = !!data.enabled;
    this.currentWorldFollowers = Number.isFinite(data.currentWorldFollowers)
      ? Math.max(0, data.currentWorldFollowers)
      : (Number.isFinite(data.currentWorldHabitatCount)
      ? Math.max(0, data.currentWorldHabitatCount)
      : 0);
    this.booleanFlags = new Set(Array.isArray(data.booleanFlags) ? data.booleanFlags : []);
    this.reapplyEffects();
  }
}
