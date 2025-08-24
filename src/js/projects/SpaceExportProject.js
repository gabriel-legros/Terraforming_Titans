class SpaceExportProject extends SpaceExportBaseProject {
  getExportCap() {
    if (
      typeof spaceManager !== 'undefined' &&
      typeof spaceManager.getTerraformedPlanetCountExcludingCurrent === 'function'
    ) {
      const count = spaceManager.getTerraformedPlanetCountExcludingCurrent();
      return Math.max(count, 1) * 1000000000;
    }
    return 1000000000;
  }

  getMaxAssignableShips() {
    const capacity = this.getShipCapacity() || 1;
    return Math.floor((this.getEffectiveDuration()/1000)*this.getExportCap() / capacity);
  }

  assignSpaceships(count) {
    const maxShips = this.getMaxAssignableShips();
    const available = Math.floor(resources.special.spaceships.value);
    const adjusted = Math.max(
      -this.assignedSpaceships,
      Math.min(count, available, maxShips - this.assignedSpaceships)
    );
    super.assignSpaceships(adjusted);
  }

  updateUI() {
    super.updateUI();
    const elements = projectElements[this.name];
    if (elements && elements.maxDisposalElement) {
      const capText = `Max Export Capacity: ${formatNumber(this.getExportCap(), true)} /s`;
      elements.maxDisposalElement.innerHTML = `${capText} <span class="info-tooltip-icon" title="Earth is not interested in purchasing more metal than about 2 order of magnitude its 2025 yearly metal production.  This value may change as you progress further into the game.">&#9432;</span>`;
    }
  }
}

if (typeof globalThis !== 'undefined') {
  globalThis.SpaceExportProject = SpaceExportProject;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = SpaceExportProject;
}
