const EARTH_RADIUS_METERS = 6_371_000;
const TWO_PI = Math.PI * 2;
const MATERIAL_COST_PER_METER = 100;
const HALF_MATERIAL_SPLIT = 0.5;
const STEP_MULTIPLIER = 10;
const MINIMUM_STEP_METERS = 1;

class ParticleAcceleratorProject extends Project {
  constructor(config, name) {
    super(config, name);
    this.acceleratorCount = 0;
    const attributes = config?.attributes || {};
    const minimumRadiusMeters = attributes.minimumRadiusMeters ??
      (attributes.minimumRadiusEarth ? attributes.minimumRadiusEarth * EARTH_RADIUS_METERS : MINIMUM_STEP_METERS);
    const defaultRadiusMeters = attributes.defaultRadiusMeters ??
      (attributes.minimumRadiusEarth ? attributes.minimumRadiusEarth * EARTH_RADIUS_METERS : minimumRadiusMeters);
    const defaultStepMeters = attributes.defaultStepMeters ?? MINIMUM_STEP_METERS;

    this.minimumRadiusMeters = Math.max(MINIMUM_STEP_METERS, minimumRadiusMeters);
    this.defaultRadiusMeters = Math.max(this.minimumRadiusMeters, defaultRadiusMeters);
    this.defaultStepMeters = Math.max(MINIMUM_STEP_METERS, defaultStepMeters);

    this.selectedRadiusMeters = this.defaultRadiusMeters;
    this.bestRadiusMeters = 0;
    this.radiusStepMeters = this.defaultStepMeters;
    this.researchBoostDisplay = '—';
    this.uiElements = null;
  }

  renderUI(container) {
    const card = document.createElement('div');
    card.classList.add('info-card');

    const header = document.createElement('div');
    header.classList.add('card-header');
    const title = document.createElement('span');
    title.classList.add('card-title');
    title.textContent = 'Accelerator Design';
    header.appendChild(title);
    card.appendChild(header);

    const body = document.createElement('div');
    body.classList.add('card-body');

    const summaryGrid = document.createElement('div');
    summaryGrid.classList.add('stats-grid', 'three-col', 'project-summary-grid');

    const createSummaryBox = (labelText) => {
      const box = document.createElement('div');
      box.classList.add('stat-item', 'project-summary-box');
      const label = document.createElement('span');
      label.classList.add('stat-label');
      label.textContent = labelText;
      const value = document.createElement('span');
      value.classList.add('stat-value');
      box.append(label, value);
      summaryGrid.appendChild(box);
      return value;
    };

    const radiusValue = createSummaryBox('Target Radius');
    const bestValue = createSummaryBox('Largest Built');
    const researchBoostValue = createSummaryBox('Research Boost');

    body.appendChild(summaryGrid);

    const controls = document.createElement('div');
    controls.classList.add('thruster-power-controls', 'project-control-block');

    const stepRow = document.createElement('div');
    stepRow.classList.add('project-step-row');

    const stepLabel = document.createElement('span');
    stepLabel.classList.add('stat-label');
    stepLabel.textContent = 'Adjustment Step';

    const stepValue = document.createElement('span');
    stepValue.classList.add('stat-value');
    const stepInfo = document.createElement('span');
    stepInfo.classList.add('info-tooltip-icon');
    stepInfo.innerHTML = '&#9432;';
    stepInfo.title = 'Adjust how much the radius changes when you use the step buttons.';

    const stepValueWrapper = document.createElement('div');
    stepValueWrapper.classList.add('project-step-value');
    stepValueWrapper.append(stepValue, stepInfo);

    stepRow.append(stepLabel, stepValueWrapper);

    const buttonRow = document.createElement('div');
    buttonRow.classList.add('main-buttons');

    const createButton = (text, handler, parent = buttonRow) => {
      const button = document.createElement('button');
      button.textContent = text;
      button.addEventListener('click', handler);
      parent.appendChild(button);
      return button;
    };

    const zeroButton = createButton('0', () => this.setRadiusMeters(this.minimumRadiusMeters));

    const minusButton = createButton('', () => this.adjustRadiusBySteps(-1));

    const plusButton = createButton('', () => this.adjustRadiusBySteps(1));

    const multiplierRow = document.createElement('div');
    multiplierRow.classList.add('multiplier-container');

    const divButton = createButton('/10', () => this.scaleStepMeters(1 / STEP_MULTIPLIER), multiplierRow);

    const mulButton = createButton('x10', () => this.scaleStepMeters(STEP_MULTIPLIER), multiplierRow);

    const buttonWrapper = document.createElement('div');
    buttonWrapper.classList.add('project-step-controls');
    buttonWrapper.append(buttonRow, multiplierRow);

    controls.append(stepRow, buttonWrapper);

    body.appendChild(controls);

    const notice = document.createElement('div');
    notice.classList.add('project-warning');
    body.appendChild(notice);

    card.appendChild(body);
    container.appendChild(card);

    this.uiElements = {
      card,
      radiusValue,
      bestValue,
      researchBoostValue,
      stepValue,
      minusButton,
      plusButton,
      buttons: [zeroButton, minusButton, plusButton, mulButton, divButton],
      notice
    };

    this.updateUI();
  }

