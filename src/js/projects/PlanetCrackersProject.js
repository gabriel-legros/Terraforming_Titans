const PLANET_CRACKER_UNASSIGNED_KEY = 'idleUnassigned';

class PlanetCrackersProject extends NuclearAlchemyFurnaceProject {
  constructor(config, name) {
    super(config, name);
    this.crackedByType = {};
    this.lastCrackedPerSecond = 0;
    this.lastSpaceEnergyPerSecond = 0;
    this.lastCapGainPerSecond = { metal: 0, silicon: 0, water: 0 };
    this.lastAppliedCapKey = '';
  }

  getText(path, vars, fallback = '') {
    return t(`ui.projects.planetCrackers.${path}`, vars, fallback);
  }

  getCrackerConfig() {
    return this.attributes.planetCracking || {};
  }

  getPlanetsPerAssignmentSecond() {
    const configured = Number(this.getCrackerConfig().planetsPerAssignmentSecond);
    if (Number.isFinite(configured) && configured > 0) {
      return configured;
    }
    return 1;
  }

  getSpaceEnergyPerPlanet() {
    const configured = Number(this.getCrackerConfig().spaceEnergyPerPlanet);
    if (Number.isFinite(configured) && configured > 0) {
      return configured;
    }
    return 1e28;
  }

  getPlanetTypeConfigs() {
    const config = this.getCrackerConfig();
    const configuredTypes = config.planetTypes;
    const resolved = [];

    if (configuredTypes && configuredTypes.constructor === Object) {
      Object.keys(configuredTypes).forEach((key) => {
        const typeConfig = configuredTypes[key] || {};
        resolved.push(this.normalizePlanetTypeConfig(key, typeConfig));
      });
    }

    if (resolved.length > 0) {
      return resolved;
    }

    return [
      this.normalizePlanetTypeConfig('ironRich', {
        label: this.getText('ironRichPlanets', null, 'Iron-rich planets'),
        complexity: 1,
        total: Number(config.totalIronRichPlanets) || 10000000000,
        capBonuses: {
          metal: Number(config.metalCapPerPlanet) || 100000000000,
          silicon: Number(config.silicaCapPerPlanet) || 50000000000,
          water: Number(config.iceCapPerPlanet) || 0,
        },
      }),
    ];
  }

  normalizePlanetTypeConfig(key, typeConfig) {
    const complexity = Number(typeConfig.complexity);
    const total = Number(typeConfig.total);
    const capBonuses = typeConfig.capBonuses || {};
    const metalBonus = Number(capBonuses.metal);
    const siliconBonus = Number(capBonuses.silicon);
    const waterBonus = Number(capBonuses.water);
    const fallbackLabel = this.getText(`recipeLabels.${key}`, null, `${key}`);
    return {
      key,
      label: typeConfig.label || fallbackLabel,
      complexity: Number.isFinite(complexity) && complexity > 0 ? complexity : 1,
      total: Number.isFinite(total) && total >= 0 ? total : 0,
      capBonuses: {
        metal: Number.isFinite(metalBonus) && metalBonus > 0 ? metalBonus : 0,
        silicon: Number.isFinite(siliconBonus) && siliconBonus > 0 ? siliconBonus : 0,
        water: Number.isFinite(waterBonus) && waterBonus > 0 ? waterBonus : 0,
      },
    };
  }

  getPlanetTypeMap() {
    const map = {};
    this.getPlanetTypeConfigs().forEach((typeConfig) => {
      map[typeConfig.key] = typeConfig;
    });
    return map;
  }

  getAssignmentKeys() {
    return this.getPlanetTypeConfigs().map((entry) => entry.key);
  }

  getUnassignedAssignmentKey() {
    return PLANET_CRACKER_UNASSIGNED_KEY;
  }

  showsComplexityColumn() {
    return true;
  }

  getAssignmentNameHeaderText() {
    return this.getText('target', null, 'Target');
  }

  getControlTitleText() {
    return this.getText('title', null, 'Planet Cracker Controls');
  }

  getTotalUnitsLabelText() {
    return this.getText('totalCrackers', null, 'Total Planet Crackers');
  }

  getRunToggleText() {
    return this.getText('runCrackers', null, 'Run planet crackers');
  }

  getPrimaryRateLabelText() {
    return this.getText('energyUse', null, 'Energy Use');
  }

  getPrimaryRateText() {
    return this.getText(
      'spaceEnergyRate',
      { value: formatNumber(this.lastSpaceEnergyPerSecond, true, 3) },
      `${formatNumber(this.lastSpaceEnergyPerSecond, true, 3)} space energy/s`
    );
  }

