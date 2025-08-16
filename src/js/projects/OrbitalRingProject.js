class OrbitalRingProject extends TerraformingDurationProject {
  constructor(config, name) {
    super(config, name);
    this.ringCount = 0;
    this.currentWorldHasRing = false;
  }

  renderUI(container) {
    projectElements[this.name] = projectElements[this.name] || {};
    const els = projectElements[this.name];
    const topSection = document.createElement('div');
    topSection.classList.add('project-top-section');
    const grid = document.createElement('div');
    grid.classList.add('project-details-grid');
    const status = document.createElement('div');
    status.id = `${this.name}-ring-status`;
    grid.appendChild(status);
    const effect = document.createElement('div');
    effect.innerHTML = 'Orbital rings count as additional terraformed worlds <span class="info-tooltip-icon" title="Each orbital ring increases the terraformed world count.">&#9432;</span>';
    grid.appendChild(effect);
    topSection.appendChild(grid);
    container.appendChild(topSection);
    els.statusElement = status;
    this.updateUI();
  }

  updateUI() {
    const els = projectElements[this.name];
    if (els?.statusElement) {
      els.statusElement.textContent = `Current World Ring: ${this.currentWorldHasRing ? 'Yes' : 'No'}`;
    }
  }

  canStart() {
    if (!super.canStart()) return false;
    if (this.currentWorldHasRing) return false;
    if (
      typeof spaceManager === 'undefined' ||
      typeof spaceManager.getUnmodifiedTerraformedWorldCount !== 'function'
    ) {
      return true;
    }
    return this.ringCount < spaceManager.getUnmodifiedTerraformedWorldCount();
  }

  complete() {
    super.complete();
    this.ringCount += 1;
    if (!this.currentWorldHasRing) {
      this.currentWorldHasRing = true;
      if (typeof spaceManager !== 'undefined' && typeof spaceManager.setCurrentWorldHasOrbitalRing === 'function') {
        spaceManager.setCurrentWorldHasOrbitalRing(true);
      }
      const initialLand = currentPlanetParameters?.resources?.colony?.land?.initialValue || 0;
      if (resources?.colony?.land) {
        resources.colony.land.value += initialLand;
      }
    }
  }

  saveState() {
    return { ...super.saveState(), ringCount: this.ringCount, currentWorldHasRing: this.currentWorldHasRing };
  }

  loadState(state) {
    super.loadState(state);
    this.ringCount = state.ringCount || 0;
    this.currentWorldHasRing = state.currentWorldHasRing || false;
  }

  saveTravelState() {
    return { ringCount: this.ringCount };
  }

  loadTravelState(state = {}) {
    this.ringCount = state.ringCount || 0;
    this.currentWorldHasRing = false;
  }
}

if (typeof globalThis !== 'undefined') {
  globalThis.OrbitalRingProject = OrbitalRingProject;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = OrbitalRingProject;
}
