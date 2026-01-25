const DEFAULT_DUST_AUTOMATION_SETTINGS = {
  autoTargetAlbedo: false,
  targetAlbedo: 0.05,
  dustColor: '#000000',
  dustColorAlbedo: 0.05,
  dustColorChanged: false,
  dustAlbedoStart: null,
  dustAlbedoTransitionActive: false,
  hasCustomTarget: false,
  initialized: false
};

const DUST_TARGET_ALBEDO = {
  black: 0.05,
  white: 0.8
};

const DUST_COLOR_ALBEDO_RANGE = {
  min: 0.05,
  max: 0.8
};

function isCustomDustColor(color) {
  return color !== '#000000' && color !== '#ffffff';
}

function updateDustResourceName(settings) {
  const name = isCustomDustColor(settings.dustColor) ? 'Custom Dust' : 'Black Dust';
  const resource = resources.special.albedoUpgrades;
  if (resource.displayName !== name) {
    resource.displayName = name;
  }
}

function applyDustColorChange(previousColor, settings, previousAlbedo) {
  if (isCustomDustColor(settings.dustColor) && previousColor !== settings.dustColor) {
    resources.special.albedoUpgrades.value = 0;
    resources.special.whiteDust.value = 0;
  }
  if (previousColor !== settings.dustColor) {
    settings.dustAlbedoStart = previousAlbedo;
    settings.dustAlbedoTransitionActive = true;
  }
  settings.dustColorChanged = true;
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
  enforceBlackOnly(settings) {
    if (this.reversalAvailable) {
      return;
    }

    const previousColor = settings.dustColor;
    if (previousColor !== '#000000') {
      const previousAlbedo = terraforming.calculateGroundAlbedo();
      settings.dustColor = '#000000';
      settings.dustColorAlbedo = DUST_TARGET_ALBEDO.black;
      settings.targetAlbedo = DUST_TARGET_ALBEDO.black;
      settings.hasCustomTarget = false;
      applyDustColorChange(previousColor, settings, previousAlbedo);
    }

    this.reverseEnabled = false;
    if (this.currentRecipeKey !== 'black') {
      this.currentRecipeKey = 'black';
      this._applyRecipeMapping();
    }
  }

  getAutomationSettings() {
    const settings = DustFactory.getAutomationSettings();
    if (!settings.initialized) {
      settings.targetAlbedo = this.currentRecipeKey === 'white'
        ? DUST_TARGET_ALBEDO.white
        : DUST_TARGET_ALBEDO.black;
      settings.initialized = true;
    }
    return settings;
  }

  updateProductivity(resources, deltaTime) {
    this.setAutomationActivityMultiplier(1);

    const {
      targetProductivity: baseTarget,
      hasAtmosphericOversight,
      solveRequired
    } = this.computeBaseProductivity(resources, deltaTime);

    if (this.active === 0) {
      this.setAutomationActivityMultiplier(0);
      this.productivity = 0;
      return;
    }

    let targetProductivity = baseTarget;
    const settings = getDustAutomationSettings(this);
    updateDustResourceName(settings);
    this.enforceBlackOnly(settings);

    if (hasAtmosphericOversight && settings.autoTargetAlbedo) {
      const isCustomColor = isCustomDustColor(settings.dustColor);
      if (isCustomColor) {
        const blackRes = resources.special.albedoUpgrades;
        const remaining = blackRes.baseCap - blackRes.value;
        if (remaining <= 0) {
          this.setAutomationActivityMultiplier(0);
          this.productivity = 0;
          return;
        }
        if (this.currentRecipeKey !== 'black') {
          this.currentRecipeKey = 'black';
          this._applyRecipeMapping();
        }
        this.reverseEnabled = false;
        this.productivity = targetProductivity;
        return;
      }

      const targetAlbedo = settings.targetAlbedo;
      const currentAlbedo = terraforming.calculateGroundAlbedo();
      const difference = targetAlbedo - currentAlbedo;
      const tolerance = 0.0005;

      if (Math.abs(difference) <= tolerance) {
        this.setAutomationActivityMultiplier(0);
        this.productivity = 0;
        return;
      }

      const blackRes = resources.special.albedoUpgrades;
      const whiteRes = resources.special.whiteDust;
      const needHigher = difference > 0;
      if (needHigher && !this.reversalAvailable) {
        this.setAutomationActivityMultiplier(0);
        this.productivity = 0;
        return;
      }

      let recipeKey = needHigher ? 'white' : 'black';
      let reverse = false;
      let resource = needHigher ? whiteRes : blackRes;
      let sign = 1;

      if (this.reversalAvailable) {
        if (needHigher && blackRes.value > 0) {
          recipeKey = 'black';
          reverse = true;
          resource = blackRes;
          sign = -1;
        } else if (!needHigher && whiteRes.value > 0) {
          recipeKey = 'white';
          reverse = true;
          resource = whiteRes;
          sign = -1;
        }
      }

      const recipe = this.recipes[recipeKey];
      const resourceId = recipeKey === 'white' ? 'whiteDust' : 'albedoUpgrades';
      const baseProduction = recipe.production.special[resourceId];
      const effectiveMultiplier =
        this.getEffectiveProductionMultiplier() *
        this.getEffectiveResourceProductionMultiplier('special', resourceId);
      const maxChange = this.active * baseProduction * effectiveMultiplier * (deltaTime / 1000);
      const allowedChange = reverse ? Math.min(maxChange, resource.value) : maxChange;

      const original = resource.value;
      const required = solveRequired((amount) => {
        resource.value = Math.max(0, original + sign * amount);
        const result = terraforming.calculateGroundAlbedo() - targetAlbedo;
        resource.value = original;
        return result;
      }, allowedChange);

      let fraction = allowedChange > 0 ? required / allowedChange : 0;
      if (fraction <= 0 && allowedChange > 0) {
        fraction = 1;
      }
      if (fraction > 1) {
        fraction = 1;
      }

      if (this.currentRecipeKey !== recipeKey) {
        this.currentRecipeKey = recipeKey;
        this._applyRecipeMapping();
      }
      this.reverseEnabled = reverse;
      this.productivity = Math.min(targetProductivity, fraction);
      if (this.productivity === 0) {
        this.setAutomationActivityMultiplier(0);
      }
      return;
    }

    this.productivity = this.applyProductivityDamping(this.productivity, targetProductivity);
  }

  initUI(autoBuildContainer, cache) {
    const settings = getDustAutomationSettings(this);
    updateDustResourceName(settings);

    const albedoControl = document.createElement('div');
    albedoControl.classList.add('dust-albedo-control');
    albedoControl.style.display = this.isBooleanFlagSet('terraformingBureauFeature')
      ? 'flex'
      : 'none';

    const albedoCheckbox = document.createElement('input');
    albedoCheckbox.type = 'checkbox';
    albedoCheckbox.classList.add('dust-albedo-checkbox');
    albedoCheckbox.checked = settings.autoTargetAlbedo;
    albedoCheckbox.addEventListener('change', () => {
      settings.autoTargetAlbedo = albedoCheckbox.checked;
    });
    albedoControl.appendChild(albedoCheckbox);

    const albedoLabel = document.createElement('span');
    albedoLabel.textContent = 'Target ground albedo:';
    albedoControl.appendChild(albedoLabel);

    const albedoInput = document.createElement('input');
    albedoInput.type = 'number';
    albedoInput.step = 0.01;
    albedoInput.min = DUST_COLOR_ALBEDO_RANGE.min;
    albedoInput.max = DUST_COLOR_ALBEDO_RANGE.max;
    albedoInput.classList.add('dust-albedo-input');
    albedoControl.appendChild(albedoInput);

    const colorControl = document.createElement('div');
    colorControl.classList.add('dust-color-control');
    colorControl.style.display = this.isBooleanFlagSet('terraformingBureauFeature') && this.reversalAvailable
      ? 'flex'
      : 'none';

    const colorLabel = document.createElement('span');
    colorLabel.textContent = 'Dust color:';
    colorControl.appendChild(colorLabel);

    const colorInput = document.createElement('input');
    colorInput.type = 'color';
    colorInput.classList.add('dust-color-input');
    colorControl.appendChild(colorInput);

    albedoInput.addEventListener('input', () => {
      if (isCustomDustColor(settings.dustColor)) {
        return;
      }
      settings.targetAlbedo = clampDustAlbedo(Number(albedoInput.value));
      settings.hasCustomTarget = true;
    });

    const update = () => {
      const isCustomColor = isCustomDustColor(settings.dustColor);
      if (isCustomColor) {
        settings.targetAlbedo = settings.dustColorAlbedo;
        settings.hasCustomTarget = false;
      }
      albedoInput.readOnly = isCustomColor;
      if (document.activeElement !== albedoInput) {
        albedoInput.value = isCustomColor ? settings.dustColorAlbedo : settings.targetAlbedo;
      }
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
      if (isCustomDustColor(settings.dustColor)) {
        settings.targetAlbedo = settings.dustColorAlbedo;
        settings.hasCustomTarget = false;
      }
      applyDustColorChange(previousColor, settings, previousAlbedo);
      update();
    });

    autoBuildContainer.appendChild(albedoControl);
    autoBuildContainer.appendChild(colorControl);

    cache.dust = {
      container: albedoControl,
      checkbox: albedoCheckbox,
      input: albedoInput,
      colorControl,
      colorInput
    };
  }

  updateUI(elements) {
    const dustEls = elements.dust;
    const enabled = this.isBooleanFlagSet('terraformingBureauFeature');
    dustEls.container.style.display = enabled ? 'flex' : 'none';
    dustEls.colorControl.style.display = enabled && this.reversalAvailable ? 'flex' : 'none';
    const settings = getDustAutomationSettings(this);
    updateDustResourceName(settings);
    this.enforceBlackOnly(settings);
    dustEls.checkbox.checked = settings.autoTargetAlbedo;
    if (isCustomDustColor(settings.dustColor)) {
      settings.targetAlbedo = settings.dustColorAlbedo;
      settings.hasCustomTarget = false;
    }
    dustEls.input.readOnly = isCustomDustColor(settings.dustColor);
    if (document.activeElement !== dustEls.input) {
      dustEls.input.value = isCustomDustColor(settings.dustColor)
        ? settings.dustColorAlbedo
        : settings.targetAlbedo;
    }
    if (document.activeElement !== dustEls.colorInput) {
      dustEls.colorInput.value = settings.dustColor;
    }
  }

  saveState() {
    const state = super.saveState();
    state.automationSettings = DustFactory.saveAutomationSettings();
    return state;
  }

  loadState(state = {}) {
    super.loadState(state);
    DustFactory.loadAutomationSettings(state.automationSettings);
  }

  static getAutomationSettings() {
    return this.automationSettings;
  }

  static saveAutomationSettings() {
    const settings = this.getAutomationSettings();
    return {
      autoTargetAlbedo: !!settings.autoTargetAlbedo,
      targetAlbedo: settings.targetAlbedo,
      dustColor: settings.dustColor,
      dustColorAlbedo: settings.dustColorAlbedo,
      dustAlbedoStart: settings.dustAlbedoStart,
      dustAlbedoTransitionActive: !!settings.dustAlbedoTransitionActive,
      hasCustomTarget: !!settings.hasCustomTarget,
      initialized: !!settings.initialized
    };
  }

  static loadAutomationSettings(saved = {}) {
    const settings = this.getAutomationSettings();
    settings.autoTargetAlbedo = 'autoTargetAlbedo' in saved
      ? !!saved.autoTargetAlbedo
      : DEFAULT_DUST_AUTOMATION_SETTINGS.autoTargetAlbedo;
    settings.targetAlbedo = 'targetAlbedo' in saved
      ? saved.targetAlbedo
      : DEFAULT_DUST_AUTOMATION_SETTINGS.targetAlbedo;
    settings.dustColor = 'dustColor' in saved
      ? saved.dustColor
      : DEFAULT_DUST_AUTOMATION_SETTINGS.dustColor;
    settings.dustColorAlbedo = 'dustColorAlbedo' in saved
      ? saved.dustColorAlbedo
      : getDustAlbedoFromColor(settings.dustColor);
    settings.dustColorChanged = false;
    settings.dustAlbedoStart = 'dustAlbedoStart' in saved
      ? saved.dustAlbedoStart
      : DEFAULT_DUST_AUTOMATION_SETTINGS.dustAlbedoStart;
    settings.dustAlbedoTransitionActive = 'dustAlbedoTransitionActive' in saved
      ? !!saved.dustAlbedoTransitionActive
      : DEFAULT_DUST_AUTOMATION_SETTINGS.dustAlbedoTransitionActive;
    settings.hasCustomTarget = 'hasCustomTarget' in saved
      ? !!saved.hasCustomTarget
      : DEFAULT_DUST_AUTOMATION_SETTINGS.hasCustomTarget;
    settings.initialized = 'initialized' in saved
      ? !!saved.initialized
      : DEFAULT_DUST_AUTOMATION_SETTINGS.initialized;
    return settings;
  }

  static getDustAlbedoFromColor(color) {
    return getDustAlbedoFromColor(color);
  }

  static applyDustColorChange(previousColor, settings, previousAlbedo) {
    applyDustColorChange(previousColor, settings, previousAlbedo);
  }
}

function getDustAutomationSettings(context) {
  return context.getAutomationSettings();
}

DustFactory.automationSettings = {
  autoTargetAlbedo: DEFAULT_DUST_AUTOMATION_SETTINGS.autoTargetAlbedo,
  targetAlbedo: DEFAULT_DUST_AUTOMATION_SETTINGS.targetAlbedo,
  dustColor: DEFAULT_DUST_AUTOMATION_SETTINGS.dustColor,
  dustColorAlbedo: DEFAULT_DUST_AUTOMATION_SETTINGS.dustColorAlbedo,
  dustColorChanged: DEFAULT_DUST_AUTOMATION_SETTINGS.dustColorChanged,
  dustAlbedoStart: DEFAULT_DUST_AUTOMATION_SETTINGS.dustAlbedoStart,
  dustAlbedoTransitionActive: DEFAULT_DUST_AUTOMATION_SETTINGS.dustAlbedoTransitionActive,
  hasCustomTarget: DEFAULT_DUST_AUTOMATION_SETTINGS.hasCustomTarget,
  initialized: DEFAULT_DUST_AUTOMATION_SETTINGS.initialized
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