  getExpansionRateText(rate) {
    return this.getText(
      'expansionRate',
      { value: formatNumber(rate, true, 3) },
      `${formatNumber(rate, true, 3)} crackers/s`
    );
  }

  getOperationNoteText() {
    return this.getText(
      'operationNote',
      {
        energy: formatNumber(this.getSpaceEnergyPerPlanet(), true),
      },
      `Consumes ${formatNumber(this.getSpaceEnergyPerPlanet(), true)} space energy per cracked planet. Complexity and cap bonuses are defined per target type.`
    );
  }

  getRecipe(key) {
    const typeConfig = this.getPlanetTypeMap()[key];
    if (!typeConfig) {
      return null;
    }
    return {
      label: typeConfig.label,
      complexity: typeConfig.complexity,
    };
  }

  getRecipeTooltipText(key) {
    const typeConfig = this.getPlanetTypeMap()[key];
    if (!typeConfig) {
      return '';
    }
    return this.getText(
      'recipeTooltip',
      {
        metal: formatNumber(typeConfig.capBonuses.metal || 0, true),
        silicon: formatNumber(typeConfig.capBonuses.silicon || 0, true),
        water: formatNumber(typeConfig.capBonuses.water || 0, true),
      },
      `Per cracked planet: +${formatNumber(typeConfig.capBonuses.metal || 0, true)} metal cap, +${formatNumber(typeConfig.capBonuses.silicon || 0, true)} silica cap, +${formatNumber(typeConfig.capBonuses.water || 0, true)} ice cap.`
    );
  }

  getCrackedForType(typeKey) {
    const value = Number(this.crackedByType[typeKey]);
    if (Number.isFinite(value) && value > 0) {
      return value;
    }
    return 0;
  }

  getRemainingForType(typeKey) {
    const typeConfig = this.getPlanetTypeMap()[typeKey];
    if (!typeConfig) {
      return 0;
    }
    return Math.max(0, typeConfig.total - this.getCrackedForType(typeKey));
  }

  getTotalConfiguredPlanets() {
    return this.getPlanetTypeConfigs().reduce((sum, entry) => sum + entry.total, 0);
  }

  getTotalCrackedPlanets() {
    return this.getPlanetTypeConfigs().reduce((sum, entry) => sum + this.getCrackedForType(entry.key), 0);
  }

  getTotalRemainingPlanets() {
    return this.getPlanetTypeConfigs().reduce((sum, entry) => sum + this.getRemainingForType(entry.key), 0);
  }

  getTotalCapBonusesFromCracked() {
    const totals = { metal: 0, silicon: 0, water: 0 };
    this.getPlanetTypeConfigs().forEach((typeConfig) => {
      const cracked = this.getCrackedForType(typeConfig.key);
      totals.metal += cracked * typeConfig.capBonuses.metal;
      totals.silicon += cracked * typeConfig.capBonuses.silicon;
      totals.water += cracked * typeConfig.capBonuses.water;
    });
    return totals;
  }

  getCapKey() {
    const totals = this.getTotalCapBonusesFromCracked();
    return `${totals.metal}|${totals.silicon}|${totals.water}`;
  }

  applyCapBonusEffects() {
    const totals = this.getTotalCapBonusesFromCracked();
    warpGateNetworkManager.addAndReplace({
      type: 'importCapFlatBonus',
      resourceKey: 'metal',
      value: totals.metal,
      effectId: 'planet-crackers-metal-cap-bonus',
      sourceId: 'planetCrackers',
    });
    warpGateNetworkManager.addAndReplace({
      type: 'importCapFlatBonus',
      resourceKey: 'silicon',
      value: totals.silicon,
      effectId: 'planet-crackers-silicon-cap-bonus',
      sourceId: 'planetCrackers',
    });
    warpGateNetworkManager.addAndReplace({
      type: 'importCapFlatBonus',
      resourceKey: 'water',
      value: totals.water,
      effectId: 'planet-crackers-water-cap-bonus',
      sourceId: 'planetCrackers',
    });
    this.lastAppliedCapKey = this.getCapKey();
  }

  update(deltaTime) {
    super.update(deltaTime);
    if (this.lastAppliedCapKey !== this.getCapKey()) {
      this.applyCapBonusEffects();
    }
  }

