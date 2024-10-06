// Save game state to localStorage (including research)
function saveGame() {
  const gameState = {
      dayNightCycle: dayNightCycle.saveState(), // Save the state from DayNightCycle
      resources: JSON.stringify(resources), // Convert the entire resources object to JSON
      buildings: JSON.stringify(buildings), // Convert the entire buildings object to JSON
      colonies: JSON.stringify(colonies), // Convert the entire colonies object to JSON
      projects: projectManager.saveState(), // Save the projects state using projectManager
      research: researchManager.saveState(), // Save the research state from researchManager
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
          const restoredResources = JSON.parse(gameState.resources);
          for (const category in restoredResources) {
              if (resources[category]) {
                  for (const resourceName in restoredResources[category]) {
                      if (resources[category][resourceName]) {
                          Object.assign(resources[category][resourceName], restoredResources[category][resourceName]);

                          // Ensure infinite cap resources are restored correctly
                          if (!resources[category][resourceName].hasCap) {
                              resources[category][resourceName].cap = Infinity;
                          }
                      }
                  }
              }
          }
          updateResourceDisplay(resources);
      }

      // Restore buildings
      if (gameState.buildings) {
        const restoredBuildings = JSON.parse(gameState.buildings);
        for (const buildingName in restoredBuildings) {
            const buildingState = restoredBuildings[buildingName];
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
          const restoredColonies = JSON.parse(gameState.colonies);
          for (const colonyName in restoredColonies) {
              const colonyState = restoredColonies[colonyName];
              const colony = colonies[colonyName];
              if (colony) {
                  Object.assign(colony, colonyState);
                  const newConfig = colonyParameters[colonyName];
                  colony.initializeFromConfig(newConfig, colonyName);
                  // Reset effects applied from research
                  colony.activeEffects = [];
              }
          }
          updateColonyDisplay(colonies);
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

      console.log('Game loaded successfully (DayNightCycle, resources, buildings, projects, colonies, and research).');
  } else {
      console.log('No saved game found.');
  }
}
