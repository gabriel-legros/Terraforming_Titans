(function () {
  let ProjectBase;
  try {
    ProjectBase = Project;
  } catch (error) {}
  try {
    ({ Project: ProjectBase } = require('../projects.js'));
  } catch (error) {}

  const FOUNDRY_SHOP_ITEMS = [
    {
      id: 'galacticMetalMiningCap',
      label: 'Galactic Metal Mining Expertise',
      cost: 1,
      maxPurchases: 900,
      description: 'Increases the metal mining cap by 10%.',
    },
    {
      id: 'galacticSilicaMiningCap',
      label: 'Galactic Silica Mining Expertise',
      cost: 1,
      maxPurchases: 900,
      description: 'Increases the silica mining cap by 10%.',
    },
    {
      id: 'oreMiningOutput',
      label: 'Ore Mining Expertise',
      cost: 1,
      maxPurchases: 900,
      description: 'Increases ore mine output by 1%.',
    },
    {
      id: 'silicaMiningOutput',
      label: 'Silica Mining Expertise',
      cost: 1,
      maxPurchases: 900,
      description: 'Increases silica mining output by 1%.',
    },
    {
      id: 'deeperMiningSpeed',
      label: 'Deeper Mining Expertise',
      cost: 1,
      maxPurchases: 900,
      description: 'Increases deeper mining speed by 1%.',
    },
  ];

  const FOUNDRY_SHOP_ITEM_MAP = FOUNDRY_SHOP_ITEMS.reduce((acc, item) => {
    acc[item.id] = item;
    return acc;
  }, {});

  class FoundryWorldProject extends ProjectBase {
    constructor(config, name) {
      super(config, name);
      this.foundryPoints = 0;
      this.ecumenopolisDisabled = false;
      this.shopPurchases = this.createEmptyShopPurchases();
      this.shopElements = null;
    }

    createEmptyShopPurchases() {
      return FOUNDRY_SHOP_ITEMS.reduce((acc, item) => {
        acc[item.id] = 0;
        return acc;
      }, {});
    }

    getFoundryPointGain(depth) {
      const normalized = Math.max(depth, 1);
      return Math.log10(normalized) * 5;
    }

    getDeepMiningDepth() {
      return projectManager.projects.deeperMining.averageDepth;
    }

    canStart() {
      if (!super.canStart()) {
        return false;
      }
      if (this.getDeepMiningDepth() < 50000) {
        return false;
      }
      if (projectManager.projects.bioworld.isActive || projectManager.projects.bioworld.isCompleted) {
        return false;
      }
      return true;
    }

    complete() {
      super.complete();
      this.convertEcumenopolisToMetropolises();
      this.ecumenopolisDisabled = true;
      this.applyEcumenopolisDisable();
    }

    convertEcumenopolisToMetropolises() {
      const ecumenopolis = colonies.t7_colony;
      const metropolis = colonies.t6_colony;
      const totalCount = ecumenopolis.count;
      const activeCount = ecumenopolis.active;
      if (activeCount > 0) {
        ecumenopolis.adjustLand(-activeCount);
        metropolis.adjustLand(activeCount);
      }
      metropolis.count += totalCount;
      metropolis.active += activeCount;
      ecumenopolis.count = 0;
      ecumenopolis.active = 0;
      ecumenopolis.updateResourceStorage();
      metropolis.updateResourceStorage();
    }

    applyEcumenopolisDisable() {
      researchManager.addAndReplace({
        type: 'booleanFlag',
        flagId: 'ecumenopolisDisabled',
        value: true,
        effectId: 'foundry-ecumenopolis-disable',
        sourceId: 'foundryWorld',
      });
      researchManager.addAndReplace({
        type: 'researchDisable',
        targetId: 'ai_ecumenopolis_expansion',
        effectId: 'foundry-ecumenopolis-research-disable',
        sourceId: 'foundryWorld',
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

    prepareTravelState() {
      if (this.isCompleted) {
        this.foundryPoints += this.getFoundryPointGain(this.getDeepMiningDepth());
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
      return this.foundryPoints >= item.cost;
    }

    purchaseUpgrade(id) {
      const item = FOUNDRY_SHOP_ITEM_MAP[id];
      if (!this.canPurchaseUpgrade(item)) {
        return;
      }
      this.foundryPoints -= item.cost;
      this.shopPurchases[id] = this.getShopPurchaseCount(id) + 1;
      this.applyFoundryEffects();
      this.updateUI();
    }

    applyFoundryEffects() {
      const capBonus = 1 + (this.getShopPurchaseCount('galacticMetalMiningCap') * 0.1);
      warpGateNetworkManager.addAndReplace({
        type: 'importCapMultiplier',
        resourceKey: 'metal',
        value: capBonus,
        effectId: 'foundry-metal-cap',
        sourceId: 'foundryWorld',
      });
      const silicaCapBonus = 1 + (this.getShopPurchaseCount('galacticSilicaMiningCap') * 0.1);
      warpGateNetworkManager.addAndReplace({
        type: 'importCapMultiplier',
        resourceKey: 'silicon',
        value: silicaCapBonus,
        effectId: 'foundry-silica-cap',
        sourceId: 'foundryWorld',
      });

      const oreMineMultiplier = 1 + (this.getShopPurchaseCount('oreMiningOutput') * 0.01);
      addEffect({
        target: 'building',
        targetId: 'oreMine',
        type: 'productionMultiplier',
        effectId: 'foundry-ore-mine-output',
        value: oreMineMultiplier,
        sourceId: 'foundryWorld',
      });
      const silicaMultiplier = 1 + (this.getShopPurchaseCount('silicaMiningOutput') * 0.01);
      addEffect({
        target: 'building',
        targetId: 'sandQuarry',
        type: 'productionMultiplier',
        effectId: 'foundry-silica-output',
        value: silicaMultiplier,
        sourceId: 'foundryWorld',
      });

      const speedBonus = 1 + (this.getShopPurchaseCount('deeperMiningSpeed') * 0.01);
      addEffect({
        target: 'project',
        targetId: 'deeperMining',
        type: 'projectDurationMultiplier',
        effectId: 'foundry-deeper-mining-speed',
        value: 1 / speedBonus,
        sourceId: 'foundryWorld',
      });

      if (this.ecumenopolisDisabled) {
        this.applyEcumenopolisDisable();
      }
    }

    renderUI(container) {
      const wrapper = document.createElement('div');
      wrapper.classList.add('bioworld-shop');

      const header = document.createElement('div');
      header.classList.add('bioworld-shop-header');
      const titleGroup = document.createElement('div');
      titleGroup.classList.add('bioworld-shop-title');
      const title = document.createElement('span');
      title.textContent = 'Metallurgy Shop';
      const info = document.createElement('span');
      info.classList.add('info-tooltip-icon');
      info.innerHTML = '&#9432;';
      info.title = 'You gain metallurgy points when travelling after completing this project: 5*log10(deeper mining depth).';
      titleGroup.append(title, info);

      const pointsGroup = document.createElement('div');
      pointsGroup.classList.add('bioworld-shop-meta');
      const pointsLabel = document.createElement('span');
      pointsLabel.textContent = 'Metallurgy Points:';
      const pointsValue = document.createElement('span');
      pointsValue.classList.add('bioworld-shop-points');
      pointsGroup.append(pointsLabel, pointsValue);

      header.append(titleGroup, pointsGroup);
      wrapper.appendChild(header);

      const items = document.createElement('div');
      items.classList.add('bioworld-shop-items');

      const shopRows = {};
      if (FOUNDRY_SHOP_ITEMS.length === 0) {
        const empty = document.createElement('div');
        empty.classList.add('bioworld-shop-empty');
        empty.textContent = 'No foundry upgrades available yet.';
        items.appendChild(empty);
      }

      FOUNDRY_SHOP_ITEMS.forEach((item) => {
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

    updateUI() {
      const elements = this.shopElements;
      elements.pointsValue.textContent = formatNumber(this.foundryPoints, true, 2);
      FOUNDRY_SHOP_ITEMS.forEach((item) => {
        const row = elements.shopRows[item.id];
        const purchases = this.getShopPurchaseCount(item.id);
        row.cost.textContent = `${formatNumber(item.cost, true)} FP`;
        row.count.textContent = `${purchases}/${item.maxPurchases}`;
        row.button.disabled = !this.canPurchaseUpgrade(item);
        row.button.textContent = purchases >= item.maxPurchases ? 'Maxed' : 'Buy';
      });
    }

    saveState() {
      return {
        ...super.saveState(),
        foundryPoints: this.foundryPoints,
        ecumenopolisDisabled: this.ecumenopolisDisabled,
        shopPurchases: { ...this.shopPurchases },
      };
    }

    loadState(state = {}) {
      super.loadState(state);
      this.foundryPoints = state.foundryPoints || 0;
      this.ecumenopolisDisabled = this.isCompleted || false;
      if (state.ecumenopolisDisabled) {
        this.ecumenopolisDisabled = true;
      }
      this.shopPurchases = {
        ...this.createEmptyShopPurchases(),
        ...(state.shopPurchases || {}),
      };
      this.applyFoundryEffects();
    }

    saveTravelState() {
      return {
        foundryPoints: this.foundryPoints,
        shopPurchases: { ...this.shopPurchases },
      };
    }

    loadTravelState(state = {}) {
      this.foundryPoints = state.foundryPoints || 0;
      this.shopPurchases = {
        ...this.createEmptyShopPurchases(),
        ...(state.shopPurchases || {}),
      };
    }
  }

  try {
    window.FoundryWorldProject = FoundryWorldProject;
  } catch (error) {}

  try {
    module.exports = FoundryWorldProject;
  } catch (error) {}
})();
