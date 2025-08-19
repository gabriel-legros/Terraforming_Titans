class NanotechManager extends EffectableEntity {
  constructor() {
    super({ description: 'Manages the nanobot swarm' });
    this.nanobots = 1; // starting nanobot count
    this.growthSlider = 0; // 0-10
    this.siliconSlider = 0; // 0-10
    this.maintenanceSlider = 0; // 0-10
    this.glassSlider = 0; // 0-10
    this.currentEnergyConsumption = 0;
    this.currentSiliconConsumption = 0;
    this.currentGlassProduction = 0;
    this.currentMaintenanceReduction = 0;
    this.enabled = false;
  }

  getGrowthRate() {
    return (
      (this.growthSlider / 10) * 0.0025 +
      (this.siliconSlider / 10) * 0.0015 -
      (this.maintenanceSlider / 10) * 0.0015 -
      (this.glassSlider / 10) * 0.0015
    );
  }

  getMaxNanobots() {
    if (typeof resources !== 'undefined' && resources.surface?.land) {
      return resources.surface.land.value * 10000 * 1e19;
    }
    return Infinity;
  }

  produceResources(deltaTime, accumulatedChanges) {
    if (!this.enabled) return;
    const rate = this.getGrowthRate();
    let effectiveRate = rate;
    this.currentEnergyConsumption = 0;
    this.currentSiliconConsumption = 0;
    this.currentGlassProduction = 0;
    if (typeof resources !== 'undefined') {
      const energyRes = resources.colony?.energy;
      if (rate > 0 && energyRes && accumulatedChanges?.colony) {
        const projected = energyRes.value + (accumulatedChanges.colony.energy || 0);
        const overflowEnergy = Math.max(0, projected - energyRes.cap);
        const availablePower = overflowEnergy;
        const requiredPower = this.nanobots * 1e-12 * deltaTime / 1000;
        const actualPower = Math.min(requiredPower, availablePower);
        const powerFraction = requiredPower > 0 ? actualPower / requiredPower : 0;
        effectiveRate = rate * powerFraction;
        this.currentEnergyConsumption = actualPower * 1000 / deltaTime;
        const energyUsed = actualPower;
        accumulatedChanges.colony.energy -= energyUsed;
      } else if (rate > 0) {
        effectiveRate = 0;
      }

      const siliconRes = resources.colony?.silicon;
      if (siliconRes && accumulatedChanges?.colony) {
        const siliconRate = this.nanobots * 1e-18 * (this.siliconSlider / 10);
        const needed = siliconRate * (deltaTime / 1000);
        const available = siliconRes.value + (accumulatedChanges.colony.silicon || 0);
        const used = Math.min(needed, available);
        this.currentSiliconConsumption = used / (deltaTime / 1000);
        accumulatedChanges.colony.silicon =
          (accumulatedChanges.colony.silicon || 0) - used;
        siliconRes.modifyRate(-this.currentSiliconConsumption, 'Nanotech Silicon', 'nanotech');
      }

      const glassRes = resources.colony?.glass;
      if (glassRes && accumulatedChanges?.colony) {
        const glassRate = this.nanobots * 1e-18 * (this.glassSlider / 10);
        this.currentGlassProduction = glassRate;
        accumulatedChanges.colony.glass =
          (accumulatedChanges.colony.glass || 0) + glassRate * (deltaTime / 1000);
        glassRes.modifyRate(glassRate, 'Nanotech Glass', 'nanotech');
      }
    }
    if (effectiveRate !== 0) {
      this.nanobots += this.nanobots * effectiveRate * (deltaTime / 1000);
    }
    const max = this.getMaxNanobots();
    this.nanobots = Math.min(this.nanobots, max);
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
    const coveragePerBot = 1e-20;
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
            <label for="nanotech-growth-slider">Growth</label>
            <div class="slider-container">
              <input type="range" id="nanotech-growth-slider" min="0" max="10" step="1">
              <div class="tick-marks">${Array(11).fill('<span></span>').join('')}</div>
            </div>
            <span id="nanotech-growth-impact" class="slider-value">+0.00%</span>
            <span id="nanotech-growth-energy" class="slider-value">0 W</span>
          </div>
          <div class="slider-description"><small>The swarm will consume power over storage (not stored energy) to grow. Each nanobot needs 10e-12W. All other consumptions happens after buildings and projects.  When travelling, HOPE can hide ${formatNumber(1e15)} nanobots from the Dead Hand Protocol.</small></div>
          
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
          <div class="slider-description"><small>Consumes silicon (including silicon in storage) to boost growth.</small></div>
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
        .getElementById('nanotech-growth-slider')
        .addEventListener('input', (e) => {
          this.growthSlider = parseInt(e.target.value);
          this.updateUI();
        });
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
    }
    if (!container) return;
    container.style.display = this.enabled ? '' : 'none';
    const max = this.getMaxNanobots();
    const countEl = document.getElementById('nanobot-count');
    if (countEl) countEl.textContent = formatNumber(this.nanobots, false, 2);
    const capEl = document.getElementById('nanobot-cap');
    if (capEl) capEl.textContent = formatNumber(max);
    const growthEl = document.getElementById('nanobot-growth-rate');
    if (growthEl)
      growthEl.textContent = `${(this.getGrowthRate() * 100).toFixed(2)}%`;
    const gSlider = document.getElementById('nanotech-growth-slider');
    if (gSlider) gSlider.value = this.growthSlider;
    const sSlider = document.getElementById('nanotech-silicon-slider');
    if (sSlider) sSlider.value = this.siliconSlider;
    const mSlider = document.getElementById('nanotech-maintenance-slider');
    if (mSlider) mSlider.value = this.maintenanceSlider;
    const glSlider = document.getElementById('nanotech-glass-slider');
    if (glSlider) glSlider.value = this.glassSlider;

    const growthImpactEl = document.getElementById('nanotech-growth-impact');
    if (growthImpactEl)
      growthImpactEl.textContent = `+${((this.growthSlider / 10) * 0.25).toFixed(2)}%`;
    const siliconImpactEl = document.getElementById('nanotech-silicon-impact');
    if (siliconImpactEl)
      siliconImpactEl.textContent = `+${((this.siliconSlider / 10) * 0.15).toFixed(2)}%`;
    const maintenanceImpactEl = document.getElementById('nanotech-maintenance-impact');
    if (maintenanceImpactEl)
      maintenanceImpactEl.textContent = `${(- (this.maintenanceSlider / 10) * 0.15).toFixed(2)}%`;
    const glassImpactEl = document.getElementById('nanotech-glass-impact');
    if (glassImpactEl)
      glassImpactEl.textContent = `${(- (this.glassSlider / 10) * 0.15).toFixed(2)}%`;

    const energyRateEl = document.getElementById('nanotech-growth-energy');
    if (energyRateEl)
      energyRateEl.textContent = `${formatNumber(this.currentEnergyConsumption, false, 2, true)} W`;
    const siliconRateEl = document.getElementById('nanotech-silicon-rate');
    if (siliconRateEl)
      siliconRateEl.textContent = `${formatNumber(this.currentSiliconConsumption, false, 2, true)} ton/s`;
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
      growthSlider: this.growthSlider,
      siliconSlider: this.siliconSlider,
      maintenanceSlider: this.maintenanceSlider,
      glassSlider: this.glassSlider,
    };
  }

  loadState(state) {
    if (!state) return;
    this.nanobots = state.nanobots || 1;
    this.growthSlider = state.growthSlider || 0;
    this.siliconSlider = state.siliconSlider || 0;
    this.maintenanceSlider = state.maintenanceSlider || 0;
    this.glassSlider = state.glassSlider || 0;
    const max = this.getMaxNanobots();
    this.nanobots = Math.min(this.nanobots, max);
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
