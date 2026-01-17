class NanotechManager extends EffectableEntity {
  constructor() {
    super({ description: 'Manages the nanobot swarm' });
    this.nanobots = 1; // starting nanobot count
    this.siliconSlider = 10; // 0-10
    this.maintenanceSlider = 0; // 0-10
    this.glassSlider = 0; // 0-10
    this.metalSlider = 10; // 0-10
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
    this.maxEnergyAbsolute = 1e6;
    this.energyLimitMode = 'percent';
    this.maxSiliconPercent = 10;
    this.maxSiliconAbsolute = 1e6;
    this.siliconLimitMode = 'percent';
    this.maxMetalPercent = 10;
    this.maxMetalAbsolute = 1e6;
    this.metalLimitMode = 'percent';
    this.uiCache = null; // cache of UI element references for fast updates
    this.uiState = {
      glassMax: 10,
      componentsMax: 10,
      stage1Warning: '',
      stage2Warning: '',
    };
  }

  getExtraNanotechStages() {
    let extraStages = 0;
    this.booleanFlags.forEach((flag) => {
      if (flag === 'stage1_enabled') return;
      if (flag.startsWith('stage') && flag.endsWith('_enabled')) {
        extraStages += 1;
      }
    });
    return extraStages;
  }

  getTravelPreserveCap() {
    const extraStages = this.getExtraNanotechStages();
    return 1e15 * Math.pow(10, extraStages);
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
    const extraStages = this.getExtraNanotechStages();
    const baseRate = 0.0025 * (1 + extraStages);
    const stage2Enabled = this.isBooleanFlagSet('stage2_enabled');
    const siliconAllocation = 10;
    const metalAllocation = stage2Enabled ? 10 : 0;
    const isArtificialWorld = currentPlanetParameters?.classification?.archetype === 'artificial';
    const getEffectiveProductionRate = (resource) => {
      const production = resource?.productionRate || 0;
      return production;  
    };
    const getCombinedProductionRate = (resource, extraResource, useExtra) => {
      const base = getEffectiveProductionRate(resource);
      if (!useExtra) return base;
      return base + getEffectiveProductionRate(extraResource);
    };
    let powerFraction = 1;
    let siliconFraction = 1;
    let metalFraction = 1;
    let siliconProvided = 0;
    let metalProvided = 0;
    this.currentEnergyConsumption = 0;
    this.currentSiliconConsumption = 0;
    this.currentGlassProduction = 0;
    this.currentMetalConsumption = 0;
    this.currentComponentsProduction = 0;
    this.optimalEnergyConsumption = this.nanobots * 1e-12;
    this.optimalSiliconConsumption = this.nanobots * 1e-18 * (siliconAllocation / 10);
    this.optimalMetalConsumption = stage2Enabled
      ? this.nanobots * 1e-18 * (metalAllocation / 10)
      : 0;
    if (typeof resources !== 'undefined') {
      const recyclingEnabled = this.isBooleanFlagSet('nanotechRecycling');

      const siliconRes = resources.colony?.silicon;
      const junkResForSilicon = recyclingEnabled ? resources.surface?.junk : null;
      
      if (siliconRes && accumulatedChanges?.colony) {
        const siliconProduction = getCombinedProductionRate(siliconRes, junkResForSilicon, recyclingEnabled);
        const siliconLimitRate = this.siliconLimitMode === 'absolute'
          ? Math.max(0, this.maxSiliconAbsolute)
          : Math.max(0, (siliconProduction * this.maxSiliconPercent) / 100);
        const needed = this.optimalSiliconConsumption * (deltaTime / 1000);
        const limitedNeed = Math.min(needed, siliconLimitRate * (deltaTime / 1000));
        
        // Try junk first if recycling is enabled
        let usedJunk = 0;
        if (junkResForSilicon && accumulatedChanges?.surface && limitedNeed > 0) {
          const junkAvailable = Math.max(junkResForSilicon.value + (accumulatedChanges.surface.junk || 0), 0);
          usedJunk = Math.min(limitedNeed, junkAvailable);
          if (usedJunk > 0) {
            accumulatedChanges.surface.junk = (accumulatedChanges.surface.junk || 0) - usedJunk;
            junkResForSilicon.modifyRate(-usedJunk / (deltaTime / 1000), 'Nanotech Junk', 'nanotech');
          }
        }
        
        // Use regular silicon for the remainder
        const remainingNeeded = limitedNeed - usedJunk;
        const siliconAvailable = Math.max(siliconRes.value + (accumulatedChanges.colony.silicon || 0), 0);
        const usedSilicon = Math.min(remainingNeeded, siliconAvailable);
        const totalUsed = usedJunk + usedSilicon;

        this.hasEnoughSilicon = limitedNeed >= needed && totalUsed >= needed;
        siliconProvided = totalUsed;
        this.currentSiliconConsumption = deltaTime > 0 ? totalUsed / (deltaTime / 1000) : 0;
        
        if (usedSilicon > 0) {
          accumulatedChanges.colony.silicon = (accumulatedChanges.colony.silicon || 0) - usedSilicon;
          siliconRes.modifyRate(-usedSilicon / (deltaTime / 1000), 'Nanotech Silica', 'nanotech');
        }
        
        siliconFraction = this.hasEnoughSilicon ? 1 : (needed > 0 ? totalUsed / needed : 1);
      } else if (siliconAllocation > 0) {
        siliconFraction = 0;
      }

      if (stage2Enabled) {
        const metalRes = resources.colony?.metal;
        const scrapRes = recyclingEnabled ? resources.surface?.scrapMetal : null;
        
        if (metalRes && accumulatedChanges?.colony) {
          const metalProduction = getCombinedProductionRate(metalRes, scrapRes, recyclingEnabled);
          const metalLimitRate = this.metalLimitMode === 'absolute'
            ? Math.max(0, this.maxMetalAbsolute)
            : Math.max(0, (metalProduction * this.maxMetalPercent) / 100);
          const needed = this.optimalMetalConsumption * (deltaTime / 1000);
          const limitedNeed = Math.min(needed, metalLimitRate * (deltaTime / 1000));
          
          // Try scrap metal first if recycling is enabled
          let usedScrap = 0;
          if (scrapRes && accumulatedChanges?.surface && limitedNeed > 0) {
            const scrapAvailable = Math.max(scrapRes.value + (accumulatedChanges.surface.scrapMetal || 0), 0);
            usedScrap = Math.min(limitedNeed, scrapAvailable);
            if (usedScrap > 0) {
              accumulatedChanges.surface.scrapMetal = (accumulatedChanges.surface.scrapMetal || 0) - usedScrap;
              scrapRes.modifyRate(-usedScrap / (deltaTime / 1000), 'Nanotech Scrap', 'nanotech');
            }
          }
          
          // Use regular metal for the remainder
          const remainingNeeded = limitedNeed - usedScrap;
          const metalAvailable = Math.max(metalRes.value + (accumulatedChanges.colony.metal || 0), 0);
          const usedMetal = Math.min(remainingNeeded, metalAvailable);
          const totalUsed = usedScrap + usedMetal;

          this.hasEnoughMetal = limitedNeed >= needed && totalUsed >= needed;
          metalProvided = totalUsed;
          this.currentMetalConsumption = deltaTime > 0 ? totalUsed / (deltaTime / 1000) : 0;
          
          if (usedMetal > 0) {
            accumulatedChanges.colony.metal = (accumulatedChanges.colony.metal || 0) - usedMetal;
            metalRes.modifyRate(-usedMetal / (deltaTime / 1000), 'Nanotech Metal', 'nanotech');
          }
          
          metalFraction = this.hasEnoughMetal ? 1 : (needed > 0 ? totalUsed / needed : 1);
        } else if (metalAllocation > 0) {
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
      const junkRes = recyclingEnabled ? resources.surface?.junk : null;
      
      if (glassRes && accumulatedChanges?.colony) {
        const glassRate = this.nanobots * 1e-18 * (this.glassSlider / 10);
        const glassAmount = isArtificialWorld
          ? Math.min(glassRate * (deltaTime / 1000), siliconProvided)
          : glassRate * (deltaTime / 1000);
        
        // Produce glass from the remainder (what wasn't covered by junk)
        const actualGlassProduced = glassAmount;
        this.currentGlassProduction = actualGlassProduced / (deltaTime / 1000);
        
        if (actualGlassProduced > 0) {
          accumulatedChanges.colony.glass =
            (accumulatedChanges.colony.glass || 0) + actualGlassProduced;
          glassRes.modifyRate(this.currentGlassProduction, 'Nanotech Glass', 'nanotech');
        }
      }

      const componentsRes = resources.colony?.components;
      if (componentsRes && accumulatedChanges?.colony && stage2Enabled) {
        const componentsRate = this.nanobots * 1e-19 * (this.componentsSlider / 10);
        const componentsAmount = isArtificialWorld
          ? Math.min(componentsRate * (deltaTime / 1000), metalProvided)
          : componentsRate * (deltaTime / 1000);
        this.currentComponentsProduction = deltaTime > 0 ? componentsAmount / (deltaTime / 1000) : 0;
        if (componentsAmount > 0) {
          accumulatedChanges.colony.components =
            (accumulatedChanges.colony.components || 0) + componentsAmount;
          componentsRes.modifyRate(this.currentComponentsProduction, 'Nanotech Components', 'nanotech');
        }
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
      (siliconAllocation / 10) * 0.0015 * this.siliconFraction;
    const metalRate = stage2Enabled
      ? (metalAllocation / 10) * 0.0015 * this.metalFraction
      : 0;
    const penalty =
      (this.maintenanceSlider / 10) * 0.0015 +
      (this.glassSlider / 10) * 0.0015 +
      (stage2Enabled ? (this.maintenance2Slider / 10) * 0.0015 : 0) +
      (stage2Enabled ? (this.componentsSlider / 10) * 0.0015 : 0);

    // Apply growth multiplier from effects (e.g., garbage hazard)
    const growthMultiplier = this.getEffectiveGrowthMultiplier();
    const effectiveRate = (baseRate * this.powerFraction + siliconRate + metalRate - penalty) * growthMultiplier;
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
    const travelCap = this.getTravelPreserveCap();
    const capped = Math.min(Number(this.nanobots), travelCap);
    this.nanobots = Math.max(1, capped) || travelCap;
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
          name: 'Nanocolony',
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
          name: 'Nanocolony',
        };
        addEffect(effect);
      }
    });
  }

  updateUI() {
    if (typeof document === 'undefined') return;
    if (nanotechManager && nanotechManager !== this) return;
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
	                Energy allocation <span class="info-tooltip-icon" id="nanotech-energy-tooltip"></span>
	              </div>
	              <div class="nanotech-energy-limit">
	                <input type="text" id="nanotech-energy-limit" value="${this.maxEnergyPercent}">
	                <select id="nanotech-energy-limit-mode">
	                  <option value="percent" selected>percentage of power</option>
	                  <option value="absolute">absolute</option>
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
          <p class="nanotech-hint">The swarm can consume power to grow. Each nanobot needs 1pW. All other consumptions happens after buildings and projects. When travelling, HOPE can hide <span id="nanotech-travel-cap">${formatNumber(this.getTravelPreserveCap())}</span> nanobots from the Dead Hand Protocol <span class="info-tooltip-icon" id="nanotech-travel-tooltip"></span>.</p>
          <div class="nanotech-stage">
            <div class="nanotech-stage-header">
              <h4>Stage I <span id="nanotech-stage1-warning" class="nanotech-stage-warning"></span></h4>
            </div>
            <div class="nanotech-slider-grid">
              <div class="nanotech-slider-card">
                <div class="nanotech-allocation-header">
                  <span class="allocation-title">
                    Silica allocation <span class="info-tooltip-icon" id="nanotech-silicon-tooltip"></span>
                  </span>
                </div>
                <div class="nanotech-energy-limit">
                  <input type="text" id="nanotech-silicon-limit" value="${this.maxSiliconPercent}">
                  <select id="nanotech-silicon-limit-mode">
                    <option value="percent" selected>percentage of production</option>
                    <option value="absolute">absolute</option>
                  </select>
                </div>
                <div class="nanotech-energy-stats">
                  <div class="energy-stat">
                    <span class="energy-label">Growth boost</span>
                    <span class="energy-value" id="nanotech-silicon-impact">+0.00%</span>
                  </div>
                  <div class="energy-stat">
                    <span class="energy-label">Draw</span>
                    <span class="energy-value" id="nanotech-silicon-rate">0 ton/s</span>
                  </div>
                </div>
                <p class="slider-description">Consumes silica to boost growth.</p>
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
                    <div class="tick-marks" id="nanotech-glass-ticks">${Array(11).fill('<span></span>').join('')}</div>
                  </div>
                </div>
                <p class="slider-description">Diverts growth to fabricate glass.</p>
              </div>
            </div>
          </div>
          <div class="nanotech-stage" id="nanotech-stage-2">
            <div class="nanotech-stage-header">
              <h4>Stage II <span id="nanotech-stage2-warning" class="nanotech-stage-warning"></span></h4>
            </div>
            <div class="nanotech-slider-grid">
              <div class="nanotech-slider-card">
                <div class="nanotech-allocation-header">
                  <span class="allocation-title">
                    Metal allocation <span class="info-tooltip-icon" id="nanotech-metal-tooltip"></span>
                  </span>
                </div>
                <div class="nanotech-energy-limit">
                  <input type="text" id="nanotech-metal-limit" value="${this.maxMetalPercent}">
                  <select id="nanotech-metal-limit-mode">
                    <option value="percent" selected>percentage of production</option>
                    <option value="absolute">absolute</option>
                  </select>
                </div>
                <div class="nanotech-energy-stats">
                  <div class="energy-stat">
                    <span class="energy-label">Growth boost</span>
                    <span class="energy-value" id="nanotech-metal-impact">+0.00%</span>
                  </div>
                  <div class="energy-stat">
                    <span class="energy-label">Draw</span>
                    <span class="energy-value" id="nanotech-metal-rate">0 ton/s</span>
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
                    <div class="tick-marks" id="nanotech-components-ticks">${Array(11).fill('<span></span>').join('')}</div>
                  </div>
                </div>
                <p class="slider-description">Diverts growth to fabricate components.</p>
              </div>
            </div>
          </div>
        </div>`;
      // Cache references once the container is built
      this.cacheUIRefs(container);
      this.bindUIHandlers();
    }
    if (!container) return;
    // Ensure cache is aligned with current container
    const cacheRefreshed = this.ensureUICache(container);
    if (cacheRefreshed) {
      this.bindUIHandlers();
    }
    container.style.display = this.enabled ? '' : 'none';
    const max = this.getMaxNanobots();
    const C = this.uiCache || {};
    const stage2Active = this.isBooleanFlagSet('stage2_enabled');
    const siliconAllocation = 10;
    const metalAllocation = stage2Active ? 10 : 0;
    const hasSand = this.hasSandDeposits();
    const oreDeposits = currentPlanetParameters && currentPlanetParameters.resources
      ? currentPlanetParameters.resources.underground?.ore?.maxDeposits || 0
      : 0;
    const hasOre = oreDeposits > 0;

    const glassMax = hasSand ? 10 : siliconAllocation;
    if (this.glassSlider > glassMax) {
      this.glassSlider = glassMax;
    }
    if (C.glSlider && Number(C.glSlider.max) !== glassMax) {
      C.glSlider.max = glassMax;
      this.updateTickMarks(C.glassTicks, glassMax);
      this.uiState.glassMax = glassMax;
    }

    const componentsMax = hasOre ? 10 : metalAllocation;
    if (this.componentsSlider > componentsMax) {
      this.componentsSlider = componentsMax;
    }
    if (C.componentsSlider && Number(C.componentsSlider.max) !== componentsMax) {
      C.componentsSlider.max = componentsMax;
      this.updateTickMarks(C.componentsTicks, componentsMax);
      this.uiState.componentsMax = componentsMax;
    }

    const stage1Warning = hasSand ? '' : '⚠️ No sand deposits; glass capped to silica.';
    if (C.stage1WarningEl && C.stage1WarningEl.textContent !== stage1Warning) {
      C.stage1WarningEl.textContent = stage1Warning;
      this.uiState.stage1Warning = stage1Warning;
    }

    const stage2Warning = stage2Active && !hasOre
      ? '⚠️ No ore deposits; components capped to metal.'
      : '';
    if (C.stage2WarningEl && C.stage2WarningEl.textContent !== stage2Warning) {
      C.stage2WarningEl.textContent = stage2Warning;
      this.uiState.stage2Warning = stage2Warning;
    }
    if (C.countEl) {
      C.countEl.textContent = formatNumber(this.nanobots, false, 2);
      C.countEl.style.color = this.nanobots >= max ? 'green' : '';
    }
    if (C.capEl) {
      C.capEl.textContent = formatNumber(max, false, 2);
      C.capEl.style.color = this.nanobots >= max ? 'green' : '';
    }
    if (C.travelCapEl) {
      C.travelCapEl.textContent = formatNumber(this.getTravelPreserveCap());
    }
    if (C.growthEl) {
      const extraStages = this.getExtraNanotechStages();
      const baseOpt = 0.0025 * (1 + extraStages);
      const siliconOpt = (siliconAllocation / 10) * 0.0015;
      const metalOpt = stage2Active ? (metalAllocation / 10) * 0.0015 : 0;
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
      const growthMultiplier = this.getEffectiveGrowthMultiplier();
      const actualRate = effectiveRate * growthMultiplier;
      const rawLabel = `${(effectiveRate * 100).toFixed(3)}%`;
      const actualLabel = `${(actualRate * 100).toFixed(3)}%`;
      C.growthEl.textContent = Math.abs(growthMultiplier - 1) > 1e-6
        ? `${rawLabel} -> ${actualLabel}`
        : actualLabel;
      C.growthEl.style.color = (!this.hasEnoughEnergy || !this.hasEnoughSilicon || !this.hasEnoughMetal) ? 'orange' : '';
      this.effectiveGrowthRate = actualRate;
    }
    if (C.mSlider && document.activeElement !== C.mSlider) C.mSlider.value = this.maintenanceSlider;
    if (C.glSlider && document.activeElement !== C.glSlider) C.glSlider.value = this.glassSlider;
    if (C.maintenance2Slider && document.activeElement !== C.maintenance2Slider) {
      C.maintenance2Slider.value = this.maintenance2Slider;
    }
    if (C.componentsSlider && document.activeElement !== C.componentsSlider) {
      C.componentsSlider.value = this.componentsSlider;
    }
    if (C.eMode) C.eMode.value = this.energyLimitMode;
    if (C.eLimit && document.activeElement !== C.eLimit) {
      if (this.energyLimitMode === 'absolute') {
        const watts = Math.max(0, this.maxEnergyAbsolute);
        C.eLimit.dataset.energyLimit = String(watts);
        C.eLimit.value = watts >= 1e6 ? formatNumber(watts, true, 3) : String(watts);
        C.eLimit.removeAttribute('max');
      } else {
        const pct = Math.max(0, Math.min(100, this.maxEnergyPercent));
        this.maxEnergyPercent = pct;
        C.eLimit.dataset.energyLimit = String(pct);
        C.eLimit.value = String(pct);
        C.eLimit.max = 100;
      }
    }
    if (C.sMode) C.sMode.value = this.siliconLimitMode;
    if (C.sLimit && document.activeElement !== C.sLimit) {
      if (this.siliconLimitMode === 'absolute') {
        const tons = Math.max(0, this.maxSiliconAbsolute);
        C.sLimit.dataset.siliconLimit = String(tons);
        C.sLimit.value = tons >= 1e6 ? formatNumber(tons, true, 3) : String(tons);
        C.sLimit.removeAttribute('max');
      } else {
        const pct = Math.max(0, Math.min(100, this.maxSiliconPercent));
        this.maxSiliconPercent = pct;
        C.sLimit.dataset.siliconLimit = String(pct);
        C.sLimit.value = String(pct);
        C.sLimit.max = 100;
      }
    }
    if (C.metalMode) C.metalMode.value = this.metalLimitMode;
    if (C.metalLimit && document.activeElement !== C.metalLimit) {
      if (this.metalLimitMode === 'absolute') {
        const tons = Math.max(0, this.maxMetalAbsolute);
        C.metalLimit.dataset.metalLimit = String(tons);
        C.metalLimit.value = tons >= 1e6 ? formatNumber(tons, true, 3) : String(tons);
        C.metalLimit.removeAttribute('max');
      } else {
        const pct = Math.max(0, Math.min(100, this.maxMetalPercent));
        this.maxMetalPercent = pct;
        C.metalLimit.dataset.metalLimit = String(pct);
        C.metalLimit.value = String(pct);
        C.metalLimit.max = 100;
      }
    }

    if (C.growthImpactEl) {
      const extraStages = this.getExtraNanotechStages();
      const optimal = 0.25 * (1 + extraStages);
      const effective = optimal * this.powerFraction;
      C.growthImpactEl.textContent = `+${effective.toFixed(3)}%`;
      C.growthImpactEl.style.color = !this.hasEnoughEnergy ? 'orange' : '';
    }
    if (C.siliconImpactEl) {
      const optimal = (siliconAllocation / 10) * 0.15;
      const effective = optimal * this.siliconFraction;
      C.siliconImpactEl.textContent = `+${effective.toFixed(3)}%`;
      C.siliconImpactEl.style.color = !this.hasEnoughSilicon ? 'orange' : '';
    }
    if (C.metalImpactEl) {
      const optimal = stage2Active ? (metalAllocation / 10) * 0.15 : 0;
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

  hasSandDeposits() {
    const quarryHasSand = buildings?.sandQuarry?.hasSandAvailable?.();
    const attrHasSand = currentPlanetParameters?.specialAttributes?.hasSand;
    return (quarryHasSand ?? attrHasSand) !== false;
  }

  bindUIHandlers() {
    const C = this.uiCache || {};
    if (C.mSlider?.dataset?.nanotechBound !== 'maintenance') {
      C.mSlider.addEventListener('input', (e) => {
        nanotechManager.maintenanceSlider = parseInt(e.target.value);
        nanotechManager.updateUI();
      });
      C.mSlider.dataset.nanotechBound = 'maintenance';
    }
    if (C.glSlider?.dataset?.nanotechBound !== 'glass') {
      C.glSlider.addEventListener('input', (e) => {
        nanotechManager.glassSlider = parseInt(e.target.value);
        nanotechManager.updateUI();
      });
      C.glSlider.dataset.nanotechBound = 'glass';
    }
    if (C.maintenance2Slider?.dataset?.nanotechBound !== 'maintenance2') {
      C.maintenance2Slider.addEventListener('input', (e) => {
        nanotechManager.maintenance2Slider = parseInt(e.target.value);
        nanotechManager.updateUI();
      });
      C.maintenance2Slider.dataset.nanotechBound = 'maintenance2';
    }
    if (C.componentsSlider?.dataset?.nanotechBound !== 'components') {
      C.componentsSlider.addEventListener('input', (e) => {
        nanotechManager.componentsSlider = parseInt(e.target.value);
        nanotechManager.updateUI();
      });
      C.componentsSlider.dataset.nanotechBound = 'components';
    }
    if (C.eLimit?.dataset?.nanotechBound !== 'energyLimit') {
      wireStringNumberInput(C.eLimit, {
        datasetKey: 'energyLimit',
        parseValue: (value) => {
          const parsed = parseFlexibleNumber(value);
          const numeric = Number.isFinite(parsed) ? parsed : 0;
          if (nanotechManager.energyLimitMode === 'absolute') return Math.max(0, numeric);
          return Math.max(0, Math.min(100, numeric));
        },
        formatValue: (parsed) => {
          if (nanotechManager.energyLimitMode === 'absolute') {
            return parsed >= 1e6 ? formatNumber(parsed, true, 3) : String(parsed);
          }
          return String(parsed);
        },
        onValue: (parsed) => {
          if (nanotechManager.energyLimitMode === 'absolute') {
            nanotechManager.maxEnergyAbsolute = parsed;
          } else {
            nanotechManager.maxEnergyPercent = parsed;
          }
          nanotechManager.updateUI();
        },
      });
      C.eLimit.dataset.nanotechBound = 'energyLimit';
    }
    if (C.eMode?.dataset?.nanotechBound !== 'energyMode') {
      C.eMode.addEventListener('change', (e) => {
        nanotechManager.energyLimitMode = e.target.value;
        if (nanotechManager.energyLimitMode === 'absolute' && !(nanotechManager.maxEnergyAbsolute > 0)) {
          nanotechManager.maxEnergyAbsolute = 1e6;
        }
        nanotechManager.updateUI();
      });
      C.eMode.dataset.nanotechBound = 'energyMode';
    }
    if (C.sLimit?.dataset?.nanotechBound !== 'siliconLimit') {
      wireStringNumberInput(C.sLimit, {
        datasetKey: 'siliconLimit',
        parseValue: (value) => {
          const numeric = parseFlexibleNumber(value) || 0;
          if (nanotechManager.siliconLimitMode === 'absolute') return Math.max(0, numeric);
          return Math.max(0, Math.min(100, numeric));
        },
        formatValue: (parsed) => {
          if (nanotechManager.siliconLimitMode === 'absolute') {
            return parsed >= 1e6 ? formatNumber(parsed, true, 3) : String(parsed);
          }
          return String(parsed);
        },
        onValue: (parsed) => {
          if (nanotechManager.siliconLimitMode === 'absolute') {
            nanotechManager.maxSiliconAbsolute = parsed;
          } else {
            nanotechManager.maxSiliconPercent = parsed;
          }
          nanotechManager.updateUI();
        },
      });
      C.sLimit.dataset.nanotechBound = 'siliconLimit';
    }
    if (C.sMode?.dataset?.nanotechBound !== 'siliconMode') {
      C.sMode.addEventListener('change', (e) => {
        nanotechManager.siliconLimitMode = e.target.value;
        if (nanotechManager.siliconLimitMode === 'absolute' && !(nanotechManager.maxSiliconAbsolute > 0)) {
          nanotechManager.maxSiliconAbsolute = 1e6;
        }
        nanotechManager.updateUI();
      });
      C.sMode.dataset.nanotechBound = 'siliconMode';
    }
    if (C.metalLimit?.dataset?.nanotechBound !== 'metalLimit') {
      wireStringNumberInput(C.metalLimit, {
        datasetKey: 'metalLimit',
        parseValue: (value) => {
          const numeric = parseFlexibleNumber(value) || 0;
          if (nanotechManager.metalLimitMode === 'absolute') return Math.max(0, numeric);
          return Math.max(0, Math.min(100, numeric));
        },
        formatValue: (parsed) => {
          if (nanotechManager.metalLimitMode === 'absolute') {
            return parsed >= 1e6 ? formatNumber(parsed, true, 3) : String(parsed);
          }
          return String(parsed);
        },
        onValue: (parsed) => {
          if (nanotechManager.metalLimitMode === 'absolute') {
            nanotechManager.maxMetalAbsolute = parsed;
          } else {
            nanotechManager.maxMetalPercent = parsed;
          }
          nanotechManager.updateUI();
        },
      });
      C.metalLimit.dataset.nanotechBound = 'metalLimit';
    }
    if (C.metalMode?.dataset?.nanotechBound !== 'metalMode') {
      C.metalMode.addEventListener('change', (e) => {
        nanotechManager.metalLimitMode = e.target.value;
        if (nanotechManager.metalLimitMode === 'absolute' && !(nanotechManager.maxMetalAbsolute > 0)) {
          nanotechManager.maxMetalAbsolute = 1e6;
        }
        nanotechManager.updateUI();
      });
      C.metalMode.dataset.nanotechBound = 'metalMode';
    }
    if (C.energyTooltipIcon?.dataset?.nanotechBound !== 'energyTooltip') {
      attachDynamicInfoTooltip(
        C.energyTooltipIcon,
        'Percentage of power: Maximum percentage of total energy production the swarm may consume per second.\nAbsolute: Fixed energy limit in watts the swarm may consume per second. Accepts scientific notation and suffixes (e.g., 1e3, 2.5k, 1M).'
      );
      C.energyTooltipIcon.dataset.nanotechBound = 'energyTooltip';
    }
    if (C.travelTooltipIcon?.dataset?.nanotechBound !== 'travelTooltip') {
      attachDynamicInfoTooltip(
        C.travelTooltipIcon,
        'Each nanocolony stage after Stage I multiplies the preserved amount by 10.'
      );
      C.travelTooltipIcon.dataset.nanotechBound = 'travelTooltip';
    }
    if (C.siliconTooltipIcon?.dataset?.nanotechBound !== 'siliconTooltip') {
      attachDynamicInfoTooltip(
        C.siliconTooltipIcon,
        'Percentage of silica production: maximum share of silicon production the swarm may consume per second.\nAbsolute: fixed silica limit in tons per second. Accepts scientific notation and suffixes (e.g., 1e3, 2.5k, 1M).'
      );
      C.siliconTooltipIcon.dataset.nanotechBound = 'siliconTooltip';
    }
    if (C.metalTooltipIcon?.dataset?.nanotechBound !== 'metalTooltip') {
      attachDynamicInfoTooltip(
        C.metalTooltipIcon,
        'Percentage of metal production: maximum share of metal production the swarm may consume per second.\nAbsolute: fixed metal limit in tons per second. Accepts scientific notation and suffixes (e.g., 1e3, 2.5k, 1M).'
      );
      C.metalTooltipIcon.dataset.nanotechBound = 'metalTooltip';
    }
  }

  cacheUIRefs(container) {
    // Cache all frequently accessed DOM nodes under the Nanotech card
    const qs = (selector) => container.querySelector(selector);
    this.uiCache = {
      container,
      countEl: qs('#nanobot-count'),
      capEl: qs('#nanobot-cap'),
      growthEl: qs('#nanobot-growth-rate'),
      mSlider: qs('#nanotech-maintenance-slider'),
      glSlider: qs('#nanotech-glass-slider'),
      maintenance2Slider: qs('#nanotech-maintenance2-slider'),
      componentsSlider: qs('#nanotech-components-slider'),
      glassTicks: qs('#nanotech-glass-ticks'),
      componentsTicks: qs('#nanotech-components-ticks'),
      eLimit: qs('#nanotech-energy-limit'),
      eMode: qs('#nanotech-energy-limit-mode'),
      sLimit: qs('#nanotech-silicon-limit'),
      sMode: qs('#nanotech-silicon-limit-mode'),
      metalLimit: qs('#nanotech-metal-limit'),
      metalMode: qs('#nanotech-metal-limit-mode'),
      energyTooltipIcon: qs('#nanotech-energy-tooltip'),
      travelTooltipIcon: qs('#nanotech-travel-tooltip'),
      siliconTooltipIcon: qs('#nanotech-silicon-tooltip'),
      metalTooltipIcon: qs('#nanotech-metal-tooltip'),
      growthImpactEl: qs('#nanotech-growth-impact'),
      siliconImpactEl: qs('#nanotech-silicon-impact'),
      metalImpactEl: qs('#nanotech-metal-impact'),
      maintenanceImpactEl: qs('#nanotech-maintenance-impact'),
      maintenance2ImpactEl: qs('#nanotech-maintenance2-impact'),
      glassImpactEl: qs('#nanotech-glass-impact'),
      componentsImpactEl: qs('#nanotech-components-impact'),
      energyRateEl: qs('#nanotech-growth-energy'),
      siliconRateEl: qs('#nanotech-silicon-rate'),
      maintenanceRateEl: qs('#nanotech-maintenance-rate'),
      maintenance2RateEl: qs('#nanotech-maintenance2-rate'),
      glassRateEl: qs('#nanotech-glass-rate'),
      metalRateEl: qs('#nanotech-metal-rate'),
      componentsRateEl: qs('#nanotech-components-rate'),
      stage2Container: qs('#nanotech-stage-2'),
      stage1WarningEl: qs('#nanotech-stage1-warning'),
      stage2WarningEl: qs('#nanotech-stage2-warning'),
      travelCapEl: qs('#nanotech-travel-cap'),
    };
  }

  ensureUICache(container) {
    const cacheNodes = [
      this.uiCache?.countEl,
      this.uiCache?.growthEl,
      this.uiCache?.siliconImpactEl,
      this.uiCache?.siliconRateEl,
      this.uiCache?.stage1WarningEl,
      this.uiCache?.stage2WarningEl,
      this.uiCache?.travelCapEl,
    ];
    const needsRefresh = !this.uiCache ||
      this.uiCache.container !== container ||
      cacheNodes.some((node) => !container.contains(node));
    if (needsRefresh) {
      this.cacheUIRefs(container);
      return true;
    }
    return false;
  }

  updateTickMarks(ticksElement, max) {
    if (!ticksElement) return;
    const desiredCount = Math.max(0, Math.floor(max)) + 1;
    if (ticksElement.children.length === desiredCount) return;
    ticksElement.innerHTML = Array(desiredCount).fill('<span></span>').join('');
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
      maxSiliconPercent: this.maxSiliconPercent,
      maxSiliconAbsolute: this.maxSiliconAbsolute,
      siliconLimitMode: this.siliconLimitMode,
      maxMetalPercent: this.maxMetalPercent,
      maxMetalAbsolute: this.maxMetalAbsolute,
      metalLimitMode: this.metalLimitMode,
    };
  }

  loadState(state) {
    if (!state) return;
    this.nanobots = state.nanobots || 1;
    this.siliconSlider = 10;
    this.maintenanceSlider = state.maintenanceSlider || 0;
    this.glassSlider = state.glassSlider || 0;
    this.metalSlider = 10;
    this.maintenance2Slider = state.maintenance2Slider || 0;
    this.componentsSlider = state.componentsSlider || 0;
    this.maxEnergyPercent = state.maxEnergyPercent ?? 10;
    this.maxEnergyAbsolute = state.maxEnergyAbsolute ?? 1e6;
    this.energyLimitMode = state.energyLimitMode || 'percent';
    this.maxSiliconPercent = state.maxSiliconPercent ?? 10;
    this.maxSiliconAbsolute = state.maxSiliconAbsolute ?? 1e6;
    this.siliconLimitMode = state.siliconLimitMode || 'percent';
    this.maxMetalPercent = state.maxMetalPercent ?? 10;
    this.maxMetalAbsolute = state.maxMetalAbsolute ?? 1e6;
    this.metalLimitMode = state.metalLimitMode || 'percent';
    const max = this.getMaxNanobots();
    this.nanobots = Math.max(1, Math.min(this.nanobots, max));
    this.reapplyEffects();
    this.updateUI();
  }

  reset() {
    this.nanobots = 1;
    this.siliconSlider = 10;
    this.maintenanceSlider = 0;
    this.glassSlider = 0;
    this.metalSlider = 10;
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
    this.maxEnergyAbsolute = 1e6;
    this.energyLimitMode = 'percent';
    this.maxSiliconPercent = 10;
    this.maxSiliconAbsolute = 1e6;
    this.siliconLimitMode = 'percent';
    this.maxMetalPercent = 10;
    this.maxMetalAbsolute = 1e6;
    this.metalLimitMode = 'percent';
    this.updateUI();
  }

  reapplyEffects() {
    this.applyMaintenanceEffects();
  }

  getEffectiveGrowthMultiplier() {
    let multiplier = 1;
    this.activeEffects.forEach((effect) => {
      if (effect.type === 'nanoColonyGrowthMultiplier') {
        multiplier *= effect.value;
      }
    });
    return multiplier;
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { NanotechManager };
}
