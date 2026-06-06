const EARTH_RECONSTRUCTION_MAX_MASS_STEPS = 20;
const EARTH_RECONSTRUCTION_BASE_RADIUS_SCALE = 0.7;
const EARTH_RECONSTRUCTION_RADIUS_SCALE_PER_STEP = 0.015;
const EARTH_RECONSTRUCTION_MAX_HEAT_STEPS = 20;
const EARTH_RECONSTRUCTION_MAX_SHAPE_STEPS = 20;
const EARTH_RECONSTRUCTION_MAX_ATMOSPHERE_STEPS = 20;
const EARTH_RECONSTRUCTION_MAX_WATER_STEPS = 20;
const EARTH_RECONSTRUCTION_MAX_TILT_STEPS = 20;
const EARTH_RECONSTRUCTION_MAX_BIOMASS_STEPS = 20;
const EARTH_RECONSTRUCTION_MAX_LUNA_STEPS = 1;
const EARTH_RECONSTRUCTION_MAX_COMPLETE_TERRAFORMING_STEPS = 1;
const EARTH_RECONSTRUCTION_STEP_FRACTION = 0.05;
const EARTH_RECONSTRUCTION_BIOMASS_COVERAGE_SCALE = 10;
const EARTH_RECONSTRUCTION_TARGET_RADIUS_KM = 6371;
const EARTH_RECONSTRUCTION_TARGET_MASS_KG = 5.972e24;
const EARTH_RECONSTRUCTION_TARGET_CORE_HEAT_FLUX = 250000;
const EARTH_RECONSTRUCTION_TARGET_AXIAL_TILT_DEG = 23.44;
const EARTH_RECONSTRUCTION_TARGET_ATMOSPHERE = {
  carbonDioxide: 2056831169131.2002,
  atmosphericWater: 18678784443623.46,
  atmosphericMethane: 9882092383,
  atmosphericAmmonia: 0,
  oxygen: 1109477074900000,
  inertGas: 4112001053800000,
  hydrogen: 0,
  sulfuricAcid: 0
};
const EARTH_RECONSTRUCTION_TARGET_WATER = {
  liquidWater: 644656795267087900,
  zonalSurface: {
    tropical: { liquidWater: 280304580319841150, ice: 0 },
    temperate: { liquidWater: 364351819684932350, ice: 0 },
    polar: { liquidWater: 395262314397.17847, ice: 114178198844575490 }
  }
};

class EarthManager extends EffectableEntity {
  constructor() {
    super({ description: 'Manages Earth reconstruction actions' });
    this.enabled = false;
    this.unlockedActions = new Set();
    this.increaseMassCount = 0;
    this.removeHeatCount = 0;
    this.shapeSurfaceCount = 0;
    this.buildAtmosphereCount = 0;
    this.addWaterCount = 0;
    this.adjustTiltCount = 0;
    this.restoreBiomassCount = 0;
    this.replaceLunaCount = 0;
    this.completeTerraformingCount = 0;
  }

  enable() {
    this.enabled = true;
    this.applyMassGeometry();
    this.applyCoreHeatFlux();
    this.applyAxialTilt();
  }

  reset() {
    this.enabled = false;
    this.unlockedActions = new Set();
    this.increaseMassCount = 0;
    this.removeHeatCount = 0;
    this.shapeSurfaceCount = 0;
    this.buildAtmosphereCount = 0;
    this.addWaterCount = 0;
    this.adjustTiltCount = 0;
    this.restoreBiomassCount = 0;
    this.replaceLunaCount = 0;
    this.completeTerraformingCount = 0;
    this.activeEffects = [];
    this.booleanFlags = new Set();
  }

  applyEffect(effect) {
    if (effect.type === 'unlockAction') {
      this.unlockAction(effect.targetId || effect.actionId);
      return;
    }
    super.applyEffect(effect);
  }

  unlockAction(actionId) {
    if (!actionId) return;
    this.unlockedActions.add(actionId);
  }

  isActionUnlocked(actionId) {
    return this.unlockedActions.has(actionId);
  }

  pressAction(actionId) {
    if (!this.enabled || !this.isActionUnlocked(actionId)) return false;
    if (actionId === 'increaseMass') {
      if (this.increaseMassCount >= EARTH_RECONSTRUCTION_MAX_MASS_STEPS) return false;
      this.increaseMassCount += 1;
      this.applyMassGeometry();
      return true;
    }
    if (actionId === 'removeHeat') {
      if (this.removeHeatCount >= EARTH_RECONSTRUCTION_MAX_HEAT_STEPS) return false;
      this.removeHeatCount += 1;
      this.applyCoreHeatFlux();
      return true;
    }
    if (actionId === 'shapeSurface') {
      if (this.shapeSurfaceCount >= EARTH_RECONSTRUCTION_MAX_SHAPE_STEPS) return false;
      this.shapeSurfaceCount += 1;
      return true;
    }
    if (actionId === 'buildAtmosphere') {
      if (this.buildAtmosphereCount >= EARTH_RECONSTRUCTION_MAX_ATMOSPHERE_STEPS) return false;
      this.buildAtmosphereCount += 1;
      this.applyAtmosphereStep();
      return true;
    }
    if (actionId === 'addWater') {
      if (this.addWaterCount >= EARTH_RECONSTRUCTION_MAX_WATER_STEPS) return false;
      this.addWaterCount += 1;
      this.applyWaterStep();
      return true;
    }
    if (actionId === 'adjustTilt') {
      if (this.adjustTiltCount >= EARTH_RECONSTRUCTION_MAX_TILT_STEPS) return false;
      this.adjustTiltCount += 1;
      this.applyAxialTilt();
      return true;
    }
    if (actionId === 'restoreBiomass') {
      if (this.restoreBiomassCount >= EARTH_RECONSTRUCTION_MAX_BIOMASS_STEPS) return false;
      this.restoreBiomassCount += 1;
      this.applyBiomassStep();
      return true;
    }
    if (actionId === 'replaceLuna') {
      if (this.replaceLunaCount >= EARTH_RECONSTRUCTION_MAX_LUNA_STEPS) return false;
      this.replaceLunaCount += 1;
      return true;
    }
    if (actionId === 'completeTerraforming') {
      if (this.completeTerraformingCount >= EARTH_RECONSTRUCTION_MAX_COMPLETE_TERRAFORMING_STEPS) return false;
      this.completeTerraformingCount += 1;
      return true;
    }
    return false;
  }

  getActionCount(actionId) {
    if (actionId === 'increaseMass') {
      return this.increaseMassCount;
    }
    if (actionId === 'removeHeat') {
      return this.removeHeatCount;
    }
    if (actionId === 'shapeSurface') {
      return this.shapeSurfaceCount;
    }
    if (actionId === 'buildAtmosphere') {
      return this.buildAtmosphereCount;
    }
    if (actionId === 'addWater') {
      return this.addWaterCount;
    }
    if (actionId === 'adjustTilt') {
      return this.adjustTiltCount;
    }
    if (actionId === 'restoreBiomass') {
      return this.restoreBiomassCount;
    }
    if (actionId === 'replaceLuna') {
      return this.replaceLunaCount;
    }
    if (actionId === 'completeTerraforming') {
      return this.completeTerraformingCount;
    }
    return 0;
  }

  refreshTerraformingAfterResourceStep() {
    terraforming._updateAtmosphericPressureCache();
    terraforming._updateZonalCoverageCache();
    terraforming.setTemperatureValuesToTrend();
  }

  applyMassGeometry() {
    const radiusScale = this.getMassRadiusScale();
    const radius = EARTH_RECONSTRUCTION_TARGET_RADIUS_KM * radiusScale;
    const mass = EARTH_RECONSTRUCTION_TARGET_MASS_KG * Math.pow(radiusScale, 3);
    const gravity = calculateGravityFromMassRadius(mass, radius);
    const surfaceArea = calculateSurfaceAreaM2FromRadius(radius);
    const crossSectionArea = calculateCrossSectionAreaM2FromRadius(radius);

    terraforming.celestialParameters.radius = radius;
    terraforming.celestialParameters.mass = mass;
    terraforming.celestialParameters.gravity = gravity;
    terraforming.celestialParameters.baseRadius = radius;
    terraforming.celestialParameters.baseMass = mass;
    terraforming.celestialParameters.baseGravity = gravity;
    terraforming.celestialParameters.surfaceArea = surfaceArea;
    terraforming.celestialParameters.crossSectionArea = crossSectionArea;
    terraforming.initialCelestialParameters.radius = radius;
    terraforming.initialCelestialParameters.mass = mass;
    terraforming.initialCelestialParameters.gravity = gravity;
    terraforming.initialCelestialParameters.baseRadius = radius;
    terraforming.initialCelestialParameters.baseMass = mass;
    terraforming.initialCelestialParameters.baseGravity = gravity;
    terraforming.initialCelestialParameters.surfaceArea = surfaceArea;
    terraforming.initialCelestialParameters.crossSectionArea = crossSectionArea;
    terraforming.apparentEquatorialGravity = getApparentEquatorialGravity(terraforming.celestialParameters);

    currentPlanetParameters.celestialParameters.radius = radius;
    currentPlanetParameters.celestialParameters.mass = mass;
    currentPlanetParameters.celestialParameters.gravity = gravity;
    currentPlanetParameters.celestialParameters.baseRadius = radius;
    currentPlanetParameters.celestialParameters.baseMass = mass;
    currentPlanetParameters.celestialParameters.baseGravity = gravity;
    currentPlanetParameters.celestialParameters.surfaceArea = surfaceArea;
    currentPlanetParameters.celestialParameters.crossSectionArea = crossSectionArea;

    const landHectares = surfaceArea / 10000;
    resources.surface.land.setExactLandValue(landHectares);
    resources.surface.land.initialValue = landHectares;
    terraforming.baseLand = landHectares;
    terraforming.initialLand = landHectares;
    terraforming.celestialParameters.baseLand = landHectares;
    terraforming.initialCelestialParameters.baseLand = landHectares;

    terraforming._updateAtmosphericPressureCache();
    terraforming._updateZonalCoverageCache();
  }

