class TerraformingDurationProject extends Project {
  getDurationWithTerraformBonus(baseDuration) {
    if (
      typeof spaceManager === 'undefined' ||
      typeof spaceManager.getTerraformedPlanetCountIncludingCurrent !== 'function'
    ) {
      return baseDuration;
    }
    const count = spaceManager.getTerraformedPlanetCountIncludingCurrent();
    return baseDuration / count;
  }
}

if (typeof globalThis !== 'undefined') {
  globalThis.TerraformingDurationProject = TerraformingDurationProject;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = TerraformingDurationProject;
}
