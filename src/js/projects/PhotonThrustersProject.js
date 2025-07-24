function calculateOrbitalPeriodDays(distanceAU) {
  if (typeof distanceAU !== 'number' || distanceAU <= 0) return 0;
  const years = Math.sqrt(Math.pow(distanceAU, 3));
  return years * 365.25;
}

class PhotonThrustersProject extends Project {
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
            <span class="stat-label">Orbital Period:</span>
            <span id="spin-orbital-period" class="stat-value">0</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">Target :</span>
            <span id="spin-target" class="stat-value">1 day</span>
          </div>
        </div>
      </div>
    `;
    container.appendChild(spinCard);

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
        orbitalPeriod: spinCard.querySelector('#spin-orbital-period'),
        target: spinCard.querySelector('#spin-target'),
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

    if (elements.spin && elements.spin.orbitalPeriod) {
      const period = calculateOrbitalPeriodDays(params.distanceFromSun);
      elements.spin.orbitalPeriod.textContent = `${formatNumber(period, false, 2)} days`;
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
