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

  const roundBuildingToggle = document.getElementById('round-building-toggle');
  roundBuildingToggle.checked = gameSettings.roundBuildingConstruction;
  roundBuildingToggle.addEventListener('change', () => {
    gameSettings.roundBuildingConstruction = roundBuildingToggle.checked;
    updateBuildingDisplay(buildings);
    updateColonyDisplay(colonies);
  });

  const scientificNotationThresholdInput = document.getElementById('scientific-notation-threshold-input');
  scientificNotationThresholdInput.value = formatScientific(gameSettings.scientificNotationThreshold ?? 1e30);
  const thresholdWire = wireStringNumberInput(scientificNotationThresholdInput, {
    parseValue: (value) => {
      const parsed = parseFlexibleNumber(value);
      return Math.max(1, parsed || 0);
    },
    formatValue: (value) => formatScientific(value),
    onValue: (parsed) => {
      gameSettings.scientificNotationThreshold = parsed;
    },
    datasetKey: 'scientificNotationThreshold',
  });
  thresholdWire.syncParsedValue();

  const simplifyGoldenAsteroidToggle = document.getElementById('simplify-golden-asteroid-toggle');
  if (simplifyGoldenAsteroidToggle) {
    simplifyGoldenAsteroidToggle.checked = gameSettings.simplifyGoldenAsteroid;
    simplifyGoldenAsteroidToggle.addEventListener('change', () => {
      gameSettings.simplifyGoldenAsteroid = simplifyGoldenAsteroidToggle.checked;
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
