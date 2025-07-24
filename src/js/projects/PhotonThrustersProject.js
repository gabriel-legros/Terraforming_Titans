function getRotationPeriodHours(params) {
  if (!params) return 24;
  const { rotationPeriod } = params;
  if (typeof rotationPeriod === 'number' && rotationPeriod > 0) {
    return rotationPeriod;
  }
  return 24;
}

const G = 6.67430e-11;
const SOLAR_MASS = 1.989e30;
const AU_IN_METERS = 1.496e11;

function calculateOrbitalPeriodDays(distanceAU) {
  const a = typeof distanceAU === 'number' && distanceAU > 0 ? distanceAU : 1;
  return 365.25 * Math.sqrt(Math.pow(a, 3));
}

function calculateEscapeEnergyCost(massKg, parentMassKg, orbitRadiusKm) {
  if (
    typeof massKg !== 'number' ||
    typeof parentMassKg !== 'number' ||
    typeof orbitRadiusKm !== 'number'
  ) {
    return 0;
  }
  const r = orbitRadiusKm * 1000;
  const ve = Math.sqrt(2 * G * parentMassKg / r);
  const vo = Math.sqrt(G * parentMassKg / r);
  const deltaE = 0.5 * massKg * (ve * ve - vo * vo);
  return Math.abs(deltaE) / 86400;
}

function calculateOrbitalEnergyCost(massKg, currentAU, targetAU) {
  if (
    typeof massKg !== 'number' ||
    typeof currentAU !== 'number' ||
    typeof targetAU !== 'number'
  ) {
    return 0;
  }
  const r1 = currentAU * AU_IN_METERS;
  const r2 = targetAU * AU_IN_METERS;
  const e1 = -G * SOLAR_MASS * massKg / (2 * r1);
  const e2 = -G * SOLAR_MASS * massKg / (2 * r2);
  return Math.abs(e2 - e1) / 86400;
}

function calculateSpinEnergyCost(massKg, radiusKm, currentHours, targetHours) {
  if (
    typeof massKg !== 'number' ||
    typeof radiusKm !== 'number' ||
    typeof currentHours !== 'number' ||
    typeof targetHours !== 'number'
  ) {
    return 0;
  }
  const I = 0.4 * massKg * Math.pow(radiusKm * 1000, 2);
  const w1 = (2 * Math.PI) / (currentHours * 3600);
  const w2 = (2 * Math.PI) / (targetHours * 3600);
  const deltaE = 0.5 * I * (w2 * w2 - w1 * w1);
  return Math.abs(deltaE) / 86400; // convert J -> W-day
}

class PhotonThrustersProject extends Project {
  constructor(config, name) {
    super(config, name);
    this.targetDays = 1;
    this.targetAU = 1;
    this.energyInvestment = 0;
    this.investmentMultiplier = 1;
    this.spinInvest = false;
    this.motionInvest = false;
  }

