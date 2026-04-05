function getKeratiHiveText(path, fallback, vars) {
  try {
    return t(`ui.projects.keratiHive.${path}`, vars, fallback);
  } catch (error) {
    return fallback;
  }
}

const KERATI_HIVE_RESERVATION_SOURCE = 'keratiTerritory';
const KERATI_HIVE_ACTION_ORDER = [
  'drone',
  'builder',
  'hunter',
  'princess',
  'queenUpgrade',
  'empressUpgrade',
];

class KeratiHiveProject extends Project {
  constructor(config, name) {
    super(config, name);
    this.tuning = this.buildTuning(config?.attributes?.tuning || {});
    this.uiElements = null;
    this.hasInitializedHive = false;
    this.huntingEnabled = true;
    this.foodTransferAmount = this.tuning.foodTransfer.defaultAmount;
    this.batchAmounts = {};
    KERATI_HIVE_ACTION_ORDER.forEach((actionId) => {
      this.batchAmounts[actionId] = this.tuning.batch.defaultAmount;
    });
    this.resetHiveState();
  }

  getRawTuningConfig() {
    return this.attributes?.tuning || {};
  }

  refreshTuning() {
    this.tuning = this.buildTuning(this.getRawTuningConfig());
    return this.tuning;
  }

  buildTuning(tuning) {
    const initialState = tuning.initialState || {};
    const batch = tuning.batch || {};
    const foodTransfer = tuning.foodTransfer || {};
    const costs = tuning.costs || {};
    const rates = tuning.rates || {};
    return {
      initialState: {
        territory: initialState.territory ?? 1,
        spawningPools: initialState.spawningPools ?? 1,
        poolProgress: initialState.poolProgress ?? 0,
        hiveFood: initialState.hiveFood ?? 0,
        honey: initialState.honey ?? 0,
        larva: initialState.larva ?? 0,
        drones: initialState.drones ?? 1,
        builders: initialState.builders ?? 0,
        hunters: initialState.hunters ?? 0,
        princesses: initialState.princesses ?? 1,
        queens: initialState.queens ?? 0,
        empresses: initialState.empresses ?? 0,
      },
      batch: {
        defaultAmount: Math.max(1, batch.defaultAmount ?? 1),
        maxAmount: Math.max(1, batch.maxAmount ?? 1e18),
      },
      foodTransfer: {
        defaultAmount: Math.max(1, foodTransfer.defaultAmount ?? 1),
      },
      completedWorkersPerInitialLand: Math.max(0, tuning.completedWorkersPerInitialLand ?? 0),
      costs: {
        droneLarva: costs.droneLarva ?? 1,
        droneHoney: costs.droneHoney ?? 5,
        builderLarva: costs.builderLarva ?? 1,
        builderHoney: costs.builderHoney ?? 15,
        hunterLarva: costs.hunterLarva ?? 1,
        hunterHoney: costs.hunterHoney ?? 15,
        princessLarva: costs.princessLarva ?? 5,
        princessHoney: costs.princessHoney ?? 50,
        queenHoney: costs.queenHoney ?? costs.queenhoney ?? 1000,
        empressHoney: costs.empressHoney ?? costs.empresshoney ?? 50000,
      },
      rates: {
        droneFoodPerSecond: rates.droneFoodPerSecond ?? 1,
        droneHoneyPerSecond: rates.droneHoneyPerSecond ?? 2,
        builderHoneyPerSecond: rates.builderHoneyPerSecond ?? 5,
        builderPoolProgressPerSecond: rates.builderPoolProgressPerSecond ?? 0.05,
        hunterBiomassPerSecond: rates.hunterBiomassPerSecond ?? 0.01,
        hunterFoodPerSecond: rates.hunterFoodPerSecond ?? 1,
        hunterTerritoryPerSecond: rates.hunterTerritoryPerSecond ?? 0.01,
        princessLarvaPerSecond: rates.princessLarvaPerSecond ?? 0.1,
        queenLarvaPerSecond: rates.queenLarvaPerSecond ?? 1,
        empressLarvaPerSecond: rates.empressLarvaPerSecond ?? 10,
      },
      territoryPerPool: tuning.territoryPerPool ?? 1,
    };
  }

  resetHiveState() {
    this.refreshTuning();
    const initial = this.tuning.initialState;
    this.territory = initial.territory;
    this.spawningPools = initial.spawningPools;
    this.poolProgress = initial.poolProgress;
    this.hiveFood = initial.hiveFood;
    this.honey = initial.honey;
    this.larva = initial.larva;
    this.drones = initial.drones;
    this.builders = initial.builders;
    this.hunters = initial.hunters;
    this.princesses = initial.princesses;
    this.queens = initial.queens;
    this.empresses = initial.empresses;
  }

  resetProject() {
    this.refreshTuning();
    this.isCompleted = false;
    this.isActive = false;
    this.isPaused = false;
    this.remainingTime = this.getEffectiveDuration();
    this.startingDuration = this.remainingTime;
    this.resetHiveState();
    this.hasInitializedHive = true;
    this.huntingEnabled = true;
    this.foodTransferAmount = this.tuning.foodTransfer.defaultAmount;
    KERATI_HIVE_ACTION_ORDER.forEach((actionId) => {
      this.batchAmounts[actionId] = this.tuning.batch.defaultAmount;
    });
    this.syncLandReservation();
    this.updateUI();
  }

  enable() {
    this.refreshTuning();
    const wasUnlocked = this.unlocked;
    super.enable();
    if (!wasUnlocked && !this.hasInitializedHive) {
      this.resetHiveState();
      this.hasInitializedHive = true;
    }
    this.syncLandReservation();
  }

