(function () {
  let ProjectBase;
  try {
    ProjectBase = Project;
  } catch (error) {}
  try {
    ({ Project: ProjectBase } = require('../projects.js'));
  } catch (error) {}

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
      this.specializationSourceId = options.specializationSourceId;
      this.otherSpecializationId = options.otherSpecializationId;
      this.ecumenopolisEffectPrefix = options.ecumenopolisEffectPrefix;
      this[this.pointsKey] = 0;
      this.ecumenopolisDisabled = false;
      this.shopPurchases = this.createEmptyShopPurchases();
      this.shopElements = null;
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
      if (purchases >= item.maxPurchases) {
        return false;
      }
      return this.getSpecializationPoints() >= item.cost;
    }

    purchaseUpgrade(id) {
      const item = this.shopItemMap[id];
      if (!this.canPurchaseUpgrade(item)) {
        return;
      }
      this.addSpecializationPoints(-item.cost);
      this.shopPurchases[id] = this.getShopPurchaseCount(id) + 1;
      this.applySpecializationEffects();
      this.updateUI();
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
      const otherSpecialization = projectManager.projects[this.otherSpecializationId];
      if (otherSpecialization.isCompleted) {
        return 'Another Specialization has been completed';
      }
      return '';
    }

    getTravelPointGain() {
      return 0;
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
      title.textContent = this.shopTitle;
      const info = document.createElement('span');
      info.classList.add('info-tooltip-icon');
      info.innerHTML = '&#9432;';
      info.title = this.shopTooltip;
      titleGroup.append(title, info);

      const pointsGroup = document.createElement('div');
      pointsGroup.classList.add('bioworld-shop-meta');
      const pointsLabel = document.createElement('span');
      pointsLabel.textContent = this.pointsLabel;
      const pointsValue = document.createElement('span');
      pointsValue.classList.add('bioworld-shop-points');
      pointsGroup.append(pointsLabel, pointsValue);

      const potentialGroup = document.createElement('div');
      potentialGroup.classList.add('bioworld-shop-meta');
      const potentialLabel = document.createElement('span');
      potentialLabel.textContent = 'Potential Points:';
      const potentialValue = document.createElement('span');
      potentialValue.classList.add('bioworld-shop-points');
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
        potentialValue,
        shopRows,
      };
      this.updateUI();
    }

    updateUI() {
      const elements = this.shopElements;
      elements.pointsValue.textContent = formatNumber(this.getSpecializationPoints(), true, 2);
      elements.potentialValue.textContent = formatNumber(this.getTravelPointGain(), true, 2);
      this.shopItems.forEach((item) => {
        const row = elements.shopRows[item.id];
        const purchases = this.getShopPurchaseCount(item.id);
        row.cost.textContent = `${formatNumber(item.cost, true)} ${this.pointsUnit}`;
        row.count.textContent = `${purchases}/${item.maxPurchases}`;
        row.button.disabled = !this.canPurchaseUpgrade(item);
        row.button.textContent = purchases >= item.maxPurchases ? 'Maxed' : 'Buy';
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
