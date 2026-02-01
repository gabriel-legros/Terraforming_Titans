// research.js

// Research Class
class Research {
    constructor(id, name, description, cost, prerequisites, effects, extra = {}) {
      this.id = id;
      this.name = name;
      this.description = description;
      const normalizedCost = cost || {};
      this.baseCost = { ...normalizedCost };
      this.cost = { ...normalizedCost };
      this.prerequisites = prerequisites;
      this.effects = (effects || []).map(effect => ({
        ...effect,
        baseValue: Number.isFinite(effect.baseValue) ? effect.baseValue : effect.value
      }));
      Object.assign(this, extra);
      this.baseDisabled = !!extra.disabled;
      this.disabled = this.baseDisabled;
      this.repeatable = !!extra.repeatable;
      this.repeatableCostMultiplier = Number.isFinite(extra.repeatableCostMultiplier)
        ? extra.repeatableCostMultiplier
        : 1;
      this.timesResearched = 0;
      this.isResearched = false;
      this.alertedWhenUnlocked = extra.alertedWhenUnlocked || false;
      this.alertedSpaceTab = extra.alertedSpaceTab || false;
    }
}

  // Research Manager Class to manage all researches
  class ResearchManager extends EffectableEntity {
    constructor(researchData) {
      super({ description: 'Manages all research' });
      this.researches = {};
      this.advancedResearchUnlocked = false;
      this.orderDirty = false;
      this.autoResearchPresets = [];
      this.currentAutoResearchPreset = 1;
      this.autoResearchEnabled = false;
      this.pendingConditionalEffects = new Map();

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
      this.createAutoResearchPreset();
    }

    getRepeatCount(research) {
      if (!research) {
        return 0;
      }
      if (research.repeatable) {
        return Math.max(0, research.timesResearched);
      }
      return research.isResearched ? 1 : 0;
    }

    calculateRepeatableEffectValue(research, effect) {
    if (!research.repeatable) {
      return effect.value;
    }
    const repeatLevel = research.timesResearched;
    if (repeatLevel <= 0) {
      return null;
    }

    const baseValue = Number.isFinite(effect.baseValue) ? effect.baseValue : effect.value;
    if (effect.type === 'globalWorkerReduction') {
      const increment = Number.isFinite(effect.repeatableAddend) ? effect.repeatableAddend : baseValue;
      const divisor = 1 + increment * repeatLevel;
      return 1 - 1 / divisor;
    }

    const increment = Number.isFinite(effect.repeatableAddend)
      ? effect.repeatableAddend
      : Number.isFinite(baseValue) ? baseValue - 1 : 0;
    if (!Number.isFinite(increment)) {
      return effect.value;
    }

    const base = Number.isFinite(effect.repeatableBase) ? effect.repeatableBase : 1;
    return base + increment * repeatLevel;
  }

    updateRepeatableResearchCost(research) {
      if (!research.repeatable) {
        research.cost = { ...research.baseCost };
        return;
      }

      const multiplier = (research.repeatableCostMultiplier || 1) ** Math.max(research.timesResearched, 0);
      research.cost = scaleResearchCost(research.baseCost, multiplier);
      this.orderDirty = true;
    }

    createAutoResearchPreset() {
      const preset = {};
      this.populateAutoResearchPreset(preset);
      this.autoResearchPresets.push(preset);
      return this.autoResearchPresets.length;
    }

    populateAutoResearchPreset(target) {
      for (const category in this.researches) {
        this.researches[category].forEach((research) => {
          target[research.id] = this.normalizeAutoResearchEntry(target[research.id]);
        });
      }
    }

    normalizeAutoResearchEntry(entry) {
      if (entry && typeof entry === 'object') {
        return {
          enabled: Boolean(entry.enabled),
          priority: this.normalizeAutoResearchPriority(entry.priority),
        };
      }

      return {
        enabled: Boolean(entry),
        priority: 4,
      };
    }

    normalizeAutoResearchPriority(priority) {
      const parsed = Number.parseInt(priority, 10);
      if (Number.isInteger(parsed) && parsed >= 1 && parsed <= 4) {
        return parsed;
      }
      return 4;
    }

    ensureAutoResearchPresetsAreComplete() {
      this.autoResearchPresets.forEach((preset) => {
        this.populateAutoResearchPreset(preset);
      });
    }

    getAutoResearchPreset(presetIndex) {
      if (!Number.isInteger(presetIndex)) {
        return null;
      }
      const index = presetIndex - 1;
      if (index < 0 || index >= this.autoResearchPresets.length) {
        return null;
      }
      return this.autoResearchPresets[index];
    }

    isAutoResearchEnabled(presetIndex, researchId) {
      const preset = this.getAutoResearchPreset(presetIndex);
      if (!preset || !Object.prototype.hasOwnProperty.call(preset, researchId)) {
        return false;
      }
      const entry = this.normalizeAutoResearchEntry(preset[researchId]);
      preset[researchId] = entry;
      return Boolean(entry.enabled);
    }

    setAutoResearchEnabled(presetIndex, researchId, enabled) {
      const preset = this.getAutoResearchPreset(presetIndex);
      if (!preset) {
        return false;
      }
      this.populateAutoResearchPreset(preset);
      if (!Object.prototype.hasOwnProperty.call(preset, researchId)) {
        return false;
      }
      preset[researchId] = this.normalizeAutoResearchEntry({
        ...preset[researchId],
        enabled,
      });
      return true;
    }

    setAutoResearchPriority(presetIndex, researchId, priority) {
      const preset = this.getAutoResearchPreset(presetIndex);
      if (!preset) {
        return false;
      }
      this.populateAutoResearchPreset(preset);
      if (!Object.prototype.hasOwnProperty.call(preset, researchId)) {
        return false;
      }
      preset[researchId] = this.normalizeAutoResearchEntry({
        ...preset[researchId],
        priority,
      });
      return true;
    }

    getAutoResearchPriority(presetIndex, researchId) {
      const preset = this.getAutoResearchPreset(presetIndex);
      if (!preset || !Object.prototype.hasOwnProperty.call(preset, researchId)) {
        return 4;
      }
      const entry = this.normalizeAutoResearchEntry(preset[researchId]);
      preset[researchId] = entry;
      return entry.priority;
    }

    processAutoResearchQueue() {
      const unlocked = this.autoResearchEnabled || this.isBooleanFlagSet('autoResearchEnabled');
      if (!unlocked) {
        return;
      }

      const preset = this.getAutoResearchPreset(this.currentAutoResearchPreset);
      if (!preset) {
        return;
      }

      const candidates = [];
      for (const category in this.researches) {
        if (category === 'advanced') {
          continue;
        }

        const list = this.researches[category];
        for (let i = 0; i < list.length; i += 1) {
          const research = list[i];
          if (research.isResearched && !research.repeatable) {
            continue;
          }
          const entry = this.normalizeAutoResearchEntry(preset[research.id]);
          preset[research.id] = entry;
          if (!entry.enabled) {
            continue;
          }
          if (!this.isResearchDisplayable(research)) {
            continue;
          }
          if (!this.isResearchAvailable(research.id)) {
            continue;
          }
          if (!canAffordResearch(research)) {
            continue;
          }
          candidates.push({
            research,
            priority: this.normalizeAutoResearchPriority(entry.priority),
            cost: this.calculateResearchTotalCost(research),
          });
        }
      }

      if (candidates.length === 0) {
        return;
      }

      candidates.sort((a, b) => {
        if (a.priority !== b.priority) {
          return a.priority - b.priority;
        }
        return a.cost - b.cost;
      });

      candidates.forEach((candidate) => {
        if (canAffordResearch(candidate.research)) {
          this.completeResearch(candidate.research.id);
        }
      });
    }

    update(deltaTime) {
      this.processAutoResearchQueue();

      if (!resources || !resources.colony || !resources.colony.advancedResearch) return;
      if (!resources.colony.advancedResearch.unlocked) return;
      if (typeof spaceManager === 'undefined') return;
      if (typeof spaceManager.getTerraformedPlanetCount !== 'function') return;

      const count = spaceManager.getTerraformedPlanetCount();
      if (count <= 0) return;

      const multiplier = this.calculateAdvancedResearchMultiplier();
      const rate = count * multiplier; // 1 per second per terraformed planet scaled by effects
      resources.colony.advancedResearch.increase((rate * deltaTime) / 1000);
      resources.colony.advancedResearch.modifyRate(rate, 'Research Manager', 'research');
    }

    calculateAdvancedResearchMultiplier() {
      return this.activeEffects.reduce((multiplier, effect) => {
        if (effect.type === 'advancedResearchBoost') {
          return multiplier * effect.value;
        }
        return multiplier;
      }, 1);
    }

    applyEffect(effect) {
      if (effect.type === 'advancedResearchBoost') {
        return;
      }
      if (effect.type === 'researchDisable') {
        this.applyResearchDisable(effect);
        return;
      }
      if (effect.type === 'enableResearch') {
        this.applyEnableResearch(effect);
        return;
      }
      super.applyEffect(effect);
    }

    applyResearchDisable(effect) {
      const research = this.getResearchById(effect.targetId);
      if (!research) {
        return;
      }
      if (research.disabled) {
        return;
      }
      // Mark the research as disabled so it won't show in the UI
      research.disabled = true;
      // Force a UI refresh
      if (typeof invalidateResearchUICache === 'function') {
        invalidateResearchUICache();
      }
    }

    applyEnableResearch(effect) {
      const research = this.getResearchById(effect.targetId);
      if (!research) {
        return;
      }
      const wasDisabled = research.disabled;
      research.disabled = false;
      if (!wasDisabled) {
        return;
      }
      this.sortAllResearches();
      if (typeof registerResearchUnlockAlert === 'function') {
        if (!research.isResearched &&
            !research.alertedWhenUnlocked &&
            this.isResearchDisplayable(research) &&
            this.isResearchAvailable(research.id)) {
          registerResearchUnlockAlert(`${research.category}-research`);
        }
        return;
      }
      if (typeof initializeResearchAlerts === 'function') {
        initializeResearchAlerts();
      }
    }

    saveState() {
      const researchState = {};
      for (const category in this.researches) {
        researchState[category] = this.researches[category].map((research) => ({
          id: research.id,
          isResearched: research.isResearched,
          timesResearched: research.timesResearched,
          alertedWhenUnlocked: research.alertedWhenUnlocked,
          alertedSpaceTab: research.alertedSpaceTab,
        }));
      }
      return {
        researches: researchState,
        autoResearchPresets: this.autoResearchPresets.map((preset) => {
          const presetCopy = {};
          for (const key in preset) {
            const entry = this.normalizeAutoResearchEntry(preset[key]);
            presetCopy[key] = { ...entry };
          }
          return presetCopy;
        }),
        currentAutoResearchPreset: this.currentAutoResearchPreset,
      };
    }

    loadState(researchState) {
      if (!researchState) {
        this.autoResearchPresets = [];
        this.createAutoResearchPreset();
        return;
      }

      const savedResearchState = researchState.researches || researchState;

      for (const category in savedResearchState) {
        const savedResearches = savedResearchState[category];
        savedResearches.forEach((savedResearch) => {
          const research = this.getResearchById(savedResearch.id);
          if (research) {
            const savedTimes = Number.isFinite(savedResearch.timesResearched)
              ? savedResearch.timesResearched
              : (savedResearch.isResearched ? 1 : 0);
            research.timesResearched = savedTimes;
            research.isResearched = savedResearch.isResearched || savedTimes > 0;
            research.alertedWhenUnlocked = savedResearch.alertedWhenUnlocked || false;
            research.alertedSpaceTab = savedResearch.alertedSpaceTab || savedResearch.isResearched || false;
            this.updateRepeatableResearchCost(research);
            if (research.isResearched && this.getRepeatCount(research) > 0) {
              this.applyResearchEffects(research); // Reapply effects if research is completed
            }
          }
        });
      }
      this.sortAllResearches();

      const savedPresets = researchState.autoResearchPresets;
      this.autoResearchPresets = [];
      if (Array.isArray(savedPresets) && savedPresets.length > 0) {
        savedPresets.forEach((preset) => {
          const copy = {};
          for (const key in preset) {
            copy[key] = this.normalizeAutoResearchEntry(preset[key]);
          }
          this.populateAutoResearchPreset(copy);
          this.autoResearchPresets.push(copy);
        });
      } else {
        this.createAutoResearchPreset();
      }
      this.ensureAutoResearchPresetsAreComplete();

      const selectedPreset = researchState.currentAutoResearchPreset;
      if (Number.isInteger(selectedPreset) && selectedPreset >= 1 && selectedPreset <= this.autoResearchPresets.length) {
        this.currentAutoResearchPreset = selectedPreset;
      } else {
        this.currentAutoResearchPreset = 1;
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

    planetHasGeothermalDeposits() {
      if (typeof currentPlanetParameters === 'undefined') return true;
      const geo = currentPlanetParameters.resources.underground?.geothermal;
      return (geo?.maxDeposits || 0) > 0;
    }

    planetHasNaturalMagnetosphere() {
      return currentPlanetParameters.celestialParameters.hasNaturalMagnetosphere;
    }

    hasKesslerHazard() {
      try {
        return hazardManager.parameters.kessler && !hazardManager.kesslerHazard.isCleared();
      } catch (error) {
        return false;
      }
    }

    isArtificialWorld() {
      if (spaceManager && spaceManager.currentArtificialKey !== null) {
        return true;
      }
      return currentPlanetParameters?.classification?.archetype === 'artificial';
    }

    isRingWorld() {
      return currentPlanetParameters?.classification?.type === 'ring';
    }

    isResearchDisplayable(research) {
      if (research.disabled) {
        return false;
      }
      if (research.category === 'advanced' && !this.isBooleanFlagSet('advancedResearchUnlocked')) {
        return false;
      }
      if (research.disableFlag) {
        const flags = Array.isArray(research.disableFlag)
          ? research.disableFlag
          : [research.disableFlag];
        if (flags.some(flag => this.isBooleanFlagSet(flag))) {
          return false;
        }
      }
      if (research.requiresMethane && !this.planetHasMethane()) {
        return false;
      }
      if (research.requiresGeothermal && !this.planetHasGeothermalDeposits()) {
        return false;
      }
      if (research.requiresNoNaturalMagnetosphere && this.planetHasNaturalMagnetosphere()) {
        return false;
      }
      if (research.requiresKesslerHazard && !this.hasKesslerHazard()) {
        return false;
      }
      if (research.artificialAllowed === false && this.isArtificialWorld()) {
        return false;
      }
      if (research.ringworldAllowed === false && this.isRingWorld()) {
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
      if (this.isBooleanFlagSet('stopHidingRegular') && category !== 'advanced') {
        limit = Infinity;
      }
      const researches = this.getResearchesByCategory(category);
      const visible = new Set();
      const unresearched = researches.filter(r => (!r.isResearched || (r.repeatable && r.timesResearched === 0)) && this.isResearchDisplayable(r));
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
      if (typeof invalidateResearchUICache === 'function') {
        invalidateResearchUICache();
      }
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
          if (research.cost.research) {
            resources.colony.research.value -= research.cost.research;
          }
          if (research.cost.advancedResearch) {
            resources.colony.advancedResearch.value -= research.cost.advancedResearch;
          }

          research.isResearched = true;
          research.timesResearched = (research.timesResearched || 0) + 1;
          console.log(`Research "${research.name}" has been completed.`);
          this.applyResearchEffects(research); // Apply the effects of the research
          this.updateRepeatableResearchCost(research);
          if (research.category === 'advanced') {
            this.checkResearchUnlocks();
          }
        } else {
          console.log(`Research "${id}" cannot be completed yet.`);
        }
      }

    // Instantly mark a research as completed without cost or prerequisite checks,
    // but still respect planet and flag requirements.
    completeResearchInstant(id) {
        const research = this.getResearchById(id);
        if (!research || (research.isResearched && !research.repeatable) || !this.isResearchDisplayable(research)) {
          return;
        }

        research.isResearched = true;
        research.timesResearched = Math.max(research.timesResearched || 0, 1);
        this.updateRepeatableResearchCost(research);
        this.applyResearchEffects(research);
        if (research.category === 'advanced') {
          this.checkResearchUnlocks();
        }
      }

    // Reapply effects for all completed research. Used when game state is
    // recreated but the research manager persists (e.g. travelling to a new
    // planet).
    reapplyEffects() {
      for (const category in this.researches) {
      this.researches[category].forEach((research) => {
        if (research.isResearched && (!research.repeatable || research.timesResearched > 0)) {
          this.applyResearchEffects(research);
        }
      });
      }
    }

  // Apply research effects to the target
  applyResearchEffects(research) {
    research.effects.forEach((effect, index) => {
      this.applyResearchEffect(research, effect, index);
    });
  }

  applyResearchEffect(research, effect, index) {
    const requiredFlags = this.normalizeRequiredResearchFlags(effect);
    const effectId = effect.effectId || `${research.id}_${index}`;
    const sourceId = research.id;
    const effectiveEffect = { ...effect, sourceId, effectId };
    const repeatableValue = this.calculateRepeatableEffectValue(research, effect);

    if (repeatableValue === null) {
      return;
    }
    if (typeof repeatableValue !== 'undefined') {
      effectiveEffect.value = repeatableValue;
    }

    if (requiredFlags.length > 0 && !requiredFlags.every(flagId => this.isBooleanFlagSet(flagId))) {
      this.queueConditionalResearchEffect(effectId, sourceId, effectiveEffect, requiredFlags);
      return;
    }

    this.pendingConditionalEffects.delete(effectId);
    addEffect(effectiveEffect);
  }

  queueConditionalResearchEffect(effectId, sourceId, effect, requiredFlags) {
    this.pendingConditionalEffects.set(effectId, {
      sourceId,
      effect: { ...effect, effectId },
      requiredFlags,
    });
  }

  applyPendingConditionalEffects() {
    this.pendingConditionalEffects.forEach((entry, effectId) => {
      if (entry.requiredFlags.every(flagId => this.isBooleanFlagSet(flagId))) {
        addEffect({ ...entry.effect, sourceId: entry.sourceId });
        this.pendingConditionalEffects.delete(effectId);
      }
    });
  }

  normalizeRequiredResearchFlags(effect) {
    if (!effect.requiredResearchFlags) {
      return [];
    }

    return Array.isArray(effect.requiredResearchFlags)
      ? effect.requiredResearchFlags
      : [effect.requiredResearchFlags];
  }

  addAndReplace(effect) {
    super.addAndReplace(effect);
    if (effect.type === 'booleanFlag' && effect.value) {
      this.checkResearchUnlocks();
      this.applyPendingConditionalEffects();
    }
  }

  // Remove research effects from the target
  removeResearchEffects(research) {
    research.effects.forEach((effect) => {
      removeEffect({ ...effect, sourceId: research.id });
    });

    this.pendingConditionalEffects.forEach((entry, effectId) => {
      if (entry.sourceId === research.id) {
        this.pendingConditionalEffects.delete(effectId);
      }
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
        research.timesResearched = 0;
        research.disabled = research.baseDisabled;
        this.updateRepeatableResearchCost(research);
      });
    }
    this.sortAllResearches();
  }
}

  // Helper Functions
  function scaleResearchCost(baseCost, multiplier) {
    const scaled = {};
    if (!baseCost) {
      return scaled;
    }
    for (const key in baseCost) {
      scaled[key] = (baseCost[key] || 0) * multiplier;
    }
    return scaled;
  }

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
