class NanotechManager extends EffectableEntity {
  constructor() {
    super({ description: 'Manages the nanobot swarm' });
    this.nanobots = 1; // starting nanobot count
    this.siliconSlider = 0; // 0-10
    this.maintenanceSlider = 0; // 0-10
    this.glassSlider = 0; // 0-10
    this.metalSlider = 0; // 0-10
    this.maintenance2Slider = 0; // 0-10
    this.componentsSlider = 0; // 0-10
    this.currentEnergyConsumption = 0;
    this.currentSiliconConsumption = 0;
    this.currentGlassProduction = 0;
    this.currentMetalConsumption = 0;
    this.currentComponentsProduction = 0;
    this.currentMaintenanceReduction = 0;
    this.currentMaintenance2Reduction = 0;
    this.optimalEnergyConsumption = 0;
    this.optimalSiliconConsumption = 0;
    this.optimalMetalConsumption = 0;
    this.enabled = false;
    this.powerFraction = 1;
    this.siliconFraction = 1;
    this.metalFraction = 1;
    this.hasEnoughEnergy = true;
    this.hasEnoughSilicon = true;
    this.hasEnoughMetal = true;
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
    let metalFraction = 1;
    const stage2Enabled = this.isBooleanFlagSet('stage2_enabled');
    this.currentEnergyConsumption = 0;
    this.currentSiliconConsumption = 0;
    this.currentGlassProduction = 0;
    this.currentMetalConsumption = 0;
    this.currentComponentsProduction = 0;
    this.optimalEnergyConsumption = this.nanobots * 1e-12;
    this.optimalSiliconConsumption = this.nanobots * 1e-18 * (this.siliconSlider / 10);
    this.optimalMetalConsumption = stage2Enabled
      ? this.nanobots * 1e-18 * (this.metalSlider / 10)
      : 0;
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

      if (stage2Enabled) {
        const metalRes = resources.colony?.metal;
        if (metalRes && accumulatedChanges?.colony) {
          const needed = this.optimalMetalConsumption * (deltaTime / 1000);
          const available = Math.max(metalRes.value + (accumulatedChanges.colony.metal || 0), 0);
          this.hasEnoughMetal = available >= needed;
          const used = this.hasEnoughMetal ? needed : available;

          this.currentMetalConsumption = deltaTime > 0 ? used / (deltaTime / 1000) : 0;
          accumulatedChanges.colony.metal = (accumulatedChanges.colony.metal || 0) - used;
          metalRes.modifyRate(-this.currentMetalConsumption, 'Nanotech Metal', 'nanotech');
          metalFraction = this.hasEnoughMetal ? 1 : (needed > 0 ? used / needed : 1);
        } else if (this.metalSlider > 0) {
          metalFraction = 0;
          this.hasEnoughMetal = false;
        } else {
          this.hasEnoughMetal = true;
        }
      } else {
        metalFraction = 0;
        this.hasEnoughMetal = true;
      }

      const glassRes = resources.colony?.glass;
      if (glassRes && accumulatedChanges?.colony) {
        const glassRate = this.nanobots * 1e-18 * (this.glassSlider / 10);
        this.currentGlassProduction = glassRate;
        accumulatedChanges.colony.glass =
          (accumulatedChanges.colony.glass || 0) + glassRate * (deltaTime / 1000);
        glassRes.modifyRate(glassRate, 'Nanotech Glass', 'nanotech');
      }

      const componentsRes = resources.colony?.components;
      if (componentsRes && accumulatedChanges?.colony && stage2Enabled) {
        const componentsRate = this.nanobots * 1e-19 * (this.componentsSlider / 10);
        this.currentComponentsProduction = componentsRate;
        accumulatedChanges.colony.components =
          (accumulatedChanges.colony.components || 0) + componentsRate * (deltaTime / 1000);
        componentsRes.modifyRate(componentsRate, 'Nanotech Components', 'nanotech');
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
    this.metalFraction = metalFraction;
    const siliconRate =
      (this.siliconSlider / 10) * 0.0015 * this.siliconFraction;
    const metalRate = stage2Enabled
      ? (this.metalSlider / 10) * 0.0015 * this.metalFraction
      : 0;
    const penalty =
      (this.maintenanceSlider / 10) * 0.0015 +
      (this.glassSlider / 10) * 0.0015 +
      (stage2Enabled ? (this.maintenance2Slider / 10) * 0.0015 : 0) +
      (stage2Enabled ? (this.componentsSlider / 10) * 0.0015 : 0);

    const effectiveRate = baseRate * this.powerFraction + siliconRate + metalRate - penalty;
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
    const totals = { metal: 0, glass: 0, water: 0, components: 0, superconductors: 0 };
    for (const name in structures) {
      const s = structures[name];
      if (!s || !s.maintenanceCost) continue;
      const prod = s.productivity !== undefined ? s.productivity : 1;
      totals.metal += (s.maintenanceCost.metal || 0) * (s.active || 0) * prod;
      totals.glass += (s.maintenanceCost.glass || 0) * (s.active || 0) * prod;
      totals.water += (s.maintenanceCost.water || 0) * (s.active || 0) * prod;
      totals.components += (s.maintenanceCost.components || 0) * (s.active || 0) * prod;
      totals.superconductors += (s.maintenanceCost.superconductors || 0) * (s.active || 0) * prod;
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

    const stage2Total = totals.components + totals.superconductors;
    let coverage2 = stage2Total > 0 ? (this.nanobots * coveragePerBot) / stage2Total : 0;
    coverage2 = Math.min(coverage2, 0.5);
    const reduction2 = this.isBooleanFlagSet('stage2_enabled')
      ? coverage2 * (this.maintenance2Slider / 10)
      : 0;
    this.currentMaintenance2Reduction = reduction2;
    const mult2 = 1 - reduction2;
    ['components', 'superconductors'].forEach((res) => {
      for (const name in structures) {
        const target = colonies && colonies[name] ? 'colony' : 'building';
        const effect = {
          target,
          targetId: name,
          type: 'maintenanceCostMultiplier',
          resourceCategory: 'colony',
          resourceId: res,
          value: mult2,
          effectId: `nanotechMaint2_${res}`,
          sourceId: 'nanotechMaintenance2',
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
        <div class="card-body nanotech-card-body">
          <div class="nanotech-summary-grid">
            <div class="nanotech-summary-card">
              <span class="summary-label">Nanobots</span>
              <div class="summary-value">
                <span id="nanobot-count">1</span>
                <span class="summary-divider">/</span>
                <span id="nanobot-cap">1</span>
              </div>
            </div>
            <div class="nanotech-summary-card">
              <span class="summary-label">Growth rate</span>
              <span class="summary-value" id="nanobot-growth-rate">0%</span>
            </div>
            <div class="nanotech-summary-card nanotech-energy-card">
              <div class="summary-label">
                Energy allocation <span class="info-tooltip-icon" title="Percentage of power: Maximum percentage of total energy production the swarm may consume per second. Absolute (MW): Fixed energy limit in megawatts the swarm may consume per second.">&#9432;</span>
              </div>
              <div class="nanotech-energy-limit">
                <input type="text" id="nanotech-energy-limit" value="${this.maxEnergyPercent}">
                <select id="nanotech-energy-limit-mode">
                  <option value="percent" selected>percentage of power</option>
                  <option value="absolute">absolute (MW)</option>
                </select>
              </div>
              <div class="nanotech-energy-stats">
                <div class="energy-stat">
                  <span class="energy-label">Growth boost</span>
                  <span class="energy-value" id="nanotech-growth-impact">+0.00%</span>
                </div>
                <div class="energy-stat">
                  <span class="energy-label">Draw</span>
                  <span class="energy-value" id="nanotech-growth-energy">0 W</span>
                </div>
              </div>
            </div>
          </div>
          <p class="nanotech-hint">The swarm can consume power to grow. Each nanobot needs 1pW. All other consumptions happens after buildings and projects. When travelling, HOPE can hide ${formatNumber(1e15)} nanobots from the Dead Hand Protocol.</p>
          <div class="nanotech-stage">
            <div class="nanotech-stage-header">
              <h4>Stage I</h4>
            </div>
            <div class="nanotech-slider-grid">
              <div class="nanotech-slider-card">
                <div class="slider-header">
                  <span class="slider-title">Silicon Consumption</span>
                  <div class="slider-values">
                    <span id="nanotech-silicon-impact">+0.00%</span>
                    <span id="nanotech-silicon-rate">0 ton/s</span>
                  </div>
                </div>
                <div class="slider-control">
                  <div class="slider-container">
                    <input type="range" id="nanotech-silicon-slider" class="pretty-slider" min="0" max="10" step="1">
                    <div class="tick-marks">${Array(11).fill('<span></span>').join('')}</div>
                  </div>
                </div>
                <p class="slider-description">Consumes silicon to boost growth.</p>
              </div>
              <div class="nanotech-slider-card">
                <div class="slider-header">
                  <span class="slider-title">Maintenance I</span>
                  <div class="slider-values">
                    <span id="nanotech-maintenance-impact">0.00%</span>
                    <span id="nanotech-maintenance-rate">0%</span>
                  </div>
                </div>
                <div class="slider-control">
                  <div class="slider-container">
                    <input type="range" id="nanotech-maintenance-slider" class="pretty-slider" min="0" max="10" step="1">
                    <div class="tick-marks">${Array(11).fill('<span></span>').join('')}</div>
                  </div>
                </div>
                <p class="slider-description">Reduces metal, glass, and water maintenance by up to 50%.</p>
              </div>
              <div class="nanotech-slider-card">
                <div class="slider-header">
                  <span class="slider-title">Glass Production</span>
                  <div class="slider-values">
                    <span id="nanotech-glass-impact">0.00%</span>
                    <span id="nanotech-glass-rate">0 ton/s</span>
                  </div>
                </div>
                <div class="slider-control">
                  <div class="slider-container">
                    <input type="range" id="nanotech-glass-slider" class="pretty-slider" min="0" max="10" step="1">
                    <div class="tick-marks">${Array(11).fill('<span></span>').join('')}</div>
                  </div>
                </div>
                <p class="slider-description">Diverts growth to fabricate glass.</p>
              </div>
            </div>
          </div>
          <div class="nanotech-stage" id="nanotech-stage-2">
            <div class="nanotech-stage-header">
              <h4>Stage II</h4>
            </div>
            <div class="nanotech-slider-grid">
              <div class="nanotech-slider-card">
                <div class="slider-header">
                  <span class="slider-title">Metal Consumption</span>
                  <div class="slider-values">
                    <span id="nanotech-metal-impact">+0.00%</span>
                    <span id="nanotech-metal-rate">0 ton/s</span>
                  </div>
                </div>
                <div class="slider-control">
                  <div class="slider-container">
                    <input type="range" id="nanotech-metal-slider" class="pretty-slider" min="0" max="10" step="1">
                    <div class="tick-marks">${Array(11).fill('<span></span>').join('')}</div>
                  </div>
                </div>
                <p class="slider-description">Consumes metal to boost growth.</p>
              </div>
              <div class="nanotech-slider-card">
                <div class="slider-header">
                  <span class="slider-title">Maintenance II</span>
                  <div class="slider-values">
                    <span id="nanotech-maintenance2-impact">0.00%</span>
                    <span id="nanotech-maintenance2-rate">0%</span>
                  </div>
                </div>
                <div class="slider-control">
                  <div class="slider-container">
                    <input type="range" id="nanotech-maintenance2-slider" class="pretty-slider" min="0" max="10" step="1">
                    <div class="tick-marks">${Array(11).fill('<span></span>').join('')}</div>
                  </div>
                </div>
                <p class="slider-description">Reduces components and superconductors maintenance by up to 50%.</p>
              </div>
              <div class="nanotech-slider-card">
                <div class="slider-header">
                  <span class="slider-title">Components Production</span>
                  <div class="slider-values">
                    <span id="nanotech-components-impact">0.00%</span>
                    <span id="nanotech-components-rate">0 ton/s</span>
                  </div>
                </div>
                <div class="slider-control">
                  <div class="slider-container">
                    <input type="range" id="nanotech-components-slider" class="pretty-slider" min="0" max="10" step="1">
                    <div class="tick-marks">${Array(11).fill('<span></span>').join('')}</div>
                  </div>
                </div>
                <p class="slider-description">Diverts growth to fabricate components.</p>
              </div>
            </div>
          </div>
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
        .getElementById('nanotech-metal-slider')
        .addEventListener('input', (e) => {
          this.metalSlider = parseInt(e.target.value);
          this.updateUI();
        });
      document
        .getElementById('nanotech-maintenance2-slider')
        .addEventListener('input', (e) => {
          this.maintenance2Slider = parseInt(e.target.value);
          this.updateUI();
        });
      document
        .getElementById('nanotech-components-slider')
        .addEventListener('input', (e) => {
          this.componentsSlider = parseInt(e.target.value);
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
    const stage2Active = this.isBooleanFlagSet('stage2_enabled');
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
      const metalOpt = stage2Active ? (this.metalSlider / 10) * 0.0015 : 0;
      const penalty =
        (this.maintenanceSlider / 10) * 0.0015 +
        (this.glassSlider / 10) * 0.0015 +
        (stage2Active ? (this.maintenance2Slider / 10) * 0.0015 : 0) +
        (stage2Active ? (this.componentsSlider / 10) * 0.0015 : 0);
      const optimalRate = baseOpt + siliconOpt + metalOpt - penalty;
      const effectiveRate =
        baseOpt * this.powerFraction +
        siliconOpt * this.siliconFraction +
        (stage2Active ? metalOpt * this.metalFraction : 0) -
        penalty;
      C.growthEl.textContent = `${(effectiveRate * 100).toFixed(3)}%`;
      C.growthEl.style.color = (!this.hasEnoughEnergy || !this.hasEnoughSilicon || !this.hasEnoughMetal) ? 'orange' : '';
      this.effectiveGrowthRate = effectiveRate;
    }
    if (C.sSlider) C.sSlider.value = this.siliconSlider;
    if (C.mSlider) C.mSlider.value = this.maintenanceSlider;
    if (C.glSlider) C.glSlider.value = this.glassSlider;
    if (C.metalSlider) C.metalSlider.value = this.metalSlider;
    if (C.maintenance2Slider) C.maintenance2Slider.value = this.maintenance2Slider;
    if (C.componentsSlider) C.componentsSlider.value = this.componentsSlider;
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
    if (C.metalImpactEl) {
      const optimal = stage2Active ? (this.metalSlider / 10) * 0.15 : 0;
      const effective = stage2Active ? optimal * this.metalFraction : 0;
      C.metalImpactEl.textContent = `+${effective.toFixed(3)}%`;
      C.metalImpactEl.style.color = !this.hasEnoughMetal ? 'orange' : '';
    }
    if (C.maintenanceImpactEl) {
      const value = -(this.maintenanceSlider / 10) * 0.15;
      C.maintenanceImpactEl.textContent = `${value.toFixed(3)}%`;
      C.maintenanceImpactEl.style.color = '';
    }
    if (C.maintenance2ImpactEl) {
      const value = stage2Active ? -(this.maintenance2Slider / 10) * 0.15 : 0;
      C.maintenance2ImpactEl.textContent = `${value.toFixed(3)}%`;
      C.maintenance2ImpactEl.style.color = '';
    }
    if (C.glassImpactEl) {
      const value = -(this.glassSlider / 10) * 0.15;
      C.glassImpactEl.textContent = `${value.toFixed(3)}%`;
      C.glassImpactEl.style.color = '';
    }
    if (C.componentsImpactEl) {
      const value = stage2Active ? -(this.componentsSlider / 10) * 0.15 : 0;
      C.componentsImpactEl.textContent = `${value.toFixed(3)}%`;
      C.componentsImpactEl.style.color = '';
    }

    if (C.energyRateEl) {
      C.energyRateEl.textContent = `${formatNumber(this.currentEnergyConsumption, false, 2, true)} / ${formatNumber(this.optimalEnergyConsumption, false, 2, true)} W`;
      C.energyRateEl.style.color = !this.hasEnoughEnergy ? 'orange' : '';
    }
    if (C.siliconRateEl) {
      C.siliconRateEl.textContent = `${formatNumber(this.currentSiliconConsumption, false, 2, true)} / ${formatNumber(this.optimalSiliconConsumption, false, 2, true)} ton/s`;
      C.siliconRateEl.style.color = !this.hasEnoughSilicon ? 'orange' : '';
    }
    if (C.metalRateEl) {
      const current = stage2Active ? this.currentMetalConsumption : 0;
      const optimal = stage2Active ? this.optimalMetalConsumption : 0;
      C.metalRateEl.textContent = `${formatNumber(current, false, 2, true)} / ${formatNumber(optimal, false, 2, true)} ton/s`;
      C.metalRateEl.style.color = !this.hasEnoughMetal ? 'orange' : '';
    }
    if (C.maintenanceRateEl)
      C.maintenanceRateEl.textContent = `-${(this.currentMaintenanceReduction * 100).toFixed(2)}%`;
    if (C.maintenance2RateEl)
      C.maintenance2RateEl.textContent = `-${(this.currentMaintenance2Reduction * 100).toFixed(2)}%`;
    if (C.glassRateEl)
      C.glassRateEl.textContent = `${formatNumber(this.currentGlassProduction, false, 2, true)} ton/s`;
    if (C.componentsRateEl)
      C.componentsRateEl.textContent = `${formatNumber(stage2Active ? this.currentComponentsProduction : 0, false, 2, true)} ton/s`;

    if (C.stage2Container) {
      C.stage2Container.style.display = stage2Active ? '' : 'none';
    }
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
      metalSlider: document.getElementById('nanotech-metal-slider'),
      maintenance2Slider: document.getElementById('nanotech-maintenance2-slider'),
      componentsSlider: document.getElementById('nanotech-components-slider'),
      eLimit: document.getElementById('nanotech-energy-limit'),
      eMode: document.getElementById('nanotech-energy-limit-mode'),
      growthImpactEl: document.getElementById('nanotech-growth-impact'),
      siliconImpactEl: document.getElementById('nanotech-silicon-impact'),
      metalImpactEl: document.getElementById('nanotech-metal-impact'),
      maintenanceImpactEl: document.getElementById('nanotech-maintenance-impact'),
      maintenance2ImpactEl: document.getElementById('nanotech-maintenance2-impact'),
      glassImpactEl: document.getElementById('nanotech-glass-impact'),
      componentsImpactEl: document.getElementById('nanotech-components-impact'),
      energyRateEl: document.getElementById('nanotech-growth-energy'),
      siliconRateEl: document.getElementById('nanotech-silicon-rate'),
      maintenanceRateEl: document.getElementById('nanotech-maintenance-rate'),
      maintenance2RateEl: document.getElementById('nanotech-maintenance2-rate'),
      glassRateEl: document.getElementById('nanotech-glass-rate'),
      metalRateEl: document.getElementById('nanotech-metal-rate'),
      componentsRateEl: document.getElementById('nanotech-components-rate'),
      stage2Container: document.getElementById('nanotech-stage-2'),
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
      metalSlider: this.metalSlider,
      maintenance2Slider: this.maintenance2Slider,
      componentsSlider: this.componentsSlider,
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
    this.metalSlider = state.metalSlider || 0;
    this.maintenance2Slider = state.maintenance2Slider || 0;
    this.componentsSlider = state.componentsSlider || 0;
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
    this.metalSlider = 0;
    this.maintenance2Slider = 0;
    this.componentsSlider = 0;
    this.currentEnergyConsumption = 0;
    this.currentSiliconConsumption = 0;
    this.currentGlassProduction = 0;
    this.currentMetalConsumption = 0;
    this.currentComponentsProduction = 0;
    this.currentMaintenanceReduction = 0;
    this.currentMaintenance2Reduction = 0;
    this.optimalEnergyConsumption = 0;
    this.optimalSiliconConsumption = 0;
    this.optimalMetalConsumption = 0;
    this.enabled = false;
    this.powerFraction = 1;
    this.siliconFraction = 1;
    this.metalFraction = 1;
    this.hasEnoughEnergy = true;
    this.hasEnoughSilicon = true;
    this.hasEnoughMetal = true;
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
