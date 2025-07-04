globalGameIsLoadingFromSave = false;

function getGameState() {
  return {
    dayNightCycle: dayNightCycle.saveState(),
    resources: resources,
    buildings: buildings,
    colonies: colonies,
    projects: projectManager.saveState(),
    research: researchManager.saveState(),
    oreScanning: oreScanner.saveState(),
    terraforming: terraforming.saveState(),
    story: storyManager.saveState(),
    journalEntrySources: journalEntrySources,
    journalHistorySources: journalHistorySources,
    goldenAsteroid: goldenAsteroid.saveState(),
    solisManager: solisManager.saveState(),
    lifeDesigner: lifeDesigner.saveState(),
    milestonesManager: milestonesManager.saveState(),
    skills: skillManager.saveState(),
    spaceManager: spaceManager.saveState(),
    selectedBuildCounts: selectedBuildCounts,
    settings: gameSettings,
    colonySliderSettings: colonySliderSettings,
    ghgFactorySettings: ghgFactorySettings,
    playTimeSeconds: playTimeSeconds
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
        const key = spaceManager.getCurrentPlanetKey();
        if (planetParameters[key]) {
          defaultPlanet = key; // keep global consistent
          currentPlanetParameters = planetParameters[key];
        }
        // Reinitialize game state using the loaded planet parameters
        initializeGameState({preserveManagers: true});
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

    if(gameState.playTimeSeconds !== undefined){
      playTimeSeconds = gameState.playTimeSeconds;
    }

    tabManager.activateTab('buildings');

    globalGameIsLoadingFromSave = false;

      console.log('Game loaded successfully (DayNightCycle, resources, buildings, projects, colonies, and research).');
  } else {
      console.log('No saved game found.');
  }
}

function saveGameToSlot(slot) {
  const gameState = getGameState();

  // Store game state in localStorage
  localStorage.setItem(`gameState_${slot}`, JSON.stringify(gameState));
  console.log(`Game saved successfully to slot ${slot}.`);

  // Get the current date and time
  const saveDate = new Date();

  // Format the save date using the formatDate function
  const formattedSaveDate = formatDate(saveDate);

  // Update the save date for the slot
  document.getElementById(`${slot}-date`).textContent = formattedSaveDate;

  // Save the save slot dates as UNIX timestamps
  saveSaveSlotDates(slot, saveDate);
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
  localStorage.removeItem(`gameState_${slot}`);
  console.log(`Save file deleted successfully from slot ${slot}.`);

  // Clear the save date for the slot
  document.getElementById(`${slot}-date`).textContent = 'Empty';

  // Delete the save slot date
  deleteSaveSlotDate(slot);
}

// Save the save slot dates as UNIX timestamps
function saveSaveSlotDates(slot, date) {
  const saveSlotDates = JSON.parse(localStorage.getItem('saveSlotDates')) || {};
  saveSlotDates[slot] = new Date(date).getTime();
  localStorage.setItem('saveSlotDates', JSON.stringify(saveSlotDates));
}

// Load the save slot dates and display them in a user-friendly format
function loadSaveSlotDates() {
  const saveSlotDates = JSON.parse(localStorage.getItem('saveSlotDates')) || {};
  for (const slot in saveSlotDates) {
    const timestamp = saveSlotDates[slot];
    const date = new Date(timestamp);
    const formattedDate = formatDate(date);
    document.getElementById(`${slot}-date`).textContent = formattedDate;
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
  const saveSlotDates = JSON.parse(localStorage.getItem('saveSlotDates')) || {};
  delete saveSlotDates[slot];
  localStorage.setItem('saveSlotDates', JSON.stringify(saveSlotDates));
}

// Add event listeners to save, load, and delete buttons
function addSaveSlotListeners() {
  const saveSlots = ['autosave', 'slot1', 'slot2', 'slot3', 'slot4', 'slot5'];

  saveSlots.forEach(slot => {
    const saveButton = document.querySelector(`.save-button[data-slot="${slot}"]`);
    const loadButton = document.querySelector(`.load-button[data-slot="${slot}"]`);
    const deleteButton = document.querySelector(`.delete-button[data-slot="${slot}"]`);

    if (saveButton) {
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