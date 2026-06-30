(function () {
  const RESORT_VACATION_PREP_SECONDS = 15;
  const RESORT_VACATION_EFFECT_SECONDS = 30;
  const RESORT_VACATION_COOLDOWN_SECONDS = 320;
  const RESORT_VACATION_SOURCE_ID = 'resortWorldVacation';
  const RESORT_VACATION_RESOURCE_SOURCE_ID = 'resortWorldVacationResourceGlow';
  const RESORT_VACATION_WORKER_SOURCE_ID = 'resortWorldVacationWorker';
  const RESORT_GLOW_RESOURCE_SOURCE_ID = 'resortWorldGlowResourceGlow';
  const RESORT_RESOURCE_FLAG_ID = 'resortVacation';
  const RESORT_GLOW_RESOURCE_IDS = ['food', 'components', 'electronics', 'superconductors', 'superalloys', 'androids'];
  const RESORT_WORKER_MULTIPLIER = 0.5;
  const RESORT_BASE_HAPPINESS_BONUS = 0.05;
  const RESORT_BASE_FACTORY_THROUGHPUT_BONUS = 0.25;
  const RESORT_BASE_FUNDING_PER_COLONIST = 10;
  const RESORT_SHOP_ITEMS = [
    {
      id: 'happiness',
      stat: 'happiness',
      maxPurchases: Infinity,
      label: getResortWorldText('catalogs.specializations.resort.shopItems.happiness.label'),
      description: getResortWorldText('catalogs.specializations.resort.shopItems.happiness.description'),
    },
    {
      id: 'factoryThroughput',
      stat: 'factoryThroughput',
      maxPurchases: Infinity,
      label: getResortWorldText('catalogs.specializations.resort.shopItems.factoryThroughput.label'),
      description: getResortWorldText('catalogs.specializations.resort.shopItems.factoryThroughput.description'),
    },
    {
      id: 'fundingPerColonist',
      stat: 'fundingPerColonist',
      maxPurchases: Infinity,
      label: getResortWorldText('catalogs.specializations.resort.shopItems.fundingPerColonist.label'),
      description: getResortWorldText('catalogs.specializations.resort.shopItems.fundingPerColonist.description'),
    },
  ];
  const RESORT_SHOP_ITEM_MAP = RESORT_SHOP_ITEMS.reduce((acc, item) => {
    acc[item.id] = item;
    return acc;
  }, {});
  let resortVacationGoldButton = null;

  class ResortWorldProject extends SpecializationProject {
    constructor(config, name) {
      super(config, name, {
        pointsKey: 'resortPoints',
        pointsLabel: getResortWorldText('catalogs.specializations.resort.pointsLabel'),
        pointsUnit: 'RP',
        shopTitle: getResortWorldText('catalogs.specializations.resort.shopTitle'),
        shopTooltip: getResortWorldText('catalogs.specializations.resort.shopTooltip'),
        emptyShopText: getResortWorldText('catalogs.specializations.resort.emptyShopText'),
        shopItems: RESORT_SHOP_ITEMS,
        shopItemMap: RESORT_SHOP_ITEM_MAP,
        specializationSourceId: 'resortWorld',
        otherSpecializationIds: [],
        ecumenopolisEffectPrefix: 'resortWorld',
      });
      this.vacationState = 'ready';
      this.vacationTimer = 0;
      this.showVacationButtonAboveResources = false;
      this.factoryEffectsApplied = false;
      this.vacationResourceEffectsApplied = false;
      this.glowResourceEffectsApplied = false;
      this.lastFactoryMultiplier = 1;
      this.lastWorkerComposition = {
        colonistWorkers: 0,
        androidWorkers: 0,
        bioworkers: 0,
        ratio: 0,
      };
      this.ui = null;
    }

    getWaterCoverage() {
      return calculateAverageCoverage(terraforming, 'liquidWater') || 0;
    }

    getMinimumZoneTemperature() {
      let minimum = Infinity;
      const zones = terraforming.zoneKeys && terraforming.zoneKeys.length ? terraforming.zoneKeys : ZONES;
      for (let i = 0; i < zones.length; i += 1) {
        const zone = zones[i];
        const value = terraforming.temperature.zones[zone].value;
        if (value < minimum) {
          minimum = value;
        }
      }
      return minimum;
    }

    getBeachSilicaCost() {
      const surfaceArea = Math.max(0, terraforming.celestialParameters.surfaceArea || 0);
      const landFraction = Math.max(0, 1 - this.getWaterCoverage());
      return estimateAmountForCoverage(1, surfaceArea * landFraction);
    }

    getEffectiveCost(buildCount = 1) {
      const cost = super.getEffectiveCost(buildCount);
      const beachSilicaCost = this.getBeachSilicaCost() * buildCount;
      if (beachSilicaCost > 0) {
        cost.colony ||= {};
        cost.colony.silicon = (cost.colony.silicon || 0) + beachSilicaCost;
      }
      return cost;
    }

    getSpecializationRequirements() {
      const waterCoverage = this.getWaterCoverage();
      const minimumZoneTemperature = this.getMinimumZoneTemperature();
      const beachSilicaCost = this.getBeachSilicaCost();
      const temperatureUnit = getTemperatureUnit();
      const coldestDisplayTemperature = Math.floor(toDisplayTemperature(minimumZoneTemperature) * 100) / 100;
      return [
        {
          id: 'terraformed',
          label: getResortWorldText('catalogs.specializations.resort.requirements.terraformed'),
          met: spaceManager.isCurrentWorldTerraformed(),
        },
        {
          id: 'waterCoverage',
          label: getResortWorldText('catalogs.specializations.resort.requirements.waterCoverage', {
            value: formatNumber(waterCoverage * 100, false, 2),
          }),
          met: waterCoverage >= 0.75,
        },
        {
          id: 'zoneTemperature',
          label: getResortWorldText('catalogs.specializations.resort.requirements.zoneTemperature', {
            target: formatNumber(toDisplayTemperature(293.15), false, 2),
            value: formatNumber(coldestDisplayTemperature, false, 2),
            unit: temperatureUnit,
          }),
          met: minimumZoneTemperature >= 293.15,
        },
        {
          id: 'beachSilica',
          label: getResortWorldText('catalogs.specializations.resort.requirements.beachSilica', {
            value: formatNumber(beachSilicaCost, true, 2),
          }),
          met: resources.colony.silicon.value >= beachSilicaCost,
        },
        {
          id: 'ecumenopolisCount',
          label: getResortWorldText('catalogs.specializations.resort.requirements.ecumenopolisCount'),
          met: colonies.t7_colony.count < 1000,
        },
        {
          id: 'otherSpecialization',
          label: getResortWorldText('catalogs.specializations.resort.requirements.otherSpecialization'),
          met: !hasOtherWorldSpecialization(this),
        },
      ];
    }

    canStart() {
      return super.canStart()
        && spaceManager.isCurrentWorldTerraformed()
        && this.getWaterCoverage() >= 0.75
        && this.getMinimumZoneTemperature() >= 293.15
        && colonies.t7_colony.count < 1000;
    }

    getTravelPointGain() {
      return this.isCompleted ? 1 : 0;
    }

    getShopItemCost(item) {
      const purchases = this.getShopPurchaseCount(item.id);
      return (purchases + 1) * (purchases + 1);
    }

    getShopBuyButtonText() {
      return getResortWorldText('catalogs.specializations.resort.shop.buy');
    }

    getShopMaxButtonText() {
      return getResortWorldText('catalogs.specializations.resort.shop.buyMax');
    }

    getMaxShopPurchases(item) {
      const points = this.getSpecializationPoints();
      if (points < this.getShopItemCost(item)) {
        return 0;
      }
      const current = this.getShopPurchaseCount(item.id);
      let low = 0;
      let high = 1;
      while (this.getCumulativeQuadraticCost(current, high) <= points) {
        high *= 2;
      }
      while (low + 1 < high) {
        const mid = Math.floor((low + high) / 2);
        if (this.getCumulativeQuadraticCost(current, mid) <= points) {
          low = mid;
        } else {
          high = mid;
        }
      }
      return low;
    }

    getCumulativeQuadraticCost(currentPurchases, purchaseCount) {
      if (purchaseCount <= 0) {
        return 0;
      }
      const end = currentPurchases + purchaseCount;
      return this.sumSquares(end) - this.sumSquares(currentPurchases);
    }

    sumSquares(value) {
      return value * (value + 1) * (2 * value + 1) / 6;
    }

    getSpentResortPoints() {
      let spent = 0;
      for (let i = 0; i < this.shopItems.length; i += 1) {
        spent += this.sumSquares(this.getShopPurchaseCount(this.shopItems[i].id));
      }
      return spent;
    }

    getEarnedResortPoints() {
      return this.getSpecializationPoints() + this.getSpentResortPoints();
    }

    hasVacationAccess() {
      return this.getEarnedResortPoints() > 0;
    }

    getHappinessBonus() {
      return RESORT_BASE_HAPPINESS_BONUS + this.getShopPurchaseCount('happiness') * 0.01;
    }

    getFactoryThroughputBaseBonus() {
      return RESORT_BASE_FACTORY_THROUGHPUT_BONUS + this.getShopPurchaseCount('factoryThroughput') * 0.05;
    }

    getFundingPerColonist() {
      return RESORT_BASE_FUNDING_PER_COLONIST + this.getShopPurchaseCount('fundingPerColonist') * 2;
    }

    isVacationPrepActive() {
      return this.hasVacationAccess() && this.vacationState === 'prep';
    }

    getVacationWorkerMultiplier() {
      return this.isVacationPrepActive() ? RESORT_WORKER_MULTIPLIER : 1;
    }

    isVacationEffectActive() {
      return this.hasVacationAccess() && this.vacationState === 'effect';
    }

    getWorkerCompositionRatio() {
      const breakdown = populationModule.getWorkerCapacityBreakdown();
      const colonistWorkers = Math.max(0, breakdown.colonistWorkers || 0);
      const androidWorkers = Math.max(0, breakdown.androidWorkers || 0);
      const bioworkers = Math.max(0, breakdown.bioworkers || 0);
      const total = colonistWorkers + androidWorkers + bioworkers;
      const ratio = total > 0 ? colonistWorkers / total : 0;
      this.lastWorkerComposition = {
        colonistWorkers,
        androidWorkers,
        bioworkers,
        ratio,
      };
      return ratio;
    }

    getCurrentFactoryMultiplier() {
      if (!this.isVacationEffectActive()) {
        return 1;
      }
      return 1 + this.getFactoryThroughputBaseBonus() * this.getWorkerCompositionRatio();
    }

    canStartVacation() {
      return this.hasVacationAccess() && this.vacationState === 'ready';
    }

    startVacation() {
      if (!this.canStartVacation()) {
        return false;
      }
      this.vacationState = 'prep';
      this.vacationTimer = RESORT_VACATION_PREP_SECONDS;
      this.removeFactoryEffects();
      this.applyVacationWorkerEffect();
      projectManager.markUIDirty();
      return true;
    }

    getVacationStateText() {
      if (!this.hasVacationAccess()) {
        return '';
      }
      if (this.vacationState === 'prep') {
        return getResortWorldText('catalogs.specializations.resort.vacation.prep', {
          time: formatNumber(this.vacationTimer, false, 1),
        });
      }
      if (this.vacationState === 'effect') {
        return getResortWorldText('catalogs.specializations.resort.vacation.effect', {
          time: formatNumber(this.vacationTimer, false, 1),
        });
      }
      if (this.vacationState === 'cooldown') {
        return getResortWorldText('catalogs.specializations.resort.vacation.cooldown', {
          time: formatNumber(this.vacationTimer, false, 1),
        });
      }
      return '';
    }

    getVacationButtonText() {
      const stateText = this.getVacationStateText();
      return stateText || getResortWorldText('catalogs.specializations.resort.vacation.button');
    }

    getVacationStageDuration() {
      if (this.vacationState === 'prep') {
        return RESORT_VACATION_PREP_SECONDS;
      }
      if (this.vacationState === 'effect') {
        return RESORT_VACATION_EFFECT_SECONDS;
      }
      if (this.vacationState === 'cooldown') {
        return RESORT_VACATION_COOLDOWN_SECONDS;
      }
      return 0;
    }

    getVacationStageProgress() {
      const duration = this.getVacationStageDuration();
      if (duration <= 0) {
        return 0;
      }
      return Math.max(0, Math.min(1, (duration - this.vacationTimer) / duration));
    }

    isFactoryBuilding(building) {
      return !!(building && building.getTotalWorkerNeed && building.getTotalWorkerNeed() > 0);
    }

    removeFactoryEffects(force = false) {
      if (!force && !this.factoryEffectsApplied && this.lastFactoryMultiplier === 1) {
        return;
      }
      for (const id in buildings) {
        buildings[id].removeEffect({ sourceId: RESORT_VACATION_SOURCE_ID });
      }
      this.factoryEffectsApplied = false;
      this.lastFactoryMultiplier = 1;
    }

    getVacationResourceEffects() {
      return createResourceFlagEffects('colony', ['funding'], RESORT_RESOURCE_FLAG_ID, 'resort-vacation');
    }

    getGlowResourceEffects() {
      return createResourceFlagEffects('colony', RESORT_GLOW_RESOURCE_IDS, RESORT_RESOURCE_FLAG_ID, 'resort-glow');
    }

    applyResourceFlagEffects(effects, sourceId) {
      effects.forEach(effect => addEffect({ ...effect, sourceId }));
    }

    removeResourceFlagEffects(effects, sourceId) {
      effects.forEach(effect => removeEffect({ ...effect, sourceId }));
    }

    applyVacationResourceEffects() {
      if (this.vacationResourceEffectsApplied) {
        return;
      }
      this.applyResourceFlagEffects(this.getVacationResourceEffects(), RESORT_VACATION_RESOURCE_SOURCE_ID);
      this.vacationResourceEffectsApplied = true;
    }

    removeVacationResourceEffects(force = false) {
      if (!force && !this.vacationResourceEffectsApplied) {
        return;
      }
      this.removeResourceFlagEffects(this.getVacationResourceEffects(), RESORT_VACATION_RESOURCE_SOURCE_ID);
      this.vacationResourceEffectsApplied = false;
    }

    applyGlowResourceEffects() {
      if (this.glowResourceEffectsApplied) {
        return;
      }
      this.applyResourceFlagEffects(this.getGlowResourceEffects(), RESORT_GLOW_RESOURCE_SOURCE_ID);
      this.glowResourceEffectsApplied = true;
    }

    removeGlowResourceEffects(force = false) {
      if (!force && !this.glowResourceEffectsApplied) {
        return;
      }
      this.removeResourceFlagEffects(this.getGlowResourceEffects(), RESORT_GLOW_RESOURCE_SOURCE_ID);
      this.glowResourceEffectsApplied = false;
    }

    removeAllResourceEffects(force = false) {
      this.removeVacationResourceEffects(force);
      this.removeGlowResourceEffects(force);
    }

    applyVacationWorkerEffect() {
      if (!this.isVacationPrepActive()) {
        return;
      }
      addEffect({
        target: 'population',
        type: 'colonistWorkerEfficiencyMultiplier',
        value: this.getVacationWorkerMultiplier(),
        effectId: 'resort-vacation-worker-efficiency',
        sourceId: RESORT_VACATION_WORKER_SOURCE_ID,
        name: getResortWorldText('catalogs.specializations.resort.vacation.button'),
      });
    }

    removeVacationWorkerEffect() {
      removeEffect({ target: 'population', sourceId: RESORT_VACATION_WORKER_SOURCE_ID });
    }

    applyFactoryEffects() {
      const multiplier = this.getCurrentFactoryMultiplier();
      if (Math.abs(multiplier - this.lastFactoryMultiplier) <= 1e-9 && this.factoryEffectsApplied) {
        return;
      }
      for (const id in buildings) {
        const building = buildings[id];
        building.removeEffect({ sourceId: RESORT_VACATION_SOURCE_ID });
        if (this.isFactoryBuilding(building)) {
          building.addAndReplace({
            target: 'building',
            targetId: id,
            type: 'productionMultiplier',
            value: multiplier,
            effectId: `resortWorld-${id}-production`,
            sourceId: RESORT_VACATION_SOURCE_ID,
          });
          building.addAndReplace({
            target: 'building',
            targetId: id,
            type: 'consumptionMultiplier',
            value: multiplier,
            effectId: `resortWorld-${id}-consumption`,
            sourceId: RESORT_VACATION_SOURCE_ID,
          });
        }
      }
      this.factoryEffectsApplied = true;
      this.lastFactoryMultiplier = multiplier;
    }

    applyVacationFunding(deltaTime) {
      if (!this.isVacationPrepActive()) {
        return;
      }
      const seconds = deltaTime / 1000;
      if (!(seconds > 0)) {
        return;
      }
      const fundingRate = Math.max(0, resources.colony.colonists.value) * this.getFundingPerColonist();
      if (!(fundingRate > 0)) {
        return;
      }
      resources.colony.funding.increase(fundingRate * seconds);
      resources.colony.funding.modifyRate(
        fundingRate,
        getResortWorldText('catalogs.specializations.resort.vacation.fundingSource'),
        'project'
      );
    }

    updateVacation(deltaTime) {
      if (!this.hasVacationAccess()) {
        this.vacationState = 'ready';
        this.vacationTimer = 0;
        this.removeFactoryEffects();
        this.removeVacationWorkerEffect();
        this.removeAllResourceEffects();
        return;
      }
      if (this.vacationState === 'ready') {
        this.removeFactoryEffects();
        this.removeVacationWorkerEffect();
        this.removeAllResourceEffects();
        return;
      }
      const seconds = deltaTime / 1000;
      this.vacationTimer = Math.max(0, this.vacationTimer - seconds);
      if (this.vacationState === 'prep') {
        this.applyVacationWorkerEffect();
        this.applyVacationResourceEffects();
        this.removeGlowResourceEffects();
        this.applyVacationFunding(deltaTime);
        if (this.vacationTimer <= 0) {
          this.removeVacationWorkerEffect();
          this.removeVacationResourceEffects();
          this.vacationState = 'effect';
          this.vacationTimer = RESORT_VACATION_EFFECT_SECONDS;
          projectManager.markUIDirty();
        }
        return;
      }
      if (this.vacationState === 'effect') {
        this.applyFactoryEffects();
        this.removeVacationWorkerEffect();
        this.applyGlowResourceEffects();
        if (this.vacationTimer <= 0) {
          this.removeFactoryEffects();
          this.removeGlowResourceEffects();
          this.vacationState = 'cooldown';
          this.vacationTimer = RESORT_VACATION_COOLDOWN_SECONDS;
          projectManager.markUIDirty();
        }
        return;
      }
      if (this.vacationState === 'cooldown' && this.vacationTimer <= 0) {
        this.vacationState = 'ready';
        this.vacationTimer = 0;
        this.removeAllResourceEffects();
        projectManager.markUIDirty();
      }
    }

    update(deltaTime) {
      super.update(deltaTime);
      this.updateVacation(deltaTime);
    }

    prepareTravelState() {
      super.prepareTravelState();
      this.vacationState = 'ready';
      this.vacationTimer = 0;
      this.removeFactoryEffects(true);
      this.removeVacationWorkerEffect();
      this.removeAllResourceEffects(true);
    }

    renderUI(container) {
      const vacation = document.createElement('div');
      vacation.classList.add('resort-vacation-panel');

      const button = document.createElement('button');
      button.classList.add('resort-vacation-button');
      button.textContent = getResortWorldText('catalogs.specializations.resort.vacation.button');
      button.addEventListener('click', () => {
        this.startVacation();
        this.updateUI();
      });

      const toggleRow = document.createElement('label');
      toggleRow.classList.add('checkbox-container', 'resort-vacation-top-toggle');
      const toggle = document.createElement('input');
      toggle.type = 'checkbox';
      toggle.checked = this.showVacationButtonAboveResources;
      toggle.addEventListener('change', () => {
        this.showVacationButtonAboveResources = toggle.checked;
        updateResortVacationGoldButton();
      });
      const toggleText = document.createElement('span');
      toggleText.textContent = getResortWorldText('catalogs.specializations.resort.vacation.showAboveResources');
      toggleRow.append(toggle, toggleText);

      const stats = document.createElement('div');
      stats.classList.add('resort-vacation-stats');
      const happiness = this.createVacationStat('happiness');
      const throughput = this.createVacationStat('throughput');
      const composition = this.createVacationStat('composition');
      const funding = this.createVacationStat('funding');
      stats.append(happiness.row, throughput.row, composition.row, funding.row);

      vacation.append(button, toggleRow, stats);
      container.appendChild(vacation);

      this.ui = {
        vacation,
        button,
        toggle,
        happiness: happiness.value,
        throughput: throughput.value,
        composition: composition.value,
        funding: funding.value,
      };
      super.renderUI(container);
      this.updateUI();
    }

    createVacationStat(key) {
      const row = document.createElement('div');
      row.classList.add('resort-vacation-stat');
      const label = document.createElement('span');
      label.textContent = getResortWorldText(`catalogs.specializations.resort.vacation.stats.${key}`);
      const tooltipKeys = {
        happiness: 'happinessTooltip',
        throughput: 'factoryThroughputTooltip',
        funding: 'fundingTooltip',
      };
      if (tooltipKeys[key]) {
        const icon = document.createElement('span');
        icon.classList.add('info-tooltip-icon');
        icon.innerHTML = '&#9432;';
        attachDynamicInfoTooltip(
          icon,
          getResortWorldText(`catalogs.specializations.resort.vacation.${tooltipKeys[key]}`)
        );
        label.appendChild(icon);
      }
      const value = document.createElement('span');
      row.append(label, value);
      return { row, value };
    }

    updateUI() {
      super.updateUI();
      const shopElements = this.resolveShopElements();
      if (shopElements && shopElements.shopRows) {
        this.shopItems.forEach((item) => {
          const row = shopElements.shopRows[item.id];
          row.count.textContent = getResortWorldText('catalogs.specializations.resort.shop.purchases', {
            value: formatNumber(this.getShopPurchaseCount(item.id), true),
          });
        });
      }
      if (!this.ui || !this.ui.vacation.isConnected) {
        return;
      }
      const factoryMultiplier = this.isVacationEffectActive()
        ? this.getCurrentFactoryMultiplier()
        : 1 + this.getFactoryThroughputBaseBonus() * this.getWorkerCompositionRatio();
      this.ui.button.disabled = !this.canStartVacation();
      this.ui.button.textContent = this.getVacationButtonText();
      this.ui.button.classList.toggle('resort-vacation-button-progress', this.hasVacationAccess() && this.vacationState !== 'ready');
      this.ui.button.style.setProperty('--resort-vacation-progress', `${formatNumber(this.getVacationStageProgress() * 100, false, 2)}%`);
      this.ui.toggle.checked = this.showVacationButtonAboveResources;
      this.ui.happiness.textContent = `+${formatNumber(this.getHappinessBonus() * 100, false, 2)}%`;
      this.ui.throughput.textContent = `x${formatNumber(factoryMultiplier, false, 3)}`;
      this.ui.composition.textContent = `${formatNumber(this.lastWorkerComposition.ratio * 100, false, 2)}%`;
      this.ui.funding.textContent = getResortWorldText('catalogs.specializations.resort.vacation.fundingRate', {
        value: formatNumber(this.getFundingPerColonist(), true),
      });
    }

    getSpecializationSaveState() {
      return {
        ...super.getSpecializationSaveState(),
        vacationState: this.vacationState,
        vacationTimer: this.vacationTimer,
        showVacationButtonAboveResources: this.showVacationButtonAboveResources,
      };
    }

    loadSpecializationState(state = {}) {
      super.loadSpecializationState(state);
      this.vacationState = state.vacationState || 'ready';
      this.vacationTimer = Math.max(0, state.vacationTimer || 0);
      this.showVacationButtonAboveResources = state.showVacationButtonAboveResources === true;
      if (this.vacationState !== 'prep' && this.vacationState !== 'effect' && this.vacationState !== 'cooldown') {
        this.vacationState = 'ready';
        this.vacationTimer = 0;
      }
      this.removeFactoryEffects(true);
      this.removeVacationWorkerEffect();
      this.removeAllResourceEffects(true);
      this.applyVacationWorkerEffect();
    }

    loadState(state = {}) {
      super.loadState(state);
      this.loadSpecializationState(state);
    }

    saveTravelState() {
      return {
        ...super.saveTravelState(),
        showVacationButtonAboveResources: this.showVacationButtonAboveResources,
      };
    }

    loadTravelState(state = {}) {
      super.loadTravelState(state);
      this.vacationState = 'ready';
      this.vacationTimer = 0;
      this.showVacationButtonAboveResources = state.showVacationButtonAboveResources === true;
      this.removeFactoryEffects(true);
      this.removeVacationWorkerEffect();
      this.removeAllResourceEffects(true);
    }
  }

  function getResortWorldText(path, vars) {
    return t(path, vars, '');
  }

  function getResortWorldProject() {
    return projectManager.projects.resortWorld;
  }

  function updateResortVacationGoldButton() {
    const container = document.getElementById('gold-asteroid-container');
    const project = getResortWorldProject();
    if (!project.showVacationButtonAboveResources || !project.canStartVacation()) {
      if (resortVacationGoldButton) {
        resortVacationGoldButton.style.display = 'none';
      }
      return;
    }
    if (!resortVacationGoldButton || !resortVacationGoldButton.isConnected) {
      resortVacationGoldButton = document.createElement('button');
      resortVacationGoldButton.id = 'resort-vacation-gold-button';
      resortVacationGoldButton.className = 'resort-vacation-gold-button';
      resortVacationGoldButton.addEventListener('click', () => {
        const currentProject = getResortWorldProject();
        currentProject.startVacation();
        currentProject.updateUI();
        updateResortVacationGoldButton();
      });
    }
    if (resortVacationGoldButton.parentElement !== container) {
      container.appendChild(resortVacationGoldButton);
    }
    resortVacationGoldButton.textContent = getResortWorldText('catalogs.specializations.resort.vacation.button');
    resortVacationGoldButton.disabled = !project.canStartVacation();
    resortVacationGoldButton.style.display = 'inline-block';
  }

  window.ResortWorldProject = ResortWorldProject;
  window.updateResortVacationGoldButton = updateResortVacationGoldButton;
})();