  renderUI(container) {
    const spinCard = document.createElement('div');
    spinCard.classList.add('info-card', 'spin-details-card');
    spinCard.style.display = this.isCompleted ? 'block' : 'none';
    spinCard.innerHTML = `
      <div class="card-header">
        <span class="card-title">Spin</span>
      </div>
      <div class="card-body">
        <div class="stats-grid">
          <div class="stat-item">
            <span class="stat-label">Rotation Period:</span>
            <span id="spin-rotation-period" class="stat-value">0</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">Target:</span>
            <input id="spin-target" type="number" min="0.1" step="0.1" value="1">
            <span>day</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">Energy Cost:</span>
            <span id="spin-energy-cost" class="stat-value">0</span>
          </div>
          <div class="stat-item">
            <label><input id="spin-invest" type="checkbox"> Invest</label>
          </div>
        </div>
      </div>
    `;
    container.appendChild(spinCard);

  const targetInput = spinCard.querySelector('#spin-target');
  if (targetInput) {
    targetInput.addEventListener('input', () => this.updateUI());
  }
  const spinInvestCheckbox = spinCard.querySelector('#spin-invest');

    const motionCard = document.createElement('div');
    motionCard.classList.add('info-card', 'motion-details-card');
    motionCard.style.display = this.isCompleted ? 'block' : 'none';
    motionCard.innerHTML = `
      <div class="card-header">
        <span class="card-title">Motion</span>
      </div>
      <div class="card-body">
        <div class="stats-grid">
          <div class="stat-item">
            <span class="stat-label">Distance from Sun:</span>
            <span id="motion-distance-sun" class="stat-value">0</span>
          </div>
          <div id="motion-parent-container" class="stat-item" style="display:none;">
            <span class="stat-label">Parent:</span>
            <span id="motion-parent-name" class="stat-value"></span>
            <span class="stat-label">at</span>
            <span id="motion-parent-distance" class="stat-value"></span>
          </div>
          <div id="motion-target-container" class="stat-item" style="display:none;">
            <span class="stat-label">Target:</span>
            <input id="motion-target" type="number" min="0.1" step="0.1" value="1">
            <span>AU</span>
          </div>
          <div id="motion-energy-container" class="stat-item" style="display:none;">
            <span class="stat-label">Energy Cost:</span>
            <span id="motion-energy-cost" class="stat-value">0</span>
          </div>
          <div id="motion-escape-container" class="stat-item" style="display:none;">
            <span class="stat-label">Escape Energy:</span>
            <span id="motion-escape-energy" class="stat-value">0</span>
          </div>
          <div class="stat-item">
            <label><input id="motion-invest" type="checkbox"> Invest</label>
          </div>
        </div>
        <div id="motion-moon-warning" class="moon-warning" style="display:none;">
          <span class="icon">\u26A0</span>
          <span>Escape parent body before adjusting solar distance</span>
        </div>
      </div>
    `;
    container.appendChild(motionCard);

  const motionTargetInput = motionCard.querySelector('#motion-target');
  if (motionTargetInput) {
    motionTargetInput.addEventListener('input', () => this.updateUI());
  }
  const motionInvestCheckbox = motionCard.querySelector('#motion-invest');

  if (spinInvestCheckbox) {
    spinInvestCheckbox.addEventListener('change', () => {
      this.spinInvest = spinInvestCheckbox.checked;
      if (this.spinInvest) {
        this.motionInvest = false;
        if (motionInvestCheckbox) motionInvestCheckbox.checked = false;
      }
    });
  }

  if (motionInvestCheckbox) {
    motionInvestCheckbox.addEventListener('change', () => {
      this.motionInvest = motionInvestCheckbox.checked;
      if (this.motionInvest) {
        this.spinInvest = false;
        if (spinInvestCheckbox) spinInvestCheckbox.checked = false;
      }
    });
  }

    const energySection = document.createElement('div');
    energySection.classList.add('project-section-container', 'energy-investment-section');
    energySection.style.display = this.isCompleted ? 'block' : 'none';

    const energyTitle = document.createElement('h4');
    energyTitle.classList.add('section-title');
    energyTitle.textContent = 'Thruster Power';
    energySection.appendChild(energyTitle);

    const investmentContainer = document.createElement('div');
    investmentContainer.classList.add('energy-investment-container');

    const investedLabel = document.createElement('span');
    investedLabel.textContent = 'Invested:';
    const investedDisplay = document.createElement('span');
    investedDisplay.id = `${this.name}-energy-invested`;
    investmentContainer.append(investedLabel, investedDisplay);

    const buttonsContainer = document.createElement('div');
    buttonsContainer.classList.add('buttons-container');
    const createButton = (text, onClick, parent = buttonsContainer) => {
      const b = document.createElement('button');
      b.textContent = text;
      b.addEventListener('click', onClick);
      parent.appendChild(b);
      return b;
    };

    const mainButtons = document.createElement('div');
    mainButtons.classList.add('main-buttons');
    buttonsContainer.appendChild(mainButtons);

    createButton('0', () => this.setEnergyInvestment(0), mainButtons);
    const minusButton = createButton(`-${formatNumber(this.investmentMultiplier, true)}`,
      () => this.adjustEnergyInvestment(-this.investmentMultiplier), mainButtons);
    const plusButton = createButton(`+${formatNumber(this.investmentMultiplier, true)}`,
      () => this.adjustEnergyInvestment(this.investmentMultiplier), mainButtons);
    createButton('Max', () => this.setEnergyInvestment(Math.floor(resources.colony.energy.value)), mainButtons);

    const multContainer = document.createElement('div');
    multContainer.classList.add('multiplier-container');
    buttonsContainer.appendChild(multContainer);

    createButton('/10', () => {
      this.investmentMultiplier = Math.max(1, this.investmentMultiplier / 10);
      minusButton.textContent = `-${formatNumber(this.investmentMultiplier, true)}`;
      plusButton.textContent = `+${formatNumber(this.investmentMultiplier, true)}`;
    }, multContainer);
    createButton('x10', () => {
      this.investmentMultiplier *= 10;
      minusButton.textContent = `-${formatNumber(this.investmentMultiplier, true)}`;
      plusButton.textContent = `+${formatNumber(this.investmentMultiplier, true)}`;
    }, multContainer);

    energySection.append(investmentContainer, buttonsContainer);
    container.appendChild(energySection);

    projectElements[this.name] = {
      ...projectElements[this.name],
      spinCard,
      motionCard,
      energySection,
      spin: {
        rotationPeriod: spinCard.querySelector('#spin-rotation-period'),
        target: spinCard.querySelector('#spin-target'),
        energyCost: spinCard.querySelector('#spin-energy-cost'),
        investCheckbox: spinInvestCheckbox,
      },
      motion: {
        distanceSun: motionCard.querySelector('#motion-distance-sun'),
        parentContainer: motionCard.querySelector('#motion-parent-container'),
        parentName: motionCard.querySelector('#motion-parent-name'),
        parentDistance: motionCard.querySelector('#motion-parent-distance'),
        moonWarning: motionCard.querySelector("#motion-moon-warning"),
        target: motionCard.querySelector('#motion-target'),
        energyCost: motionCard.querySelector('#motion-energy-cost'),
        escapeEnergy: motionCard.querySelector('#motion-escape-energy'),
        targetContainer: motionCard.querySelector('#motion-target-container'),
        energyContainer: motionCard.querySelector('#motion-energy-container'),
        escapeContainer: motionCard.querySelector('#motion-escape-container'),
        investCheckbox: motionInvestCheckbox,
      },
      energyInvestedDisplay: investedDisplay,
      minusButton,
      plusButton,
    };
  }

