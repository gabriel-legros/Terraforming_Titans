class MultiRecipesBuilding extends Building {
  constructor(config, buildingName) {
    super(config, buildingName);
    this._defaultDisplayName = config.name || this.displayName;
    this._staticConsumption = MultiRecipesBuilding._clone(config.consumption || {});
    this._defaultProduction = MultiRecipesBuilding._clone(config.production || {});
    this._applyRecipeMapping();
  }

  static _clone(source) {
    return source ? JSON.parse(JSON.stringify(source)) : {};
  }

  _getRecipeOptions() {
    const defs = this.recipes || {};
    return this._getAllowedRecipeKeys().map(key => ({
      key,
      label: defs[key].shortName || defs[key].displayName || key
    }));
  }

  _getAllowedRecipeKeys() {
    const defs = this.recipes || {};
    const keys = Object.keys(defs);
    if (!spaceManager || !spaceManager.isArtificialWorld()) {
      return keys;
    }
    const allowed = keys.filter(key => defs[key].artificialAllowed !== false);
    return allowed.length ? allowed : keys;
  }

  _applyRecipeMapping() {
    if (!this._staticConsumption) {
      this._staticConsumption = MultiRecipesBuilding._clone(this.consumption || {});
    }
    if (!this._defaultProduction) {
      this._defaultProduction = MultiRecipesBuilding._clone(this.production || {});
    }
    if (!this._defaultDisplayName) {
      this._defaultDisplayName = this.displayName;
    }

    const allowedKeys = this._getAllowedRecipeKeys();
    if (allowedKeys.length && !allowedKeys.includes(this.currentRecipeKey)) {
      const fallback = allowedKeys.includes(this.defaultRecipe) ? this.defaultRecipe : allowedKeys[0];
      if (fallback) {
        this.currentRecipeKey = fallback;
      }
    }

    const recipe = (this.recipes || {})[this.currentRecipeKey];
    const consumptionSource = recipe?.consumption || this._staticConsumption;
    this.consumption = MultiRecipesBuilding._clone(consumptionSource);
    this._baseConsumption = MultiRecipesBuilding._clone(consumptionSource);

    const productionSource = recipe?.production || this._defaultProduction;
    this.production = MultiRecipesBuilding._clone(productionSource);

    this.displayName = recipe?.displayName || this._defaultDisplayName;
    this.shortName = recipe?.shortName || null;
  }

  setRecipe(recipeKey) {
    if (!this.recipes || !Object.prototype.hasOwnProperty.call(this.recipes, recipeKey)) {
      return false;
    }
    if (recipeKey === this.currentRecipeKey) {
      return false;
    }
    this.currentRecipeKey = recipeKey;
    this._applyRecipeMapping();
    this.updateResourceStorage();
    this.maintenanceCost = this.calculateMaintenanceCost();
    this.currentProduction = {};
    this.currentConsumption = {};
    this.currentMaintenance = {};
    updateBuildingDisplay(buildings);
    return true;
  }

  initializeCustomUI(context = {}) {
    const { leftContainer, hideButton, cachedElements } = context;
    if (!leftContainer || !hideButton || typeof document === 'undefined') {
      return;
    }

    const wrapper = document.createElement('span');
    wrapper.classList.add('building-recipe-select');

    const label = document.createElement('label');
    label.textContent = 'Recipe: ';
    label.htmlFor = `${this.name}-recipe-select`;
    wrapper.appendChild(label);

    const select = document.createElement('select');
    select.id = `${this.name}-recipe-select`;
    wrapper.appendChild(select);

    leftContainer.appendChild(wrapper);

    if (cachedElements) {
      cachedElements.recipeSelectContainer = wrapper;
      cachedElements.recipeSelectLabel = label;
      cachedElements.recipeSelect = select;
    }

    select.addEventListener('change', () => {
      const selected = select.value;
      this.setRecipe(selected);
    });

    this.updateUI(cachedElements || { recipeSelect: select });
  }

  updateUI(elements = {}) {
    const select = elements.recipeSelect;
    if (!select) {
      return;
    }

    const options = this._getRecipeOptions();
    const keyString = options.map(opt => `${opt.key}:${opt.label}`).join('|');
    if (select.dataset.optionKey !== keyString) {
      select.textContent = '';
      options.forEach(opt => {
        const optionEl = document.createElement('option');
        optionEl.value = opt.key;
        optionEl.textContent = opt.label;
        select.appendChild(optionEl);
      });
      select.dataset.optionKey = keyString;
    } else {
      options.forEach((opt, index) => {
        const optionEl = select.options[index];
        if (optionEl && optionEl.textContent !== opt.label) {
          optionEl.textContent = opt.label;
        }
      });
    }

    if (select.value !== this.currentRecipeKey) {
      select.value = this.currentRecipeKey;
    }
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { MultiRecipesBuilding };
} else {
  window.MultiRecipesBuilding = MultiRecipesBuilding;
}