  setLastRunStats(planetsRate = 0, spaceEnergyRate = 0, capRate = null, ratesByType = null) {
    this.lastCrackedPerSecond = planetsRate;
    this.lastSpaceEnergyPerSecond = spaceEnergyRate;
    this.lastCapGainPerSecond = capRate || { metal: 0, silicon: 0, water: 0 };
    this.lastOutputRatesByResource = {};
    const keys = this.getAssignmentKeys();
    for (let index = 0; index < keys.length; index += 1) {
      const key = keys[index];
      this.lastOutputRatesByResource[key] = ratesByType?.[key] || 0;
    }
    this.lastTotalOutputPerSecond = planetsRate;
  }

  buildOperationPlan(seconds, productivity = 1) {
    const plan = {
      hasAssignments: false,
      crackedTotal: 0,
      crackedByType: {},
      spaceEnergyUse: 0,
      capGain: { metal: 0, silicon: 0, water: 0 },
      reasons: {
        noTargetsRemaining: false,
      },
    };

    const perTypeCapacity = [];
    let desiredTotal = 0;
    const planetTypes = this.getPlanetTypeConfigs();
    for (let index = 0; index < planetTypes.length; index += 1) {
      const typeConfig = planetTypes[index];
      const assigned = this.furnaceAssignments[typeConfig.key] || 0;
      if (!(assigned > 0)) {
        continue;
      }
      plan.hasAssignments = true;
      const desired = (assigned / Math.max(1, typeConfig.complexity)) * this.getPlanetsPerAssignmentSecond() * seconds * productivity;
      if (!(desired > 0)) {
        continue;
      }
      const remaining = this.getRemainingForType(typeConfig.key);
      if (!(remaining > 0)) {
        continue;
      }
      const cappedDesired = Math.min(desired, remaining);
      perTypeCapacity.push({ typeConfig, desired: cappedDesired });
      desiredTotal += cappedDesired;
    }

    if (!(this.getTotalRemainingPlanets() > 0)) {
      plan.reasons.noTargetsRemaining = true;
      return plan;
    }

    if (!(desiredTotal > 0)) {
      return plan;
    }

    const maxByEnergy = resources.space.energy.value / this.getSpaceEnergyPerPlanet();
    const allocationRatio = Math.max(0, Math.min(1, maxByEnergy / desiredTotal));

    for (let index = 0; index < perTypeCapacity.length; index += 1) {
      const entry = perTypeCapacity[index];
      const cracked = entry.desired * allocationRatio;
      if (!(cracked > 0)) {
        continue;
      }
      const key = entry.typeConfig.key;
      plan.crackedByType[key] = cracked;
      plan.crackedTotal += cracked;
      plan.capGain.metal += cracked * entry.typeConfig.capBonuses.metal;
      plan.capGain.silicon += cracked * entry.typeConfig.capBonuses.silicon;
      plan.capGain.water += cracked * entry.typeConfig.capBonuses.water;
    }

    plan.spaceEnergyUse = plan.crackedTotal * this.getSpaceEnergyPerPlanet();
    return plan;
  }

  getOperationShortfallStatus(productivity = 1) {
    if (!(this.getTotalRemainingPlanets() > 0)) {
      return this.getText('status.depleted', null, 'All configured planet targets have been cracked');
    }
    const energyRatio = Math.max(0, Math.min(1, Number(resources.space.energy.availabilityRatio) || 0));
    if (energyRatio <= 0) {
      return this.getText('status.noSpaceEnergy', null, 'No space energy');
    }
    if (energyRatio < 1 || productivity < 1) {
      return this.getText('status.insufficientSpaceEnergy', null, 'Insufficient space energy');
    }
    return this.getText('status.idle', null, 'Idle');
  }

