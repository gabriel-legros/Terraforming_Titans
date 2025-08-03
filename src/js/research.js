// research.js

// Research Class
class Research {
    constructor(id, name, description, cost, prerequisites, effects, extra = {}) {
      this.id = id;
      this.name = name;
      this.description = description;
      this.cost = cost;
      this.prerequisites = prerequisites;
      this.effects = effects;
      Object.assign(this, extra);
      this.isResearched = false;
      this.alertedWhenUnlocked = extra.alertedWhenUnlocked || false;
    }
}

  // Research Manager Class to manage all researches
  class ResearchManager extends EffectableEntity {
    constructor(researchData) {
      super({ description: 'Manages all research' });
      this.researches = {};
      this.advancedResearchUnlocked = false;
      this.orderDirty = false;
  
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
              research.effects,
              { ...research, category }
            )
        );
      }

      this.sortAllResearches();
      this.orderDirty = false;
    }

    update(deltaTime) {
      if (!resources || !resources.colony || !resources.colony.advancedResearch) return;
      if (!resources.colony.advancedResearch.unlocked) return;
      if (typeof spaceManager === 'undefined') return;

      const statuses = spaceManager.planetStatuses || {};
      const count = Object.values(statuses).filter(s => s.terraformed).length;
      if (count <= 0) return;

      const rate = count; // 1 per second per terraformed planet
      resources.colony.advancedResearch.increase(rate * deltaTime / 1000);
      resources.colony.advancedResearch.modifyRate(rate, 'Research Manager', 'research');
    }

    saveState() {
      const researchState = {};
      for (const category in this.researches) {
        researchState[category] = this.researches[category].map((research) => ({
          id: research.id,
          isResearched: research.isResearched,
          alertedWhenUnlocked: research.alertedWhenUnlocked,
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
            research.alertedWhenUnlocked = savedResearch.alertedWhenUnlocked || false;
            if (research.isResearched) {
              this.applyResearchEffects(research); // Reapply effects if research is completed
            }
          }
        });
      }
      this.sortAllResearches();
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

    getResearchCategoryById(id) {
      const research = this.getResearchById(id);
      return research ? research.category : null;
    }

    // Helpers to determine whether a research should display based on
    // planet resources and unlocked flags.
    planetHasMethane() {
      if (typeof currentPlanetParameters === 'undefined') return true;
      const surf = currentPlanetParameters.resources.surface;
      const atm = currentPlanetParameters.resources.atmospheric;
      return (surf.liquidMethane?.initialValue || 0) > 0 ||
             (surf.hydrocarbonIce?.initialValue || 0) > 0 ||
             (atm.atmosphericMethane?.initialValue || 0) > 0;
    }

    isResearchDisplayable(research) {
      if (research.requiresMethane && !this.planetHasMethane()) {
        return false;
      }
      if (research.requiredFlags && !research.requiredFlags.every(f => this.isBooleanFlagSet(f))) {
        return false;
      }
      return true;
    }

    // Return the IDs of researches that should be visible for a category. All
    // completed researches stay visible along with the cheapest `limit`
    // incomplete ones that are displayable on the current planet.
    getVisibleResearchIdsByCategory(category, limit = 3) {
      const researches = this.getResearchesByCategory(category);
      const visible = new Set();
      const unresearched = researches.filter(r => !r.isResearched && this.isResearchDisplayable(r));
      unresearched.slice(0, limit).forEach(r => visible.add(r.id));
      researches.forEach(r => {
        if (r.isResearched && this.isResearchDisplayable(r)) visible.add(r.id);
      });
      return visible;
    }

    calculateResearchTotalCost(research) {
      return Object.values(research.cost || {}).reduce((sum, val) => sum + val, 0);
    }

    sortAllResearches() {
      for (const category in this.researches) {
        this.researches[category].sort((a, b) =>
          this.calculateResearchTotalCost(a) - this.calculateResearchTotalCost(b)
        );
      }
      this.orderDirty = true;
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

    checkResearchUnlocks() {
      for (const category in this.researches) {
        const subtabId = `${category}-research`;
        this.researches[category].forEach(r => {
          if (!r.isResearched && !r.alertedWhenUnlocked &&
              this.isResearchAvailable(r.id) && this.isResearchDisplayable(r)) {
            if (typeof registerResearchUnlockAlert === 'function') {
              registerResearchUnlockAlert(subtabId);
            }
          }
        });
      }
    }
  
    // Mark a research as completed
    completeResearch(id) {
        const research = this.getResearchById(id);
        if (research && this.isResearchAvailable(id) && canAffordResearch(research)) {
          research.isResearched = true;
          if (research.cost.research) {
            resources.colony.research.value -= research.cost.research;
          }
          if (research.cost.advancedResearch) {
            resources.colony.advancedResearch.value -= research.cost.advancedResearch;
          }
          console.log(`Research "${research.name}" has been completed.`);
          this.applyResearchEffects(research); // Apply the effects of the research
          if (research.category === 'advanced') {
            this.checkResearchUnlocks();
          }
        } else {
          console.log(`Research "${id}" cannot be completed yet.`);
        }
      }

    // Instantly mark a research as completed without cost or prerequisite checks
    completeResearchInstant(id) {
        const research = this.getResearchById(id);
        if (research && !research.isResearched) {
          research.isResearched = true;
          this.applyResearchEffects(research);
          if (research.category === 'advanced') {
            this.checkResearchUnlocks();
          }
        }
      }

    // Reapply effects for all completed research. Used when game state is
    // recreated but the research manager persists (e.g. travelling to a new
    // planet).
    reapplyEffects() {
      for (const category in this.researches) {
      this.researches[category].forEach((research) => {
        if (research.isResearched) {
          this.applyResearchEffects(research);
        }
      });
      }
    }

  // Apply research effects to the target
  applyResearchEffects(research) {
    research.effects.forEach((effect) => {
      addEffect({...effect, sourceId: research})
    });
  }

  addAndReplace(effect) {
    super.addAndReplace(effect);
    if (effect.type === 'booleanFlag' && effect.value) {
      this.checkResearchUnlocks();
    }
  }

  // Remove research effects from the target
  removeResearchEffects(research) {
    research.effects.forEach((effect) => {
      removeEffect({ ...effect, sourceId: research.id });
    });
  }

  // Reset all non-advanced researches back to incomplete
  resetRegularResearch() {
    for (const category in this.researches) {
      if (category === 'advanced') continue;
      this.researches[category].forEach((research) => {
        if (research.isResearched) {
          this.removeResearchEffects(research);
          research.isResearched = false;
        }
      });
    }
    this.sortAllResearches();
  }
}

  // Helper Functions
  function canAffordResearch(researchItem) {
    if (researchItem.cost.research && resources.colony.research.value < researchItem.cost.research) {
      return false;
    }
    if (researchItem.cost.advancedResearch && resources.colony.advancedResearch.value < researchItem.cost.advancedResearch) {
      return false;
    }
    return true;
  }
  
// Initializes the research system
function initializeResearchUI() {
    // Initializes the UI tabs for research
    initializeResearchTabs(); // Delegates the sub-tab event listeners and initial UI load to research-ui.js
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { ResearchManager, Research };
}
