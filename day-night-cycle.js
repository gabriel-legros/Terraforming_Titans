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
  }

  

  function updateDayNightDisplay() {
    const dayNightStatus = dayNightCycle.isDay() ? 'Day' : 'Night';
    const dayProgress = Math.floor(dayNightCycle.getDayProgress() * 100);
  
    document.getElementById('day-night-status').textContent = dayNightStatus;
    document.getElementById('day-progress').textContent = dayProgress;
  }