  isVisible() {
    return !this.isPermanentlyDisabled() && (this.unlocked || this.hasInitializedHive || this.isCompleted);
  }

  shouldHideStartBar() {
    return true;
  }

  renderAutomationUI(container) {
    if (!container) {
      return;
    }
    const children = Array.from(container.children || []);
    children.forEach((child) => {
      child.style.display = 'none';
    });
  }

  canStart() {
    return false;
  }

  start() {
    return false;
  }

  getInitialLand() {
    return resolveWorldBaseLand(terraforming);
  }

  getCompletedWorkerContribution() {
    if (!this.isCompleted) {
      return 0;
    }
    return Math.floor(this.getInitialLand() * this.tuning.completedWorkersPerInitialLand);
  }

  getCurrentLandValue() {
    return Math.max(resources.surface.land.value || 0, 0);
  }

  getTotalSpawners() {
    return this.princesses + this.queens + this.empresses;
  }

  getTerritoryPerPool() {
    return Math.max(this.tuning.territoryPerPool, 1);
  }

  getPoolCapacityFromTerritory() {
    return Math.max(1, Math.floor(this.territory / this.getTerritoryPerPool()));
  }

  getKeratiReservedLand() {
    return resources.surface.land.getReservedAmountForSource(KERATI_HIVE_RESERVATION_SOURCE) || 0;
  }

  getOtherReservedLand() {
    const landResource = resources.surface.land;
    return Math.max(0, (landResource.reserved || 0) - this.getKeratiReservedLand());
  }

  getMaxTerritoryForGrowth() {
    return Math.max(0, this.getCurrentLandValue() - this.getOtherReservedLand());
  }

  getRemainingTerritoryCapacity() {
    return Math.max(0, this.getMaxTerritoryForGrowth() - this.territory);
  }

  getSurfaceResourceZones(resourceKey) {
    const zones = getZones();
    const entries = zones.map((zone) => ({
      zone,
      amount: (terraforming?.zonalSurface?.[zone]?.[resourceKey]) || 0,
    }));
    const total = entries.reduce((sum, entry) => sum + entry.amount, 0);
    return { entries, total };
  }

  removeSurfaceResourceFromZones(resourceKey, amount) {
    if (!terraforming || amount <= 0) {
      return 0;
    }
    const { entries, total } = this.getSurfaceResourceZones(resourceKey);
    if (total <= 0) {
      return 0;
    }
    const requested = Math.min(amount, total);
    entries.forEach((entry) => {
      if (entry.amount <= 0) {
        return;
      }
      const take = requested * (entry.amount / total);
      const zoneData = terraforming.zonalSurface?.[entry.zone];
      if (zoneData) {
        zoneData[resourceKey] = Math.max(0, zoneData[resourceKey] - take);
      }
    });
    return requested;
  }

  getAvailableHunterBiomass() {
    return Math.max(
      0,
      (resources.surface.hazardousBiomass.value || 0) + (resources.surface.biomass.value || 0)
    );
  }

  consumeHunterBiomass(amount, seconds) {
    if (!(amount > 0) || !(seconds > 0)) {
      return 0;
    }
    const hazardousUsed = this.removeSurfaceResourceFromZones('hazardousBiomass', amount);
    const regularUsed = this.removeSurfaceResourceFromZones('biomass', amount - hazardousUsed);
    const totalUsed = hazardousUsed + regularUsed;
    if (!(totalUsed > 0)) {
      return 0;
    }

    terraforming.synchronizeGlobalResources();

    if (hazardousUsed > 0) {
      resources.surface.hazardousBiomass.modifyRate(-(hazardousUsed / seconds), this.displayName, 'project');
      if (hazardManager?.hazardousBiomassHazard) {
        hazardManager.hazardousBiomassHazard.updateHazardousLandReservation(terraforming, hazardManager.parameters.hazardousBiomass);
      }
    }

    if (regularUsed > 0) {
      resources.surface.biomass.modifyRate(-(regularUsed / seconds), this.displayName, 'project');
    }

    return totalUsed;
  }

  getCompletionFraction() {
    const initialLand = this.getInitialLand();
    if (!(initialLand > 0)) {
      return 0;
    }
    return Math.max(0, Math.min(1, this.territory / initialLand));
  }

  syncLandReservation() {
    const shouldReserve = this.hasInitializedHive || this.isCompleted;
    const reserved = shouldReserve
      ? (this.isCompleted ? this.getInitialLand() : Math.max(0, this.territory))
      : 0;
    resources.surface.land.setReservedAmountForSource(KERATI_HIVE_RESERVATION_SOURCE, reserved);
  }

  update(deltaTime) {
    this.refreshTuning();
    this.syncLandReservation();
    if (!this.unlocked || !this.hasInitializedHive || this.isCompleted) {
      return;
    }

    const seconds = deltaTime / 1000;
    if (!(seconds > 0)) {
      return;
    }

    this.runLarvaProduction(seconds);
    this.runDrones(seconds);
    this.runBuilders(seconds);
    this.runHunters(seconds);
    this.checkCompletion();
  }

  runLarvaProduction(seconds) {
    const rates = this.tuning.rates;
    const larvaGain =
      (this.princesses * rates.princessLarvaPerSecond)
      + (this.queens * rates.queenLarvaPerSecond)
      + (this.empresses * rates.empressLarvaPerSecond);
    this.larva += larvaGain * seconds;
  }

