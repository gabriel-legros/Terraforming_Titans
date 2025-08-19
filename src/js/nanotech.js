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
  }

  getGrowthRate() {
    return (
      (this.growthSlider / 10) * 0.0015 +
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
        const availablePower = overflowEnergy / (deltaTime / 1000);
        const requiredPower = this.nanobots * 1e-11;
        const actualPower = Math.min(requiredPower, availablePower);
        const powerFraction = requiredPower > 0 ? actualPower / requiredPower : 0;
        effectiveRate = rate * powerFraction;
        this.currentEnergyConsumption = actualPower;
        const energyUsed = actualPower * (deltaTime / 1000);
        accumulatedChanges.colony.energy -= energyUsed;
        energyRes.modifyRate(-actualPower, 'Nanotech Growth', 'nanotech');
      } else if (rate > 0) {
        effectiveRate = 0;
      }

      const siliconRes = resources.colony?.silicon;
      if (siliconRes && accumulatedChanges?.colony) {
        const siliconRate = this.nanobots * 1e-20 * (this.siliconSlider / 10);
        this.currentSiliconConsumption = siliconRate;
        accumulatedChanges.colony.silicon =
          (accumulatedChanges.colony.silicon || 0) - siliconRate * (deltaTime / 1000);
        siliconRes.modifyRate(-siliconRate, 'Nanotech Silicon', 'nanotech');
      }

      const glassRes = resources.colony?.glass;
      if (glassRes && accumulatedChanges?.colony) {
        const glassRate = this.nanobots * 1e-20 * (this.glassSlider / 10);
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
          <div class="nanobot-stats">
            <div class="nanobot-count">Nanobots: <span id="nanobot-count">1</span></div>
            <div class="nanobot-growth">Growth rate: <span id="nanobot-growth-rate">0%</span></div>
          </div>
          <div class="slider-row">
            <label for="nanotech-growth-slider">Growth</label>
            <input type="range" id="nanotech-growth-slider" min="0" max="10" step="1">
            <span id="nanotech-growth-energy" class="slider-rate">0 W</span>
            <div class="slider-description"><small>The swarm will consume power over storage (not stored energy) to grow. Each nanobot needs 10e-12W.</small></div>
          </div>
          <div class="nanotech-stage">
            <h4>Stage I</h4>
            <div class="slider-row">
              <label for="nanotech-silicon-slider">Silicon Consumption</label>
              <input type="range" id="nanotech-silicon-slider" min="0" max="10" step="1">
              <span id="nanotech-silicon-rate" class="slider-rate">0 ton/s</span>
              <div class="slider-description"><small>Consumes silicon to boost growth.</small></div>
            </div>
            <div class="slider-row">
              <label for="nanotech-maintenance-slider">Maintenance I<span class="info-tooltip-icon" title="Reduces metal, glass, and water maintenance by up to 50%, if the swarm is large enough">&#9432;</span></label>
              <input type="range" id="nanotech-maintenance-slider" min="0" max="10" step="1">
              <span id="nanotech-maintenance-rate" class="slider-rate">0%</span>
              <div class="slider-description"><small>Reduces metal, glass, and water maintenance by up to 50%.</small></div>
            </div>
            <div class="slider-row">
              <label for="nanotech-glass-slider">Glass Production</label>
              <input type="range" id="nanotech-glass-slider" min="0" max="10" step="1">
              <span id="nanotech-glass-rate" class="slider-rate">0 ton/s</span>
              <div class="slider-description"><small>Diverts growth to fabricate glass.</small></div>
            </div>
          </div>
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
    const countEl = document.getElementById('nanobot-count');
    if (countEl) countEl.textContent = this.nanobots.toFixed(2);
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

    const energyRateEl = document.getElementById('nanotech-growth-energy');
    if (energyRateEl)
      energyRateEl.textContent = `${this.currentEnergyConsumption.toExponential(2)} W`;
    const siliconRateEl = document.getElementById('nanotech-silicon-rate');
    if (siliconRateEl)
      siliconRateEl.textContent = `${this.currentSiliconConsumption.toExponential(2)} ton/s`;
    const maintenanceRateEl = document.getElementById('nanotech-maintenance-rate');
    if (maintenanceRateEl)
      maintenanceRateEl.textContent = `-${(this.currentMaintenanceReduction * 100).toFixed(2)}%`;
    const glassRateEl = document.getElementById('nanotech-glass-rate');
    if (glassRateEl)
      glassRateEl.textContent = `${this.currentGlassProduction.toExponential(2)} ton/s`;
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
