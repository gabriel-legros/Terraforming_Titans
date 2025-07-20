class SpaceExportProject extends SpaceExportBaseProject {
  getExportCap() {
    if (
      typeof spaceManager !== 'undefined' &&
      typeof spaceManager.getTerraformedPlanetCount === 'function'
    ) {
      const count = spaceManager.getTerraformedPlanetCount();
      return Math.max(count, 1) * 1000000000;
    }
    return 1000000000;
  }

  getMaxAssignableShips() {
    const capacity = this.attributes.disposalAmount || 1;
    return Math.floor(100*this.getExportCap() / (capacity));
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