  runDrones(seconds) {
    const rates = this.tuning.rates;
    const foodNeeded = this.drones * rates.droneFoodPerSecond * seconds;
    if (!(foodNeeded > 0)) {
      return;
    }
    const ratio = Math.min(1, this.hiveFood / foodNeeded);
    if (!(ratio > 0)) {
      return;
    }
    this.hiveFood -= foodNeeded * ratio;
    this.honey += this.drones * rates.droneHoneyPerSecond * seconds * ratio;
  }

  runBuilders(seconds) {
    const rates = this.tuning.rates;
    const poolCapacity = this.getPoolCapacityFromTerritory();
    if (this.spawningPools >= poolCapacity) {
      this.poolProgress = 0;
      return;
    }
    const poolGain = this.builders * rates.builderPoolProgressPerSecond * seconds;
    if (!(poolGain > 0)) {
      return;
    }
    this.poolProgress += poolGain;

    const maxBuildable = Math.max(0, poolCapacity - this.spawningPools);
    if (!(maxBuildable > 0)) {
      this.poolProgress = 0;
      return;
    }

    const completedPools = Math.min(maxBuildable, Math.floor(this.poolProgress));
    if (completedPools > 0) {
      this.spawningPools += completedPools;
      this.poolProgress -= completedPools;
    }

    if (this.spawningPools >= poolCapacity) {
      this.poolProgress = 0;
    }
  }

  runHunters(seconds) {
    if (!this.huntingEnabled || this.hunters <= 0) {
      return;
    }
    const rates = this.tuning.rates;
    const hunterCount = this.hunters;
    const biomassNeeded = hunterCount * rates.hunterBiomassPerSecond * seconds;
    if (biomassNeeded > 0) {
      const actualBiomass = this.consumeHunterBiomass(biomassNeeded, seconds);
      const biomassRatio = biomassNeeded > 0 ? (actualBiomass / biomassNeeded) : 0;
      if (actualBiomass > 0 && biomassRatio > 0) {
        this.hiveFood += hunterCount * rates.hunterFoodPerSecond * seconds * biomassRatio;
      }
    }
    const territoryGain = hunterCount * rates.hunterTerritoryPerSecond * seconds;
    if (territoryGain > 0) {
      this.territory = Math.min(this.getMaxTerritoryForGrowth(), this.territory + territoryGain);
    }
  }

  checkCompletion() {
    const initialLand = this.getInitialLand();
    if (!(initialLand > 0)) {
      return;
    }
    if (this.territory < initialLand) {
      return;
    }
    this.territory = initialLand;
    this.isCompleted = true;
    this.syncLandReservation();
  }

  getFoodTransferAmount() {
    return Math.max(1, this.foodTransferAmount || 1);
  }

  setFoodTransferAmount(value) {
    this.foodTransferAmount = Math.max(1, value || 1);
  }

  addFoodToHive(requestedAmount = this.getFoodTransferAmount()) {
    if (this.isCompleted) {
      return 0;
    }
    const amount = Math.max(0, requestedAmount || 0);
    const available = Math.max(0, resources.colony.food.value || 0);
    const actual = Math.min(amount, available);
    if (!(actual > 0)) {
      return 0;
    }
    resources.colony.food.decrease(actual);
    this.hiveFood += actual;
    return actual;
  }

  recoverLand() {
    const hadTerritory = this.territory > 0 || this.isCompleted;
    this.territory = 0;
    if (this.isCompleted) {
      this.isCompleted = false;
    }
    this.syncLandReservation();
    return hadTerritory;
  }

  setBatchAmount(actionId, value) {
    const maximum = this.tuning.batch.maxAmount;
    this.batchAmounts[actionId] = Math.max(1, Math.min(maximum, Math.round(value || 1)));
  }

  scaleBatchAmount(actionId, multiplier) {
    const current = this.batchAmounts[actionId] || 1;
    const next = multiplier > 1 ? multiplyByTen(current) : divideByTen(current);
    this.setBatchAmount(actionId, next);
  }

  getBatchAmount(actionId) {
    return Math.max(1, this.batchAmounts[actionId] || 1);
  }

  getUnitCost(unitId) {
    const costs = this.tuning.costs;
    if (unitId === 'drone') {
      return { larva: costs.droneLarva, honey: costs.droneHoney };
    }
    if (unitId === 'builder') {
      return { larva: costs.builderLarva, honey: costs.builderHoney };
    }
    if (unitId === 'hunter') {
      return { larva: costs.hunterLarva, honey: costs.hunterHoney };
    }
    if (unitId === 'princess') {
      return { larva: costs.princessLarva, honey: costs.princessHoney };
    }
    return { larva: 0, honey: 0 };
  }

  getMaxAffordableHatch(unitId) {
    const cost = this.getUnitCost(unitId);
    const larvaCap = cost.larva > 0 ? Math.floor(this.larva / cost.larva) : Infinity;
    const honeyCap = cost.honey > 0 ? Math.floor(this.honey / cost.honey) : Infinity;
    if (unitId === 'princess') {
      return Math.max(0, Math.min(larvaCap, honeyCap, this.getAvailableSpawnerSlots()));
    }
    return Math.max(0, Math.min(larvaCap, honeyCap));
  }

  getAvailableSpawnerSlots() {
    return Math.max(0, this.spawningPools - this.getTotalSpawners());
  }

  hatch(unitId, requestedAmount = this.getBatchAmount(unitId)) {
    if (this.isCompleted) {
      return 0;
    }
    const actual = Math.max(0, Math.min(this.getMaxAffordableHatch(unitId), Math.floor(requestedAmount || 0)));
    if (!(actual > 0)) {
      return 0;
    }
    const cost = this.getUnitCost(unitId);
    this.larva -= cost.larva * actual;
    this.honey -= cost.honey * actual;
    if (unitId === 'drone') {
      this.drones += actual;
    } else if (unitId === 'builder') {
      this.builders += actual;
    } else if (unitId === 'hunter') {
      this.hunters += actual;
    } else if (unitId === 'princess') {
      this.princesses += actual;
    }
    return actual;
  }

