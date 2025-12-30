const DEFAULT_CHEM_REACTOR_AUTOMATION_SETTINGS = {
  autoDisable: false,
  mode: 'input',
  operator: '>',
  amount: 0,
  resourceCategory: '',
  resourceId: ''
};

class ChemicalReactor extends MultiRecipesBuilding {
  getAutomationSettings() {
    const settings = ChemicalReactor.getAutomationSettings();
    this._normalizeAutomationSettings(settings);
    return settings;
  }

  _normalizeAutomationSettings(settings) {
    settings.mode = settings.mode === 'output' ? 'output' : 'input';
    settings.operator = settings.operator === '<' ? '<' : '>';
    const options = this._getAutomationResourceOptions(settings.mode);
    if (!options.length) return;
    const match = options.find((option) => (
      option.category === settings.resourceCategory &&
      option.resource === settings.resourceId
    ));
    if (!match) {
      settings.resourceCategory = options[0].category;
      settings.resourceId = options[0].resource;
    }
  }

  _getAutomationResourceOptions(mode) {
    const source = mode === 'output' ? this.production : this.getConsumption();
    const options = [];
    for (const category in source) {
      const categoryResources = source[category];
      for (const resource in categoryResources) {
        const resourceData = resources[category][resource];
        const displayName = resourceData.displayName || resource;
        const categoryLabel = category.charAt(0).toUpperCase() + category.slice(1);
        options.push({
          category,
          resource,
          label: `${displayName} (${categoryLabel})`
        });
      }
    }
    return options;
  }

  updateProductivity(resources, deltaTime) {
    this.setAutomationActivityMultiplier(1);

    const { targetProductivity: baseTarget, hasAtmosphericOversight } =
      this.computeBaseProductivity(resources, deltaTime);
    const displayTarget = Math.max(
      0,
      Math.min(
        1,
        this.calculateBaseMinRatio(
          resources,
          deltaTime,
          this.ignoreResourceForProductivityResourceDisplay
        )
      )
    );

    if (this.active === 0) {
      this.setAutomationActivityMultiplier(0);
      this.productivity = 0;
      this.displayProductivity = 0;
      return;
    }

    let targetProductivity = baseTarget;
    const settings = this.getAutomationSettings();
    if (hasAtmosphericOversight && settings.autoDisable) {
      const options = this._getAutomationResourceOptions(settings.mode);
      if (options.length) {
        this._normalizeAutomationSettings(settings);
        const currentValue =
          resources[settings.resourceCategory][settings.resourceId].value;
        const amount = settings.amount || 0;
        const disable = settings.operator === '>'
          ? currentValue > amount
          : currentValue < amount;
        if (disable) {
          this.setAutomationActivityMultiplier(0);
          this.productivity = 0;
          this.displayProductivity = 0;
          return;
        }
      }
    }

    if (this.snapProductivity) {
      this.productivity = targetProductivity;
      this.displayProductivity = displayTarget;
      return;
    }

    this.productivity = this.applyProductivityDamping(
      this.productivity,
      targetProductivity
    );
    this.displayProductivity = this.applyProductivityDamping(
      this.displayProductivity,
      displayTarget
    );
  }

