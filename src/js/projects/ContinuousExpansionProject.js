class ContinuousExpansionProject extends TerraformingDurationProject {
  constructor(config, name) {
    super(config, name);
    this.continuousThreshold = this.continuousThreshold || 1000;
  }

  isExpansionContinuous() {
    return this.getEffectiveDuration() < this.continuousThreshold;
  }

  isContinuous() {
    return this.isExpansionContinuous();
  }

  startContinuousExpansion(resources) {
    if (!this.isExpansionContinuous()) {
      return super.start(resources);
    }
    if (!this.canStart(resources)) {
      return false;
    }
    this.isActive = true;
    this.isPaused = false;
    this.isCompleted = false;
    this.startingDuration = Infinity;
    this.remainingTime = Infinity;
    return true;
  }

  getExpansionProgressField() {
    return 'expansionProgress';
  }

  getExpansionCompletedField() {
    return 'repeatCount';
  }

  getExpansionLimit() {
    return this.maxRepeatCount || Infinity;
  }

  getExpansionProgressValue(progressField = this.getExpansionProgressField()) {
    return Math.max(0, this[progressField] || 0);
  }

  setExpansionProgressValue(value, progressField = this.getExpansionProgressField()) {
    this[progressField] = Math.max(0, value || 0);
  }

  getExpansionCompletedValue(completedField = this.getExpansionCompletedField()) {
    return Math.max(0, this[completedField] || 0);
  }

  setExpansionCompletedValue(value, completedField = this.getExpansionCompletedField()) {
    this[completedField] = Math.max(0, value || 0);
  }

  getExpansionCompletedTotal(options = {}) {
    const completedField = options.completedField || this.getExpansionCompletedField();
    const progressField = options.progressField || this.getExpansionProgressField();
    return this.getExpansionCompletedValue(completedField) + this.getExpansionProgressValue(progressField);
  }

  getRemainingExpansionCapacity(options = {}) {
    const limit = options.limit === undefined ? this.getExpansionLimit() : options.limit;
    if (limit === Infinity) {
      return Infinity;
    }
    return Math.max(0, limit - this.getExpansionCompletedTotal(options));
  }

  applyFractionalProgress(progress, options = {}) {
    const completedField = options.completedField || this.getExpansionCompletedField();
    const progressField = options.progressField || this.getExpansionProgressField();
    const limit = options.limit === undefined ? this.getExpansionLimit() : options.limit;

    const requestedProgress = Math.max(0, progress || 0);
    let completedValue = this.getExpansionCompletedValue(completedField);
    let progressValue = this.getExpansionProgressValue(progressField);
    let appliedProgress = requestedProgress;
    let capped = false;

    if (limit !== Infinity) {
      const remaining = Math.max(0, limit - (completedValue + progressValue));
      if (remaining <= 0) {
        this.setExpansionCompletedValue(completedValue, completedField);
        this.setExpansionProgressValue(Math.max(0, limit - completedValue), progressField);
        return {
          appliedProgress: 0,
          completedDelta: 0,
          capped: true,
          completedValue,
          progressValue: this.getExpansionProgressValue(progressField),
        };
      }
      if (appliedProgress > remaining) {
        appliedProgress = remaining;
        capped = true;
      }
    }

    const total = progressValue + appliedProgress;
    const completedDelta = Math.floor(total);
    completedValue += completedDelta;
    progressValue = total - completedDelta;

    if (limit !== Infinity && completedValue + progressValue >= limit) {
      capped = true;
      progressValue = Math.max(0, limit - completedValue);
    }

    this.setExpansionCompletedValue(completedValue, completedField);
    this.setExpansionProgressValue(progressValue, progressField);

    return {
      appliedProgress,
      completedDelta,
      capped,
      completedValue,
      progressValue,
    };
  }

  applyExpansionProgress(progress, options = {}) {
    const result = this.applyFractionalProgress(progress, options);
    if (result.capped) {
      if (options.deactivateOnCap !== false) {
        this.isActive = false;
      }
      if (options.completeOnCap !== false) {
        this.isCompleted = true;
      }
    }
    return result;
  }

  carryDiscreteExpansionProgress(options = {}) {
    if (this.startingDuration === Infinity || this.remainingTime === Infinity || this.startingDuration <= 0) {
      return {
        appliedProgress: 0,
        completedDelta: 0,
        capped: false,
      };
    }
    const carried = (this.startingDuration - this.remainingTime) / this.startingDuration;
    const result = carried > 0
      ? this.applyExpansionProgress(carried, options)
      : {
          appliedProgress: 0,
          completedDelta: 0,
          capped: false,
        };
    this.startingDuration = Infinity;
    this.remainingTime = Infinity;
    return result;
  }
}

try {
  window.ContinuousExpansionProject = ContinuousExpansionProject;
} catch (error) {}

try {
  module.exports = ContinuousExpansionProject;
} catch (error) {}