  getMaxAffordablePromotion(actionId) {
    const costs = this.tuning.costs;
    if (actionId === 'queenUpgrade') {
      return Math.max(0, Math.min(this.princesses, Math.floor(this.honey / costs.queenHoney)));
    }
    if (actionId === 'empressUpgrade') {
      return Math.max(0, Math.min(this.queens, Math.floor(this.honey / costs.empressHoney)));
    }
    return 0;
  }

  promote(actionId, requestedAmount = this.getBatchAmount(actionId)) {
    if (this.isCompleted) {
      return 0;
    }
    const actual = Math.max(0, Math.min(this.getMaxAffordablePromotion(actionId), Math.floor(requestedAmount || 0)));
    if (!(actual > 0)) {
      return 0;
    }
    if (actionId === 'queenUpgrade') {
      this.honey -= this.tuning.costs.queenHoney * actual;
      this.princesses -= actual;
      this.queens += actual;
      return actual;
    }
    if (actionId === 'empressUpgrade') {
      this.honey -= this.tuning.costs.empressHoney * actual;
      this.queens -= actual;
      this.empresses += actual;
      return actual;
    }
    return 0;
  }

  getNetRates() {
    const rates = this.tuning.rates;
    const droneRatio = this.drones > 0 && rates.droneFoodPerSecond > 0
      ? Math.min(1, this.hiveFood / Math.max(this.drones * rates.droneFoodPerSecond, 1e-9))
      : 0;
    const builderRatio = this.builders > 0 && this.spawningPools < this.getPoolCapacityFromTerritory() ? 1 : 0;
    const hunterFoodRatio = this.hunters > 0 && this.huntingEnabled && rates.hunterBiomassPerSecond > 0
      ? Math.min(1, this.getAvailableHunterBiomass() / Math.max(this.hunters * rates.hunterBiomassPerSecond, 1e-9))
      : 0;
    const hunterTerritoryRatio = this.hunters > 0 && this.huntingEnabled && rates.hunterTerritoryPerSecond > 0
      ? Math.min(1, this.getRemainingTerritoryCapacity() / Math.max(this.hunters * rates.hunterTerritoryPerSecond, 1e-9))
      : 0;
    return {
      honeyPerSecond: this.drones * rates.droneHoneyPerSecond * droneRatio,
      hiveFoodDeltaPerSecond: (this.hunters * rates.hunterFoodPerSecond * hunterFoodRatio) - (this.drones * rates.droneFoodPerSecond * droneRatio),
      larvaPerSecond:
        (this.princesses * rates.princessLarvaPerSecond)
        + (this.queens * rates.queenLarvaPerSecond)
        + (this.empresses * rates.empressLarvaPerSecond),
      poolProgressPerSecond: this.builders * rates.builderPoolProgressPerSecond * builderRatio,
      territoryPerSecond: this.hunters * rates.hunterTerritoryPerSecond * hunterTerritoryRatio,
      biomassPerSecond: this.hunters * rates.hunterBiomassPerSecond * hunterFoodRatio,
    };
  }

  createSummaryBox(summaryGrid, labelText, tooltipText = '') {
    const box = document.createElement('div');
    box.classList.add('stat-item', 'project-summary-box');
    const labelRow = document.createElement('div');
    labelRow.classList.add('kerati-hive-summary-label-row');
    const label = document.createElement('span');
    label.classList.add('stat-label');
    label.textContent = labelText;
    labelRow.appendChild(label);
    if (tooltipText) {
      const info = document.createElement('span');
      info.classList.add('info-tooltip-icon');
      info.innerHTML = '&#9432;';
      const tooltip = attachDynamicInfoTooltip(info, tooltipText);
      labelRow.appendChild(info);
      box._tooltipIcon = info;
      box._tooltip = tooltip;
    }
    const content = document.createElement('div');
    content.classList.add('project-summary-content');
    const value = document.createElement('span');
    value.classList.add('stat-value');
    content.appendChild(value);
    box.append(labelRow, content);
    summaryGrid.appendChild(box);
    return { box, label, content, value, tooltipIcon: box._tooltipIcon || null, tooltip: box._tooltip || null };
  }

  createActionRow(container, options) {
    const row = document.createElement('div');
    row.classList.add('kerati-hive-action-card');

    const info = document.createElement('div');
    info.classList.add('kerati-hive-action-card__info');
    const label = document.createElement('span');
    label.classList.add('kerati-hive-action-card__title');
    label.textContent = options.label;
    const value = document.createElement('span');
    value.classList.add('kerati-hive-action-card__summary');
    const availability = document.createElement('span');
    availability.classList.add('kerati-hive-action-card__summary', 'kerati-hive-action-card__availability');
    const meta = document.createElement('div');
    meta.classList.add('kerati-hive-action-card__meta');
    const metaCost = document.createElement('span');
    metaCost.classList.add('kerati-hive-action-card__meta-line');
    const metaEach = document.createElement('span');
    metaEach.classList.add('kerati-hive-action-card__meta-line');
    meta.append(metaCost, metaEach);
    info.append(label, value, availability, meta);

    const controls = document.createElement('div');
    controls.classList.add('kerati-hive-action-card__controls');
    const batchControls = document.createElement('div');
    batchControls.classList.add('kerati-hive-action-card__batch', 'main-buttons');
    const downButton = document.createElement('button');
    downButton.type = 'button';
    downButton.textContent = getKeratiHiveText('common.divideTen', '/10');
    downButton.addEventListener('click', () => {
      this.scaleBatchAmount(options.actionId, 0.1);
      this.updateUI();
    });
    const upButton = document.createElement('button');
    upButton.type = 'button';
    upButton.textContent = getKeratiHiveText('common.timesTen', 'x10');
    upButton.addEventListener('click', () => {
      this.scaleBatchAmount(options.actionId, 10);
      this.updateUI();
    });
    const actionButton = document.createElement('button');
    actionButton.type = 'button';
    actionButton.classList.add('progress-button', 'kerati-hive-action-card__button');
    actionButton.addEventListener('click', () => {
      options.onAction();
      this.checkCompletion();
      this.syncLandReservation();
      this.updateUI();
    });
    batchControls.append(downButton, upButton);
    controls.append(batchControls, actionButton);

    row.append(info, controls);
    container.appendChild(row);
    return { row, value, availability, metaCost, metaEach, actionButton, downButton, upButton };
  }

