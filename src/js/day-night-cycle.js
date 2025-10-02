let dayNightContainer = null;
let dayNightProgressBar = null;
let dayNightProgressText = null;
let dayNightSun = null; // NEW

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
      if (typeof gameSettings !== 'undefined' && gameSettings.disableDayNightCycle) {
        return true;
      }
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

// Convert a rotation period in hours to a day-night cycle duration in
// milliseconds using one Earth day as one minute.
function rotationPeriodToDuration(rotationHours) {
  return (rotationHours / 24) * 30000;
}

function resetDayNightContainerCache() {
  dayNightContainer = null;
  dayNightProgressBar = null;
  dayNightProgressText = null;
  dayNightSun = null; // NEW
}

function ensureSun(container) {
  if (!dayNightSun) {
    dayNightSun = document.getElementById('day-night-sun');
    if (!dayNightSun) {
      dayNightSun = document.createElement('div');
      dayNightSun.id = 'day-night-sun';
      dayNightSun.className = 'day-night-sun';
      container.appendChild(dayNightSun);
    }
  }
}

function updateDayNightDisplay() {
  if (!dayNightContainer) {
    dayNightContainer = document.querySelector('.day-night-progress-bar-container');
  }
  const container = dayNightContainer;

  if (typeof gameSettings !== 'undefined' && gameSettings.disableDayNightCycle) {
    if (container) container.style.display = 'none';
    return;
  }
  if (container) container.style.display = 'block';

  const dayProgress = Math.max(0, Math.min(1, dayNightCycle.getDayProgress()));
  const dayProgressPercent = dayProgress * 100;

  if (!dayNightProgressBar) dayNightProgressBar = document.getElementById('day-night-progress-bar');
  if (!dayNightProgressText) dayNightProgressText = document.getElementById('progress-text');

  // Background gradient motion (leave as you had it)
  if (dayNightProgressBar) {
    dayNightProgressBar.style.backgroundPosition = `${dayProgressPercent}% 50%`;
  }

  // ----- SUN LOGIC -----
  if (container) ensureSun(container);

  if (dayNightSun && container) {
    // Measure container and sun
    const barWidth = container.clientWidth;
    const sunWidth = dayNightSun.offsetWidth || 24; // fallback if not yet rendered

    // Move left -> right.
    // Use left edge positioning so we can push the Sun fully off-screen.
    // At 0%: left = -sunWidth (fully off screen)
    // At 50%: centered in the bar
    // At 100%: left = barWidth (fully off screen on right)
    const startX = -sunWidth;
    const endX   = barWidth;
    const x = startX + (endX - startX) * dayProgress;
    dayNightSun.style.left = `${x}px`;

    // Fade rules:
    // Invisible at 0% (exactly none), fully visible by 2%.
    // Start fading at 97%, fully invisible by 99% (your requirement).
    const FADE_IN_END     = 0.02;  // 2%
    const FADE_OUT_START  = 0.97;  // 97%
    const FADE_OUT_END    = 0.99;  // 99%

    let alpha = 1;
    if (dayProgress <= 0) {
      alpha = 0;
    } else if (dayProgress < FADE_IN_END) {
      alpha = dayProgress / FADE_IN_END; // 0 → 1
    } else if (dayProgress < FADE_OUT_START) {
      alpha = 1;
    } else if (dayProgress < FADE_OUT_END) {
      alpha = 1 - ((dayProgress - FADE_OUT_START) / (FADE_OUT_END - FADE_OUT_START)); // 1 → 0
    } else {
      alpha = 0; // 99%+
    }
    dayNightSun.style.opacity = alpha.toFixed(3);
  }

  // Progress text
  if (dayNightProgressText) {
    dayNightProgressText.textContent = `Day Cycle: ${dayProgressPercent.toFixed(1)}%`;
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { DayNightCycle, rotationPeriodToDuration, updateDayNightDisplay, resetDayNightContainerCache };
}
