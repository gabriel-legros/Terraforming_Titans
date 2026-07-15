function getHydrogenReservoirText(path, fallback, vars) {
  try {
    return t(path, vars, fallback);
  } catch (error) {
    return fallback;
  }
}

class HydrogenReservoir extends MultiRecipesBuilding {
  constructor(config, buildingName) {
    super(config, buildingName);
    this._cachedUI = null;
    this._handleEmptyClick = event => {
      event.stopPropagation();
      this.emptyToAtmosphere();
    };
  }

  initializeCustomUI(context = {}) {
    super.initializeCustomUI(context);

    const { hideButton } = context;
    if (!hideButton) {
      return;
    }

    const cache = context.cachedElements || {};
    let { emptyButton } = cache;
    if (!emptyButton) {
      emptyButton = document.createElement('button');
      emptyButton.textContent = getHydrogenReservoirText('ui.common.empty', 'Empty');
      emptyButton.classList.add('empty-button');
      cache.emptyButton = emptyButton;
    }

    if (emptyButton._hydrogenReservoirHandler) {
      emptyButton.removeEventListener('click', emptyButton._hydrogenReservoirHandler);
    }
    emptyButton._hydrogenReservoirHandler = this._handleEmptyClick;
    emptyButton.addEventListener('click', this._handleEmptyClick);

    hideButton.insertAdjacentElement('afterend', emptyButton);

    this._cachedUI = cache;
    this.updateUI(cache);
  }

  updateUI(elements = {}) {
    super.updateUI(elements);

    if (elements !== this._cachedUI && elements.emptyButton) {
      this._cachedUI = elements;
    }

    const button = elements.emptyButton || this._cachedUI?.emptyButton;
    if (!button) {
      return;
    }

    const colonyHydrogen = resources?.colony?.colonyHydrogen;
    const availableHydrogen = colonyHydrogen?.value ?? 0;
    button.disabled = availableHydrogen <= 0;
    button.style.display = this.unlocked && !this.isHidden ? 'inline-block' : 'none';
  }

  emptyToAtmosphere() {
    const colonyHydrogen = resources?.colony?.colonyHydrogen;
    const atmosphericHydrogen = resources?.atmospheric?.hydrogen;
    if (!colonyHydrogen || !atmosphericHydrogen) {
      return;
    }

    const amount = colonyHydrogen.value;
    if (amount <= 0) {
      return;
    }

    colonyHydrogen.decrease(amount);
    atmosphericHydrogen.increase(amount);
    atmosphericHydrogen.enable?.();

    updateResourceDisplay(resources);
    updateStructureDisplay(structures);
    this.updateUI(this._cachedUI || {});
  }
}

try {
  registerBuildingConstructor('hydrogenReservoir', HydrogenReservoir);
} catch (error) {}

try {
  module.exports = { HydrogenReservoir };
} catch (error) {
  window.HydrogenReservoir = HydrogenReservoir;
}