  getActionMeta(actionId) {
    this.refreshTuning();
    const rates = this.tuning.rates;
    if (actionId === 'drone') {
      return {
        cost: getKeratiHiveText('actions.drone.cost', 'Cost: {larva} larva + {honey} honey', {
          larva: formatNumber(this.tuning.costs.droneLarva, true, 3),
          honey: formatNumber(this.tuning.costs.droneHoney, true, 3),
        }),
        each: getKeratiHiveText('actions.drone.each', 'Each: {foodRate} food/s -> {honeyRate} honey/s', {
          foodRate: formatNumber(rates.droneFoodPerSecond, true, 3),
          honeyRate: formatNumber(rates.droneHoneyPerSecond, true, 3),
        }),
      };
    }
    if (actionId === 'builder') {
      return {
        cost: getKeratiHiveText('actions.builder.cost', 'Cost: {larva} larva + {honey} honey', {
          larva: formatNumber(this.tuning.costs.builderLarva, true, 3),
          honey: formatNumber(this.tuning.costs.builderHoney, true, 3),
        }),
        each: getKeratiHiveText('actions.builder.each', 'Each: {poolRate} pool/s', {
          poolRate: formatNumber(rates.builderPoolProgressPerSecond, true, 3),
        }),
      };
    }
    if (actionId === 'hunter') {
      return {
        cost: getKeratiHiveText('actions.hunter.cost', 'Cost: {larva} larva + {honey} honey', {
          larva: formatNumber(this.tuning.costs.hunterLarva, true, 3),
          honey: formatNumber(this.tuning.costs.hunterHoney, true, 3),
        }),
        each: getKeratiHiveText('actions.hunter.each', 'Each: {biomassRate} biomass/s -> {foodRate} food/s + {territoryRate} territory/s', {
          biomassRate: formatNumber(rates.hunterBiomassPerSecond, true, 3),
          foodRate: formatNumber(rates.hunterFoodPerSecond, true, 3),
          territoryRate: formatNumber(rates.hunterTerritoryPerSecond, true, 3),
        }),
      };
    }
    if (actionId === 'princess') {
      return {
        cost: getKeratiHiveText('actions.princess.cost', 'Cost: {larva} larva + {honey} honey', {
          larva: formatNumber(this.tuning.costs.princessLarva, true, 3),
          honey: formatNumber(this.tuning.costs.princessHoney, true, 3),
        }),
        each: getKeratiHiveText('actions.princess.each', 'Each: {larvaRate} larva/s', {
          larvaRate: formatNumber(rates.princessLarvaPerSecond, true, 3),
        }),
      };
    }
    if (actionId === 'queenUpgrade') {
      return {
        cost: getKeratiHiveText('actions.queen.cost', 'Cost: 1 princess + {honey} honey', {
          honey: formatNumber(this.tuning.costs.queenHoney, true, 3),
        }),
        each: getKeratiHiveText('actions.queen.each', 'Each: {larvaRate} larva/s', {
          larvaRate: formatNumber(rates.queenLarvaPerSecond, true, 3),
        }),
      };
    }
    if (actionId === 'empressUpgrade') {
      return {
        cost: getKeratiHiveText('actions.empress.cost', 'Cost: 1 queen + {honey} honey', {
          honey: formatNumber(this.tuning.costs.empressHoney, true, 3),
        }),
        each: getKeratiHiveText('actions.empress.each', 'Each: {larvaRate} larva/s', {
          larvaRate: formatNumber(rates.empressLarvaPerSecond, true, 3),
        }),
      };
    }
    return { cost: '', each: '' };
  }

  getSpawningPoolsTooltipText() {
    this.refreshTuning();
    const territoryPerPool = this.getTerritoryPerPool();
    const territory = Math.max(0, this.territory);
    const cap = this.getPoolCapacityFromTerritory();
    return getKeratiHiveText(
      'summary.poolsTooltip',
      'Spawning pool cap comes from Hive territory. Each pool needs {territoryPerPool} territory, so {territory} territory supports up to {cap} pools.',
      {
        territoryPerPool: formatNumber(territoryPerPool, true, 3),
        territory: formatNumber(territory, true, 3),
        cap: formatNumber(cap, true, 3),
      }
    );
  }

