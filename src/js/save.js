globalGameIsLoadingFromSave = false;

function getGameState() {
  return {
    dayNightCycle: (typeof dayNightCycle !== 'undefined' && typeof dayNightCycle.saveState === 'function') ? dayNightCycle.saveState() : undefined,
    resources: typeof resources !== 'undefined' ? resources : undefined,
    buildings: typeof buildings !== 'undefined' ? buildings : undefined,
    colonies: typeof colonies !== 'undefined' ? colonies : undefined,
    projects: (typeof projectManager !== 'undefined' && typeof projectManager.saveState === 'function') ? projectManager.saveState() : undefined,
    research: (typeof researchManager !== 'undefined' && typeof researchManager.saveState === 'function') ? researchManager.saveState() : undefined,
    oreScanning: (typeof oreScanner !== 'undefined' && typeof oreScanner.saveState === 'function') ? oreScanner.saveState() : undefined,
    terraforming: (typeof terraforming !== 'undefined' && typeof terraforming.saveState === 'function') ? terraforming.saveState() : undefined,
    story: (typeof storyManager !== 'undefined' && typeof storyManager.saveState === 'function') ? storyManager.saveState() : undefined,
    journalEntrySources: typeof journalEntrySources !== 'undefined' ? journalEntrySources : undefined,
    journalHistorySources: typeof journalHistorySources !== 'undefined' ? journalHistorySources : undefined,
    goldenAsteroid: (typeof goldenAsteroid !== 'undefined' && typeof goldenAsteroid.saveState === 'function') ? goldenAsteroid.saveState() : undefined,
    solisManager: (typeof solisManager !== 'undefined' && typeof solisManager.saveState === 'function') ? solisManager.saveState() : undefined,
    warpGateCommand: (typeof warpGateCommand !== 'undefined' && typeof warpGateCommand.saveState === 'function') ? warpGateCommand.saveState() : undefined,
    lifeDesigner: (typeof lifeDesigner !== 'undefined' && typeof lifeDesigner.saveState === 'function') ? lifeDesigner.saveState() : undefined,
    milestonesManager: (typeof milestonesManager !== 'undefined' && typeof milestonesManager.saveState === 'function') ? milestonesManager.saveState() : undefined,
    skills: (typeof skillManager !== 'undefined' && typeof skillManager.saveState === 'function') ? skillManager.saveState() : undefined,
    spaceManager: (typeof spaceManager !== 'undefined' && typeof spaceManager.saveState === 'function') ? spaceManager.saveState() : undefined,
    selectedBuildCounts: typeof selectedBuildCounts !== 'undefined' ? selectedBuildCounts : undefined,
    settings: typeof gameSettings !== 'undefined' ? gameSettings : undefined,
    colonySliderSettings: typeof colonySliderSettings !== 'undefined' ? colonySliderSettings : undefined,
    ghgFactorySettings: typeof ghgFactorySettings !== 'undefined' ? ghgFactorySettings : undefined,
    mirrorOversightSettings: typeof globalThis.mirrorOversightSettings !== 'undefined' ? globalThis.mirrorOversightSettings : undefined,
    playTimeSeconds: typeof playTimeSeconds !== 'undefined' ? playTimeSeconds : undefined
  };
}

