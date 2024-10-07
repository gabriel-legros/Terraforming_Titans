// research.js

// Research Class
class Research {
    constructor(id, name, description, cost, prerequisites, effects) {
      this.id = id;
      this.name = name;
      this.description = description;
      this.cost = cost.research;
      this.prerequisites = prerequisites;
      this.effects = effects;
      this.isResearched = false; // Flag indicating if the research has been completed
    }
  }
  
  // Research Manager Class to manage all researches
  class ResearchManager {
    constructor(researchData) {
      this.researches = {};
  
      // Load research data and create Research instances
      for (const category in researchData) {
        this.researches[category] = researchData[category].map(
          (research) =>
            new Research(
              research.id,
              research.name,
              research.description,
              research.cost,
              research.prerequisites,
              research.effects
            )
        );
      }
    }

    saveState() {
      const researchState = {};
      for (const category in this.researches) {
        researchState[category] = this.researches[category].map((research) => ({
          id: research.id,
          isResearched: research.isResearched,
        }));
      }
      return researchState;
    }
  
    loadState(researchState) {
      for (const category in researchState) {
        const savedResearches = researchState[category];
        savedResearches.forEach((savedResearch) => {
          const research = this.getResearchById(savedResearch.id);
          if (research) {
            research.isResearched = savedResearch.isResearched;
            if (research.isResearched) {
              this.applyResearchEffects(research); // Reapply effects if research is completed
            }
          }
        });
      }
    }
  
    // Get a specific research by its ID
    getResearchById(id) {
      for (const category in this.researches) {
        const research = this.researches[category].find(
          (researchItem) => researchItem.id === id
        );
        if (research) return research;
      }
      return null;
    }
  
    // Get all researches within a category
    getResearchesByCategory(category) {
      return this.researches[category] || [];
    }
  
    // Check if a research is available (i.e., prerequisites are met)
    isResearchAvailable(id) {
      const research = this.getResearchById(id);
      if (!research) return false;
  
      // Check if all prerequisites are researched
      return research.prerequisites.every((prerequisiteId) => {
        const prerequisite = this.getResearchById(prerequisiteId);
        return prerequisite && prerequisite.isResearched;
      });
    }
  
    // Mark a research as completed
    completeResearch(id) {
      const research = this.getResearchById(id);
      if (research && this.isResearchAvailable(id) && canAffordResearch(research)) {
        research.isResearched = true;
        resources.colony.research.value -= research.cost; // Deduct the research cost
        console.log(`Research "${research.name}" has been completed.`);
        this.applyResearchEffects(research); // Apply the effects of the research
      } else {
        console.log(`Research "${id}" cannot be completed yet.`);
      }
    }

  // Apply research effects to the target
  applyResearchEffects(research) {
    research.effects.forEach((effect) => {
      if (effect.target === 'building') {
        const building = buildings[effect.targetId];
        if (building) {
          building.addEffect({ ...effect, sourceId: research.id });
        }
      } else if (effect.target === 'project') {
        const project = projectManager.projects[effect.targetId];
        if (project) {
          project.addEffect({ ...effect, sourceId: research.id });
        }
      }  else if (effect.target === 'colony') {
        const colony = colonies[effect.targetId];
        if (colony) {
          colony.addEffect({ ...effect, sourceId: research.id });
        }
      }
      else if (effect.target === 'projectManager') {
        // Apply effect to the project manager
        projectManager.addEffect({ ...effect, sourceId: research.id });
        console.log(`Applied effect to ProjectManager: ${effect.type} with value ${effect.value}`);
      }
    });
  }

  // Remove research effects from the target
  removeResearchEffects(research) {
    research.effects.forEach((effect) => {
      if (effect.target === 'building') {
        const building = buildings[effect.targetId];
        if (building) {
          building.removeEffect(research.id);
        }
      } else if (effect.target === 'projectManager') {
        // Remove effect from the project manager
        projectManager.removeEffect(research.id);
        console.log(`Removed effect from ProjectManager with source ID: ${research.id}`);
      }
      // Other target types (e.g., resources, colonies) can be handled here
    });
  }
}

  // Helper Functions
  function canAffordResearch(researchItem) {
    return resources.colony.research.value >= researchItem.cost;
  }
  
// Initializes the research system
function initializeResearch() {
    createResearchButtons(researchManager.researches); // Calls a function from research-ui.js to create buttons
    updateAllResearchButtons(researchManager.researches); // Updates the initial state of all buttons

    // Initializes the UI tabs for research
    initializeResearchTabs(); // Delegates the sub-tab event listeners and initial UI load to research-ui.js
}