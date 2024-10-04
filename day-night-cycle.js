class DayNightCycle {
    constructor(dayDuration) {
      this.dayDuration = dayDuration;
      this.elapsedTime = 0;
      this.dayProgress = 0;
    }
  
    update(delta) {
      this.elapsedTime += delta;
      this.dayProgress = (this.elapsedTime % this.dayDuration) / this.dayDuration;
    }
  
    isDay() {
      return this.dayProgress < 0.5;
    }
  
    isNight() {
      return !this.isDay();
    }
  
    getDayProgress() {
      return this.dayProgress;
    }

    setDayProgress(dayProgress) {
      this.dayProgress = dayProgress;
    }

    // Method to get the current state of DayNightCycle for saving
    saveState() {
      return {
        dayProgress: this.dayProgress,
        elapsedTime: this.elapsedTime,
      };
    }

    // Method to load the state into DayNightCycle
    loadState(state) {
      this.dayProgress = state.dayProgress || 0;
      this.elapsedTime = state.elapsedTime || 0;
    }
}

  

  function updateDayNightDisplay() {
    const dayNightStatus = dayNightCycle.isDay() ? 'Day' : 'Night';
    const dayProgress = Math.floor(dayNightCycle.getDayProgress() * 100);
  
    document.getElementById('day-night-status').textContent = dayNightStatus;
    document.getElementById('day-progress').textContent = dayProgress;
  }