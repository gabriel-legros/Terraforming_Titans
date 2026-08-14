registerTerraformingMethods('state', ({
  ZONAL_SURFACE_RESOURCE_KEYS,
  applyZonalSurfaceFromLegacy,
  createEmptyZonalSurface,
  calculateApparentEquatorialGravity
}) => ({
  saveState() {
    return {
      initialValuesCalculated: this.initialValuesCalculated,
      celestialParameters: this.celestialParameters,
      initialCelestialParameters: this.initialCelestialParameters,
      temperature: this.temperature,
      graphHistory: terraformingGraphsManager.saveState(),
      // atmosphere: this.atmosphere, // REMOVED - No longer saving internal atmosphere state
      completed: this.completed,
      // zonalAtmosphere: this.zonalAtmosphere, // REMOVED - No longer saving internal zonal atmosphere state
      zonalSurface: this.zonalSurface
      // zonalBiomass: this.zonalBiomass, // REMOVED - Biomass is stored in zonalSurface
    };
  },
  loadState(terraformingState) {
    if (!terraformingState) return;

    // Start from fresh config each load
    this.celestialParameters = structuredClone(currentPlanetParameters.celestialParameters);
    this.initialCelestialParameters = structuredClone(currentPlanetParameters.celestialParameters);
    if (terraformingState.initialCelestialParameters) {
      Object.assign(this.initialCelestialParameters, terraformingState.initialCelestialParameters);
    }
    if (terraformingState.celestialParameters) {
      Object.assign(this.celestialParameters, terraformingState.celestialParameters);
    }
    this.initialCelestialParameters.dayNightPeriod = this.initialCelestialParameters.dayNightPeriod || this.initialCelestialParameters.rotationPeriod || 24;
    this.celestialParameters.dayNightPeriod = terraformingState.celestialParameters?.dayNightPeriod === undefined ? this.celestialParameters.rotationPeriod || 24 : this.celestialParameters.dayNightPeriod || 24;

    // Ensure current has values for all initial parameters
    for (const key in this.initialCelestialParameters) {
      if (this.celestialParameters[key] === undefined) {
        this.celestialParameters[key] = this.initialCelestialParameters[key];
      }
      if (key === 'parentBody') {
        for (const key2 in this.initialCelestialParameters.parentBody) {
          if (this.celestialParameters.parentBody[key2] === undefined) {
            this.celestialParameters.parentBody[key2] = this.initialCelestialParameters.parentBody[key2];
          }
        }
      }
    }
    this.refreshDynamicWorldGeometry();
    this.completed = terraformingState.completed || false;
    this.initialValuesCalculated = terraformingState.initialValuesCalculated || false;

    // Load Temperature (including zonal)
    if (terraformingState.temperature) {
      this.temperature.value = terraformingState.temperature.value || 0;
      this.temperature.trendValue = terraformingState.temperature.trendValue ?? this.temperature.value;
      this.temperature.equilibriumTemperature = terraformingState.temperature.equilibriumTemperature ?? this.temperature.value;
      this.temperature.emissivity = terraformingState.temperature.emissivity || 0;
      this.temperature.effectiveTempNoAtmosphere = terraformingState.temperature.effectiveTempNoAtmosphere || 0;
      this.temperature.opticalDepth = terraformingState.temperature.opticalDepth || 0;
      this.temperature.opticalDepthContributions = terraformingState.temperature.opticalDepthContributions || {};
      this.temperature.unlocked = terraformingState.temperature.unlocked || false;
      if (terraformingState.temperature.zones) {
        for (const zone of ['tropical', 'temperate', 'polar']) {
          this.temperature.zones[zone].initial = terraformingState.temperature.zones[zone]?.initial || 0;
          this.temperature.zones[zone].value = terraformingState.temperature.zones[zone]?.value || 0;
          this.temperature.zones[zone].day = terraformingState.temperature.zones[zone]?.day || 0;
          this.temperature.zones[zone].night = terraformingState.temperature.zones[zone]?.night || 0;
          this.temperature.zones[zone].trendValue = terraformingState.temperature.zones[zone]?.trendValue ?? this.temperature.zones[zone].value;
          this.temperature.zones[zone].equilibriumTemperature = terraformingState.temperature.zones[zone]?.equilibriumTemperature ?? this.temperature.zones[zone].value;
        }
      }
    }

    // Load Atmosphere Unlock Status (other properties are derived from global resources)
    if (terraformingState.atmosphere) {
      this.atmosphere.unlocked = terraformingState.atmosphere.unlocked || false;
    }

    // Load Zonal Surface resources (keep defaults if not in save)
    this.zonalSurface = createEmptyZonalSurface();
    applyZonalSurfaceFromLegacy(this.zonalSurface, terraformingState);
    // Legacy migration only: absorb the old parallel remainder values into adaptive precision.
    const legacyRemainders = terraformingState.zonalSurfaceRemainders || {};
    for (const resourceKey of ZONAL_SURFACE_RESOURCE_KEYS) {
      for (const zone of getZones()) {
        const remainder = legacyRemainders[resourceKey]?.[zone] ?? legacyRemainders[zone]?.[resourceKey];
        if (remainder !== undefined) {
          this.zonalSurface[resourceKey].change(zone, remainder);
        }
      }
    }

    // If loading a save where initial values weren't calculated, run calculateInitialValues.
    // This will correctly initialize global resource amounts based on parameters
    // and distribute surface resources zonally.
    if (!this.initialValuesCalculated) {
      console.warn("Initial values not calculated in save. Running calculateInitialValues.");
      this.calculateInitialValues(currentPlanetParameters); // This now correctly sets global resource values too
    } else {
      // If initial values *were* calculated, we still need to ensure the global
      // resource amounts match the loaded zonal surface amounts.
      // Atmospheric amounts are assumed correct in the global 'resources' object
      // as they are not saved/loaded within the Terraforming state anymore.
      this.synchronizeGlobalResources(); // Sync loaded zonal surface data to global resources
    }

    // Ensure global resources reflect loaded/recalculated state
    this.synchronizeGlobalResources();
    this.updateLuminosity(); // Recalculate luminosity
    if (this.luminosity.initialSurfaceAlbedo === undefined) {
      this.luminosity.initialSurfaceAlbedo = this.luminosity.groundAlbedo;
    }
    if (this.luminosity.initialActualAlbedo === undefined) {
      this.luminosity.initialActualAlbedo = this.luminosity.actualAlbedo;
    }
    this.apparentEquatorialGravity = calculateApparentEquatorialGravity(this.celestialParameters);
    terraformingGraphsManager.loadState(terraformingState.graphHistory);
  }
}));
