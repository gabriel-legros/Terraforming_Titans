class Biodome extends Building {
  updateProductivity(resources, deltaTime) {
    if (
      typeof lifeDesigner !== 'undefined' &&
      lifeDesigner.currentDesign &&
      typeof lifeDesigner.currentDesign.canSurviveAnywhere === 'function' &&
      !lifeDesigner.currentDesign.canSurviveAnywhere()
    ) {
      this.productivity = 0;
      return;
    }
    super.updateProductivity(resources, deltaTime);
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { Biodome };
} else {
  globalThis.Biodome = Biodome;
}
