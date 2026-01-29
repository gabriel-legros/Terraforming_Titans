class TerraformingDurationProject extends Project {
  getDurationWithTerraformBonus(baseDuration) {
    const count = spaceManager.getTerraformedPlanetCountIncludingCurrent();
    const total = Math.max(1, count + this.getWorldBonus());
    return baseDuration / total;
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = TerraformingDurationProject;
} else {
  window.TerraformingDurationProject = TerraformingDurationProject;
}
