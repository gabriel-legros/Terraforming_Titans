class WorkerCapacityBatchProject extends Project {
  constructor(config, name) {
    super(config, name);
    this.buildCount = 1;
    this.activeBuildCount = 1;
    this.autoMax = true;
    this.workersPerCompletion = this.attributes?.workersPerCompletion ?? null;
  }

  getWorkersPerCompletion() {
    return this.workersPerCompletion ?? this.attributes?.workersPerCompletion ?? 10000;
  }

  getWorkerCapLimit() {
    const workers = resources?.colony?.workers?.cap ?? 0;
    const perCompletion = this.getWorkersPerCompletion();
    const maxByWorkers = perCompletion > 0 ? Math.ceil(workers / perCompletion) : Infinity;
    if (this.maxRepeatCount === Infinity) {
      return maxByWorkers;
    }
    return Math.max(Math.min(maxByWorkers, this.maxRepeatCount), 1);
  }

  getEffectiveBuildCount(count = this.buildCount) {
    const remaining = this.maxRepeatCount === Infinity
      ? Infinity
      : this.maxRepeatCount - this.repeatCount;
    return Math.max(0, Math.min(count, remaining));
  }

  getBatchCostMultiplier() {
    if (this.isActive) {
      return this.activeBuildCount || 1;
    }
    const cappedCount = Math.min(this.buildCount, this.getWorkerCapLimit());
    return this.getEffectiveBuildCount(cappedCount);
  }

  getScaledCost() {
    const base = super.getScaledCost();
    const count = this.getBatchCostMultiplier();
    const scaled = {};
    for (const category in base) {
      scaled[category] = {};
      for (const resource in base[category]) {
        scaled[category][resource] = base[category][resource] * count;
      }
    }
    return scaled;
  }

  adjustBuildCount(delta) {
    const limit = this.getWorkerCapLimit();
    this.buildCount = Math.max(0, Math.min(this.buildCount + delta, limit));
  }

  setBuildCount(value) {
    const limit = this.getWorkerCapLimit();
    this.buildCount = Math.max(0, Math.min(value, limit));
  }

  setMaxBuildCount() {
    this.setBuildCount(this.getWorkerCapLimit());
  }

  start(resources) {
    const limit = this.getWorkerCapLimit();
    const cappedCount = Math.min(this.buildCount, limit);
    this.activeBuildCount = this.getEffectiveBuildCount(cappedCount);
    return super.start(resources);
  }

  complete() {
    const completions = this.activeBuildCount || 1;
    for (let i = 0; i < completions; i++) {
      super.complete();
    }
    this.activeBuildCount = 1;
  }

  saveState() {
    return {
      ...super.saveState(),
      buildCount: this.buildCount,
      activeBuildCount: this.activeBuildCount,
      autoMax: this.autoMax,
      workersPerCompletion: this.workersPerCompletion,
    };
  }

  loadState(state) {
    super.loadState(state);
    this.buildCount = state.buildCount ?? this.buildCount;
    this.activeBuildCount = state.activeBuildCount ?? this.activeBuildCount;
    this.autoMax = state.autoMax ?? this.autoMax;
    this.workersPerCompletion = state.workersPerCompletion ?? this.workersPerCompletion;
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = WorkerCapacityBatchProject;
}
