class ParticleAcceleratorProject extends Project {
  constructor(config, name) {
    super(config, name);
    this.acceleratorCount = 0;
  }

  complete() {
    super.complete();
    this.acceleratorCount = this.repeatCount;
  }

  getCompletedCount() {
    return this.acceleratorCount;
  }

  saveState() {
    return { ...super.saveState(), acceleratorCount: this.acceleratorCount };
  }

  loadState(state = {}) {
    if (Object.keys(state).length === 0) {
      this.acceleratorCount = 0;
      return;
    }
    super.loadState(state);
    this.acceleratorCount = state.acceleratorCount ?? 0;
  }

  saveTravelState() {
    const state = {
      acceleratorCount: this.acceleratorCount,
      repeatCount: this.repeatCount,
    };
    if (this.isActive) {
      state.isActive = true;
      state.remainingTime = this.remainingTime;
      state.startingDuration = this.startingDuration;
    }
    return state;
  }

  loadTravelState(state = {}) {
    this.acceleratorCount = state.acceleratorCount ?? 0;
    this.repeatCount = state.repeatCount ?? this.acceleratorCount;
    this.isActive = false;
    if (state.isActive) {
      this.isActive = true;
      this.remainingTime = state.remainingTime ?? this.remainingTime;
      this.startingDuration = state.startingDuration ?? this.getEffectiveDuration();
    }
  }
}

const scope = globalThis;
if (scope) {
  scope.ParticleAcceleratorProject = ParticleAcceleratorProject;
}

const commonJsModule = (() => {
  try {
    return module;
  } catch (error) {
    return null;
  }
})();

if (commonJsModule?.exports) {
  commonJsModule.exports = ParticleAcceleratorProject;
}
