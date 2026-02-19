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
    this.maintenance3Slider = 0; // 0-10
    this.electronicsSlider = 0; // 0-10
    this.currentEnergyConsumption = 0;
    this.currentSiliconConsumption = 0;
    this.currentGlassProduction = 0;
    this.currentMetalConsumption = 0;
    this.currentComponentsProduction = 0;
    this.currentBiomassConsumption = 0;
    this.currentElectronicsProduction = 0;
    this.currentMaintenanceReduction = 0;
    this.currentMaintenance2Reduction = 0;
    this.currentMaintenance3Reduction = 0;
    this.optimalEnergyConsumption = 0;
    this.optimalSiliconConsumption = 0;
    this.optimalMetalConsumption = 0;
    this.optimalBiomassConsumption = 0;
    this.enabled = false;
    this.powerFraction = 1;
    this.siliconFraction = 1;
    this.metalFraction = 1;
    this.biomassFraction = 1;
    this.hasEnoughEnergy = true;
    this.hasEnoughSilicon = true;
    this.hasEnoughMetal = true;
    this.hasEnoughBiomass = true;
    this.effectiveGrowthRate = 0;
    this.onlyScrap = false;
    this.onlyJunk = false;
    this.onlyTrash = false;
    this.uncappedJunk = false;
    this.uncappedScrap = false;
    this.uncappedTrash = false;
    this.maxEnergyPercent = 10;
    this.maxEnergyAbsolute = 1e6;
    this.energyLimitMode = 'percent';
    this.maxSiliconPercent = 10;
    this.maxSiliconAbsolute = 1e6;
    this.siliconLimitMode = 'percent';
    this.maxMetalPercent = 10;
    this.maxMetalAbsolute = 1e6;
    this.metalLimitMode = 'percent';
    this.maxBiomassPercent = 10;
    this.maxBiomassAbsolute = 1e6;
    this.biomassLimitMode = 'percent';
    this.uiCache = null; // cache of UI element references for fast updates
    this.uiState = {
      glassMax: 10,
      componentsMax: 10,
      stage1Warning: '',
      stage2Warning: '',
      stage3Warning: '',
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

  isPulsarHazardActive() {
    if (!hazardManager || !hazardManager.parameters || !hazardManager.pulsarHazard) {
      return false;
    }
    const pulsar = hazardManager.parameters.pulsar;
    if (!pulsar) {
      return false;
    }
    return !hazardManager.pulsarHazard.isCleared(terraforming, pulsar);
  }

  getPulsarNanobotCapMultiplier() {
    if (!this.isPulsarHazardActive()) {
      return 1;
    }

    const pulsar = hazardManager.parameters.pulsar;
    const initialLand = Math.max(terraforming.initialLand || 0, 0);
    if (initialLand <= 0) {
      return 0;
    }

    const undergroundExpansion = projectManager?.projects?.undergroundExpansion;
    if (!undergroundExpansion) {
      return 0;
    }

    const completions = Math.max(undergroundExpansion.repeatCount || 0, 0);
    const undergroundMultiplier = Math.min(1, completions / initialLand);

    let distanceScaledSkyMultiplier = 0;
    if (hazardManager.pulsarHazard && hazardManager.pulsarHazard.getHazardStrength) {
      const hazardStrength = hazardManager.pulsarHazard.getHazardStrength(terraforming, pulsar);
      distanceScaledSkyMultiplier = Math.max(0, Math.min(1, 1 - hazardStrength));
    }

    return Math.max(undergroundMultiplier, distanceScaledSkyMultiplier);
  }

  getMaxNanobots() {
    if (!resources.surface?.land) {
      return 1e40;
    }
    const baseCap = resources.surface.land.value * 10000 * 1e19;
    return baseCap * this.getPulsarNanobotCapMultiplier();
  }

  produceResources(deltaTime, accumulatedChanges) {
    if(deltaTime == 0){
      return;
    }
    if (!this.enabled) return;
    const extraStages = this.getExtraNanotechStages();
    const baseRate = 0.0025 * Math.pow(2, extraStages);
    const stage2Enabled = this.isBooleanFlagSet('stage2_enabled');
    const stage3Enabled = this.isBooleanFlagSet('stage3_enabled');
    const siliconAllocation = 10;
    const metalAllocation = stage2Enabled ? 10 : 0;
    const biomassAllocation = stage3Enabled ? 10 : 0;
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
    const getEstimatedLifeBiomassProductionRate = () => {
      const seconds = deltaTime / 1000;
      if (seconds <= 0) {
        return 0;
      }
      const plan = lifeManager.buildAtmosphericPlan(deltaTime, accumulatedChanges);
      let growthTotal = 0;
      plan.zones.forEach(zoneName => {
        const zoneGrowth = plan.zoneGrowthByZone[zoneName] || 0;
        if (zoneGrowth > 0) {
          growthTotal += zoneGrowth;
        }
      });
      return growthTotal / seconds;
    };
    let powerFraction = 1;
    let siliconFraction = 1;
    let metalFraction = 1;
    let biomassFraction = 1;
    let siliconProvided = 0;
    let metalProvided = 0;
    this.currentEnergyConsumption = 0;
    this.currentSiliconConsumption = 0;
    this.currentGlassProduction = 0;
    this.currentMetalConsumption = 0;
    this.currentComponentsProduction = 0;
    this.currentBiomassConsumption = 0;
    this.currentElectronicsProduction = 0;
    this.optimalEnergyConsumption = this.nanobots * 1e-12;
    this.optimalSiliconConsumption = this.nanobots * 1e-18 * (siliconAllocation / 10);
    this.optimalMetalConsumption = stage2Enabled
      ? this.nanobots * 1e-18 * (metalAllocation / 10)
      : 0;
    this.optimalBiomassConsumption = stage3Enabled
      ? this.nanobots * 1e-18 * (biomassAllocation / 10)
      : 0;
    if (typeof resources !== 'undefined') {
      const recyclingEnabled = this.isBooleanFlagSet('nanotechRecycling');
      const onlyJunk = recyclingEnabled && this.onlyJunk;
      const onlyScrap = recyclingEnabled && this.onlyScrap;
      const uncappedJunk = recyclingEnabled && this.uncappedJunk;
      const uncappedScrap = recyclingEnabled && this.uncappedScrap;

      const siliconRes = resources.colony?.silicon;
      const junkResForSilicon = recyclingEnabled ? resources.surface?.junk : null;
      
      if (siliconRes && accumulatedChanges?.colony) {
        const siliconProduction = recyclingEnabled
          ? (uncappedJunk
            ? (onlyJunk ? 0 : getEffectiveProductionRate(siliconRes))
            : (onlyJunk ? getEffectiveProductionRate(junkResForSilicon) : getCombinedProductionRate(siliconRes, junkResForSilicon, true)))
          : getEffectiveProductionRate(siliconRes);
        const siliconLimitRate = this.siliconLimitMode === 'absolute'
          ? Math.max(0, this.maxSiliconAbsolute)
          : (this.siliconLimitMode === 'uncapped'
            ? Number.POSITIVE_INFINITY
            : Math.max(0, (siliconProduction * this.maxSiliconPercent) / 100));
        const needed = this.optimalSiliconConsumption * (deltaTime / 1000);
        const limitedNeed = Math.min(needed, siliconLimitRate * (deltaTime / 1000));
        
        // Try junk first if recycling is enabled
        let usedJunk = 0;
        const junkNeed = uncappedJunk ? needed : limitedNeed;
        if (junkResForSilicon && accumulatedChanges?.surface && junkNeed > 0) {
          const junkAvailable = Math.max(junkResForSilicon.value + (accumulatedChanges.surface.junk || 0), 0);
          usedJunk = Math.min(junkNeed, junkAvailable);
          if (usedJunk > 0) {
            accumulatedChanges.surface.junk = (accumulatedChanges.surface.junk || 0) - usedJunk;
            junkResForSilicon.modifyRate(-usedJunk / (deltaTime / 1000), 'Nanotech Junk', 'nanotech');
          }
        }
        
        // Use regular silicon for the remainder
        const cappedNeed = uncappedJunk ? needed : limitedNeed;
        const remainingNeeded = cappedNeed - usedJunk;
        const siliconNeeded = uncappedJunk
          ? Math.min(remainingNeeded, siliconLimitRate * (deltaTime / 1000))
          : remainingNeeded;
        const siliconAvailable = Math.max(siliconRes.value + (accumulatedChanges.colony.silicon || 0), 0);
        const usedSilicon = onlyJunk ? 0 : Math.min(siliconNeeded, siliconAvailable);
        const totalUsed = usedJunk + usedSilicon;

        this.hasEnoughSilicon = uncappedJunk
          ? totalUsed >= needed
          : (limitedNeed >= needed && totalUsed >= needed);
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
          const metalProduction = recyclingEnabled
            ? (uncappedScrap
              ? (onlyScrap ? 0 : getEffectiveProductionRate(metalRes))
              : (onlyScrap ? getEffectiveProductionRate(scrapRes) : getCombinedProductionRate(metalRes, scrapRes, true)))
            : getEffectiveProductionRate(metalRes);
          const metalLimitRate = this.metalLimitMode === 'absolute'
            ? Math.max(0, this.maxMetalAbsolute)
            : (this.metalLimitMode === 'uncapped'
              ? Number.POSITIVE_INFINITY
              : Math.max(0, (metalProduction * this.maxMetalPercent) / 100));
          const needed = this.optimalMetalConsumption * (deltaTime / 1000);
          const limitedNeed = Math.min(needed, metalLimitRate * (deltaTime / 1000));
          
          // Try scrap metal first if recycling is enabled
          let usedScrap = 0;
          const scrapNeed = uncappedScrap ? needed : limitedNeed;
          if (scrapRes && accumulatedChanges?.surface && scrapNeed > 0) {
            const scrapAvailable = Math.max(scrapRes.value + (accumulatedChanges.surface.scrapMetal || 0), 0);
            usedScrap = Math.min(scrapNeed, scrapAvailable);
            if (usedScrap > 0) {
              accumulatedChanges.surface.scrapMetal = (accumulatedChanges.surface.scrapMetal || 0) - usedScrap;
              scrapRes.modifyRate(-usedScrap / (deltaTime / 1000), 'Nanotech Scrap', 'nanotech');
            }
          }
          
          // Use regular metal for the remainder
          const cappedNeed = uncappedScrap ? needed : limitedNeed;
          const remainingNeeded = cappedNeed - usedScrap;
          const metalNeeded = uncappedScrap
            ? Math.min(remainingNeeded, metalLimitRate * (deltaTime / 1000))
            : remainingNeeded;
          const metalAvailable = Math.max(metalRes.value + (accumulatedChanges.colony.metal || 0), 0);
          const usedMetal = onlyScrap ? 0 : Math.min(metalNeeded, metalAvailable);
          const totalUsed = usedScrap + usedMetal;

          this.hasEnoughMetal = uncappedScrap
            ? totalUsed >= needed
            : (limitedNeed >= needed && totalUsed >= needed);
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

      if (stage3Enabled) {
        const biomassRes = resources.surface.biomass;
        const trashRes = resources.surface.trash;
        const onlyTrash = recyclingEnabled && this.onlyTrash;
        const uncappedTrash = recyclingEnabled && this.uncappedTrash;
        const estimatedLifeBiomassProduction = this.biomassLimitMode === 'percent' && !onlyTrash
          ? getEstimatedLifeBiomassProductionRate()
          : 0;
        const biomassTotalAvailable = recyclingEnabled
          ? (uncappedTrash
            ? Math.max(biomassRes.value + (accumulatedChanges.surface.biomass || 0), 0)
            : (onlyTrash
              ? Math.max(trashRes.value + (accumulatedChanges.surface.trash || 0), 0)
              : Math.max(
                biomassRes.value + (accumulatedChanges.surface.biomass || 0) +
                trashRes.value + (accumulatedChanges.surface.trash || 0),
                0
              )))
          : Math.max(biomassRes.value + (accumulatedChanges.surface.biomass || 0), 0);
        const biomassBaseProduction = recyclingEnabled
          ? (uncappedTrash
            ? (onlyTrash ? 0 : getEffectiveProductionRate(biomassRes))
            : (onlyTrash ? getEffectiveProductionRate(trashRes) : getCombinedProductionRate(biomassRes, trashRes, true)))
          : getEffectiveProductionRate(biomassRes);
        const biomassProduction = biomassBaseProduction + estimatedLifeBiomassProduction;
        const biomassLimitRate = this.biomassLimitMode === 'absolute'
          ? Math.max(0, this.maxBiomassAbsolute)
          : (this.biomassLimitMode === 'uncapped'
            ? Number.POSITIVE_INFINITY
            : (this.biomassLimitMode === 'percent_total'
              ? Math.max(0, (biomassTotalAvailable * this.maxBiomassPercent) / 100)
              : Math.max(0, (biomassProduction * this.maxBiomassPercent) / 100)));
        const needed = this.optimalBiomassConsumption * (deltaTime / 1000);
        const limitedNeed = Math.min(needed, biomassLimitRate * (deltaTime / 1000));

        let usedTrash = 0;
        const trashNeed = uncappedTrash ? needed : limitedNeed;
        if (recyclingEnabled && trashNeed > 0) {
          const trashAvailable = Math.max(trashRes.value + (accumulatedChanges.surface.trash || 0), 0);
          usedTrash = Math.min(trashNeed, trashAvailable);
          if (usedTrash > 0) {
            accumulatedChanges.surface.trash = (accumulatedChanges.surface.trash || 0) - usedTrash;
            trashRes.modifyRate(-usedTrash / (deltaTime / 1000), 'Nanotech Trash', 'nanotech');
          }
        }

        const cappedNeed = uncappedTrash ? needed : limitedNeed;
        const remainingNeeded = cappedNeed - usedTrash;
        const biomassNeeded = uncappedTrash
          ? Math.min(remainingNeeded, biomassLimitRate * (deltaTime / 1000))
          : remainingNeeded;
        const biomassAvailable = Math.max(biomassRes.value + (accumulatedChanges.surface.biomass || 0), 0);
        const usedBiomass = onlyTrash ? 0 : Math.min(biomassNeeded, biomassAvailable);
        const totalUsed = usedTrash + usedBiomass;

        this.hasEnoughBiomass = uncappedTrash
          ? totalUsed >= needed
          : (limitedNeed >= needed && totalUsed >= needed);
        this.currentBiomassConsumption = deltaTime > 0 ? totalUsed / (deltaTime / 1000) : 0;

        if (usedBiomass > 0) {
          accumulatedChanges.surface.biomass = (accumulatedChanges.surface.biomass || 0) - usedBiomass;
          biomassRes.modifyRate(-usedBiomass / (deltaTime / 1000), 'Nanotech Biomass', 'nanotech');
        }

        biomassFraction = this.hasEnoughBiomass ? 1 : (needed > 0 ? totalUsed / needed : 1);
      } else {
        biomassFraction = 0;
        this.hasEnoughBiomass = true;
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

      const electronicsRes = resources.colony?.electronics;
      if (electronicsRes && accumulatedChanges?.colony && stage3Enabled) {
        const electronicsRate = this.nanobots * 1e-19 * (this.electronicsSlider / 10);
        const biomassConsumed = this.currentBiomassConsumption * (deltaTime / 1000);
        const electronicsAmount = isArtificialWorld
          ? Math.min(electronicsRate * (deltaTime / 1000), biomassConsumed)
          : electronicsRate * (deltaTime / 1000);
        this.currentElectronicsProduction = deltaTime > 0 ? electronicsAmount / (deltaTime / 1000) : 0;
        if (electronicsAmount > 0) {
          accumulatedChanges.colony.electronics =
            (accumulatedChanges.colony.electronics || 0) + electronicsAmount;
          electronicsRes.modifyRate(this.currentElectronicsProduction, 'Nanotech Electronics', 'nanotech');
        }
      }

      const energyRes = resources.colony?.energy;
      if (baseRate > 0 && energyRes && accumulatedChanges?.colony) {
        const productionRate = energyRes.productionRate || 0;
        const allowedPower =
          this.energyLimitMode === 'absolute'
            ? this.maxEnergyAbsolute
            : (this.energyLimitMode === 'uncapped'
              ? Number.POSITIVE_INFINITY
              : (productionRate * this.maxEnergyPercent) / 100);
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
    this.biomassFraction = biomassFraction;
    const siliconRate =
      (siliconAllocation / 10) * 0.0015 * this.siliconFraction;
    const metalRate = stage2Enabled
      ? (metalAllocation / 10) * 0.0015 * this.metalFraction
      : 0;
    const biomassRate = stage3Enabled
      ? (biomassAllocation / 10) * 0.0015 * this.biomassFraction
      : 0;
    const penalty =
      (this.maintenanceSlider / 10) * 0.0015 +
      (this.glassSlider / 10) * 0.0015 +
      (stage2Enabled ? (this.maintenance2Slider / 10) * 0.0015 : 0) +
      (stage2Enabled ? (this.componentsSlider / 10) * 0.0015 : 0) +
      (stage3Enabled ? (this.maintenance3Slider / 10) * 0.0015 : 0) +
      (stage3Enabled ? (this.electronicsSlider / 10) * 0.0015 : 0);

    // Apply growth multiplier from effects (e.g., garbage hazard)
    const growthMultiplier = this.getEffectiveGrowthMultiplier();
    const effectiveRate = (baseRate * this.powerFraction + siliconRate + metalRate + biomassRate - penalty) * growthMultiplier;
    this.effectiveGrowthRate = effectiveRate;
    const max = this.getMaxNanobots();
    if (effectiveRate !== 0 && !isNaN(effectiveRate)) {
      const growthDelta = this.nanobots * effectiveRate * (deltaTime / 1000);
      if (growthDelta > 0) {
        if (this.nanobots < max) {
          this.nanobots = Math.min(max, this.nanobots + growthDelta);
        }
      } else {
        this.nanobots += growthDelta;
      }
    }
    this.nanobots = Math.max(1, this.nanobots);
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
    this.resetControlsForTravel();
  }

  resetControlsForTravel() {
    this.maintenanceSlider = 0;
    this.glassSlider = 0;
    this.maintenance2Slider = 0;
    this.componentsSlider = 0;
    this.maintenance3Slider = 0;
    this.electronicsSlider = 0;
    this.maxEnergyPercent = 10;
    this.maxEnergyAbsolute = 1e6;
    this.energyLimitMode = 'percent';
    this.maxSiliconPercent = 0;
    this.maxSiliconAbsolute = 0;
    this.maxMetalPercent = 0;
    this.maxMetalAbsolute = 0;
    this.maxBiomassPercent = 0;
    this.maxBiomassAbsolute = 0;
    this.currentEnergyConsumption = 0;
    this.currentSiliconConsumption = 0;
    this.currentGlassProduction = 0;
    this.currentMetalConsumption = 0;
    this.currentComponentsProduction = 0;
    this.currentBiomassConsumption = 0;
    this.currentElectronicsProduction = 0;
    this.currentMaintenanceReduction = 0;
    this.currentMaintenance2Reduction = 0;
    this.currentMaintenance3Reduction = 0;
    this.updateUI();
  }

  applyMaintenanceEffects() {
    if (typeof structures === 'undefined' || !structures) return;
    const totals = { metal: 0, glass: 0, water: 0, components: 0, superconductors: 0, electronics: 0 };
    for (const name in structures) {
      const s = structures[name];
      if (!s || !s.maintenanceCost) continue;
      const prod = s.productivity !== undefined ? s.productivity : 1;
      totals.metal += (s.maintenanceCost.metal || 0) * (s.active || 0) * prod;
      totals.glass += (s.maintenanceCost.glass || 0) * (s.active || 0) * prod;
      totals.water += (s.maintenanceCost.water || 0) * (s.active || 0) * prod;
      totals.components += (s.maintenanceCost.components || 0) * (s.active || 0) * prod;
      totals.superconductors += (s.maintenanceCost.superconductors || 0) * (s.active || 0) * prod;
      totals.electronics += (s.maintenanceCost.electronics || 0) * (s.active || 0) * prod;
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

    const stage3Total = totals.electronics;
    let coverage3 = stage3Total > 0 ? (this.nanobots * coveragePerBot) / stage3Total : 0;
    coverage3 = Math.min(coverage3, 0.5);
    const reduction3 = this.isBooleanFlagSet('stage3_enabled')
      ? coverage3 * (this.maintenance3Slider / 10)
      : 0;
    this.currentMaintenance3Reduction = reduction3;
    const mult3 = 1 - reduction3;
    for (const name in structures) {
      const target = colonies && colonies[name] ? 'colony' : 'building';
      const effect = {
        target,
        targetId: name,
        type: 'maintenanceCostMultiplier',
        resourceCategory: 'colony',
        resourceId: 'electronics',
        value: mult3,
        effectId: 'nanotechMaint3_electronics',
        sourceId: 'nanotechMaintenance3',
        name: 'Nanocolony',
      };
      addEffect(effect);
    }
  }

  updateUI() {
    if (typeof document === 'undefined') return;
    if (nanotechManager && nanotechManager !== this) return;
    const nanocolonyContentHost = document.getElementById('nanocolony-colonies-content');
    const controlsSection =
      document.getElementById('colony-controls-section') ||
      document.getElementById('colony-controls-container') ||
      document.getElementById('colony-buildings-buttons');
    const hostContainer = nanocolonyContentHost || controlsSection;
    let container = document.getElementById('nanocolony-container');
    if (container && nanocolonyContentHost && container.parentElement !== nanocolonyContentHost) {
      nanocolonyContentHost.appendChild(container);
    }
    if (!container && hostContainer) {
      container = document.createElement('div');
      container.id = 'nanocolony-container';
      container.classList.add('project-card');
      hostContainer.appendChild(container);
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
              <div class="nanotech-time-to-full">
                <span id="nanobot-time-to-full">Time to full: --</span>
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
	                  <option value="uncapped">uncapped</option>
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
                  <div class="nanotech-recycling-toggles">
                    <label class="nanotech-recycling-toggle" id="nanotech-only-junk-wrapper">
                      <input type="checkbox" id="nanotech-only-junk">
                      <span>Only Junk</span>
                    </label>
                    <label class="nanotech-recycling-toggle" id="nanotech-uncapped-junk-wrapper">
                      <input type="checkbox" id="nanotech-uncapped-junk">
                      <span>Uncapped</span>
                    </label>
                  </div>
                </div>
                <div class="nanotech-energy-limit">
                  <input type="text" id="nanotech-silicon-limit" value="${this.maxSiliconPercent}">
                  <select id="nanotech-silicon-limit-mode">
                    <option value="percent" selected>percentage of production</option>
                    <option value="absolute">absolute</option>
                    <option value="uncapped">uncapped</option>
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
                  <div class="nanotech-recycling-toggles">
                    <label class="nanotech-recycling-toggle" id="nanotech-only-scrap-wrapper">
                      <input type="checkbox" id="nanotech-only-scrap">
                      <span>Only Scrap</span>
                    </label>
                    <label class="nanotech-recycling-toggle" id="nanotech-uncapped-scrap-wrapper">
                      <input type="checkbox" id="nanotech-uncapped-scrap">
                      <span>Uncapped</span>
                    </label>
                  </div>
                </div>
                <div class="nanotech-energy-limit">
                  <input type="text" id="nanotech-metal-limit" value="${this.maxMetalPercent}">
                  <select id="nanotech-metal-limit-mode">
                    <option value="percent" selected>percentage of production</option>
                    <option value="absolute">absolute</option>
                    <option value="uncapped">uncapped</option>
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
          <div class="nanotech-stage" id="nanotech-stage-3">
            <div class="nanotech-stage-header">
              <h4>Stage III <span id="nanotech-stage3-warning" class="nanotech-stage-warning"></span></h4>
            </div>
            <div class="nanotech-slider-grid">
              <div class="nanotech-slider-card">
                <div class="nanotech-allocation-header">
                  <span class="allocation-title">
                    Biomass allocation <span class="info-tooltip-icon" id="nanotech-biomass-tooltip">&#9432;</span>
                  </span>
                  <div class="nanotech-recycling-toggles">
                    <label class="nanotech-recycling-toggle" id="nanotech-only-trash-wrapper">
                      <input type="checkbox" id="nanotech-only-trash">
                      <span>Only Trash</span>
                    </label>
                    <label class="nanotech-recycling-toggle" id="nanotech-uncapped-trash-wrapper">
                      <input type="checkbox" id="nanotech-uncapped-trash">
                      <span>Uncapped</span>
                    </label>
                  </div>
                </div>
                <div class="nanotech-energy-limit">
                  <input type="text" id="nanotech-biomass-limit" value="${this.maxBiomassPercent}">
                  <select id="nanotech-biomass-limit-mode">
                    <option value="percent" selected>percentage of production</option>
                    <option value="percent_total">percentage of total biomass</option>
                    <option value="absolute">absolute</option>
                    <option value="uncapped">uncapped</option>
                  </select>
                </div>
                <div class="nanotech-energy-stats">
                  <div class="energy-stat">
                    <span class="energy-label">Growth boost</span>
                    <span class="energy-value" id="nanotech-biomass-impact">+0.00%</span>
                  </div>
                  <div class="energy-stat">
                    <span class="energy-label">Draw</span>
                    <span class="energy-value" id="nanotech-biomass-rate">0 ton/s</span>
                  </div>
                </div>
                <p class="slider-description">Consumes biomass to boost growth.</p>
              </div>
              <div class="nanotech-slider-card">
                <div class="slider-header">
                  <span class="slider-title">Maintenance III</span>
                  <div class="slider-values">
                    <span id="nanotech-maintenance3-impact">0.00%</span>
                    <span id="nanotech-maintenance3-rate">0%</span>
                  </div>
                </div>
                <div class="slider-control">
                  <div class="slider-container">
                    <input type="range" id="nanotech-maintenance3-slider" class="pretty-slider" min="0" max="10" step="1">
                    <div class="tick-marks">${Array(11).fill('<span></span>').join('')}</div>
                  </div>
                </div>
                <p class="slider-description">Reduces electronics maintenance by up to 50%.</p>
              </div>
              <div class="nanotech-slider-card">
                <div class="slider-header">
                  <span class="slider-title">Electronics Production</span>
                  <div class="slider-values">
                    <span id="nanotech-electronics-impact">0.00%</span>
                    <span id="nanotech-electronics-rate">0 ton/s</span>
                  </div>
                </div>
                <div class="slider-control">
                  <div class="slider-container">
                    <input type="range" id="nanotech-electronics-slider" class="pretty-slider" min="0" max="10" step="1">
                    <div class="tick-marks" id="nanotech-electronics-ticks">${Array(11).fill('<span></span>').join('')}</div>
                  </div>
                </div>
                <p class="slider-description">Diverts growth to fabricate electronics.</p>
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
    const stage3Active = this.isBooleanFlagSet('stage3_enabled');
    const recyclingEnabled = this.isBooleanFlagSet('nanotechRecycling');
    const siliconAllocation = 10;
    const metalAllocation = stage2Active ? 10 : 0;
    const biomassAllocation = stage3Active ? 10 : 0;
    const hasSand = this.hasSandDeposits();
    const oreDeposits = currentPlanetParameters && currentPlanetParameters.resources
      ? currentPlanetParameters.resources.underground?.ore?.maxDeposits || 0
      : 0;
    const hasOre = oreDeposits > 0;
    const isArtificialWorld = currentPlanetParameters?.classification?.archetype === 'artificial';

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
    const stage3Warning = stage3Active && isArtificialWorld
      ? '⚠️ No resources; electronics capped to biomass.'
      : '';
    if (C.stage3WarningEl && C.stage3WarningEl.textContent !== stage3Warning) {
      C.stage3WarningEl.textContent = stage3Warning;
      this.uiState.stage3Warning = stage3Warning;
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
      const baseOpt = 0.0025 * Math.pow(2, extraStages);
      const siliconOpt = (siliconAllocation / 10) * 0.0015;
      const metalOpt = stage2Active ? (metalAllocation / 10) * 0.0015 : 0;
      const biomassOpt = stage3Active ? (biomassAllocation / 10) * 0.0015 : 0;
      const penalty =
        (this.maintenanceSlider / 10) * 0.0015 +
        (this.glassSlider / 10) * 0.0015 +
        (stage2Active ? (this.maintenance2Slider / 10) * 0.0015 : 0) +
        (stage2Active ? (this.componentsSlider / 10) * 0.0015 : 0) +
        (stage3Active ? (this.maintenance3Slider / 10) * 0.0015 : 0) +
        (stage3Active ? (this.electronicsSlider / 10) * 0.0015 : 0);
      const optimalRate = baseOpt + siliconOpt + metalOpt + biomassOpt - penalty;
      const effectiveRate =
        baseOpt * this.powerFraction +
        siliconOpt * this.siliconFraction +
        (stage2Active ? metalOpt * this.metalFraction : 0) +
        (stage3Active ? biomassOpt * this.biomassFraction : 0) -
        penalty;
      const growthMultiplier = this.getEffectiveGrowthMultiplier();
      const actualRate = effectiveRate * growthMultiplier;
      const rawLabel = `${(effectiveRate * 100).toFixed(3)}%`;
      const actualLabel = `${(actualRate * 100).toFixed(3)}%`;
      C.growthEl.textContent = Math.abs(growthMultiplier - 1) > 1e-6
        ? `${rawLabel} -> ${actualLabel}`
        : actualLabel;
      C.growthEl.style.color = (!this.hasEnoughEnergy || !this.hasEnoughSilicon || !this.hasEnoughMetal || !this.hasEnoughBiomass) ? 'orange' : '';
      this.effectiveGrowthRate = actualRate;
      if (C.timeToFullEl) {
        let timeToFullText = '--';
        if (this.nanobots >= max) {
          timeToFullText = 'Full';
        } else if (actualRate > 0 && this.nanobots > 0 && max > this.nanobots) {
          const secondsToFull = Math.log(max / this.nanobots) / actualRate;
          timeToFullText = Number.isFinite(secondsToFull) && secondsToFull >= 0
            ? formatDuration(secondsToFull)
            : '--';
        } else if (actualRate <= 0) {
          timeToFullText = 'Never';
        }
        C.timeToFullEl.textContent = `Time to full: ${timeToFullText}`;
      }
    }
    if (C.mSlider && document.activeElement !== C.mSlider) C.mSlider.value = this.maintenanceSlider;
    if (C.glSlider && document.activeElement !== C.glSlider) C.glSlider.value = this.glassSlider;
    if (C.maintenance2Slider && document.activeElement !== C.maintenance2Slider) {
      C.maintenance2Slider.value = this.maintenance2Slider;
    }
    if (C.componentsSlider && document.activeElement !== C.componentsSlider) {
      C.componentsSlider.value = this.componentsSlider;
    }
    if (C.maintenance3Slider && document.activeElement !== C.maintenance3Slider) {
      C.maintenance3Slider.value = this.maintenance3Slider;
    }
    if (C.electronicsSlider && document.activeElement !== C.electronicsSlider) {
      C.electronicsSlider.value = this.electronicsSlider;
    }
    if (C.eMode) C.eMode.value = this.energyLimitMode;
    if (C.eLimit && document.activeElement !== C.eLimit) {
      if (this.energyLimitMode === 'absolute') {
        const watts = Math.max(0, this.maxEnergyAbsolute);
        C.eLimit.dataset.energyLimit = String(watts);
        C.eLimit.value = watts >= 1e6 ? formatNumber(watts, true, 3) : String(watts);
        C.eLimit.removeAttribute('max');
        C.eLimit.placeholder = '';
        C.eLimit.disabled = false;
      } else if (this.energyLimitMode === 'uncapped') {
        C.eLimit.dataset.energyLimit = '0';
        C.eLimit.value = '';
        C.eLimit.placeholder = 'uncapped';
        C.eLimit.removeAttribute('max');
        C.eLimit.disabled = true;
      } else {
        const pct = Math.max(0, Math.min(100, this.maxEnergyPercent));
        this.maxEnergyPercent = pct;
        C.eLimit.dataset.energyLimit = String(pct);
        C.eLimit.value = String(pct);
        C.eLimit.max = 100;
        C.eLimit.placeholder = '';
        C.eLimit.disabled = false;
      }
    }
    if (C.sMode) C.sMode.value = this.siliconLimitMode;
    if (C.sLimit && document.activeElement !== C.sLimit) {
      if (this.siliconLimitMode === 'absolute') {
        const tons = Math.max(0, this.maxSiliconAbsolute);
        C.sLimit.dataset.siliconLimit = String(tons);
        C.sLimit.value = tons >= 1e6 ? formatNumber(tons, true, 3) : String(tons);
        C.sLimit.removeAttribute('max');
        C.sLimit.placeholder = '';
        C.sLimit.disabled = false;
      } else if (this.siliconLimitMode === 'uncapped') {
        C.sLimit.dataset.siliconLimit = '0';
        C.sLimit.value = '';
        C.sLimit.placeholder = 'uncapped';
        C.sLimit.removeAttribute('max');
        C.sLimit.disabled = true;
      } else {
        const pct = Math.max(0, Math.min(100, this.maxSiliconPercent));
        this.maxSiliconPercent = pct;
        C.sLimit.dataset.siliconLimit = String(pct);
        C.sLimit.value = String(pct);
        C.sLimit.max = 100;
        C.sLimit.placeholder = '';
        C.sLimit.disabled = false;
      }
    }
    if (C.metalMode) C.metalMode.value = this.metalLimitMode;
    if (C.metalLimit && document.activeElement !== C.metalLimit) {
      if (this.metalLimitMode === 'absolute') {
        const tons = Math.max(0, this.maxMetalAbsolute);
        C.metalLimit.dataset.metalLimit = String(tons);
        C.metalLimit.value = tons >= 1e6 ? formatNumber(tons, true, 3) : String(tons);
        C.metalLimit.removeAttribute('max');
        C.metalLimit.placeholder = '';
        C.metalLimit.disabled = false;
      } else if (this.metalLimitMode === 'uncapped') {
        C.metalLimit.dataset.metalLimit = '0';
        C.metalLimit.value = '';
        C.metalLimit.placeholder = 'uncapped';
        C.metalLimit.removeAttribute('max');
        C.metalLimit.disabled = true;
      } else {
        const pct = Math.max(0, Math.min(100, this.maxMetalPercent));
        this.maxMetalPercent = pct;
        C.metalLimit.dataset.metalLimit = String(pct);
        C.metalLimit.value = String(pct);
        C.metalLimit.max = 100;
        C.metalLimit.placeholder = '';
        C.metalLimit.disabled = false;
      }
    }
    if (C.biomassMode) C.biomassMode.value = this.biomassLimitMode;
    if (C.biomassLimit && document.activeElement !== C.biomassLimit) {
      if (this.biomassLimitMode === 'absolute') {
        const tons = Math.max(0, this.maxBiomassAbsolute);
        C.biomassLimit.dataset.biomassLimit = String(tons);
        C.biomassLimit.value = tons >= 1e6 ? formatNumber(tons, true, 3) : String(tons);
        C.biomassLimit.removeAttribute('max');
        C.biomassLimit.placeholder = '';
        C.biomassLimit.disabled = false;
      } else if (this.biomassLimitMode === 'uncapped') {
        C.biomassLimit.dataset.biomassLimit = '0';
        C.biomassLimit.value = '';
        C.biomassLimit.placeholder = 'uncapped';
        C.biomassLimit.removeAttribute('max');
        C.biomassLimit.disabled = true;
      } else {
        const pct = Math.max(0, Math.min(100, this.maxBiomassPercent));
        this.maxBiomassPercent = pct;
        C.biomassLimit.dataset.biomassLimit = String(pct);
        C.biomassLimit.value = String(pct);
        C.biomassLimit.max = 100;
        C.biomassLimit.placeholder = '';
        C.biomassLimit.disabled = false;
      }
    }

    if (C.growthImpactEl) {
      const extraStages = this.getExtraNanotechStages();
      const optimal = 0.25 * Math.pow(2, extraStages);
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
    if (C.biomassImpactEl) {
      const optimal = stage3Active ? (biomassAllocation / 10) * 0.15 : 0;
      const effective = stage3Active ? optimal * this.biomassFraction : 0;
      C.biomassImpactEl.textContent = `+${effective.toFixed(3)}%`;
      C.biomassImpactEl.style.color = !this.hasEnoughBiomass ? 'orange' : '';
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
    if (C.maintenance3ImpactEl) {
      const value = stage3Active ? -(this.maintenance3Slider / 10) * 0.15 : 0;
      C.maintenance3ImpactEl.textContent = `${value.toFixed(3)}%`;
      C.maintenance3ImpactEl.style.color = '';
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
    if (C.electronicsImpactEl) {
      const value = stage3Active ? -(this.electronicsSlider / 10) * 0.15 : 0;
      C.electronicsImpactEl.textContent = `${value.toFixed(3)}%`;
      C.electronicsImpactEl.style.color = '';
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
    if (C.biomassRateEl) {
      const current = stage3Active ? this.currentBiomassConsumption : 0;
      const optimal = stage3Active ? this.optimalBiomassConsumption : 0;
      C.biomassRateEl.textContent = `${formatNumber(current, false, 2, true)} / ${formatNumber(optimal, false, 2, true)} ton/s`;
      C.biomassRateEl.style.color = !this.hasEnoughBiomass ? 'orange' : '';
    }
    if (C.maintenanceRateEl)
      C.maintenanceRateEl.textContent = `-${(this.currentMaintenanceReduction * 100).toFixed(2)}%`;
    if (C.maintenance2RateEl)
      C.maintenance2RateEl.textContent = `-${(this.currentMaintenance2Reduction * 100).toFixed(2)}%`;
    if (C.maintenance3RateEl)
      C.maintenance3RateEl.textContent = `-${(this.currentMaintenance3Reduction * 100).toFixed(2)}%`;
    if (C.glassRateEl)
      C.glassRateEl.textContent = `${formatNumber(this.currentGlassProduction, false, 2, true)} ton/s`;
    if (C.componentsRateEl)
      C.componentsRateEl.textContent = `${formatNumber(stage2Active ? this.currentComponentsProduction : 0, false, 2, true)} ton/s`;
    if (C.electronicsRateEl)
      C.electronicsRateEl.textContent = `${formatNumber(stage3Active ? this.currentElectronicsProduction : 0, false, 2, true)} ton/s`;

    if (C.stage2Container) {
      C.stage2Container.style.display = stage2Active ? '' : 'none';
    }
    if (C.stage3Container) {
      C.stage3Container.style.display = stage3Active ? '' : 'none';
    }
    if (C.onlyScrapWrapper) {
      C.onlyScrapWrapper.style.display = recyclingEnabled ? '' : 'none';
    }
    if (C.onlyScrapToggle) {
      C.onlyScrapToggle.checked = recyclingEnabled ? this.onlyScrap : false;
    }
    if (C.uncappedScrapWrapper) {
      C.uncappedScrapWrapper.style.display = recyclingEnabled ? '' : 'none';
    }
    if (C.uncappedScrapToggle) {
      C.uncappedScrapToggle.checked = recyclingEnabled ? this.uncappedScrap : false;
    }
    if (C.onlyTrashWrapper) {
      C.onlyTrashWrapper.style.display = recyclingEnabled ? '' : 'none';
    }
    if (C.onlyTrashToggle) {
      C.onlyTrashToggle.checked = recyclingEnabled ? this.onlyTrash : false;
    }
    if (C.uncappedTrashWrapper) {
      C.uncappedTrashWrapper.style.display = recyclingEnabled ? '' : 'none';
    }
    if (C.uncappedTrashToggle) {
      C.uncappedTrashToggle.checked = recyclingEnabled ? this.uncappedTrash : false;
    }
    if (C.onlyJunkWrapper) {
      C.onlyJunkWrapper.style.display = recyclingEnabled ? '' : 'none';
    }
    if (C.onlyJunkToggle) {
      C.onlyJunkToggle.checked = recyclingEnabled ? this.onlyJunk : false;
    }
    if (C.uncappedJunkWrapper) {
      C.uncappedJunkWrapper.style.display = recyclingEnabled ? '' : 'none';
    }
    if (C.uncappedJunkToggle) {
      C.uncappedJunkToggle.checked = recyclingEnabled ? this.uncappedJunk : false;
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
    if (C.maintenance3Slider?.dataset?.nanotechBound !== 'maintenance3') {
      C.maintenance3Slider.addEventListener('input', (e) => {
        nanotechManager.maintenance3Slider = parseInt(e.target.value);
        nanotechManager.updateUI();
      });
      C.maintenance3Slider.dataset.nanotechBound = 'maintenance3';
    }
    if (C.electronicsSlider?.dataset?.nanotechBound !== 'electronics') {
      C.electronicsSlider.addEventListener('input', (e) => {
        nanotechManager.electronicsSlider = parseInt(e.target.value);
        nanotechManager.updateUI();
      });
      C.electronicsSlider.dataset.nanotechBound = 'electronics';
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
    if (C.biomassLimit?.dataset?.nanotechBound !== 'biomassLimit') {
      wireStringNumberInput(C.biomassLimit, {
        datasetKey: 'biomassLimit',
        parseValue: (value) => {
          const numeric = parseFlexibleNumber(value) || 0;
          if (nanotechManager.biomassLimitMode === 'absolute') return Math.max(0, numeric);
          return Math.max(0, Math.min(100, numeric));
        },
        formatValue: (parsed) => {
          if (nanotechManager.biomassLimitMode === 'absolute') {
            return parsed >= 1e6 ? formatNumber(parsed, true, 3) : String(parsed);
          }
          return String(parsed);
        },
        onValue: (parsed) => {
          if (nanotechManager.biomassLimitMode === 'absolute') {
            nanotechManager.maxBiomassAbsolute = parsed;
          } else {
            nanotechManager.maxBiomassPercent = parsed;
          }
          nanotechManager.updateUI();
        },
      });
      C.biomassLimit.dataset.nanotechBound = 'biomassLimit';
    }
    if (C.biomassMode?.dataset?.nanotechBound !== 'biomassMode') {
      C.biomassMode.addEventListener('change', (e) => {
        nanotechManager.biomassLimitMode = e.target.value;
        if (nanotechManager.biomassLimitMode === 'absolute' && !(nanotechManager.maxBiomassAbsolute > 0)) {
          nanotechManager.maxBiomassAbsolute = 1e6;
        }
        nanotechManager.updateUI();
      });
      C.biomassMode.dataset.nanotechBound = 'biomassMode';
    }
    if (C.onlyScrapToggle?.dataset?.nanotechBound !== 'onlyScrap') {
      C.onlyScrapToggle.addEventListener('change', (e) => {
        nanotechManager.onlyScrap = e.target.checked;
        nanotechManager.updateUI();
      });
      C.onlyScrapToggle.dataset.nanotechBound = 'onlyScrap';
    }
    if (C.uncappedScrapToggle?.dataset?.nanotechBound !== 'uncappedScrap') {
      C.uncappedScrapToggle.addEventListener('change', (e) => {
        nanotechManager.uncappedScrap = e.target.checked;
        nanotechManager.updateUI();
      });
      C.uncappedScrapToggle.dataset.nanotechBound = 'uncappedScrap';
    }
    if (C.onlyTrashToggle?.dataset?.nanotechBound !== 'onlyTrash') {
      C.onlyTrashToggle.addEventListener('change', (e) => {
        nanotechManager.onlyTrash = e.target.checked;
        nanotechManager.updateUI();
      });
      C.onlyTrashToggle.dataset.nanotechBound = 'onlyTrash';
    }
    if (C.uncappedTrashToggle?.dataset?.nanotechBound !== 'uncappedTrash') {
      C.uncappedTrashToggle.addEventListener('change', (e) => {
        nanotechManager.uncappedTrash = e.target.checked;
        nanotechManager.updateUI();
      });
      C.uncappedTrashToggle.dataset.nanotechBound = 'uncappedTrash';
    }
    if (C.onlyJunkToggle?.dataset?.nanotechBound !== 'onlyJunk') {
      C.onlyJunkToggle.addEventListener('change', (e) => {
        nanotechManager.onlyJunk = e.target.checked;
        nanotechManager.updateUI();
      });
      C.onlyJunkToggle.dataset.nanotechBound = 'onlyJunk';
    }
    if (C.uncappedJunkToggle?.dataset?.nanotechBound !== 'uncappedJunk') {
      C.uncappedJunkToggle.addEventListener('change', (e) => {
        nanotechManager.uncappedJunk = e.target.checked;
        nanotechManager.updateUI();
      });
      C.uncappedJunkToggle.dataset.nanotechBound = 'uncappedJunk';
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
        'Percentage of silica production: maximum share of silicon production the swarm may consume per second.\nAbsolute: fixed silica limit in tons per second. Accepts scientific notation and suffixes (e.g., 1e3, 2.5k, 1M).\nUncapped: junk usage is not capped, but silica usage still follows this limit.'
      );
      C.siliconTooltipIcon.dataset.nanotechBound = 'siliconTooltip';
    }
    if (C.metalTooltipIcon?.dataset?.nanotechBound !== 'metalTooltip') {
      attachDynamicInfoTooltip(
        C.metalTooltipIcon,
        'Percentage of metal production: maximum share of metal production the swarm may consume per second.\nAbsolute: fixed metal limit in tons per second. Accepts scientific notation and suffixes (e.g., 1e3, 2.5k, 1M).\nUncapped: scrap usage is not capped, but metal usage still follows this limit.'
      );
      C.metalTooltipIcon.dataset.nanotechBound = 'metalTooltip';
    }
    if (C.biomassTooltipIcon?.dataset?.nanotechBound !== 'biomassTooltip') {
      attachDynamicInfoTooltip(
        C.biomassTooltipIcon,
        'Percentage of biomass production: maximum share of biomass production the swarm may consume per second. Includes estimated life growth biomass production.\nPercentage of total biomass: maximum share of currently available biomass (and trash when recycling is enabled) the swarm may consume per second.\nAbsolute: fixed biomass limit in tons per second. Accepts scientific notation and suffixes (e.g., 1e3, 2.5k, 1M).\nUncapped: trash usage is not capped, but biomass usage still follows this limit.'
      );
      C.biomassTooltipIcon.dataset.nanotechBound = 'biomassTooltip';
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
      timeToFullEl: qs('#nanobot-time-to-full'),
      mSlider: qs('#nanotech-maintenance-slider'),
      glSlider: qs('#nanotech-glass-slider'),
      maintenance2Slider: qs('#nanotech-maintenance2-slider'),
      componentsSlider: qs('#nanotech-components-slider'),
      maintenance3Slider: qs('#nanotech-maintenance3-slider'),
      electronicsSlider: qs('#nanotech-electronics-slider'),
      glassTicks: qs('#nanotech-glass-ticks'),
      componentsTicks: qs('#nanotech-components-ticks'),
      electronicsTicks: qs('#nanotech-electronics-ticks'),
      eLimit: qs('#nanotech-energy-limit'),
      eMode: qs('#nanotech-energy-limit-mode'),
      sLimit: qs('#nanotech-silicon-limit'),
      sMode: qs('#nanotech-silicon-limit-mode'),
      metalLimit: qs('#nanotech-metal-limit'),
      metalMode: qs('#nanotech-metal-limit-mode'),
      biomassLimit: qs('#nanotech-biomass-limit'),
      biomassMode: qs('#nanotech-biomass-limit-mode'),
      onlyScrapToggle: qs('#nanotech-only-scrap'),
      onlyScrapWrapper: qs('#nanotech-only-scrap-wrapper'),
      uncappedScrapToggle: qs('#nanotech-uncapped-scrap'),
      uncappedScrapWrapper: qs('#nanotech-uncapped-scrap-wrapper'),
      onlyTrashToggle: qs('#nanotech-only-trash'),
      onlyTrashWrapper: qs('#nanotech-only-trash-wrapper'),
      uncappedTrashToggle: qs('#nanotech-uncapped-trash'),
      uncappedTrashWrapper: qs('#nanotech-uncapped-trash-wrapper'),
      onlyJunkToggle: qs('#nanotech-only-junk'),
      onlyJunkWrapper: qs('#nanotech-only-junk-wrapper'),
      uncappedJunkToggle: qs('#nanotech-uncapped-junk'),
      uncappedJunkWrapper: qs('#nanotech-uncapped-junk-wrapper'),
      energyTooltipIcon: qs('#nanotech-energy-tooltip'),
      travelTooltipIcon: qs('#nanotech-travel-tooltip'),
      siliconTooltipIcon: qs('#nanotech-silicon-tooltip'),
      metalTooltipIcon: qs('#nanotech-metal-tooltip'),
      biomassTooltipIcon: qs('#nanotech-biomass-tooltip'),
      growthImpactEl: qs('#nanotech-growth-impact'),
      siliconImpactEl: qs('#nanotech-silicon-impact'),
      metalImpactEl: qs('#nanotech-metal-impact'),
      biomassImpactEl: qs('#nanotech-biomass-impact'),
      maintenanceImpactEl: qs('#nanotech-maintenance-impact'),
      maintenance2ImpactEl: qs('#nanotech-maintenance2-impact'),
      maintenance3ImpactEl: qs('#nanotech-maintenance3-impact'),
      glassImpactEl: qs('#nanotech-glass-impact'),
      componentsImpactEl: qs('#nanotech-components-impact'),
      electronicsImpactEl: qs('#nanotech-electronics-impact'),
      energyRateEl: qs('#nanotech-growth-energy'),
      siliconRateEl: qs('#nanotech-silicon-rate'),
      maintenanceRateEl: qs('#nanotech-maintenance-rate'),
      maintenance2RateEl: qs('#nanotech-maintenance2-rate'),
      maintenance3RateEl: qs('#nanotech-maintenance3-rate'),
      glassRateEl: qs('#nanotech-glass-rate'),
      metalRateEl: qs('#nanotech-metal-rate'),
      componentsRateEl: qs('#nanotech-components-rate'),
      biomassRateEl: qs('#nanotech-biomass-rate'),
      electronicsRateEl: qs('#nanotech-electronics-rate'),
      stage2Container: qs('#nanotech-stage-2'),
      stage3Container: qs('#nanotech-stage-3'),
      stage1WarningEl: qs('#nanotech-stage1-warning'),
      stage2WarningEl: qs('#nanotech-stage2-warning'),
      stage3WarningEl: qs('#nanotech-stage3-warning'),
      travelCapEl: qs('#nanotech-travel-cap'),
    };
  }

  ensureUICache(container) {
    const cacheNodes = [
      this.uiCache?.countEl,
      this.uiCache?.growthEl,
      this.uiCache?.siliconImpactEl,
      this.uiCache?.biomassImpactEl,
      this.uiCache?.siliconRateEl,
      this.uiCache?.stage1WarningEl,
      this.uiCache?.stage2WarningEl,
      this.uiCache?.stage3WarningEl,
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
      maintenance3Slider: this.maintenance3Slider,
      electronicsSlider: this.electronicsSlider,
      maxEnergyPercent: this.maxEnergyPercent,
      maxEnergyAbsolute: this.maxEnergyAbsolute,
      energyLimitMode: this.energyLimitMode,
      maxSiliconPercent: this.maxSiliconPercent,
      maxSiliconAbsolute: this.maxSiliconAbsolute,
      siliconLimitMode: this.siliconLimitMode,
      maxMetalPercent: this.maxMetalPercent,
      maxMetalAbsolute: this.maxMetalAbsolute,
      metalLimitMode: this.metalLimitMode,
      maxBiomassPercent: this.maxBiomassPercent,
      maxBiomassAbsolute: this.maxBiomassAbsolute,
      biomassLimitMode: this.biomassLimitMode,
      onlyScrap: this.onlyScrap,
      onlyTrash: this.onlyTrash,
      onlyJunk: this.onlyJunk,
      uncappedScrap: this.uncappedScrap,
      uncappedTrash: this.uncappedTrash,
      uncappedJunk: this.uncappedJunk,
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
    this.maintenance3Slider = state.maintenance3Slider || 0;
    this.electronicsSlider = state.electronicsSlider || 0;
    this.maxEnergyPercent = state.maxEnergyPercent ?? 10;
    this.maxEnergyAbsolute = state.maxEnergyAbsolute ?? 1e6;
    this.energyLimitMode = state.energyLimitMode || 'percent';
    this.maxSiliconPercent = state.maxSiliconPercent ?? 10;
    this.maxSiliconAbsolute = state.maxSiliconAbsolute ?? 1e6;
    this.siliconLimitMode = state.siliconLimitMode || 'percent';
    this.maxMetalPercent = state.maxMetalPercent ?? 10;
    this.maxMetalAbsolute = state.maxMetalAbsolute ?? 1e6;
    this.metalLimitMode = state.metalLimitMode || 'percent';
    this.maxBiomassPercent = state.maxBiomassPercent ?? 10;
    this.maxBiomassAbsolute = state.maxBiomassAbsolute ?? 1e6;
    this.biomassLimitMode = state.biomassLimitMode || 'percent';
    this.onlyScrap = !!state.onlyScrap;
    this.onlyTrash = !!state.onlyTrash;
    this.onlyJunk = !!state.onlyJunk;
    this.uncappedScrap = !!state.uncappedScrap;
    this.uncappedTrash = !!state.uncappedTrash;
    this.uncappedJunk = !!state.uncappedJunk;
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
    this.maintenance3Slider = 0;
    this.electronicsSlider = 0;
    this.currentEnergyConsumption = 0;
    this.currentSiliconConsumption = 0;
    this.currentGlassProduction = 0;
    this.currentMetalConsumption = 0;
    this.currentComponentsProduction = 0;
    this.currentBiomassConsumption = 0;
    this.currentElectronicsProduction = 0;
    this.currentMaintenanceReduction = 0;
    this.currentMaintenance2Reduction = 0;
    this.currentMaintenance3Reduction = 0;
    this.optimalEnergyConsumption = 0;
    this.optimalSiliconConsumption = 0;
    this.optimalMetalConsumption = 0;
    this.optimalBiomassConsumption = 0;
    this.enabled = false;
    this.powerFraction = 1;
    this.siliconFraction = 1;
    this.metalFraction = 1;
    this.biomassFraction = 1;
    this.hasEnoughEnergy = true;
    this.hasEnoughSilicon = true;
    this.hasEnoughMetal = true;
    this.hasEnoughBiomass = true;
    this.effectiveGrowthRate = 0;
    this.onlyScrap = false;
    this.onlyJunk = false;
    this.onlyTrash = false;
    this.uncappedScrap = false;
    this.uncappedJunk = false;
    this.uncappedTrash = false;
    this.maxEnergyPercent = 10;
    this.maxEnergyAbsolute = 1e6;
    this.energyLimitMode = 'percent';
    this.maxSiliconPercent = 10;
    this.maxSiliconAbsolute = 1e6;
    this.siliconLimitMode = 'percent';
    this.maxMetalPercent = 10;
    this.maxMetalAbsolute = 1e6;
    this.metalLimitMode = 'percent';
    this.maxBiomassPercent = 10;
    this.maxBiomassAbsolute = 1e6;
    this.biomassLimitMode = 'percent';
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