  renderUI(container) {
    const card = document.createElement('div');
    card.classList.add('info-card', 'kerati-hive-card');

    const header = document.createElement('div');
    header.classList.add('card-header');
    const title = document.createElement('span');
    title.classList.add('card-title');
    title.textContent = getKeratiHiveText('title', 'Kerati Hive');
    const info = document.createElement('span');
    info.classList.add('info-tooltip-icon');
    info.innerHTML = '&#9432;';
    attachDynamicInfoTooltip(info, getKeratiHiveText('tooltip', 'Grow the hive by feeding drones, breeding spawners, and sending hunters to claim territory.'));
    header.append(title, info);
    card.appendChild(header);

    const body = document.createElement('div');
    body.classList.add('card-body', 'kerati-hive-layout');

    const statusCard = document.createElement('div');
    statusCard.classList.add('kerati-hive-status-card');
    const progressBar = document.createElement('div');
    progressBar.classList.add('kerati-hive-status-card__bar');
    const progressFill = document.createElement('div');
    progressFill.classList.add('kerati-hive-status-card__fill');
    progressBar.appendChild(progressFill);
    const progressLine = document.createElement('div');
    progressLine.classList.add('kerati-hive-status-card__text');
    statusCard.append(progressBar, progressLine);
    body.appendChild(statusCard);

    const summaryLayout = document.createElement('div');
    summaryLayout.classList.add('kerati-hive-summary-layout');

    const territoryPanel = document.createElement('div');
    territoryPanel.classList.add('kerati-hive-panel', 'kerati-hive-summary-panel');
    const territoryHeader = document.createElement('div');
    territoryHeader.classList.add('kerati-hive-section-header');
    const territoryTitle = document.createElement('span');
    territoryTitle.classList.add('kerati-hive-section-title');
    territoryTitle.textContent = getKeratiHiveText('sections.hiveOverview', 'Hive');
    territoryHeader.appendChild(territoryTitle);
    territoryPanel.appendChild(territoryHeader);
    const territoryGrid = document.createElement('div');
    territoryGrid.classList.add('stats-grid', 'two-col', 'project-summary-grid');
    const territoryValue = this.createSummaryBox(territoryGrid, getKeratiHiveText('summary.territory', 'Territory'));
    const poolsValue = this.createSummaryBox(
      territoryGrid,
      getKeratiHiveText('summary.pools', 'Spawning Pools'),
      this.getSpawningPoolsTooltipText()
    );
    const spawnersValue = this.createSummaryBox(territoryGrid, getKeratiHiveText('summary.spawners', 'Spawners'));
    const larvaValue = this.createSummaryBox(territoryGrid, getKeratiHiveText('summary.larva', 'Larva'));
    territoryPanel.appendChild(territoryGrid);

    const hivePanel = document.createElement('div');
    hivePanel.classList.add('kerati-hive-panel', 'kerati-hive-summary-panel');
    const hiveHeader = document.createElement('div');
    hiveHeader.classList.add('kerati-hive-section-header');
    const hiveTitle = document.createElement('span');
    hiveTitle.classList.add('kerati-hive-section-title');
    hiveTitle.textContent = getKeratiHiveText('sections.hiveStores', 'Hive Stores');
    const colonyFoodValue = document.createElement('span');
    colonyFoodValue.classList.add('kerati-hive-section-meta');
    hiveHeader.append(hiveTitle, colonyFoodValue);
    hivePanel.appendChild(hiveHeader);
    const hiveGrid = document.createElement('div');
    hiveGrid.classList.add('stats-grid', 'two-col', 'project-summary-grid');
    const foodValue = this.createSummaryBox(hiveGrid, getKeratiHiveText('summary.hiveFood', 'Hive Food'));
    const honeyValue = this.createSummaryBox(hiveGrid, getKeratiHiveText('summary.honey', 'Honey'));
    hivePanel.appendChild(hiveGrid);

    const transferControls = document.createElement('div');
    transferControls.classList.add('kerati-hive-transfer-controls');
    const transferInput = document.createElement('input');
    transferInput.type = 'text';
    transferInput.classList.add('space-storage-settings-input', 'kerati-hive-transfer-input');
    wireStringNumberInput(transferInput, {
      parseValue: (value) => Math.max(1, parseFlexibleNumber(value) || 1),
      formatValue: (value) => formatNumber(value, true),
      onValue: (value) => {
        this.setFoodTransferAmount(value);
        this.updateUI();
      },
    });
    transferInput.dataset.keratiHiveFood = String(this.getFoodTransferAmount());
    const addFoodButton = document.createElement('button');
    addFoodButton.type = 'button';
    addFoodButton.classList.add('progress-button', 'kerati-hive-transfer-button');
    addFoodButton.addEventListener('click', () => {
      this.addFoodToHive();
      this.updateUI();
    });
    const maxFoodButton = document.createElement('button');
    maxFoodButton.type = 'button';
    maxFoodButton.classList.add('kerati-hive-transfer-button');
    maxFoodButton.textContent = getKeratiHiveText('common.max', 'Max');
    maxFoodButton.addEventListener('click', () => {
      this.addFoodToHive(resources.colony.food.value || 0);
      this.updateUI();
    });
    transferControls.append(transferInput, addFoodButton, maxFoodButton);
    hivePanel.appendChild(transferControls);

    summaryLayout.append(territoryPanel, hivePanel);
    body.appendChild(summaryLayout);

    const workersSection = document.createElement('div');
    workersSection.classList.add('kerati-hive-section', 'kerati-hive-panel');
    const workersHeader = document.createElement('div');
    workersHeader.classList.add('kerati-hive-section-header');
    const workersTitle = document.createElement('span');
    workersTitle.classList.add('kerati-hive-section-title');
    workersTitle.textContent = getKeratiHiveText('sections.workers', 'Workers');
    const workersControls = document.createElement('div');
    workersControls.classList.add('kerati-hive-section-controls');
    const huntingToggle = createToggleButton({
      onLabel: getKeratiHiveText('hunting.on', 'Hunting On'),
      offLabel: getKeratiHiveText('hunting.off', 'Hunting Off'),
      isOn: this.huntingEnabled,
    });
    huntingToggle.addEventListener('click', () => {
      this.huntingEnabled = !this.huntingEnabled;
      this.updateUI();
    });
    const recoverLandButton = document.createElement('button');
    recoverLandButton.type = 'button';
    recoverLandButton.classList.add('kerati-hive-recover-button');
    recoverLandButton.textContent = getKeratiHiveText('hunting.recoverLand', 'Recover Land');
    recoverLandButton.addEventListener('click', () => {
      this.recoverLand();
      this.updateUI();
    });
    workersControls.append(huntingToggle, recoverLandButton);
    workersHeader.append(workersTitle, workersControls);
    workersSection.appendChild(workersHeader);
    const workersGrid = document.createElement('div');
    workersGrid.classList.add('kerati-hive-action-grid');

    const droneRow = this.createActionRow(workersGrid, {
      actionId: 'drone',
      label: getKeratiHiveText('actions.drone.label', 'Drones'),
      onAction: () => this.hatch('drone'),
    });
    const builderRow = this.createActionRow(workersGrid, {
      actionId: 'builder',
      label: getKeratiHiveText('actions.builder.label', 'Builders'),
      onAction: () => this.hatch('builder'),
    });
    const hunterRow = this.createActionRow(workersGrid, {
      actionId: 'hunter',
      label: getKeratiHiveText('actions.hunter.label', 'Hunters'),
      onAction: () => this.hatch('hunter'),
    });
    workersSection.appendChild(workersGrid);
    body.appendChild(workersSection);

    const spawnerSection = document.createElement('div');
    spawnerSection.classList.add('kerati-hive-section', 'kerati-hive-panel');
    const spawnerHeader = document.createElement('div');
    spawnerHeader.classList.add('kerati-hive-section-header');
    const spawnerTitle = document.createElement('span');
    spawnerTitle.classList.add('kerati-hive-section-title');
    spawnerTitle.textContent = getKeratiHiveText('sections.spawners', 'Spawners');
    spawnerHeader.appendChild(spawnerTitle);
    spawnerSection.appendChild(spawnerHeader);
    const spawnerGrid = document.createElement('div');
    spawnerGrid.classList.add('kerati-hive-action-grid');

    const princessRow = this.createActionRow(spawnerGrid, {
      actionId: 'princess',
      label: getKeratiHiveText('actions.princess.label', 'Princesses'),
      onAction: () => this.hatch('princess'),
    });
    const queenRow = this.createActionRow(spawnerGrid, {
      actionId: 'queenUpgrade',
      label: getKeratiHiveText('actions.queen.label', 'Queens'),
      onAction: () => this.promote('queenUpgrade'),
    });
    const empressRow = this.createActionRow(spawnerGrid, {
      actionId: 'empressUpgrade',
      label: getKeratiHiveText('actions.empress.label', 'Empresses'),
      onAction: () => this.promote('empressUpgrade'),
    });
    spawnerSection.appendChild(spawnerGrid);
    body.appendChild(spawnerSection);

    card.appendChild(body);
    container.appendChild(card);

    this.uiElements = {
      card,
      territoryValue: territoryValue.value,
      poolsValue: poolsValue.value,
      poolsTooltip: poolsValue.tooltip,
      spawnersValue: spawnersValue.value,
      foodValue: foodValue.value,
      honeyValue: honeyValue.value,
      larvaValue: larvaValue.value,
      progressFill,
      progressLine,
      colonyFoodValue,
      transferInput,
      addFoodButton,
      maxFoodButton,
      huntingToggle,
      recoverLandButton,
      actions: {
        drone: droneRow,
        builder: builderRow,
        hunter: hunterRow,
        princess: princessRow,
        queenUpgrade: queenRow,
        empressUpgrade: empressRow,
      },
    };

    this.updateUI();
  }