  initUI(autoBuildContainer, cache) {
    const settings = this.getAutomationSettings();

    const control = document.createElement('div');
    control.classList.add('chem-reactor-control');
    control.style.display = this.isBooleanFlagSet('terraformingBureauFeature')
      ? 'flex'
      : 'none';

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.classList.add('chem-reactor-checkbox');
    checkbox.checked = settings.autoDisable;
    checkbox.addEventListener('change', () => {
      settings.autoDisable = checkbox.checked;
    });
    control.appendChild(checkbox);

    const label = document.createElement('span');
    label.textContent = 'Disable if';
    control.appendChild(label);

    const modeSelect = document.createElement('select');
    modeSelect.classList.add('chem-reactor-mode');
    const inputOption = document.createElement('option');
    inputOption.value = 'input';
    inputOption.textContent = 'Input';
    const outputOption = document.createElement('option');
    outputOption.value = 'output';
    outputOption.textContent = 'Output';
    modeSelect.appendChild(inputOption);
    modeSelect.appendChild(outputOption);
    control.appendChild(modeSelect);

    const resourceSelect = document.createElement('select');
    resourceSelect.classList.add('chem-reactor-resource');
    control.appendChild(resourceSelect);

    const operatorSelect = document.createElement('select');
    operatorSelect.classList.add('chem-reactor-operator');
    const greaterOption = document.createElement('option');
    greaterOption.value = '>';
    greaterOption.textContent = '>';
    const lessOption = document.createElement('option');
    lessOption.value = '<';
    lessOption.textContent = '<';
    operatorSelect.appendChild(greaterOption);
    operatorSelect.appendChild(lessOption);
    control.appendChild(operatorSelect);

    const amountInput = document.createElement('input');
    amountInput.type = 'text';
    amountInput.classList.add('chem-reactor-amount-input');
    control.appendChild(amountInput);

    const wire = wireStringNumberInput(amountInput, {
      parseValue: (value) => Math.max(0, parseFlexibleNumber(value) || 0),
      formatValue: (value) => (value >= 1e6 ? formatNumber(value, true, 3) : String(value)),
      onValue: (value) => {
        settings.amount = value;
      },
      datasetKey: 'chemicalReactorAmount'
    });

    const syncResourceOptions = () => {
      this._normalizeAutomationSettings(settings);
      const options = this._getAutomationResourceOptions(settings.mode);
      const keyString = options.map(
        (option) => `${option.category}.${option.resource}:${option.label}`
      ).join('|');
      if (resourceSelect.dataset.optionKey !== keyString) {
        resourceSelect.textContent = '';
        options.forEach((option) => {
          const optionEl = document.createElement('option');
          optionEl.value = `${option.category}.${option.resource}`;
          optionEl.textContent = option.label;
          resourceSelect.appendChild(optionEl);
        });
        resourceSelect.dataset.optionKey = keyString;
      }
      const desiredValue = `${settings.resourceCategory}.${settings.resourceId}`;
      if (resourceSelect.value !== desiredValue) {
        resourceSelect.value = desiredValue;
      }
    };

    modeSelect.addEventListener('change', () => {
      settings.mode = modeSelect.value;
      syncResourceOptions();
    });

    resourceSelect.addEventListener('change', () => {
      const [category, resource] = resourceSelect.value.split('.');
      settings.resourceCategory = category;
      settings.resourceId = resource;
    });

    operatorSelect.addEventListener('change', () => {
      settings.operator = operatorSelect.value;
    });

    autoBuildContainer.appendChild(control);
    modeSelect.value = settings.mode;
    operatorSelect.value = settings.operator;
    syncResourceOptions();
    wire.syncParsedValue();

    cache.chemicalReactor = {
      container: control,
      checkbox,
      modeSelect,
      resourceSelect,
      operatorSelect,
      amountInput,
      wire
    };
  }