  updateUI() {
    const elements = this.uiElements;
    if (!elements) {
      return;
    }

    const format = typeof formatNumber === 'function' ? formatNumber : (value) => value;
    const radiusMeters = this.getSelectedRadiusMeters();
    const bestMeters = this.bestRadiusMeters;
    const stepMeters = this.radiusStepMeters;

    const radiusDisplay = `${format(radiusMeters, false, 2)} m`;
    const bestText = this.bestRadiusMeters > 0 ? `${format(bestMeters, false, 2)} m` : '—';
    const stepDisplay = format(stepMeters, true);

    elements.radiusValue.textContent = radiusDisplay;
    elements.bestValue.textContent = bestText;
    if (elements.researchBoostValue) {
      const researchDisplay = typeof this.researchBoostDisplay === 'string' ? this.researchBoostDisplay : '—';
      elements.researchBoostValue.textContent = researchDisplay;
    }
    elements.stepValue.textContent = stepDisplay;
    elements.minusButton.textContent = `-${stepDisplay}`;
    elements.plusButton.textContent = `+${stepDisplay}`;

    const disabled = this.isActive;
    elements.buttons.forEach(button => {
      button.disabled = disabled;
    });

    const needsIncrease = this.bestRadiusMeters > 0 && this.selectedRadiusMeters <= this.bestRadiusMeters;
    elements.notice.textContent = needsIncrease ? 'Increase the radius to beat your previous accelerator.' : '';
    elements.notice.style.display = needsIncrease ? 'block' : 'none';
  }

  setRadiusMeters(value) {
    if (this.isActive) {
      return;
    }
    const minimum = this.minimumRadiusMeters;
    const target = value > minimum ? value : minimum;
    this.selectedRadiusMeters = target;
    this.updateUI();
    globalThis?.updateProjectUI?.(this.name);
  }

  adjustRadiusBySteps(stepCount) {
    const adjustment = stepCount * this.radiusStepMeters;
    this.setRadiusMeters(this.selectedRadiusMeters + adjustment);
  }

  scaleStepMeters(multiplier) {
    if (this.isActive) {
      return;
    }
    const nextStep = this.radiusStepMeters * multiplier;
    this.radiusStepMeters = nextStep >= MINIMUM_STEP_METERS ? nextStep : MINIMUM_STEP_METERS;
    this.updateUI();
  }

  getSelectedRadiusMeters() {
    return this.selectedRadiusMeters;
  }

  getSelectedCircumferenceMeters() {
    return this.getSelectedRadiusMeters() * TWO_PI;
  }

  getPerMaterialCost() {
    return this.getSelectedCircumferenceMeters() * MATERIAL_COST_PER_METER * HALF_MATERIAL_SPLIT;
  }

  getScaledCost() {
    const colony = {};
    const superalloyMultiplier = this.getEffectiveCostMultiplier('colony', 'superalloys');
    const superconductorsMultiplier = this.getEffectiveCostMultiplier('colony', 'superconductors');
    const basePerMaterial = this.getPerMaterialCost();
    colony.superalloys = basePerMaterial * superalloyMultiplier;
    colony.superconductors = basePerMaterial * superconductorsMultiplier;
    return { colony };
  }

  canStart(resources) {
    if (!super.canStart(resources)) {
      return false;
    }
    return this.selectedRadiusMeters > this.bestRadiusMeters;
  }

  complete() {
    super.complete();
    this.acceleratorCount = this.repeatCount;
    if (this.selectedRadiusMeters > this.bestRadiusMeters) {
      this.bestRadiusMeters = this.selectedRadiusMeters;
    }
    this.updateUI();
    globalThis?.updateProjectUI?.(this.name);
  }

  getCompletedCount() {
    return this.acceleratorCount;
  }

