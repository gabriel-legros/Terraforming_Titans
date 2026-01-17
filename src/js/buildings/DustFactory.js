const DEFAULT_DUST_AUTOMATION_SETTINGS = {
  autoTargetAlbedo: false,
  targetAlbedo: 0.05,
  hasCustomTarget: false,
  initialized: false
};

const DUST_TARGET_ALBEDO = {
  black: 0.05,
  white: 0.8
};

class DustFactory extends Building {
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

    if (hasAtmosphericOversight && settings.autoTargetAlbedo) {
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
    albedoInput.min = 0;
    albedoInput.max = 1;
    albedoInput.classList.add('dust-albedo-input');
    albedoControl.appendChild(albedoInput);

    const update = () => {
      if (document.activeElement !== albedoInput) {
        albedoInput.value = settings.targetAlbedo;
      }
    };
    update();

    albedoInput.addEventListener('input', () => {
      const value = Number(albedoInput.value);
      settings.targetAlbedo = Math.min(1, Math.max(0, value));
      settings.hasCustomTarget = true;
    });

    autoBuildContainer.appendChild(albedoControl);

    cache.dust = {
      container: albedoControl,
      checkbox: albedoCheckbox,
      input: albedoInput
    };
  }

  updateUI(elements) {
    const dustEls = elements.dust;
    const enabled = this.isBooleanFlagSet('terraformingBureauFeature');
    dustEls.container.style.display = enabled ? 'flex' : 'none';
    const settings = getDustAutomationSettings(this);
    dustEls.checkbox.checked = settings.autoTargetAlbedo;
    if (document.activeElement !== dustEls.input) {
      dustEls.input.value = settings.targetAlbedo;
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
    settings.hasCustomTarget = 'hasCustomTarget' in saved
      ? !!saved.hasCustomTarget
      : DEFAULT_DUST_AUTOMATION_SETTINGS.hasCustomTarget;
    settings.initialized = 'initialized' in saved
      ? !!saved.initialized
      : DEFAULT_DUST_AUTOMATION_SETTINGS.initialized;
    return settings;
  }
}

function getDustAutomationSettings(context) {
  return context.getAutomationSettings();
}

DustFactory.automationSettings = {
  autoTargetAlbedo: DEFAULT_DUST_AUTOMATION_SETTINGS.autoTargetAlbedo,
  targetAlbedo: DEFAULT_DUST_AUTOMATION_SETTINGS.targetAlbedo,
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
