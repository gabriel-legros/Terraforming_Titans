function getRotationPeriodHours(params) {
  if (!params) return 24;
  const { rotationPeriod } = params;
  if (typeof rotationPeriod === 'number' && rotationPeriod > 0) {
    return rotationPeriod;
  }
  return 24;
}

function calculateOrbitalPeriodDays(distanceAU) {
  const a = typeof distanceAU === 'number' && distanceAU > 0 ? distanceAU : 1;
  return 365.25 * Math.sqrt(Math.pow(a, 3));
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
            <span class="stat-label">Orbital Period:</span>
            <span id="spin-orbital-period" class="stat-value">0</span>
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
        </div>
      </div>
    `;
    container.appendChild(spinCard);

    const targetInput = spinCard.querySelector('#spin-target');
    if (targetInput) {
      targetInput.addEventListener('input', () => this.updateUI());
    }

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
        </div>
        <div id="motion-moon-warning" class="warning-message" style="display:none;">
          Moons must first their parent's gravity well before distance to the sun can be changed
        </div>
      </div>
    `;
    container.appendChild(motionCard);

    projectElements[this.name] = {
      ...projectElements[this.name],
      spinCard,
      motionCard,
      spin: {
        rotationPeriod: spinCard.querySelector('#spin-rotation-period'),
        orbitalPeriod: spinCard.querySelector('#spin-orbital-period'),
        target: spinCard.querySelector('#spin-target'),
        energyCost: spinCard.querySelector('#spin-energy-cost'),
      },
      motion: {
        distanceSun: motionCard.querySelector('#motion-distance-sun'),
        parentContainer: motionCard.querySelector('#motion-parent-container'),
        parentName: motionCard.querySelector('#motion-parent-name'),
        parentDistance: motionCard.querySelector('#motion-parent-distance'),
        moonWarning: motionCard.querySelector("#motion-moon-warning"),
      },
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

    if (elements.spin) {
      const hours = getRotationPeriodHours(params);
      const days = hours / 24;
      if (elements.spin.rotationPeriod) {
        elements.spin.rotationPeriod.textContent = `${formatNumber(days, false, 2)} days`;
      }
      if (elements.spin.orbitalPeriod) {
        const orbit = calculateOrbitalPeriodDays(params.distanceFromSun);
        elements.spin.orbitalPeriod.textContent = `${formatNumber(orbit, false, 2)} days`;
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
      if (parent && elements.motion.parentContainer) {
        elements.motion.parentContainer.style.display = 'block';
        elements.motion.parentName.textContent = parent.name || '';
        elements.motion.parentDistance.textContent = `${formatNumber(parent.orbitRadius || 0, false, 2)} km`;
      } else if (elements.motion.parentContainer) {
        elements.motion.parentContainer.style.display = 'none';
      }
        if (elements.motion.moonWarning) {
          elements.motion.moonWarning.style.display = parent ? "block" : "none";
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