// Load game state from a specific slot or custom string
function loadGame(slotOrCustomString) {
  if (slotOrCustomString === undefined) {
    console.log('No slot or custom string provided. Loading aborted.');
    return;
  }

  let savedState = '';

  if (slotOrCustomString.startsWith('gameState_')) {
    // Load from a specific slot
    savedState = localStorage.getItem(slotOrCustomString);
  } else {
    // Load from a custom string
    savedState = slotOrCustomString;
  }
  if (savedState) {
      globalGameIsLoadingFromSave = true;

      const gameState = JSON.parse(savedState);

      // Load space state first so planet parameters are correct
      const savedSpace = gameState.spaceManager || gameState.spaceState;
      if (savedSpace) {
        spaceManager.loadState(savedSpace);
        const worldOriginal = typeof spaceManager.getCurrentWorldOriginal === 'function'
          ? spaceManager.getCurrentWorldOriginal() : null;
        if (spaceManager.getCurrentRandomSeed && spaceManager.getCurrentRandomSeed() !== null) {
          if (worldOriginal) {
            currentPlanetParameters = worldOriginal.merged;
          }
        } else {
          const key = spaceManager.getCurrentPlanetKey();
          if (planetParameters[key]) {
            defaultPlanet = key; // keep global consistent
            currentPlanetParameters = planetParameters[key];
          }
        }
        if (typeof setStarLuminosity === 'function') {
          setStarLuminosity(worldOriginal?.star?.luminositySolar || 1);
        }

        // Clear previously applied story effects so they don't carry over
        if (storyManager) {
          storyManager.appliedEffects = [];
        }

        // Reinitialize game state using the loaded planet parameters
        initializeGameState({ skipStoryInitialization: true });
        if (typeof tabManager.resetVisibility === 'function') {
          tabManager.resetVisibility(tabParameters);
        }
      }

      // Restore day/night cycle progress
      if (gameState.dayNightCycle) {
          dayNightCycle.loadState(gameState.dayNightCycle);
          updateDayNightDisplay();
      }

    // Restore resources
    if (gameState.resources) {
        for (const category in gameState.resources) {
          if (resources[category]) {
            for (const resourceName in gameState.resources[category]) {
              if (resources[category][resourceName]) {
                Object.assign(resources[category][resourceName], gameState.resources[category][resourceName]);
  
                // Ensure infinite cap resources are restored correctly
                if (!resources[category][resourceName].hasCap) {
                  resources[category][resourceName].cap = Infinity;
                }
                const newConfig = currentPlanetParameters.resources[category][resourceName];
                resources[category][resourceName].initializeFromConfig(resourceName, newConfig);
                resources[category][resourceName].activeEffects = [];
                resources[category][resourceName].booleanFlags = new Set();
              }
            }
          }
        }
      }
  
      // Restore buildings
      if (gameState.buildings) {
        for (const buildingName in gameState.buildings) {
          const buildingState = gameState.buildings[buildingName];
          const building = buildings[buildingName];
          if (building) {
            Object.assign(building, buildingState);
            const newConfig = buildingsParameters[buildingName];
            building.initializeFromConfig(newConfig, buildingName);
            // Reset effects applied from research
            building.activeEffects = [];
            if (building.booleanFlags && Array.isArray(building.booleanFlags)) {
              building.booleanFlags = new Set(building.booleanFlags);
            } else {
              building.booleanFlags = new Set();
            }
          }
        }
      }
      createBuildingButtons(buildings);
      if (typeof initializeBuildingAlerts === 'function') {
        initializeBuildingAlerts();
      }
  
      // Restore colonies
        if (gameState.colonies) {
          for (const colonyName in gameState.colonies) {
            const colonyState = gameState.colonies[colonyName];
            const colony = colonies[colonyName];
            if (colony) {
              Object.assign(colony, colonyState);
              const newConfig = colonyParameters[colonyName];
              colony.initializeFromConfig(newConfig, colonyName);
              // Reset effects applied from research
              colony.activeEffects = [];
              if (colony.booleanFlags && Array.isArray(colony.booleanFlags)) {
                colony.booleanFlags = new Set(colony.booleanFlags);
              } else {
                colony.booleanFlags = new Set();
              }
            }
          }
        }
      createColonyButtons(colonies);

      if (gameState.selectedBuildCounts) {
        for (const key in gameState.selectedBuildCounts) {
          if (selectedBuildCounts.hasOwnProperty(key)) {
            selectedBuildCounts[key] = gameState.selectedBuildCounts[key];
          }
        }
        if (typeof updateBuildingDisplay === 'function') {
          updateBuildingDisplay(buildings);
          updateBuildingDisplay(colonies);
        }
      }
    
      // Restore projects
      if (gameState.projects) {
          projectManager.loadState(gameState.projects);
      }

      // Load story progress
      if (gameState.story) {
        storyManager.loadState(gameState.story);
    }

    if(gameState.terraforming){
      terraforming.loadState(gameState.terraforming);
    }

      if (gameState.journalEntrySources) {
        const entries = mapSourcesToText(gameState.journalEntrySources);
        const historySources = gameState.journalHistorySources || gameState.journalEntrySources;
        const history = mapSourcesToText(historySources);
        loadJournalEntries(entries, history, gameState.journalEntrySources, historySources);
      } else if (gameState.journalEntries) {
        const history = gameState.journalHistory || gameState.journalEntries;
        loadJournalEntries(gameState.journalEntries, history);
      }

      // Always rebuild the journal from story state after loading
      if (typeof reconstructJournalState === 'function') {
        reconstructJournalState(storyManager, projectManager);
      }

      // Restore research progress
      if (gameState.research) {
          researchManager.loadState(gameState.research);
          updateAllResearchButtons(researchManager.researches);
      }
      if (typeof updateAdvancedResearchVisibility === 'function') {
          updateAdvancedResearchVisibility();
      }
      if (typeof initializeResearchAlerts === 'function') {
          initializeResearchAlerts();
      }

    // Restore ore scanning progress
    if (gameState.oreScanning) {
        oreScanner.loadState(gameState.oreScanning);
      }

    if(gameState.goldenAsteroid){
      goldenAsteroid.loadState(gameState.goldenAsteroid);
    }

    if(gameState.solisManager){
      solisManager.loadState(gameState.solisManager);
      if (typeof solisManager.reapplyEffects === 'function') {
        solisManager.reapplyEffects();
      }
      if (typeof updateSolisVisibility === 'function') {
        updateSolisVisibility();
      }
    }

    if(gameState.warpGateCommand){
      warpGateCommand.loadState(gameState.warpGateCommand);
      if (typeof warpGateCommand.reapplyEffects === 'function') {
        warpGateCommand.reapplyEffects();
      }
      if (typeof redrawWGCTeamCards === 'function') {
        redrawWGCTeamCards();
      }
      if (typeof updateWGCUI === 'function') {
        updateWGCUI();
      }
      if (typeof updateWGCVisibility === 'function') {
        updateWGCVisibility();
      }
    }

    if(gameState.lifeDesigner){
      lifeDesigner.loadState(gameState.lifeDesigner);
    }

    if(gameState.milestonesManager){
      milestonesManager.loadState(gameState.milestonesManager);
    }
    if(gameState.skills){
      skillManager.loadState(gameState.skills);
    }

    if(gameState.settings){
      Object.assign(gameSettings, gameState.settings);
      const toggle = document.getElementById('celsius-toggle');
      if(toggle){
        toggle.checked = gameSettings.useCelsius;
      }
      const silenceToggle = document.getElementById('solis-silence-toggle');
      if(silenceToggle){
        silenceToggle.checked = gameSettings.silenceSolisAlert;
      }
      const milestoneToggle = document.getElementById('milestone-silence-toggle');
      if(milestoneToggle){
        milestoneToggle.checked = gameSettings.silenceMilestoneAlert;
      }
      const unlockToggle = document.getElementById('unlock-alert-toggle');
      if(unlockToggle){
        unlockToggle.checked = gameSettings.silenceUnlockAlert;
      }
      const dayNightToggle = document.getElementById('day-night-toggle');
      if(dayNightToggle){
        dayNightToggle.checked = gameSettings.disableDayNightCycle;
      }
      const avgResourceChangeToggle = document.getElementById('avg-resource-change-toggle');
      if(avgResourceChangeToggle){
        avgResourceChangeToggle.checked = gameSettings.averageResourceChanges;
      }
      const darkModeToggle = document.getElementById('dark-mode-toggle');
      if(darkModeToggle){
        darkModeToggle.checked = gameSettings.darkMode;
        document.body.classList.toggle('dark-mode', gameSettings.darkMode);
      }
      if (typeof completedResearchHidden !== 'undefined') {
        completedResearchHidden = gameSettings.hideCompletedResearch || false;
        if (typeof updateAllResearchButtons === 'function') {
          updateAllResearchButtons(researchManager.researches);
          updateCompletedResearchVisibility();
        }
      }
    }

    if(gameState.colonySliderSettings){
      Object.assign(colonySliderSettings, gameState.colonySliderSettings);
      setWorkforceRatio(colonySliderSettings.workerRatio);
      setFoodConsumptionMultiplier(colonySliderSettings.foodConsumption);
      setLuxuryWaterMultiplier(colonySliderSettings.luxuryWater);
      setOreMineWorkerAssist(colonySliderSettings.oreMineWorkers);
    }

    if(gameState.ghgFactorySettings){
      Object.assign(ghgFactorySettings, gameState.ghgFactorySettings);
    }

    if(gameState.mirrorOversightSettings){
      Object.assign(mirrorOversightSettings, gameState.mirrorOversightSettings);
    }

    if(gameState.playTimeSeconds !== undefined){
      playTimeSeconds = gameState.playTimeSeconds;
    }

    tabManager.activateTab('buildings');

    if(typeof applyDayNightSettingEffects === 'function'){
      applyDayNightSettingEffects();
    }
    if (typeof updateDayNightDisplay === 'function') {
      updateDayNightDisplay();
    }
    if (typeof updateBuildingDisplay === 'function') {
      updateBuildingDisplay(buildings);
    }

    globalGameIsLoadingFromSave = false;

      console.log('Game loaded successfully (DayNightCycle, resources, buildings, projects, colonies, and research).');
  } else {
      console.log('No saved game found.');
  }
}

