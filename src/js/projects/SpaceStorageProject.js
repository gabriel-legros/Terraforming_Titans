class SpaceStorageProject extends TerraformingDurationProject {
  constructor(config, name) {
    super(config, name);
    this.baseDuration = config.duration;
    this.capacityPerCompletion = 1000000000000;
    this.usedStorage = 0;
  }

  get maxStorage() {
    return this.repeatCount * this.capacityPerCompletion;
  }

  getBaseDuration() {
    return this.getDurationWithTerraformBonus(this.baseDuration);
  }

  renderUI(container) {
    if (typeof renderSpaceStorageUI === 'function') {
      renderSpaceStorageUI(this, container);
    }
  }

  updateUI() {
    if (typeof updateSpaceStorageUI === 'function') {
      updateSpaceStorageUI(this);
    }
  }

  saveState() {
    return {
      ...super.saveState(),
      usedStorage: this.usedStorage,
    };
  }

  loadState(state) {
    super.loadState(state);
    this.usedStorage = state.usedStorage || 0;
  }
}

if (typeof globalThis !== 'undefined') {
  globalThis.SpaceStorageProject = SpaceStorageProject;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = SpaceStorageProject;
}
