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
      const content = document.createElement('div');
      content.classList.add('project-summary-content');
      const value = document.createElement('span');
      value.classList.add('stat-value');
      content.appendChild(value);
      box.append(label, content);
      summaryGrid.appendChild(box);
      return { box, value, content };
    };

    const radiusBox = createSummaryBox('Target Radius');
    const radiusValue = radiusBox.value;

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

    const controlsWrapper = document.createElement('div');
    controlsWrapper.classList.add('project-radius-controls');
    controlsWrapper.append(buttonRow, multiplierRow);

    radiusBox.content.classList.add('project-summary-flex');
    radiusBox.content.appendChild(controlsWrapper);

    const { value: bestValue } = createSummaryBox('Largest Built');
    const { value: researchBoostValue } = createSummaryBox('Advanced Research Boost (New / Current)');

    body.appendChild(summaryGrid);

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
      minusButton,
      plusButton,
      buttons: [zeroButton, minusButton, plusButton, divButton, mulButton],
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
      const newBoost = this.calculateResearchBoost(radiusMeters);
      const currentBoost = this.bestRadiusMeters > 0 ? this.calculateResearchBoost(this.bestRadiusMeters) : null;
      const formatPercent = (value) => `${format(value, false, 2)}%`;
      const newDisplay = formatPercent(newBoost);
      const currentDisplay = currentBoost !== null ? formatPercent(currentBoost) : '-';
      elements.researchBoostValue.textContent = `${newDisplay} / ${currentDisplay}`;
    }
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
    if (
      stepCount > 0 &&
      this.selectedRadiusMeters === this.minimumRadiusMeters &&
      this.radiusStepMeters > MINIMUM_STEP_METERS
    ) {
      this.setRadiusMeters(this.radiusStepMeters);
      return;
    }
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

  calculateResearchBoost(radiusMeters) {
    const safeRadius = Math.max(MINIMUM_STEP_METERS, radiusMeters);
    return 5 * Math.log10(safeRadius);
  }

  getResearchBoostSourceId() {
    return `${this.name}-advancedResearchBoost`;
  }

  applyResearchBoostEffect() {
    const sourceId = this.getResearchBoostSourceId();
    const boostPercent = this.bestRadiusMeters > 0 ? this.calculateResearchBoost(this.bestRadiusMeters) : 0;
    if (boostPercent <= 0) {
      removeEffect({ target: 'researchManager', sourceId });
      return;
    }
    const multiplier = 1 + (boostPercent / 100);
    addEffect({
      target: 'researchManager',
      type: 'advancedResearchBoost',
      value: multiplier,
      effectId: sourceId,
      sourceId,
      name: `${this.displayName} Research Boost`
    });
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
    this.applyResearchBoostEffect();
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
      this.applyResearchBoostEffect();
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
    this.applyResearchBoostEffect();
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
    this.applyResearchBoostEffect();
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
