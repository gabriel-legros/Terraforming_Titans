const DUST_HEMISPHERES = ['north', 'south'];
const DUST_ZONES = ['tropical', 'temperate', 'polar'];

function createDustColors(color) {
  return {
    north: { tropical: color, temperate: color, polar: color },
    south: { tropical: color, temperate: color, polar: color }
  };
}

const DEFAULT_DUST_AUTOMATION_SETTINGS = {
  dustColor: '#000000',
  dustColorAlbedo: 0.05,
  dustColors: createDustColors('#000000')
};

const DEFAULT_DUST_STATE = {
  dustColorChanged: false,
  dustAlbedoStart: null,
  dustAlbedoStarts: null,
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

function averageDustColors(colors) {
  let red = 0;
  let green = 0;
  let blue = 0;
  for (const hemisphere of DUST_HEMISPHERES) {
    for (const zone of DUST_ZONES) {
      const color = colors[hemisphere][zone];
      red += parseInt(color.slice(1, 3), 16);
      green += parseInt(color.slice(3, 5), 16);
      blue += parseInt(color.slice(5, 7), 16);
    }
  }
  const toHex = value => Math.round(value / 6).toString(16).padStart(2, '0');
  return `#${toHex(red)}${toHex(green)}${toHex(blue)}`;
}

function updateDustColorSummary(settings) {
  settings.dustColor = averageDustColors(settings.dustColors);
  let albedo = 0;
  for (const hemisphere of DUST_HEMISPHERES) {
    for (const zone of DUST_ZONES) {
      albedo += getDustAlbedoFromColor(settings.dustColors[hemisphere][zone]);
    }
  }
  settings.dustColorAlbedo = albedo / 6;
}

function setAllDustColors(settings, color) {
  for (const hemisphere of DUST_HEMISPHERES) {
    for (const zone of DUST_ZONES) {
      settings.dustColors[hemisphere][zone] = color;
    }
  }
  updateDustColorSummary(settings);
}

function getDustColorSignature(settings) {
  return DUST_HEMISPHERES
    .flatMap(hemisphere => DUST_ZONES.map(zone => settings.dustColors[hemisphere][zone]))
    .join('|');
}

function isCustomDust(settings) {
  return getDustColorSignature(settings) !== getDustColorSignature(DEFAULT_DUST_AUTOMATION_SETTINGS);
}

function getDustZoneAlbedo(settings, zone) {
  return (
    getDustAlbedoFromColor(settings.dustColors.north[zone])
    + getDustAlbedoFromColor(settings.dustColors.south[zone])
  ) / 2;
}

function getCurrentZonalGroundAlbedos() {
  const albedos = {};
  for (const zone of DUST_ZONES) {
    albedos[zone] = terraforming.calculateZonalGroundAlbedo(zone);
  }
  return albedos;
}

function updateDustResourceName(settings) {
  const name = isCustomDust(settings)
    ? getDustFactoryText('ui.buildings.dustFactory.resourceNames.customDust', 'Custom Dust')
    : getDustFactoryText('ui.buildings.dustFactory.resourceNames.blackDust', 'Black Dust');
  const resource = resources.special.albedoUpgrades;
  if (resource.displayName !== name) {
    resource.displayName = name;
  }
}

function applyDustConfigurationChange(previousSignature, building, settings, previousAlbedos, resetDustStock = false) {
  const signature = getDustColorSignature(settings);
  if (resetDustStock && previousSignature !== signature) {
    resources.special.albedoUpgrades.value = 0;
  }
  if (previousSignature !== signature) {
    building.dustAlbedoStart = DUST_ZONES.reduce(
      (total, zone) => total + previousAlbedos[zone] * terraforming.getZoneWeight(zone),
      0
    );
    building.dustAlbedoStarts = previousAlbedos;
    building.dustAlbedoTransitionActive = true;
  }
  building.dustColorChanged = true;
  updateDustResourceName(settings);
}

class DustFactory extends Building {
  constructor(config, buildingName) {
    super(config, buildingName);

    DustFactory.resetAutomationSettings();
    this.dustColorChanged = DEFAULT_DUST_STATE.dustColorChanged;
    this.dustAlbedoStart = DEFAULT_DUST_STATE.dustAlbedoStart;
    this.dustAlbedoStarts = DEFAULT_DUST_STATE.dustAlbedoStarts;
    this.dustAlbedoTransitionActive = DEFAULT_DUST_STATE.dustAlbedoTransitionActive;
  }

  enforceBlackOnly(settings) {
    if (this.reversalAvailable) {
      return;
    }

    const previousSignature = getDustColorSignature(settings);
    if (isCustomDust(settings)) {
      const previousAlbedos = getCurrentZonalGroundAlbedos();
      setAllDustColors(settings, '#000000');
      applyDustConfigurationChange(previousSignature, this, settings, previousAlbedos);
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

  applyDustAutomationSettings(saved, resetDustStock) {
    const settings = getDustAutomationSettings(this);
    const previousAlbedos = getCurrentZonalGroundAlbedos();
    const previousSignature = getDustColorSignature(settings);
    DustFactory.loadAutomationSettings(saved);
    applyDustConfigurationChange(previousSignature, this, settings, previousAlbedos, resetDustStock);
  }

  updateProductivity(resources, deltaTime) {
    this.setAutomationActivityMultiplier(1);

    const { targetProductivity: baseTarget } = this.computeBaseProductivity(resources, deltaTime);

    if (this.active === 0n) {
      this.setAutomationActivityMultiplier(0);
      this.productivity = 0;
      return;
    }

    const settings = getDustAutomationSettings(this);
    updateDustResourceName(settings);
    this.enforceBlackOnly(settings);

    this.productivity = this.applyProductivityDamping(
      this.productivity,
      baseTarget,
      deltaTime
    );
  }

  initUI(autoBuildContainer, cache) {
    const settings = getDustAutomationSettings(this);
    updateDustResourceName(settings);

    const colorControl = document.createElement('div');
    colorControl.classList.add('dust-color-control');
    colorControl.style.display = this.reversalAvailable ? 'flex' : 'none';

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

    const advancedButton = document.createElement('button');
    advancedButton.type = 'button';
    advancedButton.classList.add('dust-advanced-settings-button');
    advancedButton.innerHTML = '&#9881;&#xFE0E;';
    advancedButton.setAttribute('aria-label', getDustFactoryText(
      'ui.buildings.dustFactory.advancedSettings.button',
      'Advanced dust settings'
    ));
    advancedButton.title = getDustFactoryText(
      'ui.buildings.dustFactory.advancedSettings.button',
      'Advanced dust settings'
    );
    colorControl.appendChild(advancedButton);

    const overlay = document.createElement('div');
    overlay.classList.add('dust-settings-overlay');

    const settingsWindow = document.createElement('div');
    settingsWindow.classList.add('dust-settings-window');
    settingsWindow.setAttribute('role', 'dialog');
    settingsWindow.setAttribute('aria-modal', 'true');
    settingsWindow.setAttribute('aria-labelledby', 'dust-settings-title');

    const header = document.createElement('div');
    header.classList.add('dust-settings-header');
    const title = document.createElement('div');
    title.id = 'dust-settings-title';
    title.classList.add('dust-settings-title');
    title.textContent = getDustFactoryText(
      'ui.buildings.dustFactory.advancedSettings.title',
      'Zonal Dust Colors'
    );
    const closeButton = document.createElement('button');
    closeButton.type = 'button';
    closeButton.classList.add('dust-settings-close');
    closeButton.textContent = getDustFactoryText(
      'ui.buildings.dustFactory.advancedSettings.close',
      'Close'
    );
    header.append(title, closeButton);

    const intro = document.createElement('p');
    intro.classList.add('dust-settings-intro');
    intro.textContent = getDustFactoryText(
      'ui.buildings.dustFactory.advancedSettings.intro',
      'Each climate zone uses the average albedo of its north and south colors.'
    );

    const grid = document.createElement('div');
    grid.classList.add('dust-settings-grid');
    const corner = document.createElement('span');
    const northHeading = document.createElement('strong');
    northHeading.textContent = getDustFactoryText(
      'ui.buildings.dustFactory.advancedSettings.north',
      'North'
    );
    const southHeading = document.createElement('strong');
    southHeading.textContent = getDustFactoryText(
      'ui.buildings.dustFactory.advancedSettings.south',
      'South'
    );
    grid.append(corner, northHeading, southHeading);

    const zoneInputs = {};
    const zoneAlbedoLabels = {};
    for (const zone of DUST_ZONES) {
      zoneInputs[zone] = {};
      zoneAlbedoLabels[zone] = {};
      const zoneLabel = document.createElement('strong');
      zoneLabel.textContent = getDustFactoryText(
        `ui.buildings.dustFactory.advancedSettings.zones.${zone}`,
        zone.charAt(0).toUpperCase() + zone.slice(1)
      );
      grid.appendChild(zoneLabel);

      for (const hemisphere of DUST_HEMISPHERES) {
        const cell = document.createElement('label');
        cell.classList.add('dust-settings-color-cell');
        const input = document.createElement('input');
        input.type = 'color';
        input.classList.add('dust-color-input');
        input.setAttribute('aria-label', `${hemisphere} ${zone}`);
        const value = document.createElement('span');
        cell.append(input, value);
        grid.appendChild(cell);
        zoneInputs[zone][hemisphere] = input;
        zoneAlbedoLabels[zone][hemisphere] = value;

        input.addEventListener('input', () => {
          const previousAlbedos = getCurrentZonalGroundAlbedos();
          const previousSignature = getDustColorSignature(settings);
          settings.dustColors[hemisphere][zone] = input.value;
          updateDustColorSummary(settings);
          applyDustConfigurationChange(previousSignature, this, settings, previousAlbedos, true);
          refresh();
        });
      }
    }

    settingsWindow.append(header, intro, grid);
    overlay.appendChild(settingsWindow);
    colorControl.appendChild(overlay);

    const refresh = () => {
      albedoLabel.textContent = getDustFactoryText(
        'ui.buildings.dustFactory.averageAlbedoValue',
        'Average albedo: {albedo}',
        { albedo: settings.dustColorAlbedo.toFixed(3) }
      );
      if (document.activeElement !== colorInput) {
        colorInput.value = settings.dustColor;
      }
      for (const zone of DUST_ZONES) {
        for (const hemisphere of DUST_HEMISPHERES) {
          const input = zoneInputs[zone][hemisphere];
          if (document.activeElement !== input) {
            input.value = settings.dustColors[hemisphere][zone];
          }
          zoneAlbedoLabels[zone][hemisphere].textContent = getDustAlbedoFromColor(
            settings.dustColors[hemisphere][zone]
          ).toFixed(3);
        }
      }
    };

    colorInput.addEventListener('input', () => {
      const previousAlbedos = getCurrentZonalGroundAlbedos();
      const previousSignature = getDustColorSignature(settings);
      setAllDustColors(settings, colorInput.value);
      applyDustConfigurationChange(previousSignature, this, settings, previousAlbedos, true);
      refresh();
    });

    const close = () => overlay.classList.remove('is-visible');
    advancedButton.addEventListener('click', () => {
      refresh();
      overlay.classList.add('is-visible');
    });
    closeButton.addEventListener('click', close);
    overlay.addEventListener('click', event => {
      if (event.target === overlay) {
        close();
      }
    });

    refresh();
    autoBuildContainer.appendChild(colorControl);

    cache.dust = {
      container: colorControl,
      colorControl,
      colorInput,
      albedoLabel,
      advancedButton,
      overlay,
      zoneInputs,
      zoneAlbedoLabels,
      refresh
    };
  }

  updateUI(elements) {
    const dustEls = elements.dust;
    dustEls.colorControl.style.display = this.reversalAvailable ? 'flex' : 'none';
    const settings = getDustAutomationSettings(this);
    updateDustResourceName(settings);
    this.enforceBlackOnly(settings);
    if (!this.reversalAvailable) {
      dustEls.overlay.classList.remove('is-visible');
    }
    dustEls.refresh();
  }

  saveState() {
    const state = super.saveState();
    state.dustColorChanged = this.dustColorChanged;
    state.dustAlbedoStart = this.dustAlbedoStart;
    state.dustAlbedoStarts = this.dustAlbedoStarts;
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
    this.dustAlbedoStarts = 'dustAlbedoStarts' in state
      ? state.dustAlbedoStarts
      : DEFAULT_DUST_STATE.dustAlbedoStarts;
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
      dustColorAlbedo: settings.dustColorAlbedo,
      dustColors: {
        north: { ...settings.dustColors.north },
        south: { ...settings.dustColors.south }
      }
    };
  }

  static loadAutomationSettings(saved = {}) {
    const settings = this.getAutomationSettings();
    const legacyColor = 'dustColor' in saved
      ? saved.dustColor
      : DEFAULT_DUST_AUTOMATION_SETTINGS.dustColor;
    const savedColors = saved.dustColors || createDustColors(legacyColor);
    settings.dustColors = {
      north: { ...createDustColors(legacyColor).north, ...savedColors.north },
      south: { ...createDustColors(legacyColor).south, ...savedColors.south }
    };
    updateDustColorSummary(settings);
    return settings;
  }

  static resetAutomationSettings() {
    const settings = this.getAutomationSettings();
    settings.dustColors = createDustColors(DEFAULT_DUST_AUTOMATION_SETTINGS.dustColor);
    updateDustColorSummary(settings);
    return settings;
  }

  static getDustAlbedoFromColor(color) {
    return getDustAlbedoFromColor(color);
  }

  static getDustZoneAlbedo(zone) {
    return getDustZoneAlbedo(this.getAutomationSettings(), zone);
  }

  static getDustColorSignature() {
    return getDustColorSignature(this.getAutomationSettings());
  }

  static resetTravelState() {
    const dustFactory = buildings.dustFactory;
    const currentSettings = this.getAutomationSettings();
    const previousSignature = getDustColorSignature(currentSettings);
    const settings = this.resetAutomationSettings();
    if (previousSignature !== getDustColorSignature(settings)) {
      dustFactory.dustColorChanged = true;
    }
    dustFactory.dustAlbedoStart = DEFAULT_DUST_STATE.dustAlbedoStart;
    dustFactory.dustAlbedoStarts = DEFAULT_DUST_STATE.dustAlbedoStarts;
    dustFactory.dustAlbedoTransitionActive = DEFAULT_DUST_STATE.dustAlbedoTransitionActive;
    updateDustResourceName(settings);
  }
}

function getDustAutomationSettings(context) {
  return context.getAutomationSettings();
}

DustFactory.automationSettings = {
  dustColor: DEFAULT_DUST_AUTOMATION_SETTINGS.dustColor,
  dustColorAlbedo: DEFAULT_DUST_AUTOMATION_SETTINGS.dustColorAlbedo,
  dustColors: createDustColors(DEFAULT_DUST_AUTOMATION_SETTINGS.dustColor)
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
