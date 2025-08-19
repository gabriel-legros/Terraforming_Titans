class NanotechManager extends EffectableEntity {
  constructor() {
    super({ description: 'Manages the nanobot swarm' });
    this.nanobots = 1; // starting nanobot count
    this.siliconSlider = 0; // 0-10
    this.maintenanceSlider = 0; // 0-10
    this.glassSlider = 0; // 0-10
    this.currentEnergyConsumption = 0;
    this.currentSiliconConsumption = 0;
    this.currentGlassProduction = 0;
    this.currentMaintenanceReduction = 0;
    this.optimalEnergyConsumption = 0;
    this.optimalSiliconConsumption = 0;
    this.enabled = false;
    this.powerFraction = 1;
    this.siliconFraction = 1;
    this.hasEnoughEnergy = true;
    this.hasEnoughSilicon = true;
    this.effectiveGrowthRate = 0;
    this.maxEnergyPercent = 10;
    this.maxEnergyAbsolute = 0;
    this.energyLimitMode = 'percent';
  }


  getMaxNanobots() {
    if (typeof resources !== 'undefined' && resources.surface?.land) {
      return resources.surface.land.value * 10000 * 1e19;
    }
    return Infinity;
  }

  produceResources(deltaTime, accumulatedChanges) {
    if (!this.enabled) return;
    const baseRate = 0.0025;
    let powerFraction = 1;
    let siliconFraction = 1;
    this.currentEnergyConsumption = 0;
    this.currentSiliconConsumption = 0;
    this.currentGlassProduction = 0;
    this.optimalEnergyConsumption = this.nanobots * 1e-12;
    this.optimalSiliconConsumption = this.nanobots * 1e-18 * (this.siliconSlider / 10);
    if (typeof resources !== 'undefined') {

      const siliconRes = resources.colony?.silicon;
      if (siliconRes && accumulatedChanges?.colony) {
        const needed = this.optimalSiliconConsumption * (deltaTime / 1000);
        const available = Math.max(siliconRes.value + (accumulatedChanges.colony.silicon || 0),0);
        this.hasEnoughSilicon = available >= this.optimalSiliconConsumption * (deltaTime / 1000);
        const used = this.hasEnoughSilicon ? needed : available;

        this.currentSiliconConsumption = used / (deltaTime / 1000);
        accumulatedChanges.colony.silicon =
          (accumulatedChanges.colony.silicon || 0) - used;
        siliconRes.modifyRate(
          -this.currentSiliconConsumption,
          'Nanotech Silicon',
          'nanotech'
        );
        siliconFraction = this.hasEnoughSilicon ? 1 : (needed > 0 ? used / needed : 1);
      } else if (this.siliconSlider > 0) {
        siliconFraction = 0;
      }

      const glassRes = resources.colony?.glass;
      if (glassRes && accumulatedChanges?.colony) {
        const glassRate = this.nanobots * 1e-18 * (this.glassSlider / 10);
        this.currentGlassProduction = glassRate;
        accumulatedChanges.colony.glass =
          (accumulatedChanges.colony.glass || 0) + glassRate * (deltaTime / 1000);
        glassRes.modifyRate(glassRate, 'Nanotech Glass', 'nanotech');
      }

      const energyRes = resources.colony?.energy;
      if (baseRate > 0 && energyRes && accumulatedChanges?.colony) {
        const productionRate = energyRes.productionRate || 0;
        const allowedPower =
          this.energyLimitMode === 'absolute'
            ? this.maxEnergyAbsolute
            : (productionRate * this.maxEnergyPercent) / 100;
        const requiredPower = this.nanobots * 1e-12;
        const maxPossible = Math.min(requiredPower, allowedPower);
        const availableEnergy =
          Math.max(energyRes.value + (accumulatedChanges.colony.energy || 0),0);
        const requiredEnergy = maxPossible * (deltaTime / 1000);
        const requiredEnergyForOptimal = this.optimalEnergyConsumption * (deltaTime / 1000);
        const canDrawOptimal = Math.min(requiredEnergyForOptimal, allowedPower * (deltaTime / 1000));
        const actualEnergy = Math.min(canDrawOptimal, availableEnergy);
        this.currentEnergyConsumption = deltaTime > 0 ? (actualEnergy * 1000) / deltaTime : 0;

        powerFraction = this.optimalEnergyConsumption > 0 ? this.currentEnergyConsumption / this.optimalEnergyConsumption : 0;

        this.hasEnoughEnergy = allowedPower >= this.optimalEnergyConsumption;

        accumulatedChanges.colony.energy -= actualEnergy;
        energyRes.modifyRate(-this.currentEnergyConsumption, 'Nanotech Growth', 'nanotech');
      } else if (baseRate > 0) {
        powerFraction = 0;
      }
    } else if (this.siliconSlider > 0) {
      siliconFraction = 0;
    }
    this.powerFraction = powerFraction;
    this.siliconFraction = siliconFraction;
    const siliconRate =
      (this.siliconSlider / 10) * 0.0015 * this.siliconFraction;
    const penalty =
      (this.maintenanceSlider / 10) * 0.0015 +
      (this.glassSlider / 10) * 0.0015;
    const effectiveRate = baseRate * this.powerFraction + siliconRate - penalty;
    this.effectiveGrowthRate = effectiveRate;
    if (effectiveRate !== 0) {
      this.nanobots += this.nanobots * effectiveRate * (deltaTime / 1000);
    }
    const max = this.getMaxNanobots();
    this.nanobots = Math.max(1, Math.min(this.nanobots, max));
    this.applyMaintenanceEffects();
    this.updateUI();
  }

  enable() {
    this.enabled = true;
    this.updateUI();
  }

  prepareForTravel() {
    this.nanobots = Math.min(this.nanobots, 1e15);
  }

  applyMaintenanceEffects() {
    if (typeof structures === 'undefined' || !structures) return;
    const totals = { metal: 0, glass: 0, water: 0 };
    for (const name in structures) {
      const s = structures[name];
      if (!s || !s.maintenanceCost) continue;
      const prod = s.productivity !== undefined ? s.productivity : 1;
      totals.metal += (s.maintenanceCost.metal || 0) * (s.active || 0) * prod;
      totals.glass += (s.maintenanceCost.glass || 0) * (s.active || 0) * prod;
      totals.water += (s.maintenanceCost.water || 0) * (s.active || 0) * prod;
    }
    const total = totals.metal + totals.glass + totals.water;
    const coveragePerBot = 1e-18;
    let coverage = total > 0 ? (this.nanobots * coveragePerBot) / total : 0;
    coverage = Math.min(coverage, 0.5);
    const reduction = coverage * (this.maintenanceSlider / 10);
    this.currentMaintenanceReduction = reduction;
    const mult = 1 - reduction;
    ['metal', 'glass', 'water'].forEach((res) => {
      for (const name in structures) {
        const target = colonies && colonies[name] ? 'colony' : 'building';
        const effect = {
          target,
          targetId: name,
          type: 'maintenanceCostMultiplier',
          resourceCategory: 'colony',
          resourceId: res,
          value: mult,
          effectId: `nanotechMaint_${res}`,
          sourceId: 'nanotechMaintenance',
        };
        if (mult !== 1) {
          addEffect(effect);
        } else if (typeof removeEffect === 'function') {
          removeEffect(effect);
        }
      }
    });
  }

  updateUI() {
    if (typeof document === 'undefined') return;
    const buildingList = document.getElementById('colony-buildings-buttons');
    let container = document.getElementById('nanocolony-container');
    if (!container && buildingList) {
      container = document.createElement('div');
      container.id = 'nanocolony-container';
      container.classList.add('project-card');
      buildingList.insertAdjacentElement('afterend', container);
      container.innerHTML = `
        <div class="card-header"><span class="card-title">Nanocolony</span></div>
        <div class="card-body">
          <div class="stats-grid two-col">
            <div class="stat-item">
              <span class="stat-label">Nanobots:</span>
              <span class="stat-value"><span id="nanobot-count">1</span>/<span id="nanobot-cap">1</span></span>
            </div>
            <div class="stat-item">
              <span class="stat-label">Growth rate:</span>
              <span class="stat-value" id="nanobot-growth-rate">0%</span>
            </div>
          </div>
          <div class="control-group">
            <label for="nanotech-energy-limit">Energy Use Limit <span class="info-tooltip-icon" title="Percentage of power: Maximum percentage of total energy production the swarm may consume per second. Absolute (MW): Fixed energy limit in megawatts the swarm may consume per second.">&#9432;</span></label>
            <div style="display: flex; gap: 4px;">
              <input type="number" id="nanotech-energy-limit" min="0" max="100" step="any" value="${this.maxEnergyPercent}" style="flex:1;">
              <select id="nanotech-energy-limit-mode" style="flex:1;">
                <option value="percent" selected>percentage of power</option>
                <option value="absolute">absolute (MW)</option>
              </select>
            </div>
            <span id="nanotech-growth-impact" class="slider-value">+0.00%</span>
            <span id="nanotech-growth-energy" class="slider-value">0 W</span>
          </div>
          <div class="slider-description"><small>The swarm can consume power to grow. Each nanobot needs 1pW. All other consumptions happens after buildings and projects.  When travelling, HOPE can hide ${formatNumber(1e15)} nanobots from the Dead Hand Protocol.</small></div>

          <h4>Stage I</h4>
          <div class="control-group">
            <label for="nanotech-silicon-slider">Silicon Consumption</label>
            <div class="slider-container">
              <input type="range" id="nanotech-silicon-slider" min="0" max="10" step="1">
              <div class="tick-marks">${Array(11).fill('<span></span>').join('')}</div>
            </div>
            <span id="nanotech-silicon-impact" class="slider-value">+0.00%</span>
            <span id="nanotech-silicon-rate" class="slider-value">0 ton/s</span>
          </div>
          <div class="slider-description"><small>Consumes silicon to boost growth.</small></div>
          <div class="control-group">
            <label for="nanotech-maintenance-slider">Maintenance I</label>
            <div class="slider-container">
              <input type="range" id="nanotech-maintenance-slider" min="0" max="10" step="1">
              <div class="tick-marks">${Array(11).fill('<span></span>').join('')}</div>
            </div>
            <span id="nanotech-maintenance-impact" class="slider-value">0.00%</span>
            <span id="nanotech-maintenance-rate" class="slider-value">0%</span>
          </div>
          <div class="slider-description"><small>Reduces metal, glass, and water maintenance by up to 50%.</small></div>
          <div class="control-group">
            <label for="nanotech-glass-slider">Glass Production</label>
            <div class="slider-container">
              <input type="range" id="nanotech-glass-slider" min="0" max="10" step="1">
              <div class="tick-marks">${Array(11).fill('<span></span>').join('')}</div>
            </div>
            <span id="nanotech-glass-impact" class="slider-value">0.00%</span>
            <span id="nanotech-glass-rate" class="slider-value">0 ton/s</span>
          </div>
          <div class="slider-description"><small>Diverts growth to fabricate glass.</small></div>
        </div>`;
      document
        .getElementById('nanotech-silicon-slider')
        .addEventListener('input', (e) => {
          this.siliconSlider = parseInt(e.target.value);
          this.updateUI();
        });
      document
        .getElementById('nanotech-maintenance-slider')
        .addEventListener('input', (e) => {
          this.maintenanceSlider = parseInt(e.target.value);
          this.updateUI();
        });
      document
        .getElementById('nanotech-glass-slider')
        .addEventListener('input', (e) => {
          this.glassSlider = parseInt(e.target.value);
          this.updateUI();
        });
      document
        .getElementById('nanotech-energy-limit')
        .addEventListener('input', (e) => {
          const val = parseFloat(e.target.value) || 0;
          if (this.energyLimitMode === 'absolute') {
            this.maxEnergyAbsolute = val * 1e6;
          } else {
            this.maxEnergyPercent = val;
          }
          this.updateUI();
        });
      document
        .getElementById('nanotech-energy-limit-mode')
        .addEventListener('change', (e) => {
          this.energyLimitMode = e.target.value;
          this.updateUI();
        });
    }
    if (!container) return;
    container.style.display = this.enabled ? '' : 'none';
    const max = this.getMaxNanobots();
    const countEl = document.getElementById('nanobot-count');
    if (countEl) countEl.textContent = formatNumber(this.nanobots, false, 2);
    const capEl = document.getElementById('nanobot-cap');
    if (capEl) capEl.textContent = formatNumber(max);
    const growthEl = document.getElementById('nanobot-growth-rate');
    if (growthEl) {
      const baseOpt = 0.0025;
      const siliconOpt = (this.siliconSlider / 10) * 0.0015;
      const penalty =
        (this.maintenanceSlider / 10) * 0.0015 +
        (this.glassSlider / 10) * 0.0015;
      const optimalRate = baseOpt + siliconOpt - penalty;
      const effectiveRate =
        baseOpt * this.powerFraction +
        siliconOpt * this.siliconFraction -
        penalty;
      growthEl.textContent = `${(effectiveRate * 100).toFixed(2)}%`;
      growthEl.style.color = (!this.hasEnoughEnergy || !this.hasEnoughSilicon) ? 'orange' : '';
      this.effectiveGrowthRate = effectiveRate;
    }
    const sSlider = document.getElementById('nanotech-silicon-slider');
    if (sSlider) sSlider.value = this.siliconSlider;
    const mSlider = document.getElementById('nanotech-maintenance-slider');
    if (mSlider) mSlider.value = this.maintenanceSlider;
    const glSlider = document.getElementById('nanotech-glass-slider');
    if (glSlider) glSlider.value = this.glassSlider;
    const eLimit = document.getElementById('nanotech-energy-limit');
    const eMode = document.getElementById('nanotech-energy-limit-mode');
    if (eMode) eMode.value = this.energyLimitMode;
    if (eLimit && document.activeElement !== eLimit) {
      if (this.energyLimitMode === 'absolute') {
        eLimit.value = this.maxEnergyAbsolute / 1e6;
        eLimit.removeAttribute('max');
      } else {
        eLimit.value = this.maxEnergyPercent;
        eLimit.max = 100;
      }
    }

    const growthImpactEl = document.getElementById('nanotech-growth-impact');
    if (growthImpactEl) {
      const optimal = 0.25;
      const effective = optimal * this.powerFraction;
      growthImpactEl.textContent = `+${effective.toFixed(2)}%`;
      growthImpactEl.style.color = !this.hasEnoughEnergy ? 'orange' : '';
    }
    const siliconImpactEl = document.getElementById('nanotech-silicon-impact');
    if (siliconImpactEl) {
      const optimal = (this.siliconSlider / 10) * 0.15;
      const effective = optimal * this.siliconFraction;
      siliconImpactEl.textContent = `+${effective.toFixed(2)}%`;
      siliconImpactEl.style.color = !this.hasEnoughSilicon ? 'orange' : '';
    }
    const maintenanceImpactEl = document.getElementById('nanotech-maintenance-impact');
    if (maintenanceImpactEl) {
      const value = -(this.maintenanceSlider / 10) * 0.15;
      maintenanceImpactEl.textContent = `${value.toFixed(2)}%`;
      maintenanceImpactEl.style.color = '';
    }
    const glassImpactEl = document.getElementById('nanotech-glass-impact');
    if (glassImpactEl) {
      const value = -(this.glassSlider / 10) * 0.15;
      glassImpactEl.textContent = `${value.toFixed(2)}%`;
      glassImpactEl.style.color = '';
    }

    const energyRateEl = document.getElementById('nanotech-growth-energy');
    if (energyRateEl) {
      energyRateEl.textContent = `${formatNumber(this.currentEnergyConsumption, false, 2, true)} / ${formatNumber(this.optimalEnergyConsumption, false, 2, true)} W`;
      energyRateEl.style.color = !this.hasEnoughEnergy ? 'orange' : '';
    }
    const siliconRateEl = document.getElementById('nanotech-silicon-rate');
    if (siliconRateEl) {
      siliconRateEl.textContent = `${formatNumber(this.currentSiliconConsumption, false, 2, true)} / ${formatNumber(this.optimalSiliconConsumption, false, 2, true)} ton/s`;
      siliconRateEl.style.color = !this.hasEnoughSilicon ? 'orange' : '';
    }
    const maintenanceRateEl = document.getElementById('nanotech-maintenance-rate');
    if (maintenanceRateEl)
      maintenanceRateEl.textContent = `-${(this.currentMaintenanceReduction * 100).toFixed(2)}%`;
    const glassRateEl = document.getElementById('nanotech-glass-rate');
    if (glassRateEl)
      glassRateEl.textContent = `${formatNumber(this.currentGlassProduction, false, 2, true)} ton/s`;
  }

  saveState() {
    return {
      nanobots: this.nanobots,
      siliconSlider: this.siliconSlider,
      maintenanceSlider: this.maintenanceSlider,
      glassSlider: this.glassSlider,
      maxEnergyPercent: this.maxEnergyPercent,
      maxEnergyAbsolute: this.maxEnergyAbsolute,
      energyLimitMode: this.energyLimitMode,
    };
  }

  loadState(state) {
    if (!state) return;
    this.nanobots = state.nanobots || 1;
    this.siliconSlider = state.siliconSlider || 0;
    this.maintenanceSlider = state.maintenanceSlider || 0;
    this.glassSlider = state.glassSlider || 0;
    this.maxEnergyPercent = state.maxEnergyPercent ?? 10;
    this.maxEnergyAbsolute = state.maxEnergyAbsolute || 0;
    this.energyLimitMode = state.energyLimitMode || 'percent';
    const max = this.getMaxNanobots();
    this.nanobots = Math.max(1, Math.min(this.nanobots, max));
    this.reapplyEffects();
    this.updateUI();
  }

  reapplyEffects() {
    this.applyMaintenanceEffects();
  }
}

const nanotechManager = new NanotechManager();
if (typeof globalThis !== 'undefined') {
  globalThis.nanotechManager = nanotechManager;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { NanotechManager };
}
