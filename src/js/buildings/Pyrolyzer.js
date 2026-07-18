class Pyrolyzer extends MultiRecipesBuilding {
  constructor(config, buildingName) {
    super(config, buildingName);
    this.pyrolyzerResearchEnabled = false;
  }

  enable() {
    this.pyrolyzerResearchEnabled = true;
    this.updatePyrolyzerUnlockState();
  }

  applyBooleanFlag(effect) {
    super.applyBooleanFlag(effect);
    this.updatePyrolyzerUnlockState();
  }

  updatePyrolyzerUnlockState() {
    if (this.permanentlyDisabled) {
      return;
    }
    const shouldUnlock = this.pyrolyzerResearchEnabled && this.isBooleanFlagSet('pyrolyzer');
    const first = !this.unlocked && shouldUnlock;
    this.unlocked = shouldUnlock;
    if (automationManager?.buildingsAutomation) {
      automationManager.buildingsAutomation.recordCurrentlyAvailableBuildings();
    }
    if (first && !this.alertedWhenUnlocked) {
      registerBuildingUnlockAlert(`${this.category}-buildings`);
    }
  }
}

registerBuildingConstructor(Pyrolyzer);

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { Pyrolyzer };
} else {
  window.Pyrolyzer = Pyrolyzer;
}
