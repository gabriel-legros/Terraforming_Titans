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
    const baseDuration = this.isBooleanFlagSet('instantDuration') ? 1000 : this.duration;
    const effectiveDuration = this.applyDurationEffects(baseDuration);
    return Math.floor((effectiveDuration / 1000) * this.getExportCap() / capacity);
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

  createResourceDisposalUI() {
    const sectionContainer = super.createResourceDisposalUI();
    const elements = projectElements[this.name];
    if (elements && elements.maxDisposalElement) {
      const tooltip = document.createElement('span');
      tooltip.classList.add('info-tooltip-icon');
      tooltip.title =
        'You may not export more metal than about 2 order of magnitude Earth\'s 2025 yearly metal production.  This value may change as you progress further into the game.';
      tooltip.innerHTML = '&#9432;';
      elements.maxDisposalElement.appendChild(document.createTextNode(' '));
      elements.maxDisposalElement.appendChild(tooltip);
    }
    return sectionContainer;
  }
}

if (typeof globalThis !== 'undefined') {
  globalThis.SpaceExportProject = SpaceExportProject;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = SpaceExportProject;
}
