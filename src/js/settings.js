// Settings management functions

function addSettingsListeners() {
  const disableAutosaveToggle = document.getElementById('disable-autosave-toggle');
  if (disableAutosaveToggle) {
    disableAutosaveToggle.checked = gameSettings.disableAutosave;
    disableAutosaveToggle.addEventListener('change', () => {
      gameSettings.disableAutosave = disableAutosaveToggle.checked;
      updateAutosaveText();
    });
  }

  const keepTabRunningAudioToggle = document.getElementById('keep-tab-running-audio-toggle');
  if (keepTabRunningAudioToggle) {
    keepTabRunningAudioToggle.checked = gameSettings.keepTabRunningAudio;
    keepTabRunningAudioToggle.addEventListener('pointerdown', () => {
      if (!keepTabRunningAudioToggle.checked) {
        startBackgroundSilence();
      }
    });
    keepTabRunningAudioToggle.addEventListener('change', () => {
      gameSettings.keepTabRunningAudio = keepTabRunningAudioToggle.checked;
      if (gameSettings.keepTabRunningAudio) {
        startBackgroundSilence();
      } else {
        stopBackgroundSilence();
      }
    });
  }

  const celsiusToggle = document.getElementById('celsius-toggle');
  if (celsiusToggle) {
    celsiusToggle.checked = gameSettings.useCelsius;
    celsiusToggle.addEventListener('change', () => {
      gameSettings.useCelsius = celsiusToggle.checked;
      updateTerraformingUI();
      if (typeof updateBuildingDisplay === 'function') {
        updateBuildingDisplay(buildings);
      }
    });
  }

  const silenceToggle = document.getElementById('solis-silence-toggle');
  if (silenceToggle) {
    silenceToggle.checked = gameSettings.silenceSolisAlert;
    silenceToggle.addEventListener('change', () => {
      gameSettings.silenceSolisAlert = silenceToggle.checked;
      updateHopeAlert();
    });
  }

  const unlockToggle = document.getElementById('unlock-alert-toggle');
  if (unlockToggle) {
    unlockToggle.checked = gameSettings.silenceUnlockAlert;
    unlockToggle.addEventListener('change', () => {
      gameSettings.silenceUnlockAlert = unlockToggle.checked;
      if (typeof updateBuildingAlert === 'function') updateBuildingAlert();
      if (typeof updateProjectAlert === 'function') updateProjectAlert();
    });
  }

  const dayNightToggle = document.getElementById('day-night-toggle');
  if (dayNightToggle) {
    dayNightToggle.checked = gameSettings.disableDayNightCycle;
    dayNightToggle.addEventListener('change', () => {
      gameSettings.disableDayNightCycle = dayNightToggle.checked;
      if (typeof applyDayNightSettingEffects === 'function') applyDayNightSettingEffects();
      updateDayNightDisplay();
      if (typeof updateBuildingDisplay === 'function') {
        updateBuildingDisplay(buildings);
      }
    });
  }

  const darkModeToggle = document.getElementById('dark-mode-toggle');
  if (darkModeToggle) {
    darkModeToggle.checked = gameSettings.darkMode;
    document.body.classList.toggle('dark-mode', gameSettings.darkMode);
    darkModeToggle.addEventListener('change', () => {
      gameSettings.darkMode = darkModeToggle.checked;
      document.body.classList.toggle('dark-mode', gameSettings.darkMode);
    });
  }

  const preserveAutoStartToggle = document.getElementById('preserve-project-auto-start-toggle');
  if (preserveAutoStartToggle) {
    preserveAutoStartToggle.checked = gameSettings.preserveProjectAutoStart;
    preserveAutoStartToggle.addEventListener('change', () => {
      gameSettings.preserveProjectAutoStart = preserveAutoStartToggle.checked;
    });
  }

  const keepHiddenStructuresToggle = document.getElementById('keep-hidden-structures-toggle');
  if (keepHiddenStructuresToggle) {
    keepHiddenStructuresToggle.checked = gameSettings.keepHiddenStructuresOnTravel;
    keepHiddenStructuresToggle.addEventListener('change', () => {
      gameSettings.keepHiddenStructuresOnTravel = keepHiddenStructuresToggle.checked;
    });
  }

  const autobuildSetActiveToggle = document.getElementById('autobuild-set-active-toggle');
  if (autobuildSetActiveToggle) {
    autobuildSetActiveToggle.checked = gameSettings.autobuildAlsoSetsActive;
    autobuildSetActiveToggle.addEventListener('change', () => {
      gameSettings.autobuildAlsoSetsActive = autobuildSetActiveToggle.checked;
    });
  }

  const formatAutoBuildTargetsToggle = document.getElementById('format-autobuild-targets-toggle');
  if (formatAutoBuildTargetsToggle) {
    formatAutoBuildTargetsToggle.checked = gameSettings.formatAutoBuildTargets;
    formatAutoBuildTargetsToggle.addEventListener('change', () => {
      gameSettings.formatAutoBuildTargets = formatAutoBuildTargetsToggle.checked;
      refreshAllAutoBuildTargets();
    });
  }

  const goldenAsteroidFixedPositionToggle = document.getElementById('golden-asteroid-fixed-position-toggle');
  if (goldenAsteroidFixedPositionToggle) {
    goldenAsteroidFixedPositionToggle.checked = gameSettings.goldenAsteroidFixedPosition;
    goldenAsteroidFixedPositionToggle.addEventListener('change', () => {
      gameSettings.goldenAsteroidFixedPosition = goldenAsteroidFixedPositionToggle.checked;
    });
  }

  const startBackgroundSilenceButton = document.getElementById('start-background-silence-button');
  if (startBackgroundSilenceButton) {
    startBackgroundSilenceButton.addEventListener('click', () => {
      startBackgroundSilence();
    });
  }

  const pauseButton = document.getElementById("pause-button");
  if (pauseButton) {
    pauseButton.addEventListener("click", togglePause);
  }
}

// Call the function to add settings event listeners when the page loads
if (typeof document !== 'undefined' && document.addEventListener) {
  document.addEventListener('DOMContentLoaded', () => {
    addSettingsListeners();
  });
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { addSettingsListeners };
}
