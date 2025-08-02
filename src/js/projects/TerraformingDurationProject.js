class TerraformingDurationProject extends Project {
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
}

if (typeof globalThis !== 'undefined') {
  globalThis.TerraformingDurationProject = TerraformingDurationProject;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = TerraformingDurationProject;
}