  applyCoreHeatFlux() {
    const coreHeatFlux = EARTH_RECONSTRUCTION_TARGET_CORE_HEAT_FLUX * this.getHeatRatio();
    terraforming.celestialParameters.coreHeatFlux = coreHeatFlux;
    terraforming.initialCelestialParameters.coreHeatFlux = coreHeatFlux;
    currentPlanetParameters.celestialParameters.coreHeatFlux = coreHeatFlux;
    terraforming.updateSurfaceTemperature(0, { ignoreHeatCapacity: true });
    terraforming.setTemperatureValuesToTrend();
  }

  applyAxialTilt() {
    const axialTilt = this.getAxialTiltDeg();
    terraforming.celestialParameters.axialTilt = axialTilt;
    terraforming.initialCelestialParameters.axialTilt = axialTilt;
    currentPlanetParameters.celestialParameters.axialTilt = axialTilt;
    currentPlanetParameters.visualization.inclinationDeg = axialTilt;
  }

  applyAtmosphereStep() {
    for (const resourceId in EARTH_RECONSTRUCTION_TARGET_ATMOSPHERE) {
      const targetValue = EARTH_RECONSTRUCTION_TARGET_ATMOSPHERE[resourceId] || 0;
      const resource = resources.atmospheric[resourceId];
      resource.value += targetValue * EARTH_RECONSTRUCTION_STEP_FRACTION;
    }
    this.refreshTerraformingAfterResourceStep();
  }

  applyWaterStep() {
    const targetWater = EARTH_RECONSTRUCTION_TARGET_WATER.liquidWater || 0;
    resources.surface.liquidWater.value += targetWater * EARTH_RECONSTRUCTION_STEP_FRACTION;

    const targetZonalSurface = EARTH_RECONSTRUCTION_TARGET_WATER.zonalSurface;
    for (const zone in targetZonalSurface) {
      const targetZone = targetZonalSurface[zone];
      const zoneSurface = terraforming.zonalSurface[zone];
      zoneSurface.liquidWater += (targetZone.liquidWater || 0) * EARTH_RECONSTRUCTION_STEP_FRACTION;
      zoneSurface.ice += (targetZone.ice || 0) * EARTH_RECONSTRUCTION_STEP_FRACTION;
    }
    this.refreshTerraformingAfterResourceStep();
  }

  applyBiomassStep() {
    let addedBiomass = 0;
    const biomassZones = ['tropical', 'temperate'];
    for (const zone of biomassZones) {
      const zoneArea = terraforming.celestialParameters.surfaceArea * terraforming.getZoneWeight(zone);
      const targetBiomass = estimateAmountForCoverage(1, zoneArea, EARTH_RECONSTRUCTION_BIOMASS_COVERAGE_SCALE);
      const currentBiomass = terraforming.zonalSurface[zone].biomass || 0;
      const biomassStep = Math.min(targetBiomass * EARTH_RECONSTRUCTION_STEP_FRACTION, Math.max(0, targetBiomass - currentBiomass));
      terraforming.zonalSurface[zone].biomass += biomassStep;
      addedBiomass += biomassStep;
    }
    resources.surface.biomass.value += addedBiomass;
    terraforming._updateZonalCoverageCache();
    terraforming.setTemperatureValuesToTrend();
  }

  getMassRadiusScale() {
    const steps = Math.max(0, Math.min(EARTH_RECONSTRUCTION_MAX_MASS_STEPS, this.increaseMassCount));
    return EARTH_RECONSTRUCTION_BASE_RADIUS_SCALE + steps * EARTH_RECONSTRUCTION_RADIUS_SCALE_PER_STEP;
  }

  getHeatRatio() {
    const steps = Math.max(0, Math.min(EARTH_RECONSTRUCTION_MAX_HEAT_STEPS, this.removeHeatCount));
    return 1 - steps / EARTH_RECONSTRUCTION_MAX_HEAT_STEPS;
  }

