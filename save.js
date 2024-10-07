// Save game state to localStorage (including research)
function saveGame() {
    const gameState = {
        dayNightCycle: dayNightCycle.saveState(), // Save the state from DayNightCycle
        resources: resources, // Use resources object as is
        buildings: buildings, // Use buildings object as is
        colonies: colonies, // Use colonies object as is
        projects: projectManager.saveState(), // Save the projects state using projectManager
        research: researchManager.saveState(), // Save the research state from researchManager
        oreScanning: oreScanner.saveState() // Save the ore scanning state from oreScanner
      };

  // Store game state in localStorage
  localStorage.setItem('gameState', JSON.stringify(gameState));
  console.log('Game saved successfully (DayNightCycle, resources, buildings, projects, colonies, and research).');
}

// Load game state from localStorage (including research)
function loadGame() {

  const savedState = localStorage.getItem('gameState');
  if (savedState) {
      const gameState = JSON.parse(savedState);

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
          }
        }
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
          }
        }
      }


      createBuildingButtons(buildings);

      // Restore projects
      if (gameState.projects) {
          projectManager.loadState(gameState.projects);
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

      console.log('Game loaded successfully (DayNightCycle, resources, buildings, projects, colonies, and research).');
  } else {
      console.log('No saved game found.');
  }
}