function saveGameToSlot(slot) {
  const gameState = getGameState();

  // Store game state in localStorage
  try {
    localStorage.setItem(`gameState_${slot}`, JSON.stringify(gameState));
    console.log(`Game saved successfully to slot ${slot}.`);
  } catch (e) {
    console.warn(`Unable to access localStorage for slot ${slot}:`, e);
    return;
  }

  // Get the current date and time
  const saveDate = new Date();

  // Format the save date using the formatDate function
  const formattedSaveDate = formatDate(saveDate);

  // Update the save date for the slot
  document.getElementById(`${slot}-date`).textContent = formattedSaveDate;

  // Save the save slot dates as UNIX timestamps
  saveSaveSlotDates(slot, saveDate);

  if (slot === 'pretravel') {
    const row = document.getElementById('pretravel-row');
    if (row) row.classList.remove('hidden');
  }
}

function saveGameToFile() {
  const gameState = getGameState();

  const saveData = JSON.stringify(gameState);
  const blob = new Blob([saveData], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = 'game_save.json';
  a.click();

  URL.revokeObjectURL(url);
}

// Load game state from a file
function loadGameFromFile(event) {
  const file = event.target.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = function(e) {
      const saveData = e.target.result;
      loadGame(saveData);
    };
    reader.readAsText(file);
  }
}

