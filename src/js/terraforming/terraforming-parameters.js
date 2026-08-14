var terraformingParameters = {
  schemaVersion: 1,

  physical: {
    gravitationalConstant: 6.6743e-11,
    stefanBoltzmannConstant: 5.670374419e-8,
    universalGasConstant: 8.314462618,
    boltzmannConstant: 1.380649e-23,
    avogadroConstant: 6.02214076e23,
    atomicHydrogenMassKg: 1.6735575e-27,
    solarLuminosityW: 3.828e26,
    solarFluxAtEarthWm2: 1361,
    astronomicalUnitMeters: 149597870700,
    solarRadiusAu: 0.00465047,
    dryAirSpecificGasConstant: 287,
    dryAirSpecificHeatJPerKgK: 1004,
    waterToDryAirMolecularWeightRatio: 0.622,
    kgPerTon: 1000,
    gramsPerTon: 1000000,
    paPerAtmosphere: 101325
  },

  atmosphere: {
    molecularWeightGPerMol: {
      N2: 28.0134,
      O2: 31.9988,
      Ar: 39.948,
      CO2: 44.0095,
      CH4: 16.04246,
      NH3: 17.03052,
      H2: 2.01588,
      He: 4.0026,
      H2O: 18.01528,
      SF6: 146.06,
      H2SO4: 98.079,
      CaCO3: 100.0869,
      V2O5: 181.88
    },
    densityMolecularWeightGPerMol: {
      carbonDioxide: 44.0095,
      oxygen: 31.998,
      inertGas: 28.014,
      atmosphericWater: 18.01528,
      atmosphericMethane: 16.043,
      atmosphericAmmonia: 17.031,
      hydrogen: 2.016,
      greenhouseGas: 146.06,
      sulfuricAcid: 98.079,
      calciteAerosol: 100.0869,
      vanadiumAerosol: 181.88
    },
    specificHeatJPerKgK: {
      N2: 1040,
      O2: 918,
      Ar: 520,
      CO2: 844,
      CH4: 2220,
      NH3: 2060,
      H2: 14300,
      He: 5190,
      H2O: 1870,
      SF6: 658,
      H2SO4: 1400,
      CaCO3: 820,
      V2O5: 690
    },
    densityModel: {
      collisionCrossSectionM2: 2e-19,
      heavyTraceKeys: ['greenhouseGas', 'sulfuricAcid', 'calciteAerosol', 'vanadiumAerosol'],
      altitudeCacheStepMeters: 1000,
      enableEscapeTail: true,
      jeansLambdaTarget: 30,
      minimumEscapeScaleFactor: 0.02,
      enableWaterCondensation: true,
      relativeHumidity: 0.7,
      coldTrapRelativeHumidity: 0.1,
      adjustSurfacePressureForWaterCondensation: true,
      thermosphereBaseTemperatureK: 160,
      thermosphereSurfaceTemperatureCoefficient: 0.18,
      thermosphereReferenceSurfaceTemperatureK: 200
    },
    exosphere: {
      collisionCrossSectionM2: 2e-19,
      temperatureColumnScaleKgM2: 2000,
      asymptoticTemperatureK: 1437,
      temperatureFluxCoefficientPerJy: 9.57e-7,
      radioFluxAtOneAuJy: 1500000,
      jeansLambdaCutoff: 50,
      atomicHydrogenCollisionCrossSectionM2: 2e-19,
      molecularHydrogenCollisionCrossSectionM2: 3e-19,
      diffusionLimitAtomsM2Second: 2.5e17
    },
    aerobraking: {
      minimumAtmosphericColumnMassKgM2: 100,
      climateHeatDepositionFraction: 1,
      maximumTemperatureK: 10000,
      warningTemperatureRateKPerDay: 0.001
    },
    chemistry: {
      oxidation: {
        // Background sparks are always present; water clouds add lightning activity.
        maximumArrheniusMultiplier: 1e6,
        backgroundSparkActivity: 1,
        waterCloudSparkActivity: 2,
        combustionSpringMaximumFractionPerDay: 0.6,
        combustionSpringExponent: 2,
        combustionSpringSecondsPerDay: 86400,
        combustionWarningTemperatureRateKPerDay: 0.001,
        climateHeatDepositionFraction: 1,
        maximumCombustionTemperatureK: 10000,
        sparkReferenceTemperatureK: 298.15,
        minimumReactiveAtmosphereFraction: 0.2,
        fullReactiveAtmosphereFraction: 0.4,
        localMixingLogStandardDeviation: 0.55,
        localMixingSamples: [-2.5, -2, -1.5, -1, -0.5, 0, 0.5, 1, 1.5, 2, 2.5],
        flammabilityTemperatureCoefficientPerK: 0.0005,
        minimumFlammabilityTemperatureScale: 0.6,
        maximumFlammabilityTemperatureScale: 2,
        // Fuel/O2 molar limits reproduce the standard-air flammability ranges.
        reactions: {
          methane: {
            thermalRateCoefficient: 1e-15,
            heatReleaseJPerKg: 5.001e7,
            referenceTemperatureK: 813,
            activationTemperatureK: 18000,
            flammabilityPressureScalePa: 20000,
            leanFuelOxygenRatio: 0.2506,
            stoichiometricFuelOxygenRatio: 0.5,
            richFuelOxygenRatio: 0.8403
          },
          ammonia: {
            thermalRateCoefficient: 3e-16,
            heatReleaseJPerKg: 1.86e7,
            referenceTemperatureK: 923,
            activationTemperatureK: 16000,
            flammabilityPressureScalePa: 30000,
            leanFuelOxygenRatio: 0.8273,
            stoichiometricFuelOxygenRatio: 4 / 3,
            richFuelOxygenRatio: 2.399
          },
          hydrogen: {
            thermalRateCoefficient: 3e-15,
            heatReleaseJPerKg: 1.1996e8,
            referenceTemperatureK: 858,
            activationTemperatureK: 15000,
            flammabilityPressureScalePa: 10000,
            leanFuelOxygenRatio: 0.1984,
            stoichiometricFuelOxygenRatio: 2,
            richFuelOxygenRatio: 14.2857
          }
        }
      },
      calciteHalfLifeSeconds: 240,
      sulfuricAcidRainThresholdK: 570,
      sulfuricAcidReferenceTemperatureK: 300,
      sulfuricAcidReferenceHalfLifeSeconds: 300,
      sulfuricAcidRainWaterConversionFraction: 0.5,
      sulfuricAcidToWaterMassRatio: 18.01528 / 98.079,
      hydrogenPhotodissociationReferenceFluxWm2: 500,
      hydrogenPhotodissociationMaximumFraction: 0.6
    }
  },

  geometry: {
    minimumGravityMS2: 1e-12,
    minimumVolumeFraction: 0.01,
    fallbackDensityKgM3: 1000,
    minimumDensityKgM3: 1,
    liquidHydrogenCompression: {
      baseDensityKgM3: 71,
      maximumDensityKgM3: 1140,
      referenceMassKg: 1.2e27,
      startLog10MassKg: 20,
      exponent: 1.6
    },
    surfaceDensityKgM3: {
      liquidWater: 1000,
      ice: 917,
      dryIce: 1560,
      liquidCO2: 1100,
      liquidMethane: 450,
      hydrocarbonIce: 500,
      fineSand: 1600,
      liquidAmmonia: 680,
      ammoniaIce: 817,
      liquidOxygen: 1140,
      oxygenIce: 1426,
      liquidNitrogen: 810,
      nitrogenIce: 1030,
      biomass: 1100,
      hazardousBiomass: 1100,
      hazardousMachinery: 3000,
      graphite: 2260,
      scrapMetal: 7800,
      garbage: 300,
      trash: 300,
      junk: 500,
      radioactiveWaste: 10000
    },
    planetaryImportDensityKgM3: {
      metal: 7800,
      silicon: 2650
    }
  },

  phaseChange: {
    water: {
      latentHeatVaporizationJPerKg: 2.45e6,
      latentHeatSublimationJPerKg: 2.83e6,
      latentHeatFusionJPerKg: 3.34e5,
      solidSpecificHeatJPerKgK: 2100,
      liquidSpecificHeatJPerKgK: 4200,
      liquidDensityKgM3: 1000,
      liquidAlbedo: 0.06,
      solidAlbedo: 0.6,
      triplePointTemperatureK: 273.16,
      triplePointPressurePa: 611.657,
      criticalPointTemperatureK: 647.096,
      meltingPointK: 273.15,
      nearSurfaceVaporPressureMultiplier: 6.5,
      equilibriumCondensationParameter: 0.3094
    },
    carbonDioxide: {
      latentHeatVaporizationJPerKg: 3.75e5,
      latentHeatSublimationJPerKg: 5.90e5,
      latentHeatFusionJPerKg: 2.15e5,
      solidSpecificHeatJPerKgK: 850,
      liquidSpecificHeatJPerKgK: 2100,
      liquidDensityKgM3: 1100,
      liquidAlbedo: 0.10,
      solidAlbedo: 0.50,
      triplePointTemperatureK: 216.58,
      triplePointPressurePa: 5.185e5,
      criticalPointTemperatureK: 304.1282,
      criticalPointPressurePa: 7.3773e6,
      meltingPointK: 216.58,
      equilibriumCondensationParameter: 0.00019386130324835913
    },
    methane: {
      latentHeatVaporizationJPerKg: 5.1e5,
      latentHeatSublimationJPerKg: 5.87e5,
      latentHeatFusionJPerKg: 7.7e4,
      solidSpecificHeatJPerKgK: 2200,
      liquidSpecificHeatJPerKgK: 3500,
      liquidDensityKgM3: 450,
      liquidAlbedo: 0.1,
      solidAlbedo: 0.6,
      triplePointTemperatureK: 90.694,
      triplePointPressurePa: 0.11696e6,
      criticalPointTemperatureK: 190.564,
      criticalPointPressurePa: 4.5992e6,
      meltingPointK: 90.7,
      solidCorrelationMinimumTemperatureK: 48,
      equilibriumCondensationParameter: 3.586948746313331e-5
    },
    ammonia: {
      latentHeatVaporizationJPerKg: 1.37e6,
      latentHeatSublimationJPerKg: 1.65e6,
      latentHeatFusionJPerKg: 2.8e5,
      solidSpecificHeatJPerKgK: 2100,
      liquidSpecificHeatJPerKgK: 4700,
      liquidDensityKgM3: 680,
      liquidAlbedo: 0.12,
      solidAlbedo: 0.70,
      triplePointTemperatureK: 195.40,
      triplePointPressurePa: 6.06e3,
      criticalPointTemperatureK: 405.40,
      criticalPointPressurePa: 11.33e6,
      boilingPointTemperatureK: 239.81,
      boilingPointPressurePa: 101325,
      molarMassKgPerMol: 0.017031,
      meltingPointK: 195.4,
      equilibriumCondensationParameter: 0.002
    },
    hydrogen: {
      latentHeatVaporizationJPerKg: 4.45e5,
      latentHeatSublimationJPerKg: 5.04e5,
      latentHeatFusionJPerKg: 5.9e4,
      solidSpecificHeatJPerKgK: 9600,
      liquidSpecificHeatJPerKgK: 14300,
      triplePointTemperatureK: 13.957,
      triplePointPressurePa: 7.04e3,
      criticalPointTemperatureK: 33.19,
      criticalPointPressurePa: 1.315e6,
      boilingPointTemperatureK: 20.39,
      boilingPointPressurePa: 101325,
      supercriticalReferenceTemperatureK: 3000,
      supercriticalReferencePressurePa: 1e10,
      repartitionTonsPerPaM2Second: 1.18e-9,
      pressureToleranceFraction: 1e-10,
      minimumPressureTolerancePa: 1e-6,
      maximumPressureTolerancePa: 0.1
    },
    oxygen: {
      latentHeatVaporizationJPerKg: 2.13e5,
      latentHeatSublimationJPerKg: 2.70e5,
      latentHeatFusionJPerKg: 5.7e4,
      solidSpecificHeatJPerKgK: 920,
      liquidSpecificHeatJPerKgK: 1700,
      liquidDensityKgM3: 1140,
      liquidAlbedo: 0.15,
      solidAlbedo: 0.75,
      triplePointTemperatureK: 54.361,
      triplePointPressurePa: 1.146e3,
      criticalPointTemperatureK: 154.581,
      criticalPointPressurePa: 5.043e6,
      boilingPointTemperatureK: 90.188,
      boilingPointPressurePa: 101325,
      molarMassKgPerMol: 0.031998,
      equilibriumCondensationParameter: 0.002
    },
    nitrogen: {
      latentHeatVaporizationJPerKg: 1.99e5,
      latentHeatSublimationJPerKg: 2.60e5,
      latentHeatFusionJPerKg: 6.1e4,
      solidSpecificHeatJPerKgK: 1040,
      liquidSpecificHeatJPerKgK: 2000,
      liquidDensityKgM3: 810,
      liquidAlbedo: 0.12,
      solidAlbedo: 0.80,
      triplePointTemperatureK: 63.151,
      triplePointPressurePa: 1.253e4,
      criticalPointTemperatureK: 126.192,
      criticalPointPressurePa: 3.396e6,
      boilingPointTemperatureK: 77.355,
      boilingPointPressurePa: 101325,
      molarMassKgPerMol: 0.0280134,
      equilibriumCondensationParameter: 0.002
    },
    statisticalHumidity: {
      drySkewShape: 2,
      horizontalMixingFraction: 0.07
    },
    condensation: {
      phaseTransitionRangeK: 2,
      maximumTemperatureDifferenceK: 10,
      boilingTransitionRangeK: 2,
      liftPressureFraction: 0.65,
      adiabaticExponent: 0.286,
      secondsPerDay: 86400
    },
    penman: {
      defaultAlbedo: 0.6,
      aerodynamicResistanceSecondsPerMeter: 100,
      netRadiationFraction: 0.35
    },
    meltingAndFreezing: {
      meltingRatePerKSecond: 1e-7,
      freezingRatePerKSecond: 1e-7,
      buriedMeltCoverage: 0.1,
      buriedMeltRateFraction: 0.5
    },
    resourceCycle: {
      shallowBoilingDepthMeters: 0.05,
      shallowBoilingRatePerKSecond: 4.25e-6,
      defaultEvaporationAlbedo: 0.6,
      defaultSublimationAlbedo: 0.6,
      daytimeSolarFluxMultiplier: 2
    },
    surfaceFlow: {
      referencePlanetRadiusKm: 3389.5,
      tropicalBoundaryLatitudeDegrees: 23.5,
      polarBoundaryLatitudeDegrees: 66.5,
      boundaryInteractionDepthMeters: 200000,
      glacierFlowMeltMetersPerSecondK: 5e-8,
      baseFlowFractionPerDay: 0.001,
      hydrogenBaseFlowFractionPerDay: 0.005,
      secondsPerDay: 86400,
      viscosity: {
        water: 0.89,
        methane: 0.12,
        ammonia: 0.25,
        carbonDioxide: 0.07,
        hydrogen: 0.02
      }
    }
  },

  climate: {
    ocean: {
      waterDensityKgM3: 1000,
      waterVolumetricHeatCapacityJPerM3K: 4.2e6,
      defaultMixDepthMeters: 50
    },
    greenhouseTemperatureModel: {
      attenuationStartK: 360,
      attenuationScaleK: 100,
      attenuationExponent: 5,
      minTauFraction: 0.01,
      coldTauCap: 5000,
      hotTauCap: 20,
      tauCapTransitionK: 300,
      tauCapExponent: 4
    },
    dayNightVariation: {
      minimumColumnMassKgM2: 1,
      baseDivisor: 0.75,
      columnMassCoefficient: 0.255,
      columnMassExponent: 2.91
    },
    meridionalMixing: {
      referenceColumnMassKgM2: 1.03e4,
      columnMassRate: 0.115,
      columnMassExponent: 0.50,
      maximumRotationFactor: 3,
      minimumRotationPeriodRatio: 0.5,
      referenceRotationPeriodHours: 24,
      maximumMixFraction: 0.999
    },
    albedo: {
      maximumBondAlbedo: 0.9,
      softcapThreshold: 0.8,
      softcapStrength: 2,
      methaneHazeMaximum: 0.25,
      methaneHazeSaturation: 0.2,
      calciteHeadroomMaximum: 0.2,
      calciteSaturation: 0.0001,
      carbonDioxideHighColumnFactor: 1,
      methaneShortwaveRate: 2,
      methaneSaturationColumnKgM2: 4,
      calciteMassExtinctionM2Kg: 1500,
      hazeCoverageRate: 5.5,
      calciteOptics: { singleScatteringAlbedo: 0.90, asymmetry: 0.70 }
    },
    greenhouse: {
      referenceColumnMassKgM2: 5e4,
      pressureExponent: 0.55,
      pressureExponentByGas: { h2o: 0.45 },
      strength: { h2o: 20, co2: 10, ch4: 22, greenhousegas: 100 },
      saturationColumnKgM2: { ch4: 3 },
      saturationExponent: { ch4: 1 }
    },
    cloudSpecies: {
      h2o: { refMix: 0.004, cfMax: 0.99, pScale: 0.6, aBase: 0.69, aVar: 0.03, fractionExponent: 0.5, layerMax: 0.6, coverageExponent: 1 },
      ch4: { refMix: 0.02, cfMax: 0.14, pScale: 2.5, aBase: 0.58, aVar: 0.08, layerMax: 0.10, coverageExponent: 1.2 },
      h2so4: { refMix: 1e-4, cfMax: 0.99, pScale: 11, aBase: 0.71, aVar: 0.03, fractionExponent: 0.5, layerMax: 0.76, coverageExponent: 1.6 }
    },
    surfaceAlbedo: {
      ocean: 0.06,
      ice: 0.65,
      snow: 0.85,
      co2_ice: 0.50,
      hydrocarbon: 0.10,
      hydrocarbonIce: 0.50,
      hydrogen: 0.08,
      ammonia: 0.12,
      ammoniaIce: 0.70,
      oxygen: 0.15,
      oxygenIce: 0.80,
      nitrogen: 0.12,
      nitrogenIce: 0.80,
      fineSand: 0.45,
      biomass: 0.20
    }
  },

  gameplay: {
    solar: {
      diskGrazingFluxFactor: 2 / (3 * Math.PI),
      solarPanelBaseLuminosity: 1000,
      backgroundSolarFluxWm2: 6e-6
    },
    temperature: {
      comfortableMinimumK: 288.15,
      comfortableMaximumK: 293.15,
      maintenancePenaltyThresholdK: 373.15,
      maintenancePenaltyExponentialThresholdK: 973.15,
      maintenancePenaltyLinearRatePerK: 0.01,
      maintenancePenaltyDoublingIntervalK: 100,
      maintenancePenaltyMaximumMultiplier: 1e9
    },
    gravityPenalty: {
      linearThresholdMS2: 10,
      exponentialThresholdMS2: 20,
      linearRatePerMS2: 0.1,
      exponentialDoublingIntervalMS2: 10,
      maximumCostMultiplier: 1e12,
      equatorialWeight: 0.25,
      surfaceWeight: 0.75
    },
    surfaceHeat: {
      minimumHeatCapacityJPerM2K: 100,
      automaticAtmosphereSpecificHeatJPerKgK: 850,
      megaHeatSinkPowerW: 1e15
    },
    simulation: {
      resourceSubstepMs: 20,
      maximumResourceSubsteps: 24,
      equilibriumSnapEnabled: false,
      equilibriumSnapRateTonsPerSecond: 0.01
    },
    landReservation: {
      moltenWorldFullTemperatureK: 1273.15,
      moltenWorldClearTemperatureK: 973.15
    },
    radiationPenalty: {
      halfInhibitionDoseMsvPerDay: 1.07,
      curvatureExponent: 1.12
    },
    coverage: {
      defaultScale: 0.0001,
      curveBreakpoint: 0.002926577381,
      linearSlope: 50,
      logarithmicIntercept: 1
    },
    zones: {
      tropicalBoundaryLatitudeDegrees: 23.5,
      polarBoundaryLatitudeDegrees: 66.5,
      diskIntegrationSteps: 1000
    }
  },

  hazards: {
    hazardousBiomass: {
      crusaderRemovalPerSecond: 5,
      minimumCrusadersWhenActive: 10
    },
    hazardousMachinery: {
      initialCoverage: 1,
      maximumCoverageBase: 1,
      waterCoveragePenalty: 0.5,
      legacyInvasivenessMaximum: 30,
      legacyTemperatureMaximumC: 500,
      legacyOxygenDecayCoefficient: 1e-24,
      crusaderRemovalPerSecond: 0.5,
      researchToDisableCost: 10000,
      penalties: {
        availableAndroidDecayRate: 0.05,
        nanoColonyGrowthMultiplier: 0,
        researchMultiplier: 0.1,
        buildCostMultiplier: 1,
        electronicsMaintenanceMultiplier: 100,
        shipWorkersPerAssignedShip: 5
      }
    },
    garbage: {
      hideWhenSmallThreshold: 1e-4
    },
    kessler: {
      clearThresholdTons: 0.01,
      solisResourceCap: 1000,
      solisWaterKeep: 1000,
      solisCappedResources: ['food', 'components', 'electronics', 'glass', 'androids'],
      failureBaseDebrisPerLand: 100,
      smallProjectBaseSuccess: 0.3,
      largeProjectBaseSuccess: 0.02,
      periapsisSampleCount: 64,
      debrisDecayBaseRatePerSecond: 1 / 3600,
      debrisDensityCenter: 1e-13,
      debrisDensitySearchMaximum: 50000000,
      debrisDecayDensityReference: 1e-12,
      distributionDragLineMinimumMeters: 10000,
      distributionMeanMinimumMeters: 12000,
      debrisDecayDensityFloor: 1e-20,
      debrisDecayMaximumMultiplier: 100,
      binRegenerationCapEpsilon: 1e-9
    },
    pulsar: {
      stormPeriodSeconds: 100,
      stormDefaultDurationSeconds: 5,
      androidAttritionRate: 0.03,
      electronicsAttritionRate: 0.03,
      nanobotAttritionRate: 0.03,
      stormSalvageResources: { scrapMetal: true, junk: true },
      defaultSeverity: 1,
      orbitalDoseBoostMsvPerDay: 4900,
      pulsePeriodSeconds: 1.337,
      clearAtDistanceAu: 0
    },
    debrisDisk: {
      structureMinimum: 10,
      aerostatMinimum: 500,
      colonyResourceMinimum: 10000,
      defaultKesslerRegenerationRatePerBinPerSecond: 0.001,
      attritionRatePerSecond: 0.01,
      colonistGrowthPenalty: 0.9,
      debrisPerLand: 1e10,
      initialDebrisTons: 0
    }
  }
};
