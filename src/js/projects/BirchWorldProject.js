const BIRCH_WORLD_MAX_LAYERS = 1500;
const BIRCH_WORLD_STARTING_LAYERS = 1;
const BIRCH_WORLD_VALUE_DIVISOR = 50_000_000_000;
const BIRCH_WORLD_CORE_MASS_SOLAR = 4.3e6;
const BIRCH_WORLD_SHIP_ENERGY_PER_TON_PER_RADIUS = 25_000;
const BIRCH_WORLD_SHIP_ENERGY_EFFECT_ID = 'artificial-ship-energy-multiplier';

class BirchWorldProject extends Project {
  constructor(config, name) {
    super(config, name);
    this.layerCount = BIRCH_WORLD_STARTING_LAYERS;
    this.layerCache = null;
    this.cachedTotalLandHa = 0;
    this.completionCelebrationTriggered = false;
    this.completionCelebrationPendingOnLoad = false;
  }

  isCurrentSmbhShellworld() {
    if (spaceManager.currentArtificialKey === null) {
      return false;
    }
    const key = String(spaceManager.currentArtificialKey);
    const status = spaceManager.artificialWorldStatuses[key];
    return isSupermassiveShellworldStatus(status);
  }

  getLayerCache() {
    if (this.layerCache) {
      return this.layerCache;
    }
    const result = ShellworldGravityHelper.buildShellLayers({
      coreMassSolar: BIRCH_WORLD_CORE_MASS_SOLAR,
      preferRoot: 'inner',
      layerCount: BIRCH_WORLD_MAX_LAYERS
    });
    const earthAreaHa = ShellworldGravityHelper.calculateEarthAreaHectares();
    this.layerCache = result.layers.map((layer) => ({
      radiusEarth: layer.radiusEarth,
      landHa: earthAreaHa * layer.radiusEarth * layer.radiusEarth,
      cost: {
        colony: {
          metal: layer.cost.metal,
          superalloys: layer.cost.superalloys
        }
      }
    }));
    this.refreshCachedTotalLand();
    return this.layerCache;
  }

  refreshCachedTotalLand() {
    const layers = this.getLayerCache();
    let total = 0;
    const count = Math.max(BIRCH_WORLD_STARTING_LAYERS, Math.min(this.layerCount, BIRCH_WORLD_MAX_LAYERS));
    for (let i = 0; i < count; i += 1) {
      total += layers[i].landHa;
    }
    this.cachedTotalLandHa = total;
    return total;
  }

  getCurrentTotalLandHa() {
    if (!(this.cachedTotalLandHa > 0)) {
      return this.refreshCachedTotalLand();
    }
    return this.cachedTotalLandHa;
  }

  getCurrentWorldValue() {
    return this.getCurrentTotalLandHa() / BIRCH_WORLD_VALUE_DIVISOR;
  }

  getCurrentLayer() {
    return this.getLayerCache()[Math.max(0, this.layerCount - 1)];
  }

  getCurrentRadiusEarth() {
    return this.getCurrentLayer()?.radiusEarth || 0;
  }

  getCurrentShipEnergyPerTon() {
    return Math.max(this.getCurrentRadiusEarth() - 1, 0) * BIRCH_WORLD_SHIP_ENERGY_PER_TON_PER_RADIUS;
  }

  getNextLayer() {
    if (this.layerCount >= BIRCH_WORLD_MAX_LAYERS) {
      return null;
    }
    return this.getLayerCache()[this.layerCount];
  }

  getNextLayerLandHa() {
    return this.getNextLayer()?.landHa || 0;
  }

  getNextLayerWorldValue() {
    return this.getNextLayerLandHa() / BIRCH_WORLD_VALUE_DIVISOR;
  }

  getScaledCost() {
    if (this.layerCount >= BIRCH_WORLD_MAX_LAYERS) {
      return {};
    }
    const nextLayer = this.getNextLayer();
    return JSON.parse(JSON.stringify(nextLayer.cost));
  }

  getBirchWorldText(path, fallback, vars) {
    return t(path, vars, fallback);
  }

  getOperationalNotes() {
    return [
      {
        id: 'specializationLock',
        label: this.getBirchWorldText(
          'ui.projects.birchWorld.operationalNotes.specializationLock',
          'Counts as specialization (blocks other world specializations on this SMBH shellworld)'
        ),
        met: true
      },
      {
        id: 'terraformingGreen',
        label: this.getBirchWorldText(
          'ui.projects.birchWorld.operationalNotes.terraformingGreen',
          'Can only add a layer when all 6 terraforming requirement groups are green'
        ),
        met: terraforming.getTerraformingStatus()
      },
      {
        id: 'travelPersistence',
        label: this.getBirchWorldText(
          'ui.projects.birchWorld.operationalNotes.travelPersistence',
          'You can leave this world and come back.  Most values will be saved.'
        ),
        met: true
      }
    ];
  }

  applyEffects() {
    if (this.unlocked && this.isCurrentSmbhShellworld()) {
      this.applyCurrentWorldGeometry();
    }
  }

  updateShipEnergyPenalty() {
    projectManager.addAndReplace({
      target: 'projectManager',
      type: 'spaceshipCostPerTon',
      resourceCategory: 'colony',
      resourceId: 'energy',
      value: this.getCurrentShipEnergyPerTon(),
      skipForSpaceStorageImports: true,
      effectId: BIRCH_WORLD_SHIP_ENERGY_EFFECT_ID,
      sourceId: this.name,
      name: this.displayName
    });
  }

  setLandFields(target, totalLandHa) {
    if (!target) {
      return;
    }
    target.landHa = totalLandHa;
    if (target.celestialParameters) {
      target.celestialParameters.baseLand = totalLandHa;
    }
    if (target.resources?.surface?.land) {
      target.resources.surface.land.initialValue = totalLandHa;
      target.resources.surface.land.baseLand = totalLandHa;
      target.resources.surface.land.baseCap = totalLandHa;
    }
    if (target.resources?.special?.albedoUpgrades) {
      target.resources.special.albedoUpgrades.baseCap = Math.max(0, totalLandHa * 10000);
    }
  }

  setRadiusFields(target, radiusEarth) {
    if (!target) {
      return;
    }
    const radiusKm = radiusEarth * EARTH_RADIUS_KM;
    if (target.celestialParameters) {
      target.celestialParameters.radius = radiusKm;
      target.celestialParameters.layeredSurfaceArea = true;
      target.celestialParameters.surfaceArea = target.landHa * 10_000;
      target.celestialParameters.crossSectionArea = calculateCrossSectionAreaM2FromRadius(radiusKm);
    }
  }

  updateLiveWorldGeometry(totalLandHa) {
    const radiusEarth = this.getCurrentRadiusEarth();
    const radiusKm = radiusEarth * EARTH_RADIUS_KM;
    const atmosphericSurfaceArea = totalLandHa * 10_000;
    terraforming.baseLand = totalLandHa;
    terraforming.initialLand = totalLandHa;
    terraforming.celestialParameters.radius = radiusKm;
    terraforming.celestialParameters.baseLand = totalLandHa;
    terraforming.celestialParameters.layeredSurfaceArea = true;
    terraforming.celestialParameters.surfaceArea = atmosphericSurfaceArea;
    terraforming.celestialParameters.crossSectionArea = calculateCrossSectionAreaM2FromRadius(radiusKm);
    if (terraforming.initialCelestialParameters) {
      terraforming.initialCelestialParameters.baseLand = totalLandHa;
      terraforming.initialCelestialParameters.radius = radiusKm;
      terraforming.initialCelestialParameters.layeredSurfaceArea = true;
      terraforming.initialCelestialParameters.surfaceArea = atmosphericSurfaceArea;
      terraforming.initialCelestialParameters.crossSectionArea = terraforming.celestialParameters.crossSectionArea;
    }
    if (resources.surface.land) {
      resources.surface.land.baseLand = totalLandHa;
      resources.surface.land.baseCap = totalLandHa;
    }
    if (resources.special.albedoUpgrades) {
      resources.special.albedoUpgrades.baseCap = Math.max(0, totalLandHa * 10000);
      resources.special.albedoUpgrades.updateStorageCap();
    }
    this.setLandFields(currentPlanetParameters, totalLandHa);
    this.setRadiusFields(currentPlanetParameters, radiusEarth);
  }

  applyCurrentWorldGeometry() {
    if (!this.isCurrentSmbhShellworld()) {
      return;
    }
    this.updateLiveWorldGeometry(this.getCurrentTotalLandHa());
    this.updateShipEnergyPenalty();
  }

  renderUI(container) {
    const panel = document.createElement('div');
    panel.className = 'birch-world-panel';

    const grid = document.createElement('div');
    grid.className = 'stats-grid six-col project-summary-grid birch-world-grid';

    const metrics = [
      ['layerCount', 'ui.projects.birchWorld.currentLayers', 'Current Layers:'],
      ['totalLand', 'ui.projects.birchWorld.currentLand', 'Current Total Land:'],
      ['worldValue', 'ui.projects.birchWorld.currentValue', 'Current World Value:'],
      ['shipPenalty', 'ui.projects.birchWorld.shipPenalty', 'Ship Energy Penalty:'],
      ['nextLand', 'ui.projects.birchWorld.nextLand', 'Next Layer Land:'],
      ['nextValue', 'ui.projects.birchWorld.nextValue', 'Next Layer Value:']
    ];
    const refs = {};
    metrics.forEach((entry) => {
      const box = document.createElement('div');
      box.className = 'stat-item project-summary-box';
      const label = document.createElement('span');
      label.className = 'stat-label';
      label.textContent = this.getBirchWorldText(entry[1], entry[2]);
      const value = document.createElement('span');
      value.className = 'stat-value';
      box.append(label, value);
      grid.appendChild(box);
      refs[entry[0]] = value;
    });

    const costBox = document.createElement('div');
    costBox.className = 'stat-item project-summary-box birch-world-cost';
    const costLabel = document.createElement('span');
    costLabel.className = 'stat-label';
    costLabel.textContent = this.getBirchWorldText('ui.projects.birchWorld.nextCost', 'Next Layer Cost:');
    const costValue = document.createElement('span');
    costValue.className = 'stat-value';
    costBox.append(costLabel, costValue);
    grid.appendChild(costBox);
    refs.cost = costValue;

    const notesSection = document.createElement('div');
    notesSection.className = 'project-requirements';
    const notesLabel = document.createElement('strong');
    notesLabel.textContent = this.getBirchWorldText('ui.projects.birchWorld.operationalNotes.title', 'Operational Notes:');
    const notesList = document.createElement('ul');
    notesList.className = 'project-requirements-list';
    const noteItems = {};
    const notes = this.getOperationalNotes();
    for (let index = 0; index < notes.length; index += 1) {
      const note = notes[index];
      const item = document.createElement('li');
      item.className = 'project-requirements-item';
      item.textContent = note.label;
      item.classList.toggle('is-unmet', !note.met);
      notesList.appendChild(item);
      noteItems[note.id] = item;
    }
    notesSection.append(notesLabel, notesList);

    panel.appendChild(grid);
    panel.appendChild(notesSection);
    container.appendChild(panel);
    this.ui = refs;
    this.ui.noteItems = noteItems;
    this.ui.costItems = {};
    this.ui.costMaxLayers = document.createElement('span');
    this.ui.costMaxLayers.textContent = this.getBirchWorldText('ui.projects.birchWorld.maxLayers', 'Max layers reached');
    this.ui.cost.appendChild(this.ui.costMaxLayers);
    this.updateUI();
  }

  updateCostUI() {
    if (!this.ui || !this.ui.cost) {
      return;
    }
    const cost = this.getScaledCost();
    const storageAccess = this.attributes?.canUseSpaceStorage
      ? this.createSpaceStorageAccess('expansions')
      : null;
    const activeKeys = {};
    let visibleCount = 0;

    for (const category in cost) {
      for (const resource in cost[category]) {
        const requiredAmount = cost[category][resource];
        if (requiredAmount > 0) {
          const key = `${category}.${resource}`;
          activeKeys[key] = true;
          let item = this.ui.costItems[key];
          if (!item) {
            item = document.createElement('span');
            item.className = 'birch-world-cost-item';
            this.ui.costItems[key] = item;
            this.ui.cost.appendChild(item);
          }
          const prefix = visibleCount > 0 ? ', ' : '';
          const resourceName = resources[category][resource].displayName;
          item.textContent = `${prefix}${resourceName}: ${formatNumber(requiredAmount, true, 2)}`;
          const availableAmount = getAvailableProjectCostAmount(this, category, resource, storageAccess);
          const highlight = shouldHighlightProjectCost(this, category, resource, availableAmount, requiredAmount);
          item.style.color = highlight ? 'red' : '';
          item.style.display = '';
          visibleCount += 1;
        }
      }
    }

    for (const key in this.ui.costItems) {
      if (!activeKeys[key]) {
        this.ui.costItems[key].style.display = 'none';
      }
    }

    this.ui.costMaxLayers.style.display = visibleCount > 0 ? 'none' : '';
  }

