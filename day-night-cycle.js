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
  const dayProgress = dayNightCycle.getDayProgress() * 100;  

  const progressBar = document.getElementById('day-night-progress-bar');
  const progressText = document.getElementById('progress-text');

  progressBar.style.width = dayProgress + '%';

  // Update text, optionally round to 2 decimal places for display
  progressText.textContent = `Day Progress: ${dayProgress.toFixed(1)}%`;

    // Change color gradually between yellow (day) and dark blue (night)
    if (dayNightStatus === 'Day') {
      progressBar.style.backgroundColor = `rgb(${255 - dayProgress * 1.55}, ${255 - dayProgress}, 0)`; // Transitions from yellow to dark yellow as the day progresses
      progressBar.classList.remove('night');
  } else {
      progressBar.style.backgroundColor = `rgb(0, 0, ${dayProgress * 2.55})`; // Transitions from dark blue to lighter blue as night progresses
      progressBar.classList.add('night');
  }
}