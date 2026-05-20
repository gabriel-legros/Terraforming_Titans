(function () {
  let ProjectBase;
  try {
    ProjectBase = Project;
  } catch (error) {}
  try {
    ({ Project: ProjectBase } = require('../projects.js'));
  } catch (error) {}

  function getSpecializationText(path, vars, fallback = '') {
    try {
      return t(`ui.projects.specialization.${path}`, vars, fallback);
    } catch (error) {
      return fallback;
    }
  }

  class SpecializationProject extends ProjectBase {
    constructor(config, name, options) {
      super(config, name);
      this.pointsKey = options.pointsKey;
      this.pointsLabel = options.pointsLabel;
      this.pointsUnit = options.pointsUnit;
      this.shopTitle = options.shopTitle;
      this.shopTooltip = options.shopTooltip;
      this.emptyShopText = options.emptyShopText;
      this.shopItems = options.shopItems;
      this.shopItemMap = options.shopItemMap;
      this.maxButtonText = getSpecializationText('max', null, 'Max');
      this.specializationSourceId = options.specializationSourceId;
      this.otherSpecializationId = options.otherSpecializationId;
      this.otherSpecializationIds = Array.isArray(options.otherSpecializationIds)
        ? options.otherSpecializationIds.slice()
        : (this.otherSpecializationId ? [this.otherSpecializationId] : []);
      this.ecumenopolisEffectPrefix = options.ecumenopolisEffectPrefix;
      this.hazardPointBonusPerHazard = options.hazardPointBonusPerHazard || 0;
      this[this.pointsKey] = 0;
      this.ecumenopolisDisabled = false;
      this.shopPurchases = this.createEmptyShopPurchases();
      this.shopElements = null;
    }

    resolveShopElements() {
      if (this.shopElements?.pointsValue?.isConnected) {
        return this.shopElements;
      }
      const card = projectElements?.[this.name]?.projectItem;
      if (!card || !card.isConnected) {
        this.shopElements = null;
        return null;
      }
      const wrapper = card.querySelector('[data-specialization-ui="wrapper"]');
      const pointsValue = card.querySelector('[data-specialization-ui="pointsValue"]');
      const potentialValue = card.querySelector('[data-specialization-ui="potentialValue"]');
      if (!wrapper || !pointsValue || !potentialValue) {
        this.shopElements = null;
        return null;
      }
      const shopRows = {};
      this.shopItems.forEach((item) => {
        const id = item.id;
        shopRows[id] = {
          cost: card.querySelector(`[data-specialization-ui-cost="${id}"]`),
          count: card.querySelector(`[data-specialization-ui-count="${id}"]`),
          button: card.querySelector(`[data-specialization-ui-button="${id}"]`),
          maxButton: card.querySelector(`[data-specialization-ui-max-button="${id}"]`)
        };
      });
      this.shopElements = { wrapper, pointsValue, potentialValue, shopRows };
      return this.shopElements;
    }

    createEmptyShopPurchases() {
      return this.shopItems.reduce((acc, item) => {
        acc[item.id] = 0;
        return acc;
      }, {});
    }

    getSpecializationPoints() {
      return this[this.pointsKey];
    }

    addSpecializationPoints(value) {
      this[this.pointsKey] += value;
    }

    loadSpecializationState(state = {}) {
      this[this.pointsKey] = state[this.pointsKey] || 0;
      this.shopPurchases = {
        ...this.createEmptyShopPurchases(),
        ...(state.shopPurchases || {}),
      };
    }

    getShopPurchaseCount(id) {
      return this.shopPurchases[id] || 0;
    }

    canPurchaseUpgrade(item) {
      const purchases = this.getShopPurchaseCount(item.id);
      if (purchases >= this.getShopItemMaxPurchases(item)) {
        return false;
      }
      return this.getSpecializationPoints() >= this.getShopItemCost(item);
    }

    getMaxShopPurchases(item) {
      const points = this.getSpecializationPoints();
      const itemCost = this.getShopItemCost(item);
      if (points < itemCost) {
        return 0;
      }
      const remainingPurchases = this.getShopItemMaxPurchases(item) - this.getShopPurchaseCount(item.id);
      return Math.min(remainingPurchases, Math.floor(points / itemCost));
    }

    purchaseUpgrade(id, purchaseCount = 1) {
      const item = this.shopItemMap[id];
      if (!item || purchaseCount <= 0 || !this.canPurchaseUpgrade(item)) {
        return;
      }
      const maxPurchases = this.getMaxShopPurchases(item);
      const actualPurchases = Math.min(purchaseCount, maxPurchases);
      if (actualPurchases <= 0) {
        return;
      }
      this.addSpecializationPoints(-(this.getShopItemCost(item) * actualPurchases));
      this.shopPurchases[id] = this.getShopPurchaseCount(id) + actualPurchases;
      this.applySpecializationEffects();
      this.updateUI();
    }

    getShopItemCost(item) {
      return item.cost;
    }

    getShopItemMaxPurchases(item) {
      return item.maxPurchases;
    }

    getShopBuyButtonText(item, purchases, maxPurchases) {
      return purchases >= maxPurchases ? 'Maxed' : 'Buy';
    }

    getShopMaxButtonText() {
      return this.maxButtonText;
    }

    shouldDisableShopMaxButton(item, canBuy) {
      return !canBuy;
    }

    handleShopMaxButtonClick(item) {
      this.purchaseUpgrade(item.id, this.getMaxShopPurchases(item));
    }

    shouldHideStartBar() {
      return false;
    }

    getSpecializationRequirements() {
      return [];
    }

    getSpecializationLockedText() {
      if (this.isCompleted) {
        return '';
      }
      for (let i = 0; i < this.otherSpecializationIds.length; i += 1) {
        const projectId = this.otherSpecializationIds[i];
        const otherSpecialization = projectManager.projects[projectId];
        if (otherSpecialization && otherSpecialization.isCompleted) {
          return getSpecializationText('anotherCompleted', null, 'Another Specialization has been completed');
        }
      }
      return '';
    }

    getTravelPointGain() {
      return 0;
    }

    applyHazardPointBonus(points) {
      if (points <= 0 || this.hazardPointBonusPerHazard <= 0) {
        return points;
      }
      const hazardCount = spaceManager.getCurrentWorldHazardCount();
      if (hazardCount <= 0) {
        return points;
      }
      return points * (1 + (hazardCount * this.hazardPointBonusPerHazard));
    }

    prepareTravelState() {
      if (this.isCompleted) {
        this.addSpecializationPoints(this.getTravelPointGain());
        this.ecumenopolisDisabled = false;
        researchManager.removeEffect({ sourceId: this.specializationSourceId });
      }
    }

    applySpecializationEffects() {}

    applyEffects() {
      this.applySpecializationEffects();
    }

    applyEcumenopolisDisable() {
      researchManager.addAndReplace({
        type: 'booleanFlag',
        flagId: 'ecumenopolisDisabled',
        value: true,
        effectId: `${this.ecumenopolisEffectPrefix}-ecumenopolis-disable`,
        sourceId: this.specializationSourceId,
      });
      researchManager.addAndReplace({
        type: 'researchDisable',
        targetId: 'ai_ecumenopolis_expansion',
        effectId: `${this.ecumenopolisEffectPrefix}-ecumenopolis-research-disable`,
        sourceId: this.specializationSourceId,
      });
      const ecumenopolis = colonies.t7_colony;
      if (ecumenopolis.active > 0n) {
        ecumenopolis.adjustLand(-ecumenopolis.activeNumber);
      }
      ecumenopolis.count = 0n;
      ecumenopolis.active = 0n;
      ecumenopolis.unlocked = false;
      ecumenopolis.updateResourceStorage();
    }

    renderUI(container) {
      const wrapper = document.createElement('div');
      wrapper.classList.add('bioworld-shop');
      wrapper.dataset.specializationUi = 'wrapper';

      const header = document.createElement('div');
      header.classList.add('bioworld-shop-header');
      const titleGroup = document.createElement('div');
      titleGroup.classList.add('bioworld-shop-title');
      const title = document.createElement('span');
      title.textContent = this.shopTitle;
      const info = document.createElement('span');
      info.classList.add('info-tooltip-icon');
      info.innerHTML = '&#9432;';
      attachDynamicInfoTooltip(info, this.shopTooltip);
      titleGroup.append(title, info);

      const pointsGroup = document.createElement('div');
      pointsGroup.classList.add('bioworld-shop-meta');
      const pointsLabel = document.createElement('span');
      pointsLabel.textContent = this.pointsLabel;
      const pointsValue = document.createElement('span');
      pointsValue.classList.add('bioworld-shop-points');
      pointsValue.dataset.specializationUi = 'pointsValue';
      pointsGroup.append(pointsLabel, pointsValue);

      const potentialGroup = document.createElement('div');
      potentialGroup.classList.add('bioworld-shop-meta');
      const potentialLabel = document.createElement('span');
      potentialLabel.textContent = getSpecializationText('potentialPoints', null, 'Potential Points:');
      const potentialValue = document.createElement('span');
      potentialValue.classList.add('bioworld-shop-points');
      potentialValue.dataset.specializationUi = 'potentialValue';
      potentialGroup.append(potentialLabel, potentialValue);

      header.append(titleGroup, pointsGroup, potentialGroup);
      wrapper.appendChild(header);

      const items = document.createElement('div');
      items.classList.add('bioworld-shop-items');

      const shopRows = {};
      if (this.shopItems.length === 0 && this.emptyShopText) {
        const empty = document.createElement('div');
        empty.classList.add('bioworld-shop-empty');
        empty.textContent = this.emptyShopText;
        items.appendChild(empty);
      }

      this.shopItems.forEach((item) => {
        const row = document.createElement('div');
        row.classList.add('bioworld-shop-item');

        const labelRow = document.createElement('div');
        labelRow.classList.add('bioworld-shop-item-label');
        const labelText = document.createElement('span');
        labelText.textContent = item.label;
        const detail = document.createElement('span');
        detail.classList.add('info-tooltip-icon');
        detail.innerHTML = '&#9432;';
        attachDynamicInfoTooltip(detail, item.description);
        labelRow.append(labelText, detail);

        const cost = document.createElement('span');
        cost.classList.add('bioworld-shop-cost');
        cost.dataset.specializationUiCost = item.id;

        const count = document.createElement('span');
        count.classList.add('bioworld-shop-count');
        count.dataset.specializationUiCount = item.id;

        const button = document.createElement('button');
        button.classList.add('bioworld-shop-button');
        button.dataset.specializationUiButton = item.id;
        button.textContent = getSpecializationText('buy', null, 'Buy');
        button.addEventListener('click', (event) => {
          const purchaseCount = event.shiftKey ? this.getMaxShopPurchases(item) : 1;
          this.purchaseUpgrade(item.id, purchaseCount);
        });

        const maxButton = document.createElement('button');
        maxButton.classList.add('bioworld-shop-button', 'bioworld-shop-max-button');
        maxButton.dataset.specializationUiMaxButton = item.id;
        maxButton.textContent = this.getShopMaxButtonText(item);
        maxButton.addEventListener('click', () => {
          this.handleShopMaxButtonClick(item);
        });

        const metaRow = document.createElement('div');
        metaRow.classList.add('bioworld-shop-item-meta');
        const metaGroup = document.createElement('div');
        metaGroup.classList.add('bioworld-shop-item-costs');
        metaGroup.append(cost, count);
        const buttonGroup = document.createElement('div');
        buttonGroup.classList.add('bioworld-shop-item-actions');
        buttonGroup.append(button, maxButton);
        metaRow.append(metaGroup, buttonGroup);

        row.append(labelRow, metaRow);
        items.appendChild(row);

        shopRows[item.id] = { cost, count, button, maxButton };
      });

      wrapper.appendChild(items);
      container.appendChild(wrapper);

      this.shopElements = {
        wrapper,
        pointsValue,
        potentialValue,
        shopRows,
      };
      this.updateUI();
    }

    updateUI() {
      const elements = this.resolveShopElements();
      if (!elements || !elements.pointsValue || !elements.potentialValue || !elements.shopRows) {
        return;
      }
      elements.pointsValue.textContent = formatNumber(this.getSpecializationPoints(), true, 2, false, true);
      elements.potentialValue.textContent = formatNumber(this.getTravelPointGain(), true, 2);
      this.shopItems.forEach((item) => {
        const row = elements.shopRows[item.id];
        const purchases = this.getShopPurchaseCount(item.id);
        const maxPurchases = this.getShopItemMaxPurchases(item);
        row.cost.textContent = `${formatNumber(this.getShopItemCost(item), true)} ${this.pointsUnit}`;
        row.count.textContent = `${purchases}/${maxPurchases}`;
        const canBuy = this.canPurchaseUpgrade(item);
        row.button.disabled = !canBuy;
        if (row.maxButton) {
          row.maxButton.disabled = this.shouldDisableShopMaxButton(item, canBuy);
          row.maxButton.textContent = this.getShopMaxButtonText(item);
        }
        row.button.textContent = this.getShopBuyButtonText(item, purchases, maxPurchases);
      });
    }

    getSpecializationSaveState() {
      return {
        [this.pointsKey]: this.getSpecializationPoints(),
        ecumenopolisDisabled: this.ecumenopolisDisabled,
        shopPurchases: { ...this.shopPurchases },
      };
    }

    saveState() {
      return {
        ...super.saveState(),
        ...this.getSpecializationSaveState(),
      };
    }

    saveTravelState() {
      return {
        [this.pointsKey]: this.getSpecializationPoints(),
        shopPurchases: { ...this.shopPurchases },
      };
    }

    loadTravelState(state = {}) {
      this.loadSpecializationState(state);
    }
  }

  try {
    window.SpecializationProject = SpecializationProject;
  } catch (error) {}

  try {
    module.exports = SpecializationProject;
  } catch (error) {}
})();
