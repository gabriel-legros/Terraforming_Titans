class LiftersProject extends TerraformingDurationProject {
  getBaseDuration() {
    return this.getDurationWithTerraformBonus(this.duration);
  }

  saveTravelState() {
    const state = { repeatCount: this.repeatCount };
    if (this.isActive) {
      state.isActive = true;
      state.remainingTime = this.remainingTime;
      state.startingDuration = this.startingDuration;
    }
    return state;
  }

  loadTravelState(state = {}) {
    this.repeatCount = state.repeatCount || 0;
    this.isCompleted = false;
    if (state.isActive) {
      this.isActive = true;
      this.startingDuration = state.startingDuration || this.getEffectiveDuration();
      this.remainingTime = state.remainingTime || this.startingDuration;
      return;
    }

    this.isActive = false;
    const duration = this.getEffectiveDuration();
    this.startingDuration = duration;
    this.remainingTime = duration;
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = LiftersProject;
} else if (typeof window !== 'undefined') {
  window.LiftersProject = LiftersProject;
}
