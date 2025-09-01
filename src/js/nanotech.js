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
    this.uiCache = null; // cache of UI element references for fast updates
  }


  getMaxNanobots() {
    if (typeof resources !== 'undefined' && resources.surface?.land) {
      return resources.surface.land.value * 10000 * 1e19;
    }
    return 1e40;
  }

  produceResources(deltaTime, accumulatedChanges) {
    if(deltaTime == 0){
      return;
    }
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

        this.currentSiliconConsumption = deltaTime > 0 ? used / (deltaTime / 1000) : 0;
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
    if (effectiveRate !== 0 && !isNaN(effectiveRate)) {
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
    if(!isNaN(this.nanobots)){
      this.nanobots = Math.min(this.nanobots, 1e15);
    }
    else{
      this.nanobots = 1e15;
    }
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
          addEffect(effect);
      }
    });
  }

  updateUI() {
    if (typeof document === 'undefined') return;
    const controlsSection =
      document.getElementById('colony-controls-section') ||
      document.getElementById('colony-controls-container') ||
      document.getElementById('colony-buildings-buttons');
    let container = document.getElementById('nanocolony-container');
    if (!container && controlsSection) {
      container = document.createElement('div');
      container.id = 'nanocolony-container';
      container.classList.add('project-card');
      controlsSection.insertAdjacentElement('afterend', container);
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
              <input type="text" id="nanotech-energy-limit" value="${this.maxEnergyPercent}" style="flex:1;">
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
              <input type="range" id="nanotech-silicon-slider" class="pretty-slider" min="0" max="10" step="1">
              <div class="tick-marks">${Array(11).fill('<span></span>').join('')}</div>
            </div>
            <span id="nanotech-silicon-impact" class="slider-value">+0.00%</span>
            <span id="nanotech-silicon-rate" class="slider-value">0 ton/s</span>
          </div>
          <div class="slider-description"><small>Consumes silicon to boost growth.</small></div>
          <div class="control-group">
            <label for="nanotech-maintenance-slider">Maintenance I</label>
            <div class="slider-container">
              <input type="range" id="nanotech-maintenance-slider" class="pretty-slider" min="0" max="10" step="1">
              <div class="tick-marks">${Array(11).fill('<span></span>').join('')}</div>
            </div>
            <span id="nanotech-maintenance-impact" class="slider-value">0.00%</span>
            <span id="nanotech-maintenance-rate" class="slider-value">0%</span>
          </div>
          <div class="slider-description"><small>Reduces metal, glass, and water maintenance by up to 50%.</small></div>
          <div class="control-group">
            <label for="nanotech-glass-slider">Glass Production</label>
            <div class="slider-container">
              <input type="range" id="nanotech-glass-slider" class="pretty-slider" min="0" max="10" step="1">
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
          const val = parseFloat(e.target.value);
          if (this.energyLimitMode === 'absolute') {
            this.maxEnergyAbsolute = isNaN(val) ? 0 : val * 1e6;
            e.target.value = isNaN(val) ? '' : val.toString();
          } else {
            const pct = isNaN(val) ? 0 : Math.max(0, Math.min(100, val));
            this.maxEnergyPercent = pct;
            e.target.value = isNaN(val) ? '' : pct.toString();
          }
          this.updateUI();
        });
      document
        .getElementById('nanotech-energy-limit-mode')
        .addEventListener('change', (e) => {
          this.energyLimitMode = e.target.value;
          this.updateUI();
        });
      // Cache references once the container is built
      this.cacheUIRefs(container);
    }
    if (!container) return;
    // Ensure cache is aligned with current container
    this.ensureUICache(container);
    container.style.display = this.enabled ? '' : 'none';
    const max = this.getMaxNanobots();
    const C = this.uiCache || {};
    if (C.countEl) {
      C.countEl.textContent = formatNumber(this.nanobots, false, 2);
      C.countEl.style.color = this.nanobots >= max ? 'green' : '';
    }
    if (C.capEl) {
      C.capEl.textContent = formatNumber(max, false, 2);
      C.capEl.style.color = this.nanobots >= max ? 'green' : '';
    }
    if (C.growthEl) {
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
      C.growthEl.textContent = `${(effectiveRate * 100).toFixed(3)}%`;
      C.growthEl.style.color = (!this.hasEnoughEnergy || !this.hasEnoughSilicon) ? 'orange' : '';
      this.effectiveGrowthRate = effectiveRate;
    }
    if (C.sSlider) C.sSlider.value = this.siliconSlider;
    if (C.mSlider) C.mSlider.value = this.maintenanceSlider;
    if (C.glSlider) C.glSlider.value = this.glassSlider;
    if (C.eMode) C.eMode.value = this.energyLimitMode;
    if (C.eLimit && document.activeElement !== C.eLimit) {
      if (this.energyLimitMode === 'absolute') {
        C.eLimit.value = (this.maxEnergyAbsolute / 1e6).toString();
        C.eLimit.removeAttribute('max');
      } else {
        const pct = Math.max(0, Math.min(100, this.maxEnergyPercent));
        this.maxEnergyPercent = pct;
        C.eLimit.value = pct.toString();
        C.eLimit.max = 100;
      }
    }

    if (C.growthImpactEl) {
      const optimal = 0.25;
      const effective = optimal * this.powerFraction;
      C.growthImpactEl.textContent = `+${effective.toFixed(3)}%`;
      C.growthImpactEl.style.color = !this.hasEnoughEnergy ? 'orange' : '';
    }
    if (C.siliconImpactEl) {
      const optimal = (this.siliconSlider / 10) * 0.15;
      const effective = optimal * this.siliconFraction;
      C.siliconImpactEl.textContent = `+${effective.toFixed(3)}%`;
      C.siliconImpactEl.style.color = !this.hasEnoughSilicon ? 'orange' : '';
    }
    if (C.maintenanceImpactEl) {
      const value = -(this.maintenanceSlider / 10) * 0.15;
      C.maintenanceImpactEl.textContent = `${value.toFixed(3)}%`;
      C.maintenanceImpactEl.style.color = '';
    }
    if (C.glassImpactEl) {
      const value = -(this.glassSlider / 10) * 0.15;
      C.glassImpactEl.textContent = `${value.toFixed(3)}%`;
      C.glassImpactEl.style.color = '';
    }

    if (C.energyRateEl) {
      C.energyRateEl.textContent = `${formatNumber(this.currentEnergyConsumption, false, 2, true)} / ${formatNumber(this.optimalEnergyConsumption, false, 2, true)} W`;
      C.energyRateEl.style.color = !this.hasEnoughEnergy ? 'orange' : '';
    }
    if (C.siliconRateEl) {
      C.siliconRateEl.textContent = `${formatNumber(this.currentSiliconConsumption, false, 2, true)} / ${formatNumber(this.optimalSiliconConsumption, false, 2, true)} ton/s`;
      C.siliconRateEl.style.color = !this.hasEnoughSilicon ? 'orange' : '';
    }
    if (C.maintenanceRateEl)
      C.maintenanceRateEl.textContent = `-${(this.currentMaintenanceReduction * 100).toFixed(2)}%`;
    if (C.glassRateEl)
      C.glassRateEl.textContent = `${formatNumber(this.currentGlassProduction, false, 2, true)} ton/s`;
  }

  cacheUIRefs(container) {
    // Cache all frequently accessed DOM nodes under the Nanotech card
    this.uiCache = {
      container,
      countEl: document.getElementById('nanobot-count'),
      capEl: document.getElementById('nanobot-cap'),
      growthEl: document.getElementById('nanobot-growth-rate'),
      sSlider: document.getElementById('nanotech-silicon-slider'),
      mSlider: document.getElementById('nanotech-maintenance-slider'),
      glSlider: document.getElementById('nanotech-glass-slider'),
      eLimit: document.getElementById('nanotech-energy-limit'),
      eMode: document.getElementById('nanotech-energy-limit-mode'),
      growthImpactEl: document.getElementById('nanotech-growth-impact'),
      siliconImpactEl: document.getElementById('nanotech-silicon-impact'),
      maintenanceImpactEl: document.getElementById('nanotech-maintenance-impact'),
      glassImpactEl: document.getElementById('nanotech-glass-impact'),
      energyRateEl: document.getElementById('nanotech-growth-energy'),
      siliconRateEl: document.getElementById('nanotech-silicon-rate'),
      maintenanceRateEl: document.getElementById('nanotech-maintenance-rate'),
      glassRateEl: document.getElementById('nanotech-glass-rate'),
    };
  }

  ensureUICache(container) {
    if (!this.uiCache || this.uiCache.container !== container) {
      this.cacheUIRefs(container);
    }
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

  reset() {
    this.nanobots = 1;
    this.siliconSlider = 0;
    this.maintenanceSlider = 0;
    this.glassSlider = 0;
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