  updateUI() {
    const params = terraforming.celestialParameters || {};
    const elements = projectElements[this.name];
    if (!elements) return;

    if (elements.spinCard) {
      elements.spinCard.style.display = this.isCompleted ? 'block' : 'none';
    }
    if (elements.motionCard) {
      elements.motionCard.style.display = this.isCompleted ? 'block' : 'none';
    }
    if (elements.energySection) {
      elements.energySection.style.display = this.isCompleted ? 'block' : 'none';
    }
    if (elements.energyInvestedDisplay) {
      elements.energyInvestedDisplay.textContent = formatNumber(this.energyInvestment, true);
    }
    if (elements.spin && elements.spin.investCheckbox) {
      elements.spin.investCheckbox.checked = this.spinInvest;
    }
    if (elements.motion && elements.motion.investCheckbox) {
      elements.motion.investCheckbox.checked = this.motionInvest;
    }

    if (elements.spin) {
      const hours = getRotationPeriodHours(params);
      const days = hours / 24;
      if (elements.spin.rotationPeriod) {
        elements.spin.rotationPeriod.textContent = `${formatNumber(days, false, 2)} days`;
      }
      if (elements.spin.target &&
          (typeof elements.spin.target.value === 'string' || typeof elements.spin.target.value === 'number')) {
        const val = parseFloat(elements.spin.target.value);
        if (!isNaN(val) && val > 0) {
          this.targetDays = val;
        }
      }
      if (elements.spin.energyCost) {
        const cost = calculateSpinEnergyCost(
          params.mass,
          params.radius,
          hours,
          this.targetDays * 24
        );
        elements.spin.energyCost.textContent = `${formatNumber(cost, false, 2)} W-day`;
      }
    }

    if (elements.motion) {
      if (elements.motion.distanceSun) {
        elements.motion.distanceSun.textContent = `${formatNumber(params.distanceFromSun || 0, false, 2)} AU`;
      }
      const parent = params.parentBody;
      if (parent && typeof parent === 'object') {
        if (elements.motion.parentContainer) {
          elements.motion.parentContainer.style.display = 'block';
          elements.motion.parentName.textContent = parent.name || '';
          elements.motion.parentDistance.textContent = `${formatNumber(parent.orbitRadius || 0, false, 2)} km`;
        }
        if (elements.motion.moonWarning) {
          elements.motion.moonWarning.style.display = 'block';
        }
        if (elements.motion.targetContainer) elements.motion.targetContainer.style.display = 'none';
        if (elements.motion.energyContainer) elements.motion.energyContainer.style.display = 'none';
        if (elements.motion.escapeContainer) {
          elements.motion.escapeContainer.style.display = 'block';
          const escapeCost = calculateEscapeEnergyCost(
            params.mass,
            parent.mass,
            parent.orbitRadius
          );
          if (elements.motion.escapeEnergy) {
            elements.motion.escapeEnergy.textContent = `${formatNumber(escapeCost, false, 2)} W-day`;
          }
        }
      } else {
        if (elements.motion.parentContainer) {
          elements.motion.parentContainer.style.display = 'none';
        }
        if (elements.motion.moonWarning) {
          elements.motion.moonWarning.style.display = 'none';
        }
        if (elements.motion.escapeContainer) {
          elements.motion.escapeContainer.style.display = 'none';
        }
        if (elements.motion.target &&
            (typeof elements.motion.target.value === 'string' || typeof elements.motion.target.value === 'number')) {
          const val = parseFloat(elements.motion.target.value);
          if (!isNaN(val) && val > 0) {
            this.targetAU = val;
          }
        }
        if (elements.motion.targetContainer) {
          elements.motion.targetContainer.style.display = 'block';
        }
        if (elements.motion.energyContainer) {
          elements.motion.energyContainer.style.display = 'block';
          const cost = calculateOrbitalEnergyCost(
            params.mass,
            params.distanceFromSun,
            this.targetAU
          );
          elements.motion.energyCost.textContent = `${formatNumber(cost, false, 2)} W-day`;
        }
      }
    }
  }

