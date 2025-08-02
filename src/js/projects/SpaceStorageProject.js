class SpaceStorageProject extends SpaceshipProject {
  constructor(config, name) {
    super(config, name);
    this.baseDuration = config.duration;
    this.capacityPerCompletion = 1000000000000;
    this.usedStorage = 0;
    this.selectedResources = [];
  }

  getDurationWithTerraformBonus(baseDuration) {
    if (
      typeof spaceManager === 'undefined' ||
      typeof spaceManager.getTerraformedPlanetCount !== 'function'
    ) {
      return baseDuration;
    }
    const count = spaceManager.getTerraformedPlanetCount();
    return baseDuration / (count + 1);
  }

  get maxStorage() {
    return this.repeatCount * this.capacityPerCompletion;
  }

  getBaseDuration() {
    return this.getDurationWithTerraformBonus(this.baseDuration);
  }

  toggleResourceSelection(category, resource, isSelected) {
    const exists = this.selectedResources.some(
      (r) => r.category === category && r.resource === resource
    );
    if (isSelected && !exists) {
      this.selectedResources.push({ category, resource });
    } else if (!isSelected && exists) {
      this.selectedResources = this.selectedResources.filter(
        (r) => !(r.category === category && r.resource === resource)
      );
    }
  }

  renderUI(container) {
    const topSection = document.createElement('div');
    topSection.classList.add('project-top-section');
    this.createSpaceshipAssignmentUI(topSection);
    this.createProjectDetailsGridUI(topSection);
    if (typeof renderSpaceStorageUI === 'function') {
      renderSpaceStorageUI(this, topSection);
    }
    container.appendChild(topSection);
    this.updateCostAndGains(projectElements[this.name]);
  }

  updateUI() {
    super.updateUI();
    if (typeof updateSpaceStorageUI === 'function') {
      updateSpaceStorageUI(this);
    }
  }

  saveState() {
    return {
      ...super.saveState(),
      usedStorage: this.usedStorage,
      selectedResources: this.selectedResources,
    };
  }

  loadState(state) {
    super.loadState(state);
    this.usedStorage = state.usedStorage || 0;
    this.selectedResources = state.selectedResources || [];
  }
}

if (typeof globalThis !== 'undefined') {
  globalThis.SpaceStorageProject = SpaceStorageProject;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = SpaceStorageProject;
}