  updateUI() {
    if (!this.uiElements) {
      return;
    }
    this.refreshTuning();

    const rates = this.getNetRates();
    const poolsCapacity = this.getPoolCapacityFromTerritory();
    const territoryTarget = this.getInitialLand();
    this.syncLandReservation();

    this.uiElements.territoryValue.textContent = `${formatNumber(this.territory, true, 3)} / ${formatNumber(territoryTarget, true, 3)}`;
    this.uiElements.poolsValue.textContent = `${formatNumber(this.spawningPools, true, 3)} / ${formatNumber(poolsCapacity, true, 3)}`;
    this.uiElements.spawnersValue.textContent = `${formatNumber(this.getTotalSpawners(), true, 3)} / ${formatNumber(this.spawningPools, true, 3)}`;
    this.uiElements.foodValue.textContent = formatNumber(this.hiveFood, true, 3);
    this.uiElements.honeyValue.textContent = formatNumber(this.honey, true, 3);
    this.uiElements.larvaValue.textContent = formatNumber(this.larva, true, 3);
    this.uiElements.colonyFoodValue.textContent = getKeratiHiveText('foodTransfer.available', 'Colony Food {value}', {
      value: formatNumber(resources.colony.food.value || 0, true, 3),
    });
    this.uiElements.addFoodButton.textContent = getKeratiHiveText('foodTransfer.add', 'Add Food');

    if (document.activeElement !== this.uiElements.transferInput) {
      this.uiElements.transferInput.dataset.keratiHiveFood = String(this.getFoodTransferAmount());
      this.uiElements.transferInput.value = formatNumber(this.getFoodTransferAmount(), true);
    }

    setToggleButtonState(this.uiElements.huntingToggle, this.huntingEnabled);
    this.uiElements.recoverLandButton.disabled = !this.territory && !this.isCompleted;

    const setActionState = (actionId, count, labelKey, buttonKey, maxCount) => {
      const action = this.uiElements.actions[actionId];
      const batch = this.getBatchAmount(actionId);
      action.value.textContent = getKeratiHiveText(`${labelKey}.owned`, '{count} owned', {
        count: formatNumber(count, true, 3),
      });
      action.availability.textContent = getKeratiHiveText(`${labelKey}.available`, 'Can {available}', {
        available: formatNumber(maxCount, true, 3),
      });
      const meta = this.getActionMeta(actionId);
      action.metaCost.textContent = meta.cost;
      action.metaEach.textContent = meta.each;
      action.actionButton.textContent = getKeratiHiveText(buttonKey, 'x{count}', { count: formatNumber(batch, true, 0) });
      action.actionButton.disabled = this.isCompleted || maxCount <= 0;
      action.downButton.disabled = this.isCompleted;
      action.upButton.disabled = this.isCompleted;
    };

    setActionState('drone', this.drones, 'actions.drone.summary', 'actions.drone.button', this.getMaxAffordableHatch('drone'));
    setActionState('builder', this.builders, 'actions.builder.summary', 'actions.builder.button', this.getMaxAffordableHatch('builder'));
    setActionState('hunter', this.hunters, 'actions.hunter.summary', 'actions.hunter.button', this.getMaxAffordableHatch('hunter'));
    setActionState('princess', this.princesses, 'actions.princess.summary', 'actions.princess.button', this.getMaxAffordableHatch('princess'));
    setActionState('queenUpgrade', this.queens, 'actions.queen.summary', 'actions.queen.button', this.getMaxAffordablePromotion('queenUpgrade'));
    setActionState('empressUpgrade', this.empresses, 'actions.empress.summary', 'actions.empress.button', this.getMaxAffordablePromotion('empressUpgrade'));

    const progressPercent = Math.max(0, Math.min(100, this.getCompletionFraction() * 100));
    const progressText = this.isCompleted
      ? getKeratiHiveText('status.completed', 'Kerati Hive complete. Territory covers the world and provides {workers} workers.', {
          workers: formatNumber(this.getCompletedWorkerContribution(), true, 3),
        })
      : getKeratiHiveText('status.progress', 'Completion {percent}% | Honey {honey}/s | Larva {larva}/s | Food {food}/s | Territory {territory}/s | Biomass use {biomass}/s', {
          percent: formatNumber(progressPercent, false, 2),
          honey: formatNumber(rates.honeyPerSecond, true, 3),
          larva: formatNumber(rates.larvaPerSecond, true, 3),
          food: formatNumber(rates.hiveFoodDeltaPerSecond, true, 3),
          territory: formatNumber(rates.territoryPerSecond, true, 3),
          biomass: formatNumber(rates.biomassPerSecond, true, 3),
        });
    this.uiElements.progressLine.textContent = progressText;
    this.uiElements.progressFill.style.width = `${progressPercent}%`;
    this.uiElements.progressLine.style.color = this.isCompleted ? '#2f7a35' : '';
    if (this.uiElements.poolsTooltip) {
      setTooltipText(this.uiElements.poolsTooltip, this.getSpawningPoolsTooltipText());
    }
  }

