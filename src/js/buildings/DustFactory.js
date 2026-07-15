const DEFAULT_DUST_AUTOMATION_SETTINGS = {
  dustColor: '#000000',
  dustColorAlbedo: 0.05
};

const DEFAULT_DUST_STATE = {
  dustColorChanged: false,
  dustAlbedoStart: null,
  dustAlbedoTransitionActive: false
};

const DUST_COLOR_ALBEDO_RANGE = {
  min: 0.05,
  max: 0.8
};

function getDustFactoryText(path, fallback, vars) {
  try {
    return t(path, vars, fallback);
  } catch (error) {
    return fallback;
  }
}

function isCustomDustColor(color) {
  return color.toLowerCase() !== '#000000';
}

function updateDustResourceName(settings) {
  const name = isCustomDustColor(settings.dustColor)
    ? getDustFactoryText('ui.buildings.dustFactory.resourceNames.customDust', 'Custom Dust')
    : getDustFactoryText('ui.buildings.dustFactory.resourceNames.blackDust', 'Black Dust');
  const resource = resources.special.albedoUpgrades;
  if (resource.displayName !== name) {
    resource.displayName = name;
  }
}

function applyDustColorChange(previousColor, building, settings, previousAlbedo, resetDustStock = false) {
  if (resetDustStock && previousColor !== settings.dustColor) {
    resources.special.albedoUpgrades.value = 0;
  }
  if (previousColor !== settings.dustColor) {
    building.dustAlbedoStart = previousAlbedo;
    building.dustAlbedoTransitionActive = true;
  }
  building.dustColorChanged = true;
  updateDustResourceName(settings);
}

function clampDustAlbedo(value) {
  return Math.min(DUST_COLOR_ALBEDO_RANGE.max, Math.max(DUST_COLOR_ALBEDO_RANGE.min, value));
}

function getDustAlbedoFromColor(color) {
  const r = parseInt(color.slice(1, 3), 16) / 255;
  const g = parseInt(color.slice(3, 5), 16) / 255;
  const b = parseInt(color.slice(5, 7), 16) / 255;
  const luminance = (0.2126 * r) + (0.7152 * g) + (0.0722 * b);
  const span = DUST_COLOR_ALBEDO_RANGE.max - DUST_COLOR_ALBEDO_RANGE.min;
  return clampDustAlbedo(DUST_COLOR_ALBEDO_RANGE.min + (luminance * span));
}

class DustFactory extends Building {
  constructor(config, buildingName) {
    super(config, buildingName);

    DustFactory.resetAutomationSettings();
    this.dustColorChanged = DEFAULT_DUST_STATE.dustColorChanged;
    this.dustAlbedoStart = DEFAULT_DUST_STATE.dustAlbedoStart;
    this.dustAlbedoTransitionActive = DEFAULT_DUST_STATE.dustAlbedoTransitionActive;
  }

  enforceBlackOnly(settings) {
    if (this.reversalAvailable) {
      return;
    }

    const previousColor = settings.dustColor;
    if (previousColor !== '#000000') {
      const previousAlbedo = terraforming.calculateGroundAlbedo();
      settings.dustColor = '#000000';
      settings.dustColorAlbedo = DUST_COLOR_ALBEDO_RANGE.min;
      applyDustColorChange(previousColor, this, settings, previousAlbedo);
    }

    this.reverseEnabled = false;
    if (this.currentRecipeKey !== 'black') {
      this.currentRecipeKey = 'black';
      this._applyRecipeMapping();
    }
  }

  getAutomationSettings() {
    return DustFactory.getAutomationSettings();
  }

  updateProductivity(resources, deltaTime) {
    this.setAutomationActivityMultiplier(1);

    const { targetProductivity: baseTarget } = this.computeBaseProductivity(resources, deltaTime);

    if (this.active === 0n) {
      this.setAutomationActivityMultiplier(0);
      this.productivity = 0;
      return;
    }

    let targetProductivity = baseTarget;
    const settings = getDustAutomationSettings(this);
    updateDustResourceName(settings);
    this.enforceBlackOnly(settings);

    this.productivity = this.applyProductivityDamping(
      this.productivity,
      targetProductivity,
      deltaTime
    );
  }

  initUI(autoBuildContainer, cache) {
    const settings = getDustAutomationSettings(this);
    updateDustResourceName(settings);

    const colorControl = document.createElement('div');
    colorControl.classList.add('dust-color-control');
    colorControl.style.display = this.reversalAvailable
      ? 'flex'
      : 'none';

    const colorLabel = document.createElement('span');
    colorLabel.textContent = getDustFactoryText(
      'ui.buildings.dustFactory.dustColor',
      'Dust color:'
    );
    colorControl.appendChild(colorLabel);

    const colorInput = document.createElement('input');
    colorInput.type = 'color';
    colorInput.classList.add('dust-color-input');
    colorControl.appendChild(colorInput);

    const albedoLabel = document.createElement('span');
    colorControl.appendChild(albedoLabel);

    const update = () => {
      albedoLabel.textContent = getDustFactoryText(
        'ui.buildings.dustFactory.albedoValue',
        'Albedo: {albedo}',
        {
          albedo: settings.dustColorAlbedo.toFixed(3)
        }
      );
      if (document.activeElement !== colorInput) {
        colorInput.value = settings.dustColor;
      }
    };
    update();

    colorInput.addEventListener('input', () => {
      const previousAlbedo = terraforming.calculateGroundAlbedo();
      const previousColor = settings.dustColor;
      settings.dustColor = colorInput.value;
      settings.dustColorAlbedo = getDustAlbedoFromColor(settings.dustColor);
      applyDustColorChange(previousColor, this, settings, previousAlbedo, true);
      update();
    });

    autoBuildContainer.appendChild(colorControl);

    cache.dust = {
      container: colorControl,
      colorControl,
      colorInput,
      albedoLabel
    };
  }