  updateUI(elements) {
    super.updateUI(elements);
    const chemEls = elements.chemicalReactor;
    if (!chemEls || !chemEls.container) {
      return;
    }
    const enabled = this.isBooleanFlagSet('terraformingBureauFeature');
    chemEls.container.style.display = enabled ? 'flex' : 'none';

    const settings = this.getAutomationSettings();
    chemEls.checkbox.checked = settings.autoDisable;
    if (chemEls.modeSelect.value !== settings.mode) {
      chemEls.modeSelect.value = settings.mode;
    }
    if (chemEls.operatorSelect.value !== settings.operator) {
      chemEls.operatorSelect.value = settings.operator;
    }

    this._normalizeAutomationSettings(settings);
    const options = this._getAutomationResourceOptions(settings.mode);
    const keyString = options.map(
      (option) => `${option.category}.${option.resource}:${option.label}`
    ).join('|');
    if (chemEls.resourceSelect.dataset.optionKey !== keyString) {
      chemEls.resourceSelect.textContent = '';
      options.forEach((option) => {
        const optionEl = document.createElement('option');
        optionEl.value = `${option.category}.${option.resource}`;
        optionEl.textContent = option.label;
        chemEls.resourceSelect.appendChild(optionEl);
      });
      chemEls.resourceSelect.dataset.optionKey = keyString;
    }
    const desiredValue = `${settings.resourceCategory}.${settings.resourceId}`;
    if (chemEls.resourceSelect.value !== desiredValue) {
      chemEls.resourceSelect.value = desiredValue;
    }

    if (document.activeElement !== chemEls.amountInput) {
      chemEls.amountInput.value = settings.amount >= 1e6
        ? formatNumber(settings.amount, true, 3)
        : String(settings.amount);
    }
    chemEls.amountInput.dataset.chemicalReactorAmount = String(settings.amount);
  }

  saveState() {
    const state = super.saveState();
    state.automationSettings = ChemicalReactor.saveAutomationSettings();
    return state;
  }

  loadState(state = {}) {
    super.loadState(state);
    ChemicalReactor.loadAutomationSettings(state.automationSettings);
  }

  static getAutomationSettings() {
    if (!this.automationSettings) {
      this.automationSettings = {
        autoDisable: DEFAULT_CHEM_REACTOR_AUTOMATION_SETTINGS.autoDisable,
        mode: DEFAULT_CHEM_REACTOR_AUTOMATION_SETTINGS.mode,
        operator: DEFAULT_CHEM_REACTOR_AUTOMATION_SETTINGS.operator,
        amount: DEFAULT_CHEM_REACTOR_AUTOMATION_SETTINGS.amount,
        resourceCategory: DEFAULT_CHEM_REACTOR_AUTOMATION_SETTINGS.resourceCategory,
        resourceId: DEFAULT_CHEM_REACTOR_AUTOMATION_SETTINGS.resourceId
      };
    }
    return this.automationSettings;
  }

  static saveAutomationSettings() {
    const settings = this.getAutomationSettings();
    return {
      autoDisable: !!settings.autoDisable,
      mode: settings.mode === 'output' ? 'output' : 'input',
      operator: settings.operator === '<' ? '<' : '>',
      amount: settings.amount || 0,
      resourceCategory: settings.resourceCategory,
      resourceId: settings.resourceId
    };
  }

  static loadAutomationSettings(saved = {}) {
    const settings = this.getAutomationSettings();
    settings.autoDisable = 'autoDisable' in saved
      ? !!saved.autoDisable
      : DEFAULT_CHEM_REACTOR_AUTOMATION_SETTINGS.autoDisable;
    settings.mode = saved.mode === 'output'
      ? 'output'
      : DEFAULT_CHEM_REACTOR_AUTOMATION_SETTINGS.mode;
    settings.operator = saved.operator === '<'
      ? '<'
      : DEFAULT_CHEM_REACTOR_AUTOMATION_SETTINGS.operator;
    settings.amount = 'amount' in saved
      ? (saved.amount || 0)
      : DEFAULT_CHEM_REACTOR_AUTOMATION_SETTINGS.amount;
    settings.resourceCategory = 'resourceCategory' in saved
      ? saved.resourceCategory
      : settings.resourceCategory;
    settings.resourceId = 'resourceId' in saved
      ? saved.resourceId
      : settings.resourceId;
    return settings;
  }
}

const chemicalReactorSettings = ChemicalReactor.getAutomationSettings();

try {
  module.exports = { ChemicalReactor, chemicalReactorSettings };
} catch (err) {
  window.ChemicalReactor = ChemicalReactor;
  window.chemicalReactorSettings = chemicalReactorSettings;
}
