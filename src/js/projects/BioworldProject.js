(function () {
  let ProjectBase;
  try {
    ProjectBase = Project;
  } catch (error) {}
  try {
    ({ Project: ProjectBase } = require('../projects.js'));
  } catch (error) {}

  const EVOLUTION_POINT_DIVISOR = 1e12;
  const MAX_EVOLUTION_UPGRADES = 400;
  const MAX_BIOWORKERS_UPGRADES = 200;
  const MAX_LIFE_POINT_GAIN_UPGRADES = 900;

  const BIOWORLD_SHOP_ITEMS = [
    {
      id: 'lifeDesignerUnlock',
      label: 'Unlock Life Designer',
      cost: 100,
      maxPurchases: 1,
      description: 'Permanently completes the Life Designing and Production Research.',
    },
    {
      id: 'lifePointGain',
      label: 'Life Points Gain +1%',
      cost: 1,
      maxPurchases: MAX_LIFE_POINT_GAIN_UPGRADES,
      description: 'Boosts life design point gains by 1%.',
    },
    {
      id: 'temperatureToleranceMax',
      label: 'Temperature Tolerance Max +1',
      cost: 1,
      maxPurchases: MAX_EVOLUTION_UPGRADES,
      description: 'Raises the max investments for minimum and maximum temperature tolerance by 1.',
    },
    {
      id: 'growthToleranceMax',
      label: 'Growth Tolerance Max +1',
      cost: 1,
      maxPurchases: MAX_EVOLUTION_UPGRADES,
      description: 'Raises the max investments for optimal growth temperature and growth tolerance by 1.',
    },
    {
      id: 'invasivenessMax',
      label: 'Invasiveness Max +1',
      cost: 1,
      maxPurchases: MAX_EVOLUTION_UPGRADES,
      description: 'Raises the max investments for invasiveness by 1.',
    },
    {
      id: 'spaceEfficiencyMax',
      label: 'Space Efficiency Max +1',
      cost: 1,
      maxPurchases: MAX_EVOLUTION_UPGRADES,
      description: 'Raises the max investments for space efficiency by 1.',
    },
    {
      id: 'bioworkersMax',
      label: 'Bioworkers Max +1',
      cost: 1,
      maxPurchases: MAX_BIOWORKERS_UPGRADES,
      description: 'Raises the max investments for bioworkers by 1.',
    },
  ];

  const BIOWORLD_SHOP_ITEM_MAP = BIOWORLD_SHOP_ITEMS.reduce((acc, item) => {
    acc[item.id] = item;
    return acc;
  }, {});

  class BioworldProject extends ProjectBase {
    constructor(config, name) {
      super(config, name);
      this.evolutionPoints = 0;
      this.ecumenopolisDisabled = false;
      this.biocortexIntegration = false;
      this.shopPurchases = this.createEmptyShopPurchases();
      this.shopElements = null;
    }

    createEmptyShopPurchases() {
      return BIOWORLD_SHOP_ITEMS.reduce((acc, item) => {
        acc[item.id] = 0;
        return acc;
      }, {});
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
      return (Math.log10(normalized) * 2) + 1;
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
      if (projectManager.projects.foundryWorld.isActive || projectManager.projects.foundryWorld.isCompleted) {
        return false;
      }
      return colonies.t7_colony.count < 1000;
    }

    shouldHideStartBar() {
      return false;
    }

    getSpecializationLockedText() {
      if (this.isCompleted) {
        return '';
      }
      const foundryWorld = projectManager.projects.foundryWorld;
      if (foundryWorld.isCompleted) {
        return 'Another Specialization has been completed';
      }
      return '';
    }

    complete() {
      super.complete();
      const ecumenopolis = colonies.t7_colony;
      if (ecumenopolis.active > 0) {
        ecumenopolis.adjustLand(-ecumenopolis.active);
      }
      ecumenopolis.count = 0;
      ecumenopolis.active = 0;
      ecumenopolis.updateResourceStorage();
      this.ecumenopolisDisabled = true;
      this.applyEcumenopolisDisable();
    }

    prepareTravelState() {
      if (this.isCompleted) {
        this.evolutionPoints += this.getEvolutionPointGain(resources.surface.biomass.value);
        this.ecumenopolisDisabled = false;
        researchManager.removeEffect({ sourceId: 'bioworld' });
      }
    }

    getShopPurchaseCount(id) {
      return this.shopPurchases[id] || 0;
    }

    canPurchaseUpgrade(item) {
      const purchases = this.getShopPurchaseCount(item.id);
      if (purchases >= item.maxPurchases) {
        return false;
      }
      return this.evolutionPoints >= item.cost;
    }

    purchaseUpgrade(id) {
      const item = BIOWORLD_SHOP_ITEM_MAP[id];
      if (!this.canPurchaseUpgrade(item)) {
        return;
      }
      this.evolutionPoints -= item.cost;
      this.shopPurchases[id] = this.getShopPurchaseCount(id) + 1;
      this.applyEvolutionEffects();
      this.updateUI();
    }

    applyEvolutionEffects() {
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

      if (this.ecumenopolisDisabled) {
        this.applyEcumenopolisDisable();
      }
    }

    applyEffects() {
      this.applyEvolutionEffects();
      if (this.isCompleted && this.isBooleanFlagSet('biocortexIntegration')) {
        addEffect({
          target: 'global',
          type: 'globalResearchBoost',
          value: 9,
          effectId: 'bioworld-biocortex-research',
          sourceId: 'bioworld-biocortex',
        });
      }
    }

    applyEcumenopolisDisable() {
      researchManager.addAndReplace({
        type: 'booleanFlag',
        flagId: 'ecumenopolisDisabled',
        value: true,
        effectId: 'bioworld-ecumenopolis-disable',
        sourceId: 'bioworld',
      });
      researchManager.addAndReplace({
        type: 'researchDisable',
        targetId: 'ai_ecumenopolis_expansion',
        effectId: 'bioworld-ecumenopolis-research-disable',
        sourceId: 'bioworld',
      });
      const ecumenopolis = colonies.t7_colony;
      if (ecumenopolis.active > 0) {
        ecumenopolis.adjustLand(-ecumenopolis.active);
      }
      ecumenopolis.count = 0;
      ecumenopolis.active = 0;
      ecumenopolis.unlocked = false;
      ecumenopolis.updateResourceStorage();
    }

    renderUI(container) {
      const wrapper = document.createElement('div');
      wrapper.classList.add('bioworld-shop');

      const header = document.createElement('div');
      header.classList.add('bioworld-shop-header');
      const titleGroup = document.createElement('div');
      titleGroup.classList.add('bioworld-shop-title');
      const title = document.createElement('span');
      title.textContent = 'Evolution Shop';
      const info = document.createElement('span');
      info.classList.add('info-tooltip-icon');
      info.innerHTML = '&#9432;';
      info.title = 'You gain evolution points when travelling after completing this project: 2*log10(total biomass / 1T) + 1.';
      titleGroup.append(title, info);

      const pointsGroup = document.createElement('div');
      pointsGroup.classList.add('bioworld-shop-meta');
      const pointsLabel = document.createElement('span');
      pointsLabel.textContent = 'Evolution Points:';
      const pointsValue = document.createElement('span');
      pointsValue.classList.add('bioworld-shop-points');
      pointsGroup.append(pointsLabel, pointsValue);

      header.append(titleGroup, pointsGroup);
      wrapper.appendChild(header);

      const items = document.createElement('div');
      items.classList.add('bioworld-shop-items');

      const shopRows = {};
      BIOWORLD_SHOP_ITEMS.forEach((item) => {
        const row = document.createElement('div');
        row.classList.add('bioworld-shop-item');

        const labelRow = document.createElement('div');
        labelRow.classList.add('bioworld-shop-item-label');
        const labelText = document.createElement('span');
        labelText.textContent = item.label;
        const detail = document.createElement('span');
        detail.classList.add('info-tooltip-icon');
        detail.innerHTML = '&#9432;';
        detail.title = item.description;
        labelRow.append(labelText, detail);

        const cost = document.createElement('span');
        cost.classList.add('bioworld-shop-cost');

        const count = document.createElement('span');
        count.classList.add('bioworld-shop-count');

        const button = document.createElement('button');
        button.classList.add('bioworld-shop-button');
        button.textContent = 'Buy';
        button.addEventListener('click', () => this.purchaseUpgrade(item.id));

        const metaRow = document.createElement('div');
        metaRow.classList.add('bioworld-shop-item-meta');
        const metaGroup = document.createElement('div');
        metaGroup.classList.add('bioworld-shop-item-costs');
        metaGroup.append(cost, count);
        metaRow.append(metaGroup, button);

        row.append(labelRow, metaRow);
        items.appendChild(row);

        shopRows[item.id] = { cost, count, button };
      });

      wrapper.appendChild(items);
      container.appendChild(wrapper);

      this.shopElements = {
        wrapper,
        pointsValue,
        shopRows,
      };
      this.updateUI();
    }

    update(deltaTime) {
      super.update(deltaTime);
      this.applyEffects();
    }

    updateUI() {
      const elements = this.shopElements;
      elements.pointsValue.textContent = formatNumber(this.evolutionPoints, true, 2);
      BIOWORLD_SHOP_ITEMS.forEach((item) => {
        const row = elements.shopRows[item.id];
        const purchases = this.getShopPurchaseCount(item.id);
        row.cost.textContent = `${formatNumber(item.cost, true)} EP`;
        row.count.textContent = `${purchases}/${item.maxPurchases}`;
        row.button.disabled = !this.canPurchaseUpgrade(item);
        row.button.textContent = purchases >= item.maxPurchases ? 'Maxed' : 'Buy';
      });
    }

    saveState() {
      return {
        ...super.saveState(),
        evolutionPoints: this.evolutionPoints,
        ecumenopolisDisabled: this.ecumenopolisDisabled,
        shopPurchases: { ...this.shopPurchases },
      };
    }

    loadState(state = {}) {
      super.loadState(state);
      this.evolutionPoints = state.evolutionPoints || 0;
      this.ecumenopolisDisabled = this.isCompleted || false;
      this.shopPurchases = {
        ...this.createEmptyShopPurchases(),
        ...(state.shopPurchases || {}),
      };
      this.applyEvolutionEffects();
    }

    saveTravelState() {
      return {
        evolutionPoints: this.evolutionPoints,
        shopPurchases: { ...this.shopPurchases },
      };
    }

    loadTravelState(state = {}) {
      this.evolutionPoints = state.evolutionPoints || 0;
      this.shopPurchases = {
        ...this.createEmptyShopPurchases(),
        ...(state.shopPurchases || {}),
      };
    }
  }

  try {
    window.BioworldProject = BioworldProject;
  } catch (error) {}

  try {
    module.exports = BioworldProject;
  } catch (error) {}
})();
