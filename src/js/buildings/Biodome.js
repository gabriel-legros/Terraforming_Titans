class Biodome extends Building {
  updateProductivity(resources, deltaTime) {
    this.setAutomationActivityMultiplier(1);

    if (
      typeof lifeDesigner !== 'undefined' &&
      lifeDesigner.currentDesign &&
      typeof lifeDesigner.currentDesign.canSurviveAnywhere === 'function' &&
      !lifeDesigner.currentDesign.canSurviveAnywhere()
    ) {
      this.setAutomationActivityMultiplier(0);
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
