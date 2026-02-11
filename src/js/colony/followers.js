class FollowersManager extends EffectableEntity {
  constructor() {
    super({ description: 'Manages followers systems' });
    this.enabled = false;
    this.assignmentMode = 'manual';
    this.assignmentStep = 1;
    this.autoAssignId = null;
    this.manualAssignments = {};
    this.weights = {};
    this.lastProductionRates = {};
    this.lastAppliedAssignments = {};
    this.faithInitialized = false;
    this.worldBelieverRatio = 0.1;
    this.galacticPopulation = 0;
    this.galacticBelievers = 0;
    this.galacticBelieverPercentFallback = 0.1;
    this.lastFaithWorldConversionRate = 0;
    this.lastFaithGalacticConversionRate = 0;
    this.lastFaithWorldCap = 0.15;
    this.ensureTrackedOrbitals();
  }

  getOrbitalConfigs() {
    return followersOrbitalParameters.orbitals;
  }

  ensureTrackedOrbitals() {
    const configs = this.getOrbitalConfigs();
    let autoAssignStillValid = false;
    for (let i = 0; i < configs.length; i += 1) {
      const id = configs[i].id;
      if (id === this.autoAssignId) {
        autoAssignStillValid = true;
      }
      if (!Number.isFinite(this.manualAssignments[id])) {
        this.manualAssignments[id] = 0;
      }
      if (!Number.isFinite(this.weights[id])) {
        this.weights[id] = 0;
      }
      if (!Number.isFinite(this.lastProductionRates[id])) {
        this.lastProductionRates[id] = 0;
      }
      if (!Number.isFinite(this.lastAppliedAssignments[id])) {
        this.lastAppliedAssignments[id] = 0;
      }
    }
    if (!autoAssignStillValid) {
      this.autoAssignId = null;
    }
  }

  clampPercent(value) {
    if (value <= 0) {
      return 0;
    }
    if (value >= 1) {
      return 1;
    }
    return value;
  }

  getCurrentWorldPopulation() {
    return Math.max(0, resources.colony.colonists.value);
  }

  getGalacticBelieverPercent() {
    if (this.galacticPopulation > 0) {
      return this.clampPercent(this.galacticBelievers / this.galacticPopulation);
    }
    return this.clampPercent(this.galacticBelieverPercentFallback);
  }

  getWorldBelieverPercent() {
    return this.clampPercent(this.worldBelieverRatio);
  }

  setWorldBelieverPercent(percent) {
    this.worldBelieverRatio = this.clampPercent(percent);
  }

  getWorldBelievers() {
    return this.getWorldBelieverPercent() * this.getCurrentWorldPopulation();
  }

  getPilgrimGrowthBonus() {
    return this.getWorldBelieverPercent();
  }

  getZealWorkerEfficiencyBonus() {
    return this.getWorldBelieverPercent() * 5;
  }

  getApostlesOrbitalsMultiplier() {
    const worldPercent = this.getWorldBelieverPercent();
    const bonus = Math.max(0, Math.min(9, (worldPercent - 0.1) * 10));
    return 1 + bonus;
  }

  getMissionaryGalacticConversionMultiplier() {
    return 1 + this.getWorldBelieverPercent();
  }

  getFaithConversionRatePerSecond() {
    return (0.05 / (5 * 3600)) / 0.1;
  }

  getCurrentWorldBelieverCap() {
    return Math.min(1, this.getGalacticBelieverPercent() + 0.05);
  }

  getFaithSnapshot() {
    const worldPopulation = this.getCurrentWorldPopulation();
    const worldPercent = this.getWorldBelieverPercent();
    const galacticPercent = this.getGalacticBelieverPercent();
    const apostlesMultiplier = this.getApostlesOrbitalsMultiplier();
    return {
      worldPopulation,
      worldBelievers: worldPopulation * worldPercent,
      worldPercent,
      worldCapPercent: this.getCurrentWorldBelieverCap(),
      galacticPopulation: this.galacticPopulation,
      galacticBelievers: this.galacticBelievers,
      galacticPercent,
      rates: {
        worldPerSecond: this.lastFaithWorldConversionRate,
        galacticPerSecond: this.lastFaithGalacticConversionRate
      },
      bonuses: {
        pilgrim: this.getPilgrimGrowthBonus(),
        zeal: this.getZealWorkerEfficiencyBonus(),
        apostles: apostlesMultiplier - 1,
        missionaries: this.getWorldBelieverPercent()
      },
      atWorldCap: worldPercent >= this.getCurrentWorldBelieverCap() - 1e-12
    };
  }

  recalculateGalacticPopulation() {
    let total = 0;
    const currentStoryKey = spaceManager.currentPlanetKey;
    const currentSeed = spaceManager.currentRandomSeed === null ? null : String(spaceManager.currentRandomSeed);
    const currentArtificialKey = spaceManager.currentArtificialKey === null ? null : String(spaceManager.currentArtificialKey);

    Object.keys(spaceManager.planetStatuses).forEach((key) => {
      if (currentSeed === null && currentArtificialKey === null && key === currentStoryKey) {
        return;
      }
      total += Math.max(0, spaceManager.planetStatuses[key].colonists || 0);
    });

    Object.keys(spaceManager.randomWorldStatuses).forEach((key) => {
      if (currentSeed !== null && key === currentSeed) {
        return;
      }
      total += Math.max(0, spaceManager.randomWorldStatuses[key].colonists || 0);
    });

    Object.keys(spaceManager.artificialWorldStatuses).forEach((key) => {
      if (currentArtificialKey !== null && key === currentArtificialKey) {
        return;
      }
      total += Math.max(0, spaceManager.artificialWorldStatuses[key].colonists || 0);
    });

    this.galacticPopulation = total;
  }

  initializeFaithIfNeeded() {
    if (this.faithInitialized) {
      return;
    }
    this.recalculateGalacticPopulation();
    this.galacticBelievers = this.galacticPopulation * 0.1;
    this.galacticBelieverPercentFallback = 0.1;
    this.setWorldBelieverPercent(this.getGalacticBelieverPercent());
    this.lastFaithWorldCap = this.getCurrentWorldBelieverCap();
    this.faithInitialized = true;
  }

  onColonistsImported(amount) {
    if (!this.enabled || amount <= 0) {
      return;
    }
    this.initializeFaithIfNeeded();
    const currentPopulation = this.getCurrentWorldPopulation();
    if (currentPopulation <= 0) {
      return;
    }
    const previousPopulation = Math.max(0, currentPopulation - amount);
    const previousBelievers = this.getWorldBelieverPercent() * previousPopulation;
    const importedBelievers = amount * this.getGalacticBelieverPercent();
    const nextRatio = (previousBelievers + importedBelievers) / currentPopulation;
    this.setWorldBelieverPercent(nextRatio);
  }

  onTravelDeparture(population = this.getCurrentWorldPopulation()) {
    if (!this.enabled) {
      return;
    }
    this.initializeFaithIfNeeded();
    const worldPopulation = Math.max(0, population);
    if (worldPopulation <= 0) {
      return;
    }
    const worldBelievers = worldPopulation * this.getWorldBelieverPercent();
    this.galacticPopulation += worldPopulation;
    this.galacticBelievers += worldBelievers;
    this.galacticBelievers = Math.min(this.galacticBelievers, this.galacticPopulation);
    this.galacticBelieverPercentFallback = this.getGalacticBelieverPercent();
  }

  updateFaith(deltaTime) {
    if (!this.enabled) {
      this.lastFaithWorldConversionRate = 0;
      this.lastFaithGalacticConversionRate = 0;
      return;
    }
    this.initializeFaithIfNeeded();
    const worldPopulation = this.getCurrentWorldPopulation();
    if (worldPopulation <= 0 || deltaTime <= 0) {
      this.lastFaithWorldConversionRate = 0;
      this.lastFaithGalacticConversionRate = 0;
      return;
    }

    const seconds = deltaTime / 1000;
    const conversionFactor = this.getFaithConversionRatePerSecond();
    let worldPercent = this.getWorldBelieverPercent();
    let galacticPercent = this.getGalacticBelieverPercent();
    const worldCap = Math.min(1, galacticPercent + 0.05);
    this.lastFaithWorldCap = worldCap;

    this.lastFaithWorldConversionRate = conversionFactor * worldPercent;
    if (worldPercent < worldCap) {
      const deltaPercent = this.lastFaithWorldConversionRate * seconds;
      worldPercent = Math.min(worldCap, worldPercent + deltaPercent);
      this.setWorldBelieverPercent(worldPercent);
      this.lastFaithGalacticConversionRate = 0;
      return;
    }

    this.lastFaithGalacticConversionRate = 0;
    if (this.galacticPopulation <= 0 || galacticPercent >= 1) {
      return;
    }

    const galacticRate = (this.lastFaithWorldConversionRate / 1000) * this.getMissionaryGalacticConversionMultiplier();
    this.lastFaithGalacticConversionRate = galacticRate;
    const galacticDelta = Math.min(1 - galacticPercent, galacticRate * seconds);
    if (galacticDelta <= 0) {
      return;
    }

    galacticPercent += galacticDelta;
    this.galacticBelievers = galacticPercent * this.galacticPopulation;
    this.galacticBelieverPercentFallback = galacticPercent;

    const syncedWorldPercent = Math.min(1, this.getWorldBelieverPercent() + galacticDelta);
    this.setWorldBelieverPercent(syncedWorldPercent);
  }

  getAvailableOrbitals() {
    const worlds = Math.floor(spaceManager.getTerraformedPlanetCount());
    const boosted = Math.floor(worlds * this.getApostlesOrbitalsMultiplier());
    return boosted > 0 ? boosted : 0;
  }

  getAssignmentMode() {
    return this.assignmentMode;
  }

  setAssignmentMode(mode) {
    this.assignmentMode = mode === 'weight' ? 'weight' : 'manual';
    this.updateUI();
  }

  getAutoAssignId() {
    return this.autoAssignId;
  }

  setAutoAssign(id, enabled) {
    this.ensureTrackedOrbitals();
    if (!enabled) {
      if (this.autoAssignId === id) {
        this.autoAssignId = null;
      }
      this.updateUI();
      return;
    }
    this.autoAssignId = id;
    this.updateUI();
  }

  getAssignmentStep() {
    return this.assignmentStep;
  }

  setAssignmentStep(step) {
    const next = Math.max(1, Math.floor(step));
    this.assignmentStep = next;
    this.updateUI();
  }

  multiplyAssignmentStep() {
    this.setAssignmentStep(this.assignmentStep * 10);
  }

  divideAssignmentStep() {
    this.setAssignmentStep(this.assignmentStep / 10);
  }

  getWeight(id) {
    const value = this.weights[id];
    return Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;
  }

  setWeight(id, value) {
    this.ensureTrackedOrbitals();
    const next = Math.max(0, Math.floor(value));
    this.weights[id] = next;
    this.updateUI();
  }

  adjustWeight(id, delta) {
    const current = this.getWeight(id);
    this.setWeight(id, current + delta);
  }

  getManualAssignment(id) {
    const value = this.manualAssignments[id];
    return Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;
  }

  getTotalManualAssigned() {
    this.ensureTrackedOrbitals();
    const configs = this.getOrbitalConfigs();
    let total = 0;
    for (let i = 0; i < configs.length; i += 1) {
      total += this.getManualAssignment(configs[i].id);
    }
    return total;
  }

  getManualMaxFor(id) {
    const cap = this.getAvailableOrbitals();
    const current = this.getManualAssignment(id);
    const others = this.getTotalManualAssigned() - current;
    const maxForThis = cap - others;
    return maxForThis > 0 ? maxForThis : 0;
  }

  setManualAssignment(id, value) {
    this.ensureTrackedOrbitals();
    let next = Math.max(0, Math.floor(value));
    const maxForThis = this.getManualMaxFor(id);
    if (next > maxForThis) {
      next = maxForThis;
    }
    this.manualAssignments[id] = next;
    this.updateUI();
  }

  adjustManualAssignment(id, delta) {
    const current = this.getManualAssignment(id);
    this.setManualAssignment(id, current + delta);
  }

  setManualAssignmentToMax(id) {
    this.setManualAssignment(id, this.getManualMaxFor(id));
  }

  isTargetResourceUnlocked(config) {
    const resource = resources[config.targetCategory][config.targetResource];
    return !!resource && resource.unlocked;
  }

  getWeightAssignments(capacity) {
    const configs = this.getOrbitalConfigs();
    const assignments = {};
    for (let i = 0; i < configs.length; i += 1) {
      assignments[configs[i].id] = 0;
    }
    if (capacity <= 0) {
      return assignments;
    }

    const weighted = [];
    let totalWeight = 0;
    for (let i = 0; i < configs.length; i += 1) {
      const config = configs[i];
      const weight = this.getWeight(config.id);
      if (weight <= 0) {
        continue;
      }
      if (!this.isTargetResourceUnlocked(config)) {
        continue;
      }
      weighted.push({ config, weight, index: i });
      totalWeight += weight;
    }

    if (totalWeight <= 0) {
      return assignments;
    }

    let assigned = 0;
    const remainders = [];
    for (let i = 0; i < weighted.length; i += 1) {
      const item = weighted[i];
      const raw = (capacity * item.weight) / totalWeight;
      const base = Math.floor(raw);
      assignments[item.config.id] = base;
      assigned += base;
      remainders.push({ id: item.config.id, frac: raw - base, weight: item.weight, index: item.index });
    }

    let remaining = capacity - assigned;
    remainders.sort((a, b) => {
      if (b.frac !== a.frac) return b.frac - a.frac;
      if (b.weight !== a.weight) return b.weight - a.weight;
      return a.index - b.index;
    });

    let cursor = 0;
    while (remaining > 0 && remainders.length > 0) {
      const target = remainders[cursor % remainders.length];
      assignments[target.id] += 1;
      remaining -= 1;
      cursor += 1;
    }

    return assignments;
  }

  normalizeManualAssignmentsToCapacity(capacity) {
    this.ensureTrackedOrbitals();
    const configs = this.getOrbitalConfigs();
    const autoAssignId = this.autoAssignId;
    const hasAutoAssign = !!autoAssignId;
    for (let i = 0; i < configs.length; i += 1) {
      const id = configs[i].id;
      if (hasAutoAssign && id === autoAssignId) {
        this.manualAssignments[id] = 0;
      } else {
        this.manualAssignments[id] = this.getManualAssignment(id);
      }
    }

    let total = this.getTotalManualAssigned();
    if (total <= capacity) {
      if (hasAutoAssign) {
        this.manualAssignments[autoAssignId] = Math.max(0, capacity - total);
      }
      return { ...this.manualAssignments };
    }

    let overflow = total - capacity;
    const ordered = configs
      .filter((cfg) => !(hasAutoAssign && cfg.id === autoAssignId))
      .slice()
      .sort((a, b) => this.getManualAssignment(b.id) - this.getManualAssignment(a.id));
    for (let i = 0; i < ordered.length && overflow > 0; i += 1) {
      const id = ordered[i].id;
      const current = this.getManualAssignment(id);
      if (current <= 0) {
        continue;
      }
      const reduction = Math.min(current, overflow);
      this.manualAssignments[id] = current - reduction;
      overflow -= reduction;
    }

    if (hasAutoAssign) {
      let assignedWithoutAuto = 0;
      for (let i = 0; i < configs.length; i += 1) {
        const id = configs[i].id;
        if (id === autoAssignId) {
          continue;
        }
        assignedWithoutAuto += this.manualAssignments[id] || 0;
      }
      this.manualAssignments[autoAssignId] = Math.max(0, capacity - assignedWithoutAuto);
    }

    return { ...this.manualAssignments };
  }

  getAssignmentsSnapshot() {
    this.ensureTrackedOrbitals();
    const capacity = this.getAvailableOrbitals();
    const assignments = this.assignmentMode === 'weight'
      ? this.getWeightAssignments(capacity)
      : this.normalizeManualAssignmentsToCapacity(capacity);

    let assigned = 0;
    const configs = this.getOrbitalConfigs();
    for (let i = 0; i < configs.length; i += 1) {
      assigned += assignments[configs[i].id] || 0;
    }

    return {
      mode: this.assignmentMode,
      availableOrbitals: capacity,
      assigned,
      unassigned: Math.max(0, capacity - assigned),
      assignments,
    };
  }

  getSourceStructure(config) {
    if (config.sourceType === 'colony') {
      return colonies[config.sourceId];
    }
    return buildings[config.sourceId];
  }

  getPerOrbitalRate(config) {
    const targetResource = resources[config.targetCategory][config.targetResource];
    if (!targetResource || !targetResource.unlocked) {
      return 0;
    }

    if (config.sourceType === 'fixed') {
      const baseRate = Number.isFinite(config.fixedRate) ? config.fixedRate : 0;
      const multiplier = Number.isFinite(config.multiplier) ? config.multiplier : 1;
      return baseRate * multiplier;
    }

    const sourceStructure = this.getSourceStructure(config);
    if (!sourceStructure) {
      return 0;
    }

    const sourceCategory = config.sourceCategory || config.targetCategory;
    const sourceResource = config.sourceResource || config.targetResource;
    const modifiedProduction = sourceStructure.getModifiedProduction ? sourceStructure.getModifiedProduction() : null;
    const perStructure = modifiedProduction && modifiedProduction[sourceCategory]
      ? (modifiedProduction[sourceCategory][sourceResource] || 0)
      : 0;

    if (perStructure <= 0) {
      return 0;
    }

    const multiplier = Number.isFinite(config.multiplier) ? config.multiplier : 1;
    return perStructure * multiplier;
  }

  getPerOrbitalRateById(id) {
    const configs = this.getOrbitalConfigs();
    for (let i = 0; i < configs.length; i += 1) {
      if (configs[i].id === id) {
        return this.getPerOrbitalRate(configs[i]);
      }
    }
    return 0;
  }

  getPerOrbitalCapBonus(config) {
    const perOrbitalRate = this.getPerOrbitalRate(config);
    return Math.max(100, perOrbitalRate * 10);
  }

  getOrbitalStorageCapBonusForResource(category, resourceName) {
    if (!this.enabled) {
      return 0;
    }

    const snapshot = this.getAssignmentsSnapshot();
    const configs = this.getOrbitalConfigs();
    let bonus = 0;
    for (let i = 0; i < configs.length; i += 1) {
      const config = configs[i];
      if (config.targetCategory !== category || config.targetResource !== resourceName) {
        continue;
      }

      const assigned = snapshot.assignments[config.id] || 0;
      if (assigned <= 0) {
        continue;
      }

      const targetResource = resources[category][resourceName];
      if (!targetResource || !targetResource.hasCap || !targetResource.unlocked) {
        continue;
      }

      bonus += this.getPerOrbitalCapBonus(config) * assigned;
    }
    return bonus;
  }

  getLastProductionRate(id) {
    return this.lastProductionRates[id] || 0;
  }

  produceOrbitals(deltaTime) {
    this.ensureTrackedOrbitals();
    if (!this.enabled || deltaTime <= 0) {
      this.lastProductionRates = {};
      this.lastAppliedAssignments = {};
      return;
    }

    const snapshot = this.getAssignmentsSnapshot();
    const seconds = deltaTime / 1000;
    const rates = {};
    const appliedAssignments = {};
    const configs = this.getOrbitalConfigs();

    for (let i = 0; i < configs.length; i += 1) {
      const config = configs[i];
      const id = config.id;
      const assigned = snapshot.assignments[id] || 0;
      appliedAssignments[id] = assigned;

      let rate = 0;
      const targetResource = resources[config.targetCategory][config.targetResource];
      if (assigned > 0 && targetResource && targetResource.unlocked) {
        const perOrbital = this.getPerOrbitalRate(config);
        rate = perOrbital * assigned;
      }

      rates[id] = rate;
      if (rate <= 0) {
        continue;
      }

      const amount = rate * seconds;
      if (targetResource.hasCap) {
        const upperBound = Math.max(targetResource.cap, targetResource.value);
        targetResource.value = Math.min(targetResource.value + amount, upperBound);
      } else {
        targetResource.value += amount;
      }
    }

    this.lastProductionRates = rates;
    this.lastAppliedAssignments = appliedAssignments;
  }

  applyOrbitalProductionRates() {
    if (!this.enabled) {
      return;
    }

    const configs = this.getOrbitalConfigs();
    for (let i = 0; i < configs.length; i += 1) {
      const config = configs[i];
      const rate = this.lastProductionRates[config.id] || 0;
      if (rate <= 0) {
        continue;
      }

      const targetResource = resources[config.targetCategory][config.targetResource];
      if (!targetResource) {
        continue;
      }
      targetResource.modifyRate(rate, 'Orbital', 'followers');
    }
  }

  resetTransientState() {
    this.lastProductionRates = {};
    this.lastAppliedAssignments = {};
  }

  enable() {
    const wasEnabled = this.enabled;
    this.enabled = true;
    if (!wasEnabled) {
      this.initializeFaithIfNeeded();
    }
    this.updateUI();
  }

  prepareTravelState() {
    const travelState = {
      lastProductionRates: { ...this.lastProductionRates },
      lastAppliedAssignments: { ...this.lastAppliedAssignments }
    };
    this.resetTransientState();
    return travelState;
  }

  restoreTravelState() {
    this.resetTransientState();
    if (this.enabled) {
      this.initializeFaithIfNeeded();
      this.setWorldBelieverPercent(this.getGalacticBelieverPercent());
    }
    this.updateUI();
  }

  updateUI() {
    updateColonySubtabsVisibility();
    updateFollowersUI();
  }

  reapplyEffects() {
    this.updateUI();
  }

  saveState() {
    this.ensureTrackedOrbitals();
    return {
      enabled: this.enabled,
      assignmentMode: this.assignmentMode,
      assignmentStep: this.assignmentStep,
      autoAssignId: this.autoAssignId,
      manualAssignments: { ...this.manualAssignments },
      weights: { ...this.weights },
      faith: {
        faithInitialized: this.faithInitialized,
        worldBelieverRatio: this.worldBelieverRatio,
        galacticPopulation: this.galacticPopulation,
        galacticBelievers: this.galacticBelievers,
        galacticBelieverPercentFallback: this.galacticBelieverPercentFallback
      },
      booleanFlags: Array.from(this.booleanFlags)
    };
  }

  loadState(data = {}) {
    this.enabled = !!data.enabled;
    this.assignmentMode = data.assignmentMode === 'weight' ? 'weight' : 'manual';
    this.assignmentStep = Number.isFinite(data.assignmentStep)
      ? Math.max(1, Math.floor(data.assignmentStep))
      : 1;
    this.autoAssignId = data.autoAssignId || null;

    const savedAssignments = data.manualAssignments || data.assignments || {};
    const savedWeights = data.weights || {};
    const faith = data.faith || {};

    this.manualAssignments = {};
    this.weights = {};
    this.lastProductionRates = {};
    this.lastAppliedAssignments = {};

    const configs = this.getOrbitalConfigs();
    for (let i = 0; i < configs.length; i += 1) {
      const id = configs[i].id;
      this.manualAssignments[id] = Number.isFinite(savedAssignments[id])
        ? Math.max(0, Math.floor(savedAssignments[id]))
        : 0;
      this.weights[id] = Number.isFinite(savedWeights[id])
        ? Math.max(0, Math.floor(savedWeights[id]))
        : 0;
      this.lastProductionRates[id] = 0;
      this.lastAppliedAssignments[id] = 0;
    }

    this.booleanFlags = new Set(Array.isArray(data.booleanFlags) ? data.booleanFlags : []);
    this.faithInitialized = !!faith.faithInitialized;
    this.worldBelieverRatio = this.clampPercent(faith.worldBelieverRatio ?? 0.1);
    this.galacticPopulation = Math.max(0, faith.galacticPopulation || 0);
    this.galacticBelievers = Math.max(0, faith.galacticBelievers || 0);
    this.galacticBelieverPercentFallback = this.clampPercent(
      faith.galacticBelieverPercentFallback ?? 0.1
    );
    if (this.galacticPopulation > 0 && this.galacticBelievers > this.galacticPopulation) {
      this.galacticBelievers = this.galacticPopulation;
    }
    if (this.enabled && !this.faithInitialized) {
      this.initializeFaithIfNeeded();
    }
    this.reapplyEffects();
  }

  update(deltaTime) {
    if (!this.enabled) {
      return;
    }

    if (this.assignmentMode === 'weight') {
      this.getAssignmentsSnapshot();
    }
    this.updateFaith(deltaTime);
  }
}
