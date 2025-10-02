const EARTH_RADIUS_METERS = 6_371_000;
const TWO_PI = Math.PI * 2;
const MATERIAL_COST_PER_METER = 100;
const HALF_MATERIAL_SPLIT = 0.5;

class ParticleAcceleratorProject extends Project {
  constructor(config, name) {
    super(config, name);
    this.acceleratorCount = 0;
    this.minimumRadiusEarth = config?.attributes?.minimumRadiusEarth ?? 1;
    this.selectedRadiusEarth = this.minimumRadiusEarth;
    this.bestRadiusEarth = 0;
    this.lastCompletedRadiusEarth = 0;
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

    const statsGrid = document.createElement('div');
    statsGrid.classList.add('stats-grid', 'two-col');

    const radiusLabel = document.createElement('span');
    radiusLabel.classList.add('stat-label');
    radiusLabel.textContent = 'Target Radius:';
    const radiusValue = document.createElement('span');
    radiusValue.classList.add('stat-value');
    statsGrid.append(radiusLabel, radiusValue);

    const circumferenceLabel = document.createElement('span');
    circumferenceLabel.classList.add('stat-label');
    circumferenceLabel.textContent = 'Circumference:';
    const circumferenceValue = document.createElement('span');
    circumferenceValue.classList.add('stat-value');
    statsGrid.append(circumferenceLabel, circumferenceValue);

    const bestLabel = document.createElement('span');
    bestLabel.classList.add('stat-label');
    bestLabel.textContent = 'Largest Built:';
    const bestValue = document.createElement('span');
    bestValue.classList.add('stat-value');
    statsGrid.append(bestLabel, bestValue);

    const lastLabel = document.createElement('span');
    lastLabel.classList.add('stat-label');
    lastLabel.textContent = 'Last Completion:';
    const lastValue = document.createElement('span');
    lastValue.classList.add('stat-value');
    statsGrid.append(lastLabel, lastValue);

    const alloyLabel = document.createElement('span');
    alloyLabel.classList.add('stat-label');
    alloyLabel.textContent = 'Superalloy Cost:';
    const alloyValue = document.createElement('span');
    alloyValue.classList.add('stat-value');
    statsGrid.append(alloyLabel, alloyValue);

    const superconLabel = document.createElement('span');
    superconLabel.classList.add('stat-label');
    superconLabel.textContent = 'Superconductor Cost:';
    const superconValue = document.createElement('span');
    superconValue.classList.add('stat-value');
    statsGrid.append(superconLabel, superconValue);

    body.appendChild(statsGrid);

    const controls = document.createElement('div');
    controls.classList.add('thruster-power-controls');

    const buttonRow = document.createElement('div');
    buttonRow.classList.add('main-buttons');

    const zeroButton = document.createElement('button');
    zeroButton.textContent = '0';
    buttonRow.appendChild(zeroButton);

    const minusButton = document.createElement('button');
    minusButton.textContent = '-1';
    buttonRow.appendChild(minusButton);

    const plusButton = document.createElement('button');
    plusButton.textContent = '+1';
    buttonRow.appendChild(plusButton);

    controls.appendChild(buttonRow);

    const multiplierRow = document.createElement('div');
    multiplierRow.classList.add('multiplier-container');

    const divButton = document.createElement('button');
    divButton.textContent = '/10';
    multiplierRow.appendChild(divButton);

    const mulButton = document.createElement('button');
    mulButton.textContent = 'x10';
    multiplierRow.appendChild(mulButton);

    controls.appendChild(multiplierRow);

    body.appendChild(controls);

    const notice = document.createElement('div');
    notice.classList.add('project-warning');
    body.appendChild(notice);

    card.appendChild(body);
    container.appendChild(card);

    zeroButton.addEventListener('click', () => this.setRadiusEarth(this.minimumRadiusEarth));
    minusButton.addEventListener('click', () => this.adjustRadiusEarth(-1));
    plusButton.addEventListener('click', () => this.adjustRadiusEarth(1));
    mulButton.addEventListener('click', () => this.scaleRadiusEarth(10));
    divButton.addEventListener('click', () => this.scaleRadiusEarth(0.1));

    this.uiElements = {
      card,
      radiusValue,
      circumferenceValue,
      bestValue,
      lastValue,
      alloyValue,
      superconValue,
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

    const formatter = this.getFormatter();
    const radiusDisplay = formatter.format(this.selectedRadiusEarth);
    const circumference = this.getSelectedCircumferenceMeters();
    const circumferenceDisplay = formatter.format(circumference);
    const bestDisplay = this.bestRadiusEarth > 0 ? formatter.format(this.bestRadiusEarth) : '—';
    const lastDisplay = this.lastCompletedRadiusEarth > 0 ? formatter.format(this.lastCompletedRadiusEarth) : '—';
    const materialCost = this.getPerMaterialCost();
    const materialDisplay = formatter.format(materialCost);

    elements.radiusValue.textContent = `${radiusDisplay} Earth radii`;
    elements.circumferenceValue.textContent = `${circumferenceDisplay} m`;
    elements.bestValue.textContent = bestDisplay === '—' ? bestDisplay : `${bestDisplay} Earth radii`;
    elements.lastValue.textContent = lastDisplay === '—' ? lastDisplay : `${lastDisplay} Earth radii`;
    elements.alloyValue.textContent = `${materialDisplay} t`;
    elements.superconValue.textContent = `${materialDisplay} t`;

    const disabled = this.isActive;
    elements.buttons.forEach(button => {
      button.disabled = disabled;
    });

    const needsIncrease = this.bestRadiusEarth > 0 && this.selectedRadiusEarth <= this.bestRadiusEarth;
    elements.notice.textContent = needsIncrease ? 'Increase the radius to beat your previous accelerator.' : '';
    elements.notice.style.display = needsIncrease ? 'block' : 'none';
  }

  getFormatter() {
    if (!this.numberFormatter) {
      this.numberFormatter = new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 });
    }
    return this.numberFormatter;
  }

  setRadiusEarth(value) {
    if (this.isActive) {
      return;
    }
    const minimum = this.minimumRadiusEarth;
    const target = value > minimum ? value : minimum;
    this.selectedRadiusEarth = target;
    this.updateUI();
    globalThis?.updateProjectUI?.(this.name);
  }

  adjustRadiusEarth(delta) {
    this.setRadiusEarth(this.selectedRadiusEarth + delta);
  }

  scaleRadiusEarth(multiplier) {
    this.setRadiusEarth(this.selectedRadiusEarth * multiplier);
  }

  getSelectedRadiusMeters() {
    return this.selectedRadiusEarth * EARTH_RADIUS_METERS;
  }

  getSelectedCircumferenceMeters() {
    return this.getSelectedRadiusMeters() * TWO_PI;
  }

  getPerMaterialCost() {
    return this.getSelectedCircumferenceMeters() * MATERIAL_COST_PER_METER * HALF_MATERIAL_SPLIT;
  }

  getScaledCost() {
    const colony = {};
    const superalloyMultiplier = this.getEffectiveCostMultiplier('colony', 'superalloy');
    const superconductorsMultiplier = this.getEffectiveCostMultiplier('colony', 'superconductors');
    const basePerMaterial = this.getPerMaterialCost();
    colony.superalloy = basePerMaterial * superalloyMultiplier;
    colony.superconductors = basePerMaterial * superconductorsMultiplier;
    return { colony };
  }

  canStart(resources) {
    if (!super.canStart(resources)) {
      return false;
    }
    return this.selectedRadiusEarth > this.bestRadiusEarth;
  }

  complete() {
    super.complete();
    this.acceleratorCount = this.repeatCount;
    this.lastCompletedRadiusEarth = this.selectedRadiusEarth;
    if (this.lastCompletedRadiusEarth > this.bestRadiusEarth) {
      this.bestRadiusEarth = this.lastCompletedRadiusEarth;
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
      selectedRadiusEarth: this.selectedRadiusEarth,
      bestRadiusEarth: this.bestRadiusEarth,
      lastCompletedRadiusEarth: this.lastCompletedRadiusEarth
    };
  }

  loadState(state = {}) {
    if (Object.keys(state).length === 0) {
      this.acceleratorCount = 0;
      this.selectedRadiusEarth = this.minimumRadiusEarth;
      this.bestRadiusEarth = 0;
      this.lastCompletedRadiusEarth = 0;
      this.updateUI();
      return;
    }
    super.loadState(state);
    this.acceleratorCount = state.acceleratorCount ?? 0;
    this.selectedRadiusEarth = state.selectedRadiusEarth ?? this.minimumRadiusEarth;
    this.bestRadiusEarth = state.bestRadiusEarth ?? 0;
    this.lastCompletedRadiusEarth = state.lastCompletedRadiusEarth ?? 0;
    this.updateUI();
  }

  saveTravelState() {
    const state = {
      acceleratorCount: this.acceleratorCount,
      repeatCount: this.repeatCount,
      selectedRadiusEarth: this.selectedRadiusEarth,
      bestRadiusEarth: this.bestRadiusEarth,
      lastCompletedRadiusEarth: this.lastCompletedRadiusEarth
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
    this.selectedRadiusEarth = state.selectedRadiusEarth ?? this.minimumRadiusEarth;
    this.bestRadiusEarth = state.bestRadiusEarth ?? 0;
    this.lastCompletedRadiusEarth = state.lastCompletedRadiusEarth ?? 0;
    this.isActive = false;
    if (state.isActive) {
      this.isActive = true;
      this.remainingTime = state.remainingTime ?? this.remainingTime;
      this.startingDuration = state.startingDuration ?? this.getEffectiveDuration();
    }
    this.updateUI();
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