  applyOperationCostAndGain(deltaTime = 1000, accumulatedChanges, productivity = 1) {
    if (!this.shouldOperate()) {
      this.setLastRunStats(0, 0);
      if (!this.repeatCount) {
        this.updateStatus(this.getText('status.completeAtLeastOne', null, 'Complete at least one planet cracker'));
      } else if (!this.isRunning) {
        this.updateStatus(this.getText('status.runDisabled', null, 'Run disabled'));
      }
      this.shortfallLastTick = false;
      return;
    }

    const seconds = deltaTime / 1000;
    if (!(seconds > 0)) {
      this.setLastRunStats(0, 0);
      this.updateStatus(this.getText('status.idle', null, 'Idle'));
      this.shortfallLastTick = false;
      return;
    }

    this.normalizeAssignments();
    const plan = this.buildOperationPlan(seconds, productivity);
    if (!plan.hasAssignments) {
      this.setLastRunStats(0, 0);
      this.updateStatus(this.getText('status.noAssignments', null, 'No assignments'));
      this.shortfallLastTick = this.expansionShortfallLastTick || true;
      return;
    }
    if (plan.reasons.noTargetsRemaining) {
      this.setLastRunStats(0, 0);
      this.updateStatus(this.getText('status.depleted', null, 'All configured planet targets have been cracked'));
      this.shortfallLastTick = false;
      return;
    }
    if (!(plan.crackedTotal > 0)) {
      this.setLastRunStats(0, 0);
      const status = this.getOperationShortfallStatus(productivity);
      this.updateStatus(status);
      this.shortfallLastTick = status !== this.getText('status.idle', null, 'Idle');
      return;
    }

    resources.space.energy.decrease(plan.spaceEnergyUse);
    const crackedKeys = Object.keys(plan.crackedByType);
    for (let index = 0; index < crackedKeys.length; index += 1) {
      const key = crackedKeys[index];
      this.crackedByType[key] = this.getCrackedForType(key) + plan.crackedByType[key];
    }
    this.applyCapBonusEffects();

    const planetsRate = plan.crackedTotal / seconds;
    const spaceEnergyRate = plan.spaceEnergyUse / seconds;

    resources.space.energy.modifyRate(-spaceEnergyRate, this.displayName, 'project');

    const ratesByType = {};
    const crackedRateKeys = Object.keys(plan.crackedByType);
    for (let index = 0; index < crackedRateKeys.length; index += 1) {
      const key = crackedRateKeys[index];
      ratesByType[key] = plan.crackedByType[key] / seconds;
    }
    this.setLastRunStats(
      planetsRate,
      spaceEnergyRate,
      {
        metal: plan.capGain.metal / seconds,
        silicon: plan.capGain.silicon / seconds,
        water: plan.capGain.water / seconds,
      },
      ratesByType
    );
    this.updateStatus(this.getText('status.running', null, 'Running'));
    this.shortfallLastTick = false;
  }

  estimateOperationCostAndGain(deltaTime = 1000, applyRates = true, productivity = 1) {
    const totals = { cost: {}, gain: {} };
    if (!this.shouldOperate()) {
      return totals;
    }

    const seconds = deltaTime / 1000;
    if (!(seconds > 0)) {
      return totals;
    }

    this.normalizeAssignments();
    const plan = this.buildOperationPlan(seconds, productivity);
    if (!(plan.crackedTotal > 0)) {
      return totals;
    }

    if (applyRates) {
      resources.space.energy.modifyRate(-(plan.spaceEnergyUse / seconds), this.displayName, 'project');
    }

    totals.cost.space ||= {};
    totals.cost.space.energy = (totals.cost.space.energy || 0) + plan.spaceEnergyUse;
    return totals;
  }

  estimateProductivityCostAndGain(deltaTime = 1000) {
    const totals = { cost: {}, gain: {} };
    if (!this.shouldOperate()) {
      return totals;
    }

    const seconds = deltaTime / 1000;
    if (!(seconds > 0)) {
      return totals;
    }

    this.normalizeAssignments();

    let desiredPlanets = 0;
    const keys = this.getAssignmentKeys();
    for (let index = 0; index < keys.length; index += 1) {
      const key = keys[index];
      const assigned = this.furnaceAssignments[key] || 0;
      if (!(assigned > 0)) {
        continue;
      }
      if (!(this.getRemainingForType(key) > 0)) {
        continue;
      }
      const recipe = this.getRecipe(key);
      const complexity = recipe?.complexity || 1;
      desiredPlanets += (assigned / Math.max(1, complexity)) * this.getPlanetsPerAssignmentSecond() * seconds;
    }

    if (!(desiredPlanets > 0)) {
      return totals;
    }

    totals.cost.space = {
      energy: desiredPlanets * this.getSpaceEnergyPerPlanet()
    };

    return totals;
  }