  saveState() {
    return {
      ...super.saveState(),
      acceleratorCount: this.acceleratorCount,
      selectedRadiusMeters: this.selectedRadiusMeters,
      bestRadiusMeters: this.bestRadiusMeters,
      radiusStepMeters: this.radiusStepMeters
    };
  }

  loadState(state = {}) {
    if (Object.keys(state).length === 0) {
      this.acceleratorCount = 0;
      this.selectedRadiusMeters = this.defaultRadiusMeters;
      this.bestRadiusMeters = 0;
      this.radiusStepMeters = this.defaultStepMeters;
      this.updateUI();
      return;
    }
    super.loadState(state);
    this.acceleratorCount = state.acceleratorCount ?? 0;
    const savedRadiusMeters =
      state.selectedRadiusMeters ??
      (typeof state.selectedRadiusEarth === 'number' ? state.selectedRadiusEarth * EARTH_RADIUS_METERS : undefined);
    this.selectedRadiusMeters = savedRadiusMeters && savedRadiusMeters > 0
      ? Math.max(this.minimumRadiusMeters, savedRadiusMeters)
      : this.defaultRadiusMeters;

    const savedBestMeters =
      state.bestRadiusMeters ??
      (typeof state.bestRadiusEarth === 'number' ? state.bestRadiusEarth * EARTH_RADIUS_METERS : undefined);
    this.bestRadiusMeters = savedBestMeters && savedBestMeters > 0 ? savedBestMeters : 0;

    const savedStepMeters =
      state.radiusStepMeters ??
      (typeof state.radiusStepEarth === 'number' ? state.radiusStepEarth * EARTH_RADIUS_METERS : undefined);
    this.radiusStepMeters = savedStepMeters && savedStepMeters >= MINIMUM_STEP_METERS
      ? savedStepMeters
      : this.defaultStepMeters;
    this.updateUI();
  }

  saveTravelState() {
    const state = {
      acceleratorCount: this.acceleratorCount,
      repeatCount: this.repeatCount,
      selectedRadiusMeters: this.selectedRadiusMeters,
      bestRadiusMeters: this.bestRadiusMeters,
      radiusStepMeters: this.radiusStepMeters
    };
    if (this.isActive) {
      state.isActive = true;
      state.remainingTime = this.remainingTime;
      state.startingDuration = this.startingDuration;
    }
    return state;
  }

  loadTravelState(state = {}) {
    this.acceleratorCount = state.acceleratorCount ?? 0;
    this.repeatCount = state.repeatCount ?? this.acceleratorCount;
    const savedRadiusMeters =
      state.selectedRadiusMeters ??
      (typeof state.selectedRadiusEarth === 'number' ? state.selectedRadiusEarth * EARTH_RADIUS_METERS : undefined);
    this.selectedRadiusMeters = savedRadiusMeters && savedRadiusMeters > 0
      ? Math.max(this.minimumRadiusMeters, savedRadiusMeters)
      : this.defaultRadiusMeters;

    const savedBestMeters =
      state.bestRadiusMeters ??
      (typeof state.bestRadiusEarth === 'number' ? state.bestRadiusEarth * EARTH_RADIUS_METERS : undefined);
    this.bestRadiusMeters = savedBestMeters && savedBestMeters > 0 ? savedBestMeters : 0;

    const savedStepMeters =
      state.radiusStepMeters ??
      (typeof state.radiusStepEarth === 'number' ? state.radiusStepEarth * EARTH_RADIUS_METERS : undefined);
    this.radiusStepMeters = savedStepMeters && savedStepMeters >= MINIMUM_STEP_METERS
      ? savedStepMeters
      : this.defaultStepMeters;
    this.isActive = false;
    if (state.isActive) {
      this.isActive = true;
      this.remainingTime = state.remainingTime ?? this.remainingTime;
      this.startingDuration = state.startingDuration ?? this.getEffectiveDuration();
    }
    this.updateUI();
  }

  setRadiusEarth(value) {
    this.setRadiusMeters(value * EARTH_RADIUS_METERS);
  }

  adjustRadiusEarth(delta) {
    this.setRadiusMeters(this.selectedRadiusMeters + (delta * EARTH_RADIUS_METERS));
  }

  scaleStepEarth(multiplier) {
    this.scaleStepMeters(multiplier);
  }
}

const scope = globalThis;
if (scope) {
  scope.ParticleAcceleratorProject = ParticleAcceleratorProject;
}

const commonJsModule = (() => {
  try {
    return module;
  } catch (error) {
    return null;
  }
})();

if (commonJsModule?.exports) {
  commonJsModule.exports = ParticleAcceleratorProject;
}
