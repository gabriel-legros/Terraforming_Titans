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
  }
}

if (typeof globalThis !== 'undefined') {
  globalThis.SpaceExportProject = SpaceExportProject;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = SpaceExportProject;
}
