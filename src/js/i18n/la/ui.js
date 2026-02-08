registerTranslations('la', {
  tabs: {
    buildings: 'Aedificia Lorem',
    projects: 'Projecta Specialia',
    settings: 'Lorem et Ipsum'
  },
  projectsTab: {
    subtabs: {
      resources: 'Opes',
      infrastructure: 'Infrastructura',
      mega: 'Mega',
      giga: 'Giga',
      story: 'Fabula'
    },
    card: {
      requirements: 'Requisita:',
      cost: 'Sumptus:',
      gain: 'Lucrum:',
      sustain: 'Sustinere: {value}',
      sustainTooltip: 'Project pausat si sustain cost non impletur.',
      autoStart: 'Auto start',
      run: 'Curre',
      enableExtraSettings: 'Settings extra enable',
      uncheckOnTravel: 'In travel uncheck',
      allowColonyEnergy: 'Permitte usum energiae coloniae',
      totalGain: 'Lucrum Totale: ',
      totalCost: 'Sumptus Totalis: ',
      totalCostWithItems: 'Sumptus Totalis: {value}',
      totalGainWithItems: 'Lucrum Totale: {value}',
      spaceshipsAssigned: 'Naves Assignatae: {assigned}',
      spaceshipsAssignedWithMax: 'Naves Assignatae: {assigned}/{max}',
      averageDepth: 'Profunditas media: {current} / {max}',
      completedCount: 'Completa: {current} / {max}'
    },
    warnings: {
      kesslerImportColonists: 'Project hic propter Kessler Skies limitatur. Importationes ad 100 per cursum per warpgate parvum limitantur.',
      kesslerWarpgateReplica: 'Project hic propter Kessler Skies limitatur. Facultates eius per warpgate parvum replicantur.',
      kesslerFailureChance: 'Kessler Skies: {percent}% casus defectus projecti.'
    },
    status: {
      maxDepthReached: 'Profunditas maxima attacta',
      completedShort: 'Completum',
      completedNamed: 'Completum: {name}',
      disabledByKessler: 'A Kessler disable',
      stopped: 'Stetit',
      productivitySuffix: ' ({percent}% productivitas)',
      continuous: 'Continuum{productivity}',
      inProgressShort: 'In progressu: {seconds} secunda restant',
      inProgressPercent: 'In progressu: {seconds} secunda restant ({percent}%)',
      resumeStorageExpansion: 'Resume expansionem storage ({seconds}s restant)',
      resumeNamed: 'Resume {name} ({seconds}s restant)',
      resumeShort: 'Resume ({seconds}s restant)',
      startStorageExpansion: 'Incipe expansionem storage (Duratio: {seconds} secunda)',
      startNamed: 'Incipe {name} (Duratio: {seconds} secunda)',
      startShort: 'Incipe (Duratio: {seconds} secunda)'
    },
    empty: {
      nothingAvailable: 'Nihil nunc praesto.'
    },
    settings: {
      megaProjectMode: {
        spaceFirst: 'Prioriza opes spatii pro mega+ projectis',
        colonyFirst: 'Prioriza opes coloniae pro mega+ projectis',
        spaceOnly: 'Solum opes spatii pro mega+ projectis',
        colonyOnly: 'Solum opes coloniae pro mega+ projectis'
      }
    }
  },
  buildingsTab: {
    subtabs: {
      categoryHeader: '{category} Aedificia',
      unhideObsolete: 'Revela Aedificia Obsoleta',
      categories: {
        resource: 'Opes',
        production: 'Productio',
        energy: 'Energia',
        storage: 'Repositorium',
        terraforming: 'Terraformatio',
        waste: 'Vastum'
      }
    },
    card: {
      build: 'Conde',
      controls: 'Regimina',
      hide: 'Occulta',
      reverse: 'Reverte',
      upgrade: 'Meliora',
      autoBuild: 'Auto-Conde',
      autoUpgrade: 'Auto-Meliora',
      constructed: 'Constructa',
      productivity: 'Productivitas',
      biodomeLifeWarning: '⚠ Activa Vita Forma Requiritur ⚠',
      priority: 'Prioritas : ',
      setActiveToTarget: 'Activa ad scopum pone',
      setTargetToActive: 'Scopum ad activa pone',
      cost: 'Sumptus:'
    },
    autoBuild: {
      target: {
        maxFill: 'Max imple : {percent}%',
        max: 'Scopum : Max',
        count: 'Scopum : {value}'
      },
      basis: {
        fill: '% impletum',
        population: '% populi',
        workers: '% operariorum',
        workerShare: '% pars operariorum',
        landShare: '% pars terrae',
        initialLand: '% terra initio',
        fixed: 'Fixum',
        max: 'Max',
        ofBuilding: '% de {name}'
      },
      fillFilters: {
        primary: 'Primus',
        secondary: 'Secundus',
        any: 'Quivis',
        none: 'Nullus'
      }
    },
    prodCons: {
      provides: 'Praebet',
      production: 'Productio',
      consumption: 'Consumptio',
      maintenance: 'Sustentatio',
      solarFlux: '{value} W/m² fluxus solaris'
    },
    resources: {
      workers: 'Operarii',
      land: 'Terra',
      deposit: 'Deposita'
    },
    modules: {
      units: {
        ton: 'ton',
        Pa: 'Pa',
        kPa: 'kPa'
      },
      waterTank: {
        empty: 'Exhauri'
      },
      antimatterBattery: {
        fill: 'Imple'
      },
      multiRecipe: {
        recipeLabel: 'Receta: '
      },
      oxygenFactory: {
        disableIfPressureAbove: 'Disable si O2 P > '
      },
      dustFactory: {
        targetGroundAlbedo: 'Albedo terrae scopus:',
        dustColor: 'Color pulveris:',
        resourceNameCustom: 'Pulvis Custom',
        resourceNameBlack: 'Pulvis Niger'
      },
      solarPanel: {
        tooltip: {
          limit: 'Tabulae solares ad 10× terrae initium limitantur.'
        }
      },
      windTurbine: {
        tooltip: {
          limit: 'Turbinae venti ad 1 per 50 terrae initium limitantur.'
        }
      },
      dysonReceiver: {
        tooltip: {
          noCollectors: 'Construhe collectores Dyson Swarm vel Dyson Sphere ut capacitas receiver augeatur.',
          swarmPart: '{value} swarm',
          spherePart: '{value} sphere',
          capSummary: 'Dyson receiver constructiones a collectoribus swarm et sphere limitantur; hunc cap superare non potes. {collectors}{breakdown} collectores {cap} receivers permittunt.'
        }
      },
      ghgFactory: {
        mode: {
          avgTemperature: 'temp media',
          opticalDepth: 'profunditas optica'
        },
        automatePrefix: 'Automate ',
        disableIfPrefix: 'Disable si ',
        betweenSuffix: ' inter ',
        greaterSuffix: ' > ',
        and: ' et ',
        unit: {
          tau: 'tau'
        },
        tooltip: 'Cum reversio praesto est, bureau terraformationis hanc fabricam automare permittit. Potes ponere intervallum temperaturae mediae vel profunditatis opticae, et solver conabitur trend in hoc intervallo ponere. Profunditas optica aerosola calcitis ignorat et ea prius purgabit si GHG augere debet. Convergere tempus capere potest. Premere "reverse" automationem hanc disable faciet. Cum Space Mirror advanced oversight, melius est intervalla compatibilia esse.'
      },
      chemicalReactor: {
        disableIf: 'Disable si',
        mode: {
          input: 'Input',
          output: 'Output'
        }
      },
      aerostat: {
        buoyancyNotes: 'Aerostata immunia sunt poenis pressionis et temperaturae, sed plus componentium, electronicorum et lift requirunt. Aerostata parvas communitates formant ad usum fabricarum. Investigationes coloniae aerostata etiam meliorant. Aerostata saltem 50 kPa pressionis ambientis ad buoyancy requirunt. Cum lift deficit, aerostata activa in Research Outposts terram capere possunt si optio activa est et terra sufficit.',
        landLimitTooltip: 'Ad summum 25% terrae initialis planetariae colonias aerostaticas hospitare potest ad periculum collisionis minuendum.',
        temperatureTooltipIntro: 'Aerostata poenas sustentationis temperatura pro fabricis staffed (ore mines exclusis) per capacitatem colonistarum minuunt. Quaedam aedificia valorem aerostat support habent; unumquodque aerostatum activum tot structuras tegit antequam poenae applicantur.',
        landAsResearchOutpost: 'Terra ut Research Outpost',
        summary: {
          pending: 'Telemetria buoyancy pendet.',
          pressureBelowCurrent: '▲ Pressio atmosphaerica nunc {currentPressure} kPa est, sub minimo {minPressure} kPa pro buoyancy aerostatica. ▲',
          pressureBelow: '▲ Pressio atmosphaerica sub minimo {minPressure} kPa pro buoyancy aerostatica est. ▲',
          liftBelow: '▲ Lift nunc sub minimo operationali est, activationem et constructionem aerostaticam prohibens. ▲'
        },
        title: 'Detalia Aerostatorum',
        currentLift: 'Lift Nunc:',
        temperatureMitigation: 'Mitigatio Sustentationis Temperaturae:',
        maximumAerostats: 'Maximum Aerostata:',
        notAvailable: 'N/A',
        tooltip: {
          liftIntro: 'Lift specificus ad 1 atm et 21°C ex compositione atmosphaerica currenti contra aerem respirabilem.',
          externalMolWeight: 'Pondus moleculare externum medium: {value} g/mol.',
          currentLift: 'Lift nunc: {value} kg/m³.',
          shutdownThreshold: 'Limes shutdown aerostaticus: {value} kg/m³.',
          minPressure: 'Aerostata saltem {value} kPa pressionis superficialis ad buoyancy requirunt.',
          mitigationDataUnavailable: 'Data mitigationis non praesto.',
          activeAerostats: 'Aerostata activa: {value}.',
          factoryMitigationDataUnavailable: 'Data mitigationis fabricae non praesto.',
          factoryMitigationApplied: 'Mitigatio fabricae applicata: {value}% poenae negatur.',
          mitigationLimited: 'Mitigatio limitatur capacitate colonistarum aerostaticorum comparata requisitis operariorum staffed.',
          mitigationFull: 'Omnia aedificia staffed nunc poenam sustentationis temperaturae vitant.',
          supportedBuildings: 'Aedificia aerostatice sustentata:',
          supportedBuildingEntry: '• {name}: {supported} ex {active} activis tecta (sustinere potest {capacity}; {perAerostat} per aerostatum).',
          noSupportedBuildings: 'Nulla aedificia nunc valorem Aerostat Support habent.',
          remainingCapacity: 'Capacitas aerostatica residua: {value}.'
        }
      }
    },
    tooltips: {
      randomWorld: 'Mundus Fortuitus',
      randomWorldNamed: 'Mundus Fortuitus: {name}',
      wgcRD: 'Warp Gate Command R&D',
      unknownEffect: 'Effectus ignotus',
      baseCost: 'Sumptus basis: {value}',
      baseProduction: 'Productio basis: {value}',
      baseWorkers: 'Operarii basis: {value}',
      addedWorkers: 'Operarii additi: {value}',
      innateMaintenance: 'Multiplicator sustentationis innatus: x{value}',
      multipliers: 'Multiplicatores:',
      multipliersNone: 'Multiplicatores: nulli',
      kesslerWarning: 'Sumptus Kessler x{multiplier} debris creabit',
      debrisFromBuild: 'Debris ex hoc opere: +{value} t',
      costMultiplierTransition: 'Multiplicator sumptus: {current}x -> {next}x',
      smallFailureTransition: 'Parvum opus deficit: {current}% -> {next}%',
      largeFailureTransition: 'Magnum opus deficit: {current}% -> {next}%'
    },
    empty: {
      allHidden: 'Omnia occulta',
      nothingAvailable: 'Nihil nunc praesto.'
    }
  },
  buildingsParameters: {
    oreMine: {
      name: 'Aedificium 1',
      description: 'Lorem ipsum descriptio oreMine.',
    },
    sandQuarry: {
      name: 'Aedificium 2',
      description: 'Lorem ipsum descriptio sandQuarry.',
    },
    iceHarvester: {
      name: 'Aedificium 3',
      description: 'Lorem ipsum descriptio iceHarvester.',
    },
    waterPump: {
      name: 'Aedificium 4',
      description: 'Lorem ipsum descriptio waterPump.',
    },
    atmosphericWaterCollector: {
      name: 'Aedificium 5',
      description: 'Lorem ipsum descriptio atmosphericWaterCollector.',
    },
    glassSmelter: {
      name: 'Aedificium 6',
      description: 'Lorem ipsum descriptio glassSmelter.',
    },
    hydroponicFarm: {
      name: 'Aedificium 7',
      description: 'Lorem ipsum descriptio hydroponicFarm.',
    },
    componentFactory: {
      name: 'Aedificium 8',
      description: 'Lorem ipsum descriptio componentFactory.',
    },
    electronicsFactory: {
      name: 'Aedificium 9',
      description: 'Lorem ipsum descriptio electronicsFactory.',
    },
    grapheneFactory: {
      name: 'Aedificium 10',
      description: 'Lorem ipsum descriptio grapheneFactory.',
    },
    superconductorFactory: {
      name: 'Aedificium 11',
      description: 'Lorem ipsum descriptio superconductorFactory.',
    },
    superalloyFoundry: {
      name: 'Aedificium 12',
      description: 'Lorem ipsum descriptio superalloyFoundry.',
    },
    androidFactory: {
      name: 'Aedificium 13',
      description: 'Lorem ipsum descriptio androidFactory.',
    },
    shipyard: {
      name: 'Aedificium 14',
      description: 'Lorem ipsum descriptio shipyard.',
    },
    cloningFacility: {
      name: 'Aedificium 15',
      description: 'Lorem ipsum descriptio cloningFacility.',
    },
    solarPanel: {
      name: 'Aedificium 16',
      description: 'Lorem ipsum descriptio solarPanel.',
    },
    windTurbine: {
      name: 'Aedificium 17',
      description: 'Lorem ipsum descriptio windTurbine.',
    },
    geothermalGenerator: {
      name: 'Aedificium 18',
      description: 'Lorem ipsum descriptio geothermalGenerator.',
    },
    hydrocarbonGenerator: {
      name: 'Aedificium 19',
      description: 'Lorem ipsum descriptio hydrocarbonGenerator.',
    },
    nuclearPowerPlant: {
      name: 'Aedificium 20',
      description: 'Lorem ipsum descriptio nuclearPowerPlant.',
    },
    dysonReceiver: {
      name: 'Aedificium 21',
      description: 'Lorem ipsum descriptio dysonReceiver.',
    },
    fusionPowerPlant: {
      name: 'Aedificium 22',
      description: 'Lorem ipsum descriptio fusionPowerPlant.',
      recipes: {
        water: {
          shortName: 'Receta water',
        },
        hydrogen: {
          shortName: 'Receta hydrogen',
        },
      },
    },
    superalloyFusionReactor: {
      name: 'Aedificium 23',
      description: 'Lorem ipsum descriptio superalloyFusionReactor.',
      recipes: {
        water: {
          shortName: 'Receta water',
        },
        hydrogen: {
          shortName: 'Receta hydrogen',
        },
      },
    },
    antimatterFarm: {
      name: 'Aedificium 24',
      description: 'Lorem ipsum descriptio antimatterFarm.',
    },
    battery: {
      name: 'Aedificium 25',
      description: 'Lorem ipsum descriptio battery.',
    },
    storageDepot: {
      name: 'Aedificium 26',
      description: 'Lorem ipsum descriptio storageDepot.',
    },
    waterTank: {
      name: 'Aedificium 27',
      description: 'Lorem ipsum descriptio waterTank.',
    },
    hydrogenBattery: {
      name: 'Aedificium 28',
      description: 'Lorem ipsum descriptio hydrogenBattery.',
    },
    antimatterBattery: {
      name: 'Aedificium 29',
      description: 'Lorem ipsum descriptio antimatterBattery.',
    },
    androidHousing: {
      name: 'Aedificium 30',
      description: 'Lorem ipsum descriptio androidHousing.',
    },
    dustFactory: {
      name: 'Aedificium 31',
      description: 'Lorem ipsum descriptio dustFactory.',
      recipes: {
        black: {
          displayName: 'Receta black',
        },
        white: {
          displayName: 'Receta white',
        },
      },
    },
    spaceMirror: {
      name: 'Aedificium 32',
      description: 'Lorem ipsum descriptio spaceMirror.',
    },
    hyperionLantern: {
      name: 'Aedificium 33',
      description: 'Lorem ipsum descriptio hyperionLantern.',
    },
    ghgFactory: {
      name: 'Aedificium 34',
      description: 'Lorem ipsum descriptio ghgFactory.',
      recipes: {
        ghg: {
          displayName: 'Receta ghg',
        },
        calcite: {
          displayName: 'Receta calcite',
        },
      },
    },
    oxygenFactory: {
      name: 'Aedificium 35',
      description: 'Lorem ipsum descriptio oxygenFactory.',
      recipes: {
        water: {
          shortName: 'Receta water',
        },
        silicates: {
          shortName: 'Receta silicates',
        },
        rocks: {
          shortName: 'Receta rocks',
        },
      },
    },
    boschReactor: {
      name: 'Aedificium 36',
      description: 'Lorem ipsum descriptio boschReactor.',
      recipes: {
        recipe1: {
          shortName: 'Receta recipe1',
        },
        recipe2: {
          shortName: 'Receta recipe2',
        },
        recipe3: {
          shortName: 'Receta recipe3',
        },
        haberBosch: {
          shortName: 'Receta haberBosch',
        },
        ammoniaCombustion: {
          shortName: 'Receta ammoniaCombustion',
        },
      },
    },
    massDriver: {
      name: 'Aedificium 37',
      description: 'Lorem ipsum descriptio massDriver.',
    },
    biodome: {
      name: 'Aedificium 38',
      description: 'Lorem ipsum descriptio biodome.',
    },
    scrapRecycler: {
      name: 'Aedificium 39',
      description: 'Lorem ipsum descriptio scrapRecycler.',
    },
    garbageSorter: {
      name: 'Aedificium 40',
      description: 'Lorem ipsum descriptio garbageSorter.',
    },
    trashIncinerator: {
      name: 'Aedificium 41',
      description: 'Lorem ipsum descriptio trashIncinerator.',
      recipes: {
        trash: {
          shortName: 'Receta trash',
        },
        hazardousBiomass: {
          shortName: 'Receta hazardousBiomass',
        },
      },
    },
    junkRecycler: {
      name: 'Aedificium 42',
      description: 'Lorem ipsum descriptio junkRecycler.',
    },
    radioactiveRecycler: {
      name: 'Aedificium 43',
      description: 'Lorem ipsum descriptio radioactiveRecycler.',
    },
    laserCannon: {
      name: 'Aedificium 44',
      description: 'Lorem ipsum descriptio laserCannon.',
    },
  },
  projectsParameters: {
    cargo_rocket: {
      name: 'Lorem Cargo Rocket',
      description: 'Lorem ipsum descriptio cargo_rocket.',
    },
    galactic_market: {
      name: 'Lorem Galactic Market',
      description: 'Lorem ipsum descriptio galactic_market.',
    },
    import_colonists_1: {
      name: 'Lorem Import colonists',
      description: 'Lorem ipsum descriptio import_colonists_1.',
    },
    exportResources: {
      name: 'Lorem Metal Exportation',
      description: 'Lorem ipsum descriptio exportResources.',
    },
    satellite: {
      name: 'Lorem Ore satellite',
      description: 'Lorem ipsum descriptio satellite.',
    },
    geo_satellite: {
      name: 'Lorem Geothermal satellite',
      description: 'Lorem ipsum descriptio geo_satellite.',
    },
    spaceMirrorFacility: {
      name: 'Lorem Space mirror facility',
      description: 'Lorem ipsum descriptio spaceMirrorFacility.',
    },
    ringworldTerraforming: {
      name: 'Lorem Ringworld Terraforming',
      description: 'Lorem ipsum descriptio ringworldTerraforming.',
    },
    deeperMining: {
      name: 'Lorem Deeper mining',
      description: 'Lorem ipsum descriptio deeperMining.',
    },
    undergroundExpansion: {
      name: 'Lorem Underground Land Expansion',
      description: 'Lorem ipsum descriptio undergroundExpansion.',
    },
    oreSpaceMining: {
      name: 'Lorem Metal Asteroid Mining',
      description: 'Lorem ipsum descriptio oreSpaceMining.',
    },
    siliconSpaceMining: {
      name: 'Lorem Silica Asteroid Mining',
      description: 'Lorem ipsum descriptio siliconSpaceMining.',
    },
    carbonSpaceMining: {
      name: 'Lorem Carbon Asteroid Mining',
      description: 'Lorem ipsum descriptio carbonSpaceMining.',
    },
    waterSpaceMining: {
      name: 'Lorem Ice and Water importation',
      description: 'Lorem ipsum descriptio waterSpaceMining.',
    },
    nitrogenSpaceMining: {
      name: 'Lorem Nitrogen harvesting',
      description: 'Lorem ipsum descriptio nitrogenSpaceMining.',
    },
    hydrogenSpaceMining: {
      name: 'Lorem Hydrogen Importation',
      description: 'Lorem ipsum descriptio hydrogenSpaceMining.',
    },
    spaceElevator: {
      name: 'Lorem Space Elevator',
      description: 'Lorem ipsum descriptio spaceElevator.',
    },
    magneticShield: {
      name: 'Lorem Magnetic Shield',
      description: 'Lorem ipsum descriptio magneticShield.',
    },
    planetaryThruster: {
      name: 'Lorem Planetary Thrusters',
      description: 'Lorem ipsum descriptio planetaryThruster.',
    },
    dysonSwarmReceiver: {
      name: 'Lorem Dyson Swarm',
      description: 'Lorem ipsum descriptio dysonSwarmReceiver.',
    },
    dysonSphere: {
      name: 'Lorem Dyson Sphere',
      description: 'Lorem ipsum descriptio dysonSphere.',
    },
    hephaestusMegaconstruction: {
      name: 'Lorem Hephaestus Megaconstruction Yard',
      description: 'Lorem ipsum descriptio hephaestusMegaconstruction.',
    },
    orbitalRing: {
      name: 'Lorem Orbital Ring',
      description: 'Lorem ipsum descriptio orbitalRing.',
    },
    spaceStorage: {
      name: 'Lorem Space Storage',
      description: 'Lorem ipsum descriptio spaceStorage.',
    },
    particleAccelerator: {
      name: 'Lorem Particle Accelerator',
      description: 'Lorem ipsum descriptio particleAccelerator.',
    },
    megaHeatSink: {
      name: 'Lorem Mega Heat Sink',
      description: 'Lorem ipsum descriptio megaHeatSink.',
    },
    lifters: {
      name: 'Lorem Lifters',
      description: 'Lorem ipsum descriptio lifters.',
    },
    bioworld: {
      name: 'Lorem Bioworld',
      description: 'Lorem ipsum descriptio bioworld.',
    },
    foundryWorld: {
      name: 'Lorem Foundry World',
      description: 'Lorem ipsum descriptio foundryWorld.',
    },
    disposeResources: {
      name: 'Lorem Resource Disposal',
      description: 'Lorem ipsum descriptio disposeResources.',
    },
  },
  resourcesPanel: {
    categories: {
      colony: 'Lorem Colony Opes',
      surface: 'Lorem Surface Opes',
      underground: 'Lorem Underground Opes',
      atmospheric: 'Lorem Atmospheric Opes',
      special: 'Lorem Special Opes'
    },
    tooltip: {
      notes: {
        landRecover: 'Terra recuperari potest si aedificium respondens exstinguitur',
        wasteProcessing: 'Aedificia vasti consumptionem monstrant ex operariis et energia praesto, carentias vasti ignorando.  Hic numeri non sunt vera consumptio.'
      },
      sections: {
        production: 'Productio:',
        consumptionMaintenance: 'Consumptio et Sustentatio:',
        overflow: 'Excessus:',
        autobuildCost: 'Sumptus Autobuild (avg 10s):',
        total: 'Totale :',
        assignments: 'Assignationes:'
      },
      assignments: {
        workersRatio: '{percent}% colonistarum operarios praebent',
        fromColonists: '{value} ex colonistis',
        fromAndroids: '{value} ex androidis',
        fromBioworkers: '{value} ex bioworkers',
        total: 'Totale {value}',
        unassigned: 'Non assignata {value}'
      },
      resources: {
        workers: 'Operarii'
      },
      warnings: {
        biomassDyingZones: 'Biomassa in zona {zones} moritur{suffix}.',
        androidCap: 'Productio androidum cap currentem attigit.',
        autobuildShortage: 'Autobuild inputis requisitis caret pro constructione in queue.',
        biomassLimiter: 'Crescentia biomassae per disponibilitatem {resource} limitatur{scope}.',
        scopeZones: ' in zona {zones}{suffix}',
        scopeAtmospheric: ' per atmosphaeram',
        aerostat: {
          pressureBelow: '▲ Aerostata activa tantum {pressure} kPa pressionis superficiei habent, sub minimo {minPressure} kPa ad buoyancy necessaria. ▲',
          liftBelowMinimum: '▲ Aerostata activa tantum {lift} kg/m³ lift habent, sub minimo {minLift} kg/m³ ad volandum necessaria. ▲',
          liftBelowSafety: 'Aerostata activa tantum {lift} kg/m³ lift habent, sub margine securitatis {warningLift} kg/m³.'
        },
        hydrogen: {
          base: 'Hydrogenium lente in spatium effugit secundum fluxum solarem et gravitatem.',
          photodissociation: 'UV stellarum usque ad {percent}% illius gasi photodissociare potest, atomos creans qui circa {speedup}× celerius quam moleculae effugiunt.',
          gravityLow: ', ita continua imminutio exspectanda est.',
          gravityHigh: ', ita atmosphaera hydrogenium retinere potest.',
          gravitySentence: 'Gravitas currentis est {gravity} m/s²{relation}',
          solarHigh: 'photodissociationem huius amissionis accelerans',
          solarLow: 'plurimum hydrogenii moleculare servans et amissionem tardans',
          solarSentence: 'Fluxus solaris est {flux} W/m², {effect}.'
        }
      },
      scanningProgress: 'Progressus Scanning: {percent}%',
      rates: {
        unstable: 'Instabilis'
      },
      values: {
        available: 'Praesto {value}',
        used: 'Usus {value}',
        hazardousBiomass: 'Biomassa periculosa {value}',
        value: 'Valor {value}{unit}'
      },
      time: {
        toTerraformingTarget: 'Tempus ad scopum terraformationis {label}: {duration}',
        terraformingTargetReached: 'Scopus terraformationis {label} attingitur.',
        toTargetPressure: 'Tempus ad pressionem scopi: {duration}',
        targetReached: 'Scopus terraformationis attingitur.',
        toFullUnstable: 'Tempus ad plenum : instabile.',
        toFull: 'Tempus ad plenum: {duration}',
        toEmpty: 'Tempus ad vacuum: {duration}'
      },
      zones: {
        header: 'Quantitates Zonales:',
        row: '{zone}: {value}',
        rowSurfaceBuried: '{zone}: {surface} / {buried} ({label})',
        surfaceBuried: 'superficies/sepulta',
        names: {
          tropical: 'Tropica',
          temperate: 'Temperata',
          polar: 'Polaris'
        }
      },
      net: {
        includingAutobuild: 'Mutatio Neta (cum autobuild):'
      },
      limits: {
        importsAutomation: 'Importationes a setting automationis limitantur'
      },
      sources: {
        lifting: 'Elevatio'
      }
    }
  },
  resourcesParameters: {
    colony: {
      funding: 'Lorem funding',
      colonists: 'Lorem colonists',
      workers: 'Lorem workers',
      energy: 'Lorem energy',
      metal: 'Lorem metal',
      silicon: 'Lorem silicon',
      glass: 'Lorem glass',
      water: 'Lorem water',
      food: 'Lorem food',
      components: 'Lorem components',
      electronics: 'Lorem electronics',
      superconductors: 'Lorem superconductors',
      superalloys: 'Lorem superalloys',
      androids: 'Lorem androids',
      research: 'Lorem research',
      advancedResearch: 'Lorem advancedResearch',
    },
    surface: {
      land: 'Lorem land',
      ice: 'Lorem ice',
      liquidWater: 'Lorem liquidWater',
      dryIce: 'Lorem dryIce',
      liquidCO2: 'Lorem liquidCO2',
      liquidMethane: 'Lorem liquidMethane',
      hydrocarbonIce: 'Lorem hydrocarbonIce',
      liquidAmmonia: 'Lorem liquidAmmonia',
      ammoniaIce: 'Lorem ammoniaIce',
      liquidOxygen: 'Lorem liquidOxygen',
      oxygenIce: 'Lorem oxygenIce',
      liquidNitrogen: 'Lorem liquidNitrogen',
      nitrogenIce: 'Lorem nitrogenIce',
      biomass: 'Lorem biomass',
      hazardousBiomass: 'Lorem hazardousBiomass',
      graphite: 'Lorem graphite',
      scrapMetal: 'Lorem scrapMetal',
      garbage: 'Lorem garbage',
      trash: 'Lorem trash',
      junk: 'Lorem junk',
      radioactiveWaste: 'Lorem radioactiveWaste',
    },
    underground: {
      ore: 'Lorem ore',
      geothermal: 'Lorem geothermal',
    },
    atmospheric: {
      carbonDioxide: 'Lorem carbonDioxide',
      inertGas: 'Lorem inertGas',
      oxygen: 'Lorem oxygen',
      atmosphericWater: 'Lorem atmosphericWater',
      greenhouseGas: 'Lorem greenhouseGas',
      atmosphericMethane: 'Lorem atmosphericMethane',
      atmosphericAmmonia: 'Lorem atmosphericAmmonia',
      hydrogen: 'Lorem hydrogen',
      sulfuricAcid: 'Lorem sulfuricAcid',
      calciteAerosol: 'Lorem calciteAerosol',
    },
    special: {
      albedoUpgrades: 'Lorem albedoUpgrades',
      whiteDust: 'Lorem whiteDust',
      orbitalDebris: 'Lorem orbitalDebris',
      spaceships: 'Lorem spaceships',
      alienArtifact: 'Lorem alienArtifact',
      crusaders: 'Lorem crusaders',
      antimatter: 'Lorem antimatter',
    },
  },
  saveSettings: {
    save: {
      title: 'Lorem Save',
      headers: {
        slot: 'Dolor',
        date: 'Tempus',
        actions: 'Actio'
      },
      rows: {
        autosave: 'Auto Lorem',
        pretravel: 'Prae-Via',
        slot1: 'Dolor I',
        slot2: 'Dolor II',
        slot3: 'Dolor III',
        slot4: 'Dolor IV',
        slot5: 'Dolor V'
      },
      empty: 'Vacuus',
      buttons: {
        save: 'Serva',
        load: 'Carica',
        delete: 'Dele',
        newGame: 'Novus Ludus',
        saveToFile: 'Serva ad File',
        loadFromFile: 'Carica ex File',
        saveToClipboard: 'Serva ad Clipboard',
        loadFromString: 'Carica ex String',
        pause: 'Pausa'
      },
      status: {
        saveFailedStorage: 'LOREM FAIL: storage permissio requiritur.',
        autosaveDisabled: 'Autosave clausus',
        nextAutosaveIn: 'Prox autosave in {minutes}m {seconds}s'
      },
      confirm: {
        deleteSlot: 'Dele save in slot {slot}? Actio non revertitur.',
        newGame: 'Incipe novum ludum? Progressus non servatus peribit.'
      },
      prompts: {
        pasteSave: 'Inscribe save data ad load:',
        copySave: 'Copia save data:'
      }
    },
    settings: {
      title: 'Lorem Settings',
      language: {
        label: 'Lorem Lingua',
        option: {
          en: 'Dolor Sit',
          la: 'Lorem Ipsum'
        }
      },
      keepTabRunningAudio: {
        label: 'Audio albus tab activum tenet',
        tooltip: 'Post primum click vel keypress, lenis sonus albus ludit ne browser executionem in background minuet. In Firefox quietior est. Potest etiam mutato tab laborare.'
      },
      disableAutosave: {
        label: 'Autosave disable'
      },
      useCelsius: {
        label: 'Temperatura in Celsius ostende'
      },
      darkMode: {
        label: 'Modus Obscurus enable'
      },
      disableUnlockAlerts: {
        label: 'Unlock alert disable'
      },
      disableDayNightCycle: {
        label: 'Dies-noctis cyclus disable',
        tooltip: 'Tempus diei non mutatur. Solar Panels et Ice Harvesters dimidia efficientia et dimidia maintenance operantur.'
      },
      preserveProjectAutoStart: {
        label: 'Project auto-start inter mundos serva',
        tooltip: 'Project auto-start optiones in travel servantur.'
      },
      preserveProjectSettings: {
        label: 'Plurima project settings in travel serva',
        tooltip: 'Plurima project settings in travel servantur.',
        dynamicTooltip: 'Plurima project settings in travel servantur, inclusis import disable limits, Space Mirror Facility oversight settings, et resource disposal selectionibus. In World 11 versio potentior erit.'
      },
      keepHiddenStructures: {
        label: 'Aedificia occulta in travel serva',
        tooltip: 'Aedificia quae celas post travel celata manent potius quam iterum revelantur.'
      },
      autobuildAlsoSetsActive: {
        label: 'Autobuild check etiam Set Active to Target facit'
      },
      colonyUpgradeUnchecksAutobuild: {
        label: 'Colony Upgrade check autobuild removet'
      },
      roundBuildingConstruction: {
        label: 'Constructio aedificii rotunda',
        tooltip: 'In constructio manuali, numerus constructus ad build count rotundatur. Exempli gratia: build count 100 et numerus 157 fit 200. Non valet si autobuild activus est.'
      },
      scientificNotation: {
        label: 'Utere notatione scientifica supra',
        tooltip: 'Valores ad vel supra hunc limitem in notatione scientifica monstrantur, ut 1e30.'
      },
      simplifyGoldenAsteroid: {
        label: 'Golden Asteroid simplifica',
        tooltip: 'Cum activum est, Golden Asteroid ut button aureus cliccabilis apparet loco imaginis moventis.'
      }
    },
    statistics: {
      title: 'Lorem Statistica',
      totalPlaytime: 'Totus Ludus Tempus:'
    }
  }
});