// Delete save file from a specific slot
function deleteSaveFileFromSlot(slot) {
  try {
    localStorage.removeItem(`gameState_${slot}`);
    console.log(`Save file deleted successfully from slot ${slot}.`);
  } catch (e) {
    console.warn(`Unable to access localStorage for slot ${slot}:`, e);
  }

  // Clear the save date for the slot
  document.getElementById(`${slot}-date`).textContent = 'Empty';

  // Delete the save slot date
  deleteSaveSlotDate(slot);

  if (slot === 'pretravel') {
    const row = document.getElementById('pretravel-row');
    if (row) row.classList.add('hidden');
  }
}

// Save the save slot dates as UNIX timestamps
function saveSaveSlotDates(slot, date) {
  try {
    const saveSlotDates = JSON.parse(localStorage.getItem('saveSlotDates')) || {};
    saveSlotDates[slot] = new Date(date).getTime();
    localStorage.setItem('saveSlotDates', JSON.stringify(saveSlotDates));
  } catch (e) {
    console.warn('Unable to access localStorage for save slot dates:', e);
  }
}

// Load the save slot dates and display them in a user-friendly format
function loadSaveSlotDates() {
  let saveSlotDates = {};
  try {
    saveSlotDates = JSON.parse(localStorage.getItem('saveSlotDates')) || {};
  } catch (e) {
    console.warn('Unable to access localStorage for save slot dates:', e);
    saveSlotDates = {};
  }
  for (const slot in saveSlotDates) {
    const timestamp = saveSlotDates[slot];
    const date = new Date(timestamp);
    const formattedDate = formatDate(date);
    const dateCell = document.getElementById(`${slot}-date`);
    if (dateCell) dateCell.textContent = formattedDate;
  }
  const preRow = document.getElementById('pretravel-row');
  if (preRow) {
    if (saveSlotDates.pretravel) {
      preRow.classList.remove('hidden');
    } else {
      preRow.classList.add('hidden');
    }
  }
}

