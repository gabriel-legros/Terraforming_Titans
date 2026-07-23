class FluxRefineryBuilding extends Building {
  constructor(config, buildingName) {
    super(config, buildingName);
    this.fluxProductionMultiplier = config.fluxProductionMultiplier;
  }

  getEffectiveProductionMultiplier() {
    return super.getEffectiveProductionMultiplier() * this.fluxProductionMultiplier;
  }
}

class FluxCalibrationProject extends Project {
  constructor(config, name) {
    super(config, name);
    this.customCompletionCount = 0;
  }

  complete() {
    super.complete();
    this.customCompletionCount += 1;
    const reward = this.attributes.customMetalReward * this.customCompletionCount;
    resources.colony.metal.increase(reward);
  }

  saveState() {
    return {
      ...super.saveState(),
      customCompletionCount: this.customCompletionCount
    };
  }

  loadState(state) {
    super.loadState(state);
    this.customCompletionCount = state.customCompletionCount || 0;
  }
}

registerBuildingConstructor(
  'example.custom-classes.FluxRefineryBuilding',
  FluxRefineryBuilding
);
registerProjectConstructor(
  'example.custom-classes.FluxCalibrationProject',
  FluxCalibrationProject
);