  updateUI() {
    super.updateUI();

    this.ensurePlanetCrackerTableColumns();

    const elements = projectElements[this.name] || {};
    const statusElement = elements.planetCrackerStatus;
    if (statusElement) {
      statusElement.textContent = this.getText(
        'planetProgress',
        {
          cracked: formatNumber(this.getTotalCrackedPlanets(), true, 3),
          total: formatNumber(this.getTotalConfiguredPlanets(), true),
          remaining: formatNumber(this.getTotalRemainingPlanets(), true, 3),
        },
        `Cracked: ${formatNumber(this.getTotalCrackedPlanets(), true, 3)} / ${formatNumber(this.getTotalConfiguredPlanets(), true)} | Remaining: ${formatNumber(this.getTotalRemainingPlanets(), true, 3)}`
      );
    }

    if (this.uiElements && this.uiElements.rowElements) {
      const keys = this.getManagedAssignmentKeys();
      for (let index = 0; index < keys.length; index += 1) {
        const key = keys[index];
        const row = this.uiElements.rowElements[key];
        if (!row || !row.crackedValue || !row.remainingValue) {
          continue;
        }
        if (this.isUnassignedAssignmentKey(key)) {
          row.crackedValue.textContent = '';
          row.remainingValue.textContent = '';
          continue;
        }
        row.crackedValue.textContent = formatNumber(this.getCrackedForType(key), true, 3);
        row.remainingValue.textContent = formatNumber(this.getRemainingForType(key), true, 3);
      }
    }
  }

  renderUI(container) {
    super.renderUI(container);

    const elements = projectElements[this.name] || {};
    const cardBody = elements.cardBody;
    if (!cardBody) {
      return;
    }

    const status = document.createElement('p');
    status.classList.add('project-description');
    cardBody.appendChild(status);
    elements.planetCrackerStatus = status;
    this.ensurePlanetCrackerTableColumns();

    projectElements[this.name] = elements;

    this.updateUI();
  }

  ensurePlanetCrackerTableColumns() {
    const rows = this.uiElements?.rowElements;
    if (!rows) {
      return;
    }
    const keys = this.getManagedAssignmentKeys();
    const firstKey = keys[0];
    const firstRow = firstKey ? rows[firstKey] : null;
    const headerRow = firstRow?.value?.parentElement?.previousElementSibling?.previousElementSibling;
    if (headerRow && !headerRow.classList.contains('planet-crackers-assignment-row')) {
      headerRow.classList.add('planet-crackers-assignment-row');
      const crackedHeader = document.createElement('span');
      crackedHeader.classList.add('stat-label');
      crackedHeader.textContent = this.getText('crackedHeader', null, 'Cracked');
      const remainingHeader = document.createElement('span');
      remainingHeader.classList.add('stat-label');
      remainingHeader.textContent = this.getText('remainingHeader', null, 'Remaining');
      headerRow.insertBefore(crackedHeader, headerRow.children[3]);
      headerRow.insertBefore(remainingHeader, headerRow.children[4]);
    }

    for (let index = 0; index < keys.length; index += 1) {
      const key = keys[index];
      const row = rows[key];
      const rowValue = row?.value;
      if (!rowValue) {
        continue;
      }
      const rowElement = rowValue.parentElement;
      if (!rowElement) {
        continue;
      }
      if (!rowElement.classList.contains('planet-crackers-assignment-row')) {
        rowElement.classList.add('planet-crackers-assignment-row');
      }
      if (!row.crackedValue) {
        const crackedValue = document.createElement('span');
        crackedValue.classList.add('stat-value');
        rowElement.insertBefore(crackedValue, rowElement.children[3]);
        row.crackedValue = crackedValue;
      }
      if (!row.remainingValue) {
        const remainingValue = document.createElement('span');
        remainingValue.classList.add('stat-value');
        rowElement.insertBefore(remainingValue, rowElement.children[4]);
        row.remainingValue = remainingValue;
      }
    }
  }

  saveState() {
    return {
      ...super.saveState(),
      crackedByType: this.crackedByType,
      crackedIronRichPlanets: this.getCrackedForType('ironRich'),
    };
  }

  loadState(state) {
    super.loadState(state);
    this.crackedByType = {};
    const configuredKeys = this.getAssignmentKeys();
    const savedMap = state.crackedByType || {};
    for (let index = 0; index < configuredKeys.length; index += 1) {
      const key = configuredKeys[index];
      const typeConfig = this.getPlanetTypeMap()[key];
      const saved = Number(savedMap[key]);
      if (Number.isFinite(saved) && saved > 0) {
        this.crackedByType[key] = Math.max(0, Math.min(typeConfig.total, saved));
      }
    }
    const legacyIronRich = Number(state.crackedIronRichPlanets);
    if (Number.isFinite(legacyIronRich) && legacyIronRich > 0 && !this.crackedByType.ironRich) {
      const typeConfig = this.getPlanetTypeMap().ironRich;
      if (typeConfig) {
        this.crackedByType.ironRich = Math.max(0, Math.min(typeConfig.total, legacyIronRich));
      }
    }
    this.lastAppliedCapKey = '';
  }
}

window.PlanetCrackersProject = PlanetCrackersProject;
