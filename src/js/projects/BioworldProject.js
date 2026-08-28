(function () {
  let SpecializationBase;
  try {
    SpecializationBase = SpecializationProject;
  } catch (error) {}
  try {
    ({ SpecializationProject: SpecializationBase } = require('./SpecializationProject.js'));
  } catch (error) {}

  function getBioworldText(path, vars) {
    try {
      return t(path, vars, '');
    } catch (error) {
      return '';
    }
  }

  const EVOLUTION_POINT_DIVISOR = 1e12;
  const EVOLUTION_POINT_GAIN_MULTIPLIER = 1.5;
  const MAX_EVOLUTION_UPGRADES = 400;
  const MAX_BIOWORKERS_UPGRADES = 200;
  const MAX_LIFE_POINT_GAIN_UPGRADES = 900;
  const LEVIATHAN_ORBITAL_SOURCE_ID = 'bioworld-leviathans';

  const BIOWORLD_SHOP_ITEMS = [
    {
      id: 'lifeDesignerUnlock',
      label: getBioworldText('catalogs.specializations.bioworld.shopItems.lifeDesignerUnlock.label'),
      cost: 10,
      maxPurchases: 1,
      description: getBioworldText('catalogs.specializations.bioworld.shopItems.lifeDesignerUnlock.description'),
    },
    {
      id: 'lifePointGain',
      label: getBioworldText('catalogs.specializations.bioworld.shopItems.lifePointGain.label'),
      cost: 1,
      maxPurchases: MAX_LIFE_POINT_GAIN_UPGRADES,
      description: getBioworldText('catalogs.specializations.bioworld.shopItems.lifePointGain.description'),
    },
    {
      id: 'temperatureToleranceMax',
      label: getBioworldText('catalogs.specializations.bioworld.shopItems.temperatureToleranceMax.label'),
      cost: 1,
      maxPurchases: MAX_EVOLUTION_UPGRADES,
      description: getBioworldText('catalogs.specializations.bioworld.shopItems.temperatureToleranceMax.description'),
    },
    {
      id: 'growthToleranceMax',
      label: getBioworldText('catalogs.specializations.bioworld.shopItems.growthToleranceMax.label'),
      cost: 1,
      maxPurchases: MAX_EVOLUTION_UPGRADES,
      description: getBioworldText('catalogs.specializations.bioworld.shopItems.growthToleranceMax.description'),
    },
    {
      id: 'invasivenessMax',
      label: getBioworldText('catalogs.specializations.bioworld.shopItems.invasivenessMax.label'),
      cost: 1,
      maxPurchases: MAX_EVOLUTION_UPGRADES,
      description: getBioworldText('catalogs.specializations.bioworld.shopItems.invasivenessMax.description'),
    },
    {
      id: 'spaceEfficiencyMax',
      label: getBioworldText('catalogs.specializations.bioworld.shopItems.spaceEfficiencyMax.label'),
      cost: 1,
      maxPurchases: MAX_EVOLUTION_UPGRADES,
      description: getBioworldText('catalogs.specializations.bioworld.shopItems.spaceEfficiencyMax.description'),
    },
    {
      id: 'bioworkersMax',
      label: getBioworldText('catalogs.specializations.bioworld.shopItems.bioworkersMax.label'),
      cost: 1,
      maxPurchases: MAX_BIOWORKERS_UPGRADES,
      description: getBioworldText('catalogs.specializations.bioworld.shopItems.bioworkersMax.description'),
    },
    {
      id: 'leviathans',
      label: getBioworldText('catalogs.specializations.bioworld.shopItems.leviathans.label'),
      cost: 1,
      costScaling: 'quadratic',
      maxPurchases: Infinity,
      requiresFlag: 'leviathans',
      description: getBioworldText('catalogs.specializations.bioworld.shopItems.leviathans.description'),
    },
  ];

  const BIOWORLD_SHOP_ITEM_MAP = BIOWORLD_SHOP_ITEMS.reduce((acc, item) => {
    acc[item.id] = item;
    return acc;
  }, {});

  class BioworldProject extends SpecializationBase {
    constructor(config, name) {
      super(config, name, {
        pointsKey: 'evolutionPoints',
        pointsLabel: getBioworldText('catalogs.specializations.bioworld.pointsLabel'),
        pointsUnit: 'EP',
        shopTitle: getBioworldText('catalogs.specializations.bioworld.shopTitle'),
        shopTooltip: getBioworldText('catalogs.specializations.bioworld.shopTooltip'),
        emptyShopText: '',
        shopItems: BIOWORLD_SHOP_ITEMS,
        shopItemMap: BIOWORLD_SHOP_ITEM_MAP,
        specializationSourceId: 'bioworld',
        otherSpecializationIds: [],
        ecumenopolisEffectPrefix: 'bioworld',
        hazardPointBonusPerHazard: 0.1,
      });
      this.biocortexIntegration = false;
      this.cumulativeBiomass = 0;
      this.operationPreRunThisTick = false;
      this.passiveFoodElements = null;
      this.shopCollapsed = false;
    }

    getBiomassDensity() {
      const landFraction = 1 - getEcumenopolisLandFraction(terraforming);
      const landArea = terraforming.celestialParameters.surfaceArea * Math.max(0, landFraction);
      if (landArea <= 0) {
        return 0;
      }
      return resources.surface.biomass.value / landArea;
    }

    getEvolutionPointGain(totalBiomass) {
      const normalized = Math.max(totalBiomass / EVOLUTION_POINT_DIVISOR, 1);
      return ((Math.log10(normalized) * 3) + 1);
    }

    getTravelPointGain() {
      const basePoints = this.getEvolutionPointGain(resources.surface.biomass.value);
      return this.applyHazardPointBonus(basePoints);
    }

    getPassiveFoodProduction(deltaTime = 1000) {
      const seconds = Math.max(0, deltaTime / 1000);
      const rate = this.isBooleanFlagSet('megaPotatoes')
        ? this.cumulativeBiomass * terraformingParameters.gameplay.life.surfaceBiomassFoodPerTonPerSecond
        : 0;
      return {
        rate,
        amount: rate * seconds,
      };
    }

    getShopPurchaseCountText(item, purchases, maxPurchases) {
      if (item.id === 'leviathans') {
        return getBioworldText('catalogs.specializations.bioworld.shop.purchases', {
          value: formatNumber(purchases, true),
        });
      }
      return super.getShopPurchaseCountText(item, purchases, maxPurchases);
    }

    getSpecializationRequirements() {
      return [
        {
          id: 'terraformed',
          label: getBioworldText('catalogs.specializations.bioworld.requirements.terraformed'),
          met: spaceManager.isCurrentWorldTerraformed(),
        },
        {
          id: 'biomassDensity',
          label: getBioworldText('catalogs.specializations.bioworld.requirements.biomassDensity'),
          met: this.getBiomassDensity() > 1,
        },
        {
          id: 'ecumenopolisCount',
          label: getBioworldText('catalogs.specializations.bioworld.requirements.ecumenopolisCount'),
          met: colonies.t7_colony.count === 0n,
        },
        {
          id: 'otherSpecialization',
          label: getBioworldText('catalogs.specializations.bioworld.requirements.otherSpecialization'),
          met: !hasOtherWorldSpecialization(this),
        },
      ];
    }

    getSpecializationLockedText() {
      return super.getSpecializationLockedText();
    }

    canStart() {
      if (!super.canStart()) {
        return false;
      }
      if (!spaceManager.isCurrentWorldTerraformed()) {
        return false;
      }
      if (this.getBiomassDensity() <= 1) {
        return false;
      }
      return colonies.t7_colony.count === 0n;
    }

    prepareTravelState(resetLevel = GAME_RESET_LEVEL.PLANET) {
      if (resetLevel >= this.departureResetAt) {
        return;
      }
      if (this.isCompleted) {
        this.cumulativeBiomass += Math.max(0, resources.surface.biomass.value || 0);
      }
      super.prepareTravelState(resetLevel);
    }

    complete() {
      super.complete();
      const ecumenopolis = colonies.t7_colony;
      if (ecumenopolis.active > 0n) {
        ecumenopolis.adjustLand(-ecumenopolis.activeNumber);
      }
      ecumenopolis.count = 0n;
      ecumenopolis.active = 0n;
      ecumenopolis.updateResourceStorage();
      this.ecumenopolisDisabled = true;
      this.applyEcumenopolisDisable();
    }

    applySpecializationEffects() {
      const lifePointBonus = this.getShopPurchaseCount('lifePointGain') * 0.01;
      lifeDesigner.addAndReplace({
        type: 'lifeDesignPointShopMultiplier',
        value: lifePointBonus,
        effectId: 'bioworld-life-points-shop',
        sourceId: 'bioworld',
      });
      lifeDesigner.addAndReplace({
        type: 'lifeDesignPointBiodomeMultiplier',
        value: lifePointBonus,
        effectId: 'bioworld-life-points-biodome',
        sourceId: 'bioworld',
      });
      lifeDesigner.addAndReplace({
        type: 'lifeDesignAttributeMaxBonus',
        bonuses: {
          minTemperatureTolerance: this.getShopPurchaseCount('temperatureToleranceMax'),
          maxTemperatureTolerance: this.getShopPurchaseCount('temperatureToleranceMax'),
          optimalGrowthTemperature: this.getShopPurchaseCount('growthToleranceMax'),
          growthTemperatureTolerance: this.getShopPurchaseCount('growthToleranceMax'),
          invasiveness: this.getShopPurchaseCount('invasivenessMax'),
          spaceEfficiency: this.getShopPurchaseCount('spaceEfficiencyMax'),
          bioworkforce: this.getShopPurchaseCount('bioworkersMax'),
        },
        effectId: 'bioworld-attribute-max',
        sourceId: 'bioworld',
      });

      if (this.getShopPurchaseCount('lifeDesignerUnlock') > 0) {
        researchManager.completeResearchInstant('life');
      }

      this.applyLeviathanOrbitalEffect();

      if (this.ecumenopolisDisabled) {
        this.applyEcumenopolisDisable();
      }
    }

    applyLeviathanOrbitalEffect() {
      const purchases = this.getShopPurchaseCount('leviathans');
      if (!this.isBooleanFlagSet('leviathans') || purchases <= 0) {
        removeEffect({ target: 'orbitalManager', sourceId: LEVIATHAN_ORBITAL_SOURCE_ID });
        return;
      }
      addEffect({
        target: 'orbitalManager',
        type: 'availableOrbitalsMultiplier',
        value: 1 + purchases * 0.05,
        effectId: 'bioworld-leviathans-orbitals',
        sourceId: LEVIATHAN_ORBITAL_SOURCE_ID,
      });
    }

    applyEffects() {
      super.applyEffects();
      if (this.isCompleted && this.isBooleanFlagSet('biocortexIntegration')) {
        addEffect({
          target: 'colony',
          targetId: 't6_colony',
          type: 'productionMultiplier',
          value: 10,
          effectId: 'bioworld-biocortex-metropolis',
          sourceId: 'bioworld-biocortex',
          name: getBioworldText('catalogs.specializations.bioworld.biocortexEffectName'),
        });
      }
    }

    estimateOperationCostAndGain(deltaTime = 1000, applyRates = true) {
      const totals = { cost: {}, gain: {} };
      const production = this.getPassiveFoodProduction(deltaTime);
      if (!(production.amount > 0)) {
        return totals;
      }
      totals.gain.spaceStorage = { food: production.amount };
      if (applyRates) {
        resources.spaceStorage.food.modifyRate(production.rate, this.getRateSource(), 'project');
      }
      return totals;
    }

    applyOperationCostAndGain(deltaTime = 1000, accumulatedChanges = null) {
      const production = this.getPassiveFoodProduction(deltaTime);
      if (!(production.amount > 0)) {
        return;
      }
      if (accumulatedChanges) {
        accumulatedChanges.spaceStorage ||= {};
        accumulatedChanges.spaceStorage.food = (accumulatedChanges.spaceStorage.food || 0)
          + production.amount;
      } else {
        resources.spaceStorage.food.increase(production.amount);
        projectManager.projects.spaceStorage.reconcileUsedStorage();
      }
      resources.spaceStorage.food.modifyRate(production.rate, this.getRateSource(), 'project');
    }

    estimateCostAndGain(deltaTime = 1000, applyRates = true, productivity = 1, accumulatedChanges = null) {
      const totals = super.estimateCostAndGain(deltaTime, applyRates, productivity, accumulatedChanges);
      if (this.operationPreRunThisTick === true) {
        return totals;
      }
      const operationTotals = this.estimateOperationCostAndGain(deltaTime, applyRates);
      const foodGain = operationTotals.gain.spaceStorage?.food || 0;
      if (foodGain > 0) {
        totals.gain.spaceStorage ||= {};
        totals.gain.spaceStorage.food = (totals.gain.spaceStorage.food || 0) + foodGain;
      }
      return totals;
    }

    applyCostAndGain(deltaTime = 1000, accumulatedChanges = null, productivity = 1) {
      super.applyCostAndGain(deltaTime, accumulatedChanges, productivity);
      this.operationPreRunThisTick = false;
    }

    update(deltaTime) {
      super.update(deltaTime);
      this.applyEffects();
    }

    renderUI(container) {
      super.renderUI(container);

      const card = document.createElement('div');
      card.classList.add('info-card', 'manufacturing-world-card');
      card.dataset.bioworldFoodUi = 'card';

      const header = document.createElement('div');
      header.classList.add('card-header');
      const title = document.createElement('span');
      title.classList.add('card-title');
      title.textContent = getBioworldText('catalogs.specializations.bioworld.passiveFood.title');
      header.appendChild(title);
      card.appendChild(header);

      const body = document.createElement('div');
      body.classList.add('card-body');
      const summaryGrid = document.createElement('div');
      summaryGrid.classList.add('stats-grid', 'two-col', 'project-summary-grid');

      const createStatBox = (labelText, key) => {
        const box = document.createElement('div');
        box.classList.add('stat-item', 'project-summary-box');
        const label = document.createElement('span');
        label.classList.add('stat-label');
        label.textContent = labelText;
        const value = document.createElement('span');
        value.classList.add('stat-value');
        value.dataset.bioworldFoodUi = key;
        box.append(label, value);
        summaryGrid.appendChild(box);
        return value;
      };

      const cumulativeBiomass = createStatBox(
        getBioworldText('catalogs.specializations.bioworld.passiveFood.cumulativeBiomass'),
        'cumulativeBiomass'
      );
      const foodProduction = createStatBox(
        getBioworldText('catalogs.specializations.bioworld.passiveFood.production'),
        'foodProduction'
      );
      body.appendChild(summaryGrid);
      card.appendChild(body);

      const shopWrapper = container.querySelector('[data-specialization-ui="wrapper"]');
      if (shopWrapper) {
        container.insertBefore(card, shopWrapper);
      } else {
        container.appendChild(card);
      }

      const shopTitle = shopWrapper?.querySelector('.bioworld-shop-title');
      const shopItems = shopWrapper?.querySelector('.bioworld-shop-items');
      let shopCollapseButton = null;
      if (shopTitle && shopItems) {
        shopCollapseButton = document.createElement('button');
        shopCollapseButton.type = 'button';
        shopCollapseButton.classList.add('bioworld-shop-button', 'bioworld-shop-collapse-button');
        shopCollapseButton.dataset.bioworldFoodUi = 'shopCollapseButton';
        shopCollapseButton.addEventListener('click', () => {
          this.shopCollapsed = !this.shopCollapsed;
          this.updateUI();
        });
        shopTitle.appendChild(shopCollapseButton);
      }

      this.passiveFoodElements = {
        card,
        cumulativeBiomass,
        foodProduction,
        shopItems,
        shopCollapseButton,
      };
      this.updateUI();
    }

    updateUI() {
      super.updateUI();
      const elements = this.passiveFoodElements;
      if (!elements?.card?.isConnected) {
        return;
      }
      const collapsed = this.shopCollapsed === true;
      if (elements.shopItems) {
        const shopDisplay = collapsed ? 'none' : '';
        if (elements.shopItems.style.display !== shopDisplay) {
          elements.shopItems.style.display = shopDisplay;
        }
      }
      if (elements.shopCollapseButton) {
        const collapseText = collapsed
          ? getBioworldText('catalogs.specializations.bioworld.ui.showShop')
          : getBioworldText('catalogs.specializations.bioworld.ui.hideShop');
        if (elements.shopCollapseButton.textContent !== collapseText) {
          elements.shopCollapseButton.textContent = collapseText;
        }
      }
      const unlocked = this.isBooleanFlagSet('megaPotatoes');
      const display = unlocked ? '' : 'none';
      if (elements.card.style.display !== display) {
        elements.card.style.display = display;
      }
      if (!unlocked) {
        return;
      }
      const biomassText = formatNumber(this.cumulativeBiomass, true, 2);
      const productionText = `${formatNumber(this.getPassiveFoodProduction().rate, true, 3)}/s`;
      if (elements.cumulativeBiomass.textContent !== biomassText) {
        elements.cumulativeBiomass.textContent = biomassText;
      }
      if (elements.foodProduction.textContent !== productionText) {
        elements.foodProduction.textContent = productionText;
      }
    }

    saveState() {
      return {
        ...super.saveState(),
        cumulativeBiomass: this.cumulativeBiomass,
        shopCollapsed: this.shopCollapsed,
      };
    }

    loadState(state = {}) {
      super.loadState(state);
      this.ecumenopolisDisabled = this.isCompleted || false;
      this.loadSpecializationState(state);
      this.cumulativeBiomass = Math.max(0, state.cumulativeBiomass || 0);
      this.shopCollapsed = state.shopCollapsed === true;
      this.applySpecializationEffects();
    }

    saveTravelState() {
      return {
        ...super.saveTravelState(),
        cumulativeBiomass: this.cumulativeBiomass,
        shopCollapsed: this.shopCollapsed,
      };
    }

    loadTravelState(state = {}) {
      super.loadTravelState(state);
      this.cumulativeBiomass = Math.max(0, state.cumulativeBiomass || 0);
      this.shopCollapsed = state.shopCollapsed === true;
    }
  }

  try {
    window.BioworldProject = BioworldProject;
  } catch (error) {}

  try {
    module.exports = BioworldProject;
  } catch (error) {}
})();