  updateUI(elements) {
    const dustEls = elements.dust;
    dustEls.colorControl.style.display = this.reversalAvailable ? 'flex' : 'none';
    const settings = getDustAutomationSettings(this);
    updateDustResourceName(settings);
    this.enforceBlackOnly(settings);
    dustEls.albedoLabel.textContent = getDustFactoryText(
      'ui.buildings.dustFactory.albedoValue',
      'Albedo: {albedo}',
      {
        albedo: settings.dustColorAlbedo.toFixed(3)
      }
    );
    if (document.activeElement !== dustEls.colorInput) {
      dustEls.colorInput.value = settings.dustColor;
    }
  }

  saveState() {
    const state = super.saveState();
    state.dustColorChanged = this.dustColorChanged;
    state.dustAlbedoStart = this.dustAlbedoStart;
    state.dustAlbedoTransitionActive = this.dustAlbedoTransitionActive;
    state.automationSettings = DustFactory.saveAutomationSettings();
    return state;
  }

  loadState(state = {}) {
    super.loadState(state);
    if (this.currentRecipeKey !== 'black') {
      this.currentRecipeKey = 'black';
      this.reverseEnabled = false;
      this._applyRecipeMapping();
    }
    const savedAutomation = state.automationSettings || {};
    this.dustColorChanged = 'dustColorChanged' in state
      ? state.dustColorChanged
      : ('dustColorChanged' in savedAutomation
        ? !!savedAutomation.dustColorChanged
        : DEFAULT_DUST_STATE.dustColorChanged);
    this.dustAlbedoStart = 'dustAlbedoStart' in state
      ? state.dustAlbedoStart
      : ('dustAlbedoStart' in savedAutomation
        ? savedAutomation.dustAlbedoStart
        : DEFAULT_DUST_STATE.dustAlbedoStart);
    this.dustAlbedoTransitionActive = 'dustAlbedoTransitionActive' in state
      ? state.dustAlbedoTransitionActive
      : ('dustAlbedoTransitionActive' in savedAutomation
        ? !!savedAutomation.dustAlbedoTransitionActive
        : DEFAULT_DUST_STATE.dustAlbedoTransitionActive);
    DustFactory.loadAutomationSettings(state.automationSettings);
  }

  static getAutomationSettings() {
    return this.automationSettings;
  }

  static saveAutomationSettings() {
    const settings = this.getAutomationSettings();
    return {
      dustColor: settings.dustColor,
      dustColorAlbedo: settings.dustColorAlbedo
    };
  }

  static loadAutomationSettings(saved = {}) {
    const settings = this.getAutomationSettings();
    settings.dustColor = 'dustColor' in saved
      ? saved.dustColor
      : DEFAULT_DUST_AUTOMATION_SETTINGS.dustColor;
    settings.dustColorAlbedo = 'dustColorAlbedo' in saved
      ? saved.dustColorAlbedo
      : getDustAlbedoFromColor(settings.dustColor);
    return settings;
  }

  static resetAutomationSettings() {
    const settings = this.getAutomationSettings();
    settings.dustColor = DEFAULT_DUST_AUTOMATION_SETTINGS.dustColor;
    settings.dustColorAlbedo = DEFAULT_DUST_AUTOMATION_SETTINGS.dustColorAlbedo;
    return settings;
  }

  static getDustAlbedoFromColor(color) {
    return getDustAlbedoFromColor(color);
  }

  static applyDustColorChange(previousColor, building, settings, previousAlbedo, resetDustStock) {
    applyDustColorChange(previousColor, building, settings, previousAlbedo, resetDustStock);
  }

  static resetTravelState() {
    const dustFactory = buildings.dustFactory;
    const currentSettings = this.getAutomationSettings();
    const previousColor = currentSettings.dustColor;
    const settings = this.resetAutomationSettings();
    if (previousColor !== settings.dustColor) {
      dustFactory.dustColorChanged = true;
    }
    dustFactory.dustAlbedoStart = DEFAULT_DUST_STATE.dustAlbedoStart;
    dustFactory.dustAlbedoTransitionActive = DEFAULT_DUST_STATE.dustAlbedoTransitionActive;
    updateDustResourceName(settings);
  }
}

function getDustAutomationSettings(context) {
  return context.getAutomationSettings();
}

DustFactory.automationSettings = {
  dustColor: DEFAULT_DUST_AUTOMATION_SETTINGS.dustColor,
  dustColorAlbedo: DEFAULT_DUST_AUTOMATION_SETTINGS.dustColorAlbedo
};

const dustFactorySettings = DustFactory.getAutomationSettings();

const exportTarget = (() => {
  try {
    return module.exports;
  } catch (error) {
    return window;
  }
})();

exportTarget.DustFactory = DustFactory;
exportTarget.dustFactorySettings = dustFactorySettings;