// Format the date in a user-friendly way
function formatDate(date) {
  const options = {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
    hour12: true
  };
  return date.toLocaleString(undefined, options);
}

// Delete a save slot date
function deleteSaveSlotDate(slot) {
  try {
    const saveSlotDates = JSON.parse(localStorage.getItem('saveSlotDates')) || {};
    delete saveSlotDates[slot];
    localStorage.setItem('saveSlotDates', JSON.stringify(saveSlotDates));
  } catch (e) {
    console.warn('Unable to access localStorage for save slot dates:', e);
  }
}

// Add event listeners to save, load, and delete buttons
function addSaveSlotListeners() {
  const saveSlots = ['autosave', 'pretravel', 'slot1', 'slot2', 'slot3', 'slot4', 'slot5'];

  saveSlots.forEach(slot => {
    const saveButton = document.querySelector(`.save-button[data-slot="${slot}"]`);
    const loadButton = document.querySelector(`.load-button[data-slot="${slot}"]`);
    const deleteButton = document.querySelector(`.delete-button[data-slot="${slot}"]`);

    if (saveButton && slot !== 'pretravel') {
      saveButton.addEventListener('click', () => saveGameToSlot(slot));
    }

    loadButton.addEventListener('click', () => loadGame(`gameState_${slot}`));

    deleteButton.addEventListener('click', () => {
      if (confirm(`Are you sure you want to delete the save file in slot ${slot}? This action cannot be undone.`)) {
        deleteSaveFileFromSlot(slot);
      }
    });
  });
}

// Load the most recent save
function loadMostRecentSave() {
  loadSaveSlotDates();

  const saveSlotDates = JSON.parse(localStorage.getItem('saveSlotDates')) || {};
  let mostRecentSlot = null;
  let mostRecentTimestamp = null;

  for (const slot in saveSlotDates) {
    const timestamp = saveSlotDates[slot];
    if (mostRecentTimestamp === null || timestamp > mostRecentTimestamp) {
      mostRecentSlot = slot;
      mostRecentTimestamp = timestamp;
    }
  }

  if (mostRecentSlot) {
    loadGame(`gameState_${mostRecentSlot}`);
    console.log(`Loaded most recent save from slot ${mostRecentSlot}.`);
    return true;
  } else {
    console.log('No save slots found. Starting a new game.');
    return false;
  }
}

let autosaveInterval = 180; // Autosave interval in seconds
let autosaveTimer = autosaveInterval;

function autosave(delta) {
  autosaveTimer -= delta / 1000; // Convert delta from milliseconds to seconds

  if (autosaveTimer <= 0) {
    saveGameToSlot('autosave');
    autosaveTimer = autosaveInterval; // Reset the autosave timer
  }

  updateAutosaveText();
}

function updateAutosaveText() {
  const autosaveText = document.getElementById('autosave-text');
  const minutes = Math.floor(autosaveTimer / 60);
  const seconds = Math.floor(autosaveTimer % 60);
  autosaveText.textContent = `Next autosave in ${minutes}m ${seconds}s`;
}

// Call the function to add event listeners when the page loads
document.addEventListener('DOMContentLoaded', addSaveSlotListeners);