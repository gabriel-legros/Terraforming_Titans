const BIRCH_WORLD_MAX_LAYERS = 1500;
const BIRCH_WORLD_STARTING_LAYERS = 1;
const BIRCH_WORLD_VALUE_DIVISOR = 50_000_000_000;
const BIRCH_WORLD_CORE_MASS_SOLAR = 4.3e6;

class BirchWorldProject extends Project {
  constructor(config, name) {
    super(config, name);
    this.layerCount = BIRCH_WORLD_STARTING_LAYERS;
    this.layerCache = null;
    this.cachedTotalLandHa = 0;
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

  renderUI(container) {
    const panel = document.createElement('div');
    panel.className = 'birch-world-panel';

    const grid = document.createElement('div');
    grid.className = 'stats-grid five-col project-summary-grid birch-world-grid';

    const metrics = [
      ['layerCount', 'ui.projects.birchWorld.currentLayers', 'Current Layers:'],
      ['totalLand', 'ui.projects.birchWorld.currentLand', 'Current Total Land:'],
      ['worldValue', 'ui.projects.birchWorld.currentValue', 'Current World Value:'],
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

    panel.appendChild(grid);
    container.appendChild(panel);
    this.ui = refs;
    this.updateUI();
  }

  formatCost() {
    const cost = this.getScaledCost();
    const parts = [];
    for (const category in cost) {
      for (const resource in cost[category]) {
        const amount = cost[category][resource];
        if (amount > 0) {
          const resourceName = resources[category][resource].displayName;
          parts.push(`${resourceName}: ${formatNumber(amount, true)}`);
        }
      }
    }
    return parts.length
      ? parts.join(', ')
      : this.getBirchWorldText('ui.projects.birchWorld.maxLayers', 'Max layers reached');
  }

  updateUI() {
    if (!this.ui) {
      return;
    }
    this.ui.layerCount.textContent = `${formatNumber(this.layerCount, true)} / ${formatNumber(BIRCH_WORLD_MAX_LAYERS, true)}`;
    this.ui.totalLand.textContent = formatNumber(this.getCurrentTotalLandHa(), false, 2);
    this.ui.worldValue.textContent = formatNumber(this.getCurrentWorldValue(), false, 2);
    this.ui.nextLand.textContent = formatNumber(this.getNextLayerLandHa(), false, 2);
    this.ui.nextValue.textContent = formatNumber(this.getNextLayerWorldValue(), false, 2);
    this.ui.cost.textContent = this.formatCost();
  }

  canStart() {
    if (!this.isCurrentSmbhShellworld()) {
      return false;
    }
    if (this.layerCount >= BIRCH_WORLD_MAX_LAYERS) {
      return false;
    }
    return super.canStart();
  }

  complete() {
    super.complete();
    this.layerCount = Math.min(this.layerCount + 1, BIRCH_WORLD_MAX_LAYERS);
    const totalLandHa = this.refreshCachedTotalLand();
    this.updateCurrentWorldLand(totalLandHa);
  }

  updateCurrentWorldLand(totalLandHa) {
    const key = String(spaceManager.currentArtificialKey);
    spaceManager._updateWorldCacheForStatusMutation('artificial', key, (status) => {
      status.landHa = totalLandHa;
      status.cachedLandHa = totalLandHa;
      status.terraformedValue = totalLandHa / BIRCH_WORLD_VALUE_DIVISOR;
      status.fleetCapacityValue = spaceManager._deriveArtificialFleetCapacityValue(status);
      if (status.artificialSnapshot) {
        status.artificialSnapshot.landHa = totalLandHa;
      }
      if (status.original) {
        status.original.landHa = totalLandHa;
      }
    });
    reconcileLandResourceValue();
    recalculateLandUsage();
  }

  saveState() {
    return {
      ...super.saveState(),
      layerCount: this.layerCount,
      cachedTotalLandHa: this.cachedTotalLandHa
    };
  }

  loadState(state) {
    super.loadState(state);
    this.layerCount = Math.max(
      BIRCH_WORLD_STARTING_LAYERS,
      Math.min(state.layerCount || BIRCH_WORLD_STARTING_LAYERS, BIRCH_WORLD_MAX_LAYERS)
    );
    this.cachedTotalLandHa = state.cachedTotalLandHa || 0;
    this.refreshCachedTotalLand();
  }
}

if (typeof window !== 'undefined') {
  window.BirchWorldProject = BirchWorldProject;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = BirchWorldProject;
}