  updateUI() {
    if (!this.ui) {
      return;
    }
    this.ui.layerCount.textContent = `${this.layerCount} / ${BIRCH_WORLD_MAX_LAYERS}`;
    this.ui.totalLand.textContent = formatNumber(this.getCurrentTotalLandHa(), false, 2);
    this.ui.worldValue.textContent = formatNumber(this.getCurrentWorldValue(), false, 2);
    this.ui.shipPenalty.textContent = this.getBirchWorldText(
      'ui.projects.birchWorld.shipPenaltyValue',
      '{value} / ton',
      { value: formatNumber(this.getCurrentShipEnergyPerTon(), false, 2) }
    );
    this.ui.nextLand.textContent = formatNumber(this.getNextLayerLandHa(), false, 2);
    this.ui.nextValue.textContent = formatNumber(this.getNextLayerWorldValue(), false, 2);
    this.updateCostUI();
    const notes = this.getOperationalNotes();
    for (let index = 0; index < notes.length; index += 1) {
      const note = notes[index];
      const item = this.ui.noteItems[note.id];
      item.classList.toggle('is-unmet', !note.met);
    }
  }

  canStart() {
    if (!this.isCurrentSmbhShellworld()) {
      return false;
    }
    if (this.layerCount >= BIRCH_WORLD_MAX_LAYERS) {
      return false;
    }
    if (!terraforming.getTerraformingStatus()) {
      return false;
    }
    return super.canStart();
  }

  complete() {
    super.complete();
    this.layerCount = Math.min(this.layerCount + 1, BIRCH_WORLD_MAX_LAYERS);
    const totalLandHa = this.refreshCachedTotalLand();
    this.updateCurrentWorldLand(totalLandHa);
    if (this.layerCount >= BIRCH_WORLD_MAX_LAYERS && !this.completionCelebrationTriggered) {
      this.triggerCompletionCelebration();
    }
  }

  triggerCompletionCelebration() {
    this.completionCelebrationTriggered = true;
    this.completionCelebrationPendingOnLoad = false;
    goldenAsteroid.startBirchWorldCelebration(30000);
  }

  triggerPendingCompletionCelebration() {
    if (this.completionCelebrationPendingOnLoad) {
      this.triggerCompletionCelebration();
    }
  }

  updateCurrentWorldLand(totalLandHa) {
    const key = String(spaceManager.currentArtificialKey);
    spaceManager._updateWorldCacheForStatusMutation('artificial', key, (status) => {
      this.setLandFields(status, totalLandHa);
      status.cachedLandHa = totalLandHa;
      status.radiusEarth = this.getCurrentRadiusEarth();
      this.setRadiusFields(status, status.radiusEarth);
      status.terraformedValue = totalLandHa / BIRCH_WORLD_VALUE_DIVISOR;
      status.fleetCapacityValue = spaceManager._deriveArtificialFleetCapacityValue(status);
      if (status.artificialSnapshot) {
        status.artificialSnapshot.landHa = totalLandHa;
        status.artificialSnapshot.radiusEarth = status.radiusEarth;
      }
      if (status.original) {
        this.setLandFields(status.original, totalLandHa);
        this.setLandFields(status.original.merged, totalLandHa);
        this.setLandFields(status.original.override, totalLandHa);
        this.setRadiusFields(status.original, status.radiusEarth);
        this.setRadiusFields(status.original.merged, status.radiusEarth);
        this.setRadiusFields(status.original.override, status.radiusEarth);
      }
    });
    this.updateLiveWorldGeometry(totalLandHa);
    this.updateShipEnergyPenalty();
    reconcileLandResourceValue();
    recalculateLandUsage();
  }

  saveState() {
    return {
      ...super.saveState(),
      layerCount: this.layerCount,
      cachedTotalLandHa: this.cachedTotalLandHa,
      completionCelebrationTriggered: this.completionCelebrationTriggered
    };
  }

  loadState(state) {
    super.loadState(state);
    this.layerCount = Math.max(
      BIRCH_WORLD_STARTING_LAYERS,
      Math.min(state.layerCount || BIRCH_WORLD_STARTING_LAYERS, BIRCH_WORLD_MAX_LAYERS)
    );
    this.cachedTotalLandHa = state.cachedTotalLandHa || 0;
    this.completionCelebrationTriggered = state.completionCelebrationTriggered === true;
    this.completionCelebrationPendingOnLoad = this.layerCount >= BIRCH_WORLD_MAX_LAYERS && !this.completionCelebrationTriggered;
    this.refreshCachedTotalLand();
  }
}

if (typeof window !== 'undefined') {
  window.BirchWorldProject = BirchWorldProject;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = BirchWorldProject;
}