  saveState() {
    const state = super.saveState();
    state.keratiHive = {
      hasInitializedHive: this.hasInitializedHive === true,
      huntingEnabled: this.huntingEnabled === true,
      foodTransferAmount: this.foodTransferAmount,
      batchAmounts: { ...this.batchAmounts },
      territory: this.territory,
      spawningPools: this.spawningPools,
      poolProgress: this.poolProgress,
      hiveFood: this.hiveFood,
      honey: this.honey,
      larva: this.larva,
      drones: this.drones,
      builders: this.builders,
      hunters: this.hunters,
      princesses: this.princesses,
      queens: this.queens,
      empresses: this.empresses,
    };
    return state;
  }

  loadState(state) {
    this.refreshTuning();
    super.loadState(state);
    const saved = state.keratiHive || {};
    this.hasInitializedHive = saved.hasInitializedHive === true;
    this.huntingEnabled = saved.huntingEnabled !== false;
    this.foodTransferAmount = Math.max(1, saved.foodTransferAmount || this.tuning.foodTransfer.defaultAmount);
    this.batchAmounts = {};
    KERATI_HIVE_ACTION_ORDER.forEach((actionId) => {
      this.batchAmounts[actionId] = Math.max(1, saved.batchAmounts?.[actionId] || this.tuning.batch.defaultAmount);
    });
    this.territory = saved.territory ?? this.tuning.initialState.territory;
    this.spawningPools = saved.spawningPools ?? this.tuning.initialState.spawningPools;
    this.poolProgress = saved.poolProgress ?? this.tuning.initialState.poolProgress;
    this.hiveFood = saved.hiveFood ?? this.tuning.initialState.hiveFood;
    this.honey = saved.honey ?? this.tuning.initialState.honey;
    this.larva = saved.larva ?? this.tuning.initialState.larva;
    this.drones = saved.drones ?? this.tuning.initialState.drones;
    this.builders = saved.builders ?? this.tuning.initialState.builders;
    this.hunters = saved.hunters ?? this.tuning.initialState.hunters;
    this.princesses = saved.princesses ?? this.tuning.initialState.princesses;
    this.queens = saved.queens ?? this.tuning.initialState.queens;
    this.empresses = saved.empresses ?? this.tuning.initialState.empresses;
    this.syncLandReservation();
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = KeratiHiveProject;
} else {
  window.KeratiHiveProject = KeratiHiveProject;
}