  adjustEnergyInvestment(amount) {
    this.energyInvestment = Math.max(0, this.energyInvestment + amount);
    this.updateUI();
  }

  setEnergyInvestment(value) {
    this.energyInvestment = Math.max(0, value);
    this.updateUI();
  }

  saveState() {
    return {
      ...super.saveState(),
      energyInvestment: this.energyInvestment,
      investmentMultiplier: this.investmentMultiplier,
      spinInvest: this.spinInvest,
      motionInvest: this.motionInvest,
    };
  }

  loadState(state) {
    super.loadState(state);
    this.energyInvestment = state.energyInvestment || 0;
    this.investmentMultiplier = state.investmentMultiplier || 1;
    this.spinInvest = state.spinInvest || false;
    this.motionInvest = state.motionInvest || false;
  }

  update(deltaTime) {
    super.update(deltaTime);
    if (!this.isCompleted || this.energyInvestment <= 0 || (!this.spinInvest && !this.motionInvest)) return;
    const rate = this.energyInvestment;
    const amount = rate * (deltaTime / 1000);
    const available = resources.colony.energy.value;
    const consumed = Math.min(available, amount);
    resources.colony.energy.decrease(consumed);
    if (resources.colony.energy.modifyRate) {
      resources.colony.energy.modifyRate(-rate, this.displayName, 'project');
    }

    if (consumed > 0 && terraforming && terraforming.celestialParameters) {
      const params = terraforming.celestialParameters;
      const energyJ = consumed * 86400;
      if (this.spinInvest) {
        const I = 0.4 * params.mass * Math.pow(params.radius * 1000, 2);
        const currentW = (2 * Math.PI) / ((params.rotationPeriod || 24) * 3600);
        const targetW = (2 * Math.PI) / (this.targetDays * 24 * 3600);
        const currentE = 0.5 * I * currentW * currentW;
        const targetE = 0.5 * I * targetW * targetW;
        const sign = targetE > currentE ? 1 : -1;
        let newE = currentE + sign * energyJ;
        if (sign > 0 && newE > targetE) newE = targetE;
        if (sign < 0 && newE < targetE) newE = targetE;
        const newW = Math.sqrt(2 * newE / I);
        params.rotationPeriod = (2 * Math.PI) / (newW * 3600);
      } else if (this.motionInvest) {
        if (params.parentBody && typeof params.parentBody === 'object') {
          const parent = params.parentBody;
          const r = parent.orbitRadius * 1000;
          let E = -G * parent.mass * params.mass / (2 * r);
          E += energyJ;
          if (E >= 0) {
            params.parentBody = 'Star';
          } else {
            const newR = -G * parent.mass * params.mass / (2 * E);
            parent.orbitRadius = newR / 1000;
          }
        } else {
          const r = params.distanceFromSun * AU_IN_METERS;
          const targetR = this.targetAU * AU_IN_METERS;
          const currentE = -G * SOLAR_MASS * params.mass / (2 * r);
          const targetE = -G * SOLAR_MASS * params.mass / (2 * targetR);
          const sign = targetE > currentE ? 1 : -1;
          let newE = currentE + sign * energyJ;
          if (sign > 0 && newE > targetE) newE = targetE;
          if (sign < 0 && newE < targetE) newE = targetE;
          const newR = -G * SOLAR_MASS * params.mass / (2 * newE);
          params.distanceFromSun = newR / AU_IN_METERS;
        }
      }
    }
  }
}

if (typeof globalThis !== 'undefined') {
  globalThis.PhotonThrustersProject = PhotonThrustersProject;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = PhotonThrustersProject;
}