  getSurfaceShapeRatio() {
    const steps = Math.max(0, Math.min(EARTH_RECONSTRUCTION_MAX_SHAPE_STEPS, this.shapeSurfaceCount));
    return steps / EARTH_RECONSTRUCTION_MAX_SHAPE_STEPS;
  }

  getAxialTiltDeg() {
    const steps = Math.max(0, Math.min(EARTH_RECONSTRUCTION_MAX_TILT_STEPS, this.adjustTiltCount));
    return EARTH_RECONSTRUCTION_TARGET_AXIAL_TILT_DEG * (steps / EARTH_RECONSTRUCTION_MAX_TILT_STEPS);
  }

  getVisualBaseColor() {
    const heat = this.getHeatRatio();
    if (heat <= 0) return '#878a81';
    const hot = { r: 255, g: 122, b: 31 };
    const cool = { r: 135, g: 138, b: 129 };
    const mix = (a, b) => Math.round(b + (a - b) * heat).toString(16).padStart(2, '0');
    return `#${mix(hot.r, cool.r)}${mix(hot.g, cool.g)}${mix(hot.b, cool.b)}`;
  }

  getVisualCoreHeatFlux() {
    return EARTH_RECONSTRUCTION_TARGET_CORE_HEAT_FLUX * this.getHeatRatio();
  }

  getVisualizerState() {
    return {
      radiusScale: this.getMassRadiusScale(),
      baseColor: this.getVisualBaseColor(),
      heatRatio: this.getHeatRatio(),
      surfaceShapeRatio: this.getSurfaceShapeRatio(),
      axialTiltDeg: this.getAxialTiltDeg(),
      coreHeatFlux: this.getVisualCoreHeatFlux()
    };
  }

  saveState() {
    return {
      enabled: this.enabled,
      unlockedActions: Array.from(this.unlockedActions),
      increaseMassCount: this.increaseMassCount,
      removeHeatCount: this.removeHeatCount,
      shapeSurfaceCount: this.shapeSurfaceCount,
      buildAtmosphereCount: this.buildAtmosphereCount,
      addWaterCount: this.addWaterCount,
      adjustTiltCount: this.adjustTiltCount,
      restoreBiomassCount: this.restoreBiomassCount,
      replaceLunaCount: this.replaceLunaCount,
      completeTerraformingCount: this.completeTerraformingCount,
      activeEffects: this.activeEffects,
      booleanFlags: Array.from(this.booleanFlags)
    };
  }

  loadState(state = {}) {
    this.enabled = !!state.enabled;
    this.unlockedActions = new Set(Array.isArray(state.unlockedActions) ? state.unlockedActions : []);
    this.increaseMassCount = Math.max(0, Math.min(
      EARTH_RECONSTRUCTION_MAX_MASS_STEPS,
      Number(state.increaseMassCount) || 0
    ));
    this.removeHeatCount = Math.max(0, Math.min(
      EARTH_RECONSTRUCTION_MAX_HEAT_STEPS,
      Number(state.removeHeatCount) || 0
    ));
    this.shapeSurfaceCount = Math.max(0, Math.min(
      EARTH_RECONSTRUCTION_MAX_SHAPE_STEPS,
      Number(state.shapeSurfaceCount) || 0
    ));
    this.buildAtmosphereCount = Math.max(0, Math.min(
      EARTH_RECONSTRUCTION_MAX_ATMOSPHERE_STEPS,
      Number(state.buildAtmosphereCount) || 0
    ));
    this.addWaterCount = Math.max(0, Math.min(
      EARTH_RECONSTRUCTION_MAX_WATER_STEPS,
      Number(state.addWaterCount) || 0
    ));
    this.adjustTiltCount = Math.max(0, Math.min(
      EARTH_RECONSTRUCTION_MAX_TILT_STEPS,
      Number(state.adjustTiltCount) || 0
    ));
    this.restoreBiomassCount = Math.max(0, Math.min(
      EARTH_RECONSTRUCTION_MAX_BIOMASS_STEPS,
      Number(state.restoreBiomassCount) || 0
    ));
    this.replaceLunaCount = Math.max(0, Math.min(
      EARTH_RECONSTRUCTION_MAX_LUNA_STEPS,
      Number(state.replaceLunaCount) || 0
    ));
    this.completeTerraformingCount = Math.max(0, Math.min(
      EARTH_RECONSTRUCTION_MAX_COMPLETE_TERRAFORMING_STEPS,
      Number(state.completeTerraformingCount) || 0
    ));
    this.activeEffects = Array.isArray(state.activeEffects) ? state.activeEffects : [];
    this.booleanFlags = new Set(Array.isArray(state.booleanFlags) ? state.booleanFlags : []);
    if (this.enabled) {
      this.applyMassGeometry();
      this.applyCoreHeatFlux();
      this.applyAxialTilt();
    }
  }
}
