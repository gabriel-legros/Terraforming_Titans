registerTranslations('en', {
  tabs: {
    buildings: 'Buildings',
    projects: 'Special Projects',
    settings: 'Save and Settings'
  },
  projectsTab: {
    subtabs: {
      resources: 'Resources',
      infrastructure: 'Infrastructure',
      mega: 'Mega',
      giga: 'Giga',
      story: 'Story'
    },
    card: {
      requirements: 'Requirements:',
      cost: 'Cost:',
      gain: 'Gain:',
      sustain: 'Sustain: {value}',
      sustainTooltip: 'Project will pause if sustain cost is not met.',
      autoStart: 'Auto start',
      run: 'Run',
      enableExtraSettings: 'Enable extra settings',
      uncheckOnTravel: 'Uncheck on travelling',
      allowColonyEnergy: 'Allow Colony Energy Use',
      totalGain: 'Total Gain: ',
      totalCost: 'Total Cost: ',
      totalCostWithItems: 'Total Cost: {value}',
      totalGainWithItems: 'Total Gain: {value}',
      spaceshipsAssigned: 'Spaceships Assigned: {assigned}',
      spaceshipsAssignedWithMax: 'Spaceships Assigned: {assigned}/{max}',
      averageDepth: 'Average depth: {current} / {max}',
      completedCount: 'Completed: {current} / {max}'
    },
    warnings: {
      kesslerImportColonists: 'This project is currently being capped due to Kessler Skies. Imports are limited to 100 per run through a small warpgate.',
      kesslerWarpgateReplica: 'This project is currently being capped due to Kessler Skies. Its capabilities are replicated by a small warpgate.',
      kesslerFailureChance: 'Kessler Skies: {percent}% chance of project failure.'
    },
    status: {
      maxDepthReached: 'Max depth reached',
      completedShort: 'Completed',
      completedNamed: 'Completed: {name}',
      disabledByKessler: 'Disabled by Kessler',
      stopped: 'Stopped',
      productivitySuffix: ' ({percent}% productivity)',
      continuous: 'Continuous{productivity}',
      inProgressShort: 'In Progress: {seconds} seconds remaining',
      inProgressPercent: 'In Progress: {seconds} seconds remaining ({percent}%)',
      resumeStorageExpansion: 'Resume storage expansion ({seconds}s left)',
      resumeNamed: 'Resume {name} ({seconds}s left)',
      resumeShort: 'Resume ({seconds}s left)',
      startStorageExpansion: 'Start storage expansion (Duration: {seconds} seconds)',
      startNamed: 'Start {name} (Duration: {seconds} seconds)',
      startShort: 'Start (Duration: {seconds} seconds)'
    },
    empty: {
      nothingAvailable: 'Nothing available for now.'
    },
    settings: {
      megaProjectMode: {
        spaceFirst: 'Prioritize space resources for mega+ projects',
        colonyFirst: 'Prioritize colony resources for mega+ projects',
        spaceOnly: 'Only use space resources for mega+ projects',
        colonyOnly: 'Only use colony resources for mega+ projects'
      }
    }
  },
  buildingsTab: {
    subtabs: {
      categoryHeader: '{category} Buildings',
      unhideObsolete: 'Unhide Obsolete Buildings',
      categories: {
        resource: 'Resource',
        production: 'Production',
        energy: 'Energy',
        storage: 'Storage',
        terraforming: 'Terraforming',
        waste: 'Waste'
      }
    },
    card: {
      build: 'Build',
      controls: 'Controls',
      hide: 'Hide',
      reverse: 'Reverse',
      upgrade: 'Upgrade',
      autoBuild: 'Auto-build',
      autoUpgrade: 'Auto-upgrade',
      constructed: 'Constructed',
      productivity: 'Productivity',
      biodomeLifeWarning: '⚠ Requires Active Life Design ⚠',
      priority: 'Priority : ',
      setActiveToTarget: 'Set active to target',
      setTargetToActive: 'Set Target to Active',
      cost: 'Cost:'
    },
    autoBuild: {
      target: {
        maxFill: 'Max fill : {percent}%',
        max: 'Target : Max',
        count: 'Target : {value}'
      },
      basis: {
        fill: '% filled',
        population: '% of pop',
        workers: '% of workers',
        workerShare: '% worker share',
        landShare: '% land share',
        initialLand: '% initial land',
        fixed: 'Fixed',
        max: 'Max',
        ofBuilding: '% of {name}'
      },
      fillFilters: {
        primary: 'Primary',
        secondary: 'Secondary',
        any: 'Any',
        none: 'None'
      }
    },
    prodCons: {
      provides: 'Provides',
      production: 'Production',
      consumption: 'Consumption',
      maintenance: 'Maintenance',
      solarFlux: '{value} W/m² solar flux'
    },
    resources: {
      workers: 'Workers',
      land: 'Land',
      deposit: 'Deposit'
    },
    modules: {
      units: {
        ton: 'ton',
        Pa: 'Pa',
        kPa: 'kPa'
      },
      waterTank: {
        empty: 'Empty'
      },
      antimatterBattery: {
        fill: 'Fill'
      },
      multiRecipe: {
        recipeLabel: 'Recipe: '
      },
      oxygenFactory: {
        disableIfPressureAbove: 'Disable if O2 P > '
      },
      dustFactory: {
        targetGroundAlbedo: 'Target ground albedo:',
        dustColor: 'Dust color:',
        resourceNameCustom: 'Custom Dust',
        resourceNameBlack: 'Black Dust'
      },
      solarPanel: {
        tooltip: {
          limit: 'Solar panels are limited to 10× the initial land amount.'
        }
      },
      windTurbine: {
        tooltip: {
          limit: 'Wind turbine arrays are limited to 1 per 50 units of initial land.'
        }
      },
      dysonReceiver: {
        tooltip: {
          noCollectors: 'Build Dyson Swarm or Dyson Sphere collectors to increase receiver capacity.',
          swarmPart: '{value} swarm',
          spherePart: '{value} sphere',
          capSummary: 'Dyson receivers constructions are capped by swarm and sphere collectors, and you cannot build more than this cap. {collectors}{breakdown} collectors allow {cap} receivers.'
        }
      },
      ghgFactory: {
        mode: {
          avgTemperature: 'avg T',
          opticalDepth: 'optical depth'
        },
        automatePrefix: 'Automate ',
        disableIfPrefix: 'Disable if ',
        betweenSuffix: ' between ',
        greaterSuffix: ' > ',
        and: ' and ',
        unit: {
          tau: 'tau'
        },
        tooltip: 'With reversal available, the terraforming bureau now allows you to automate this factory. You can set a range of average temperature or optical depth and a solver will attempt to set the trend inside this range. Optical depth ignores calcite aerosols and will clear them first if it needs to increase GHG. It may take some time to converge as the factories may need to build up/remove gas to reach the desired trend. Pressing "reverse" will disable this automation. If used alongside space mirror advanced oversight, it is best for the ranges to be compatible.'
      },
      chemicalReactor: {
        disableIf: 'Disable if',
        mode: {
          input: 'Input',
          output: 'Output'
        }
      },
      aerostat: {
        buoyancyNotes: 'Aerostats are immune to the pressure and temperature penalties, but require additional components, electronics and lift.  Aerostats will form small communities, allowing the use of factories.  Colony researches that normally unlock new colony types will also improve aerostats.  Aerostats need at least 50 kPa of ambient pressure to stay buoyant.  When lift fails, active aerostats can land as Research Outposts if the option is enabled and sufficient land remains.',
        landLimitTooltip: 'At most 25% of the planet\'s starting land can host aerostat colonies to minimize collision risk.',
        temperatureTooltipIntro: 'Aerostats reduce temperature maintenance penalties for staffed factories (excluding ore mines) using their colonist capacity.  Some buildings have an aerostat support value; each active aerostat covers that many structures before penalties apply.',
        landAsResearchOutpost: 'Land as Research Outpost',
        summary: {
          pending: 'Buoyancy telemetry pending.',
          pressureBelowCurrent: '▲ Current atmospheric pressure is {currentPressure} kPa, below the {minPressure} kPa minimum needed for aerostat buoyancy. ▲',
          pressureBelow: '▲ Atmospheric pressure is below the {minPressure} kPa minimum needed for aerostat buoyancy. ▲',
          liftBelow: '▲ Current lift is below the minimum operational requirement, preventing aerostat activation and construction. ▲'
        },
        title: 'Aerostats Details',
        currentLift: 'Current Lift:',
        temperatureMitigation: 'Temperature Maintenance Mitigation:',
        maximumAerostats: 'Maximum Aerostats:',
        notAvailable: 'N/A',
        tooltip: {
          liftIntro: 'Specific lift at 1 atm and 21°C using current atmospheric composition compared to breathable air.',
          externalMolWeight: 'External mean molecular weight: {value} g/mol.',
          currentLift: 'Current lift: {value} kg/m³.',
          shutdownThreshold: 'Aerostat shutdown threshold: {value} kg/m³.',
          minPressure: 'Aerostats require at least {value} kPa of surface pressure to remain buoyant.',
          mitigationDataUnavailable: 'Mitigation data unavailable.',
          activeAerostats: 'Active aerostats: {value}.',
          factoryMitigationDataUnavailable: 'Factory mitigation data unavailable.',
          factoryMitigationApplied: 'Factory mitigation applied: {value}% of the penalty is negated.',
          mitigationLimited: 'Mitigation is limited by available aerostat colonist capacity compared to staffed worker requirements.',
          mitigationFull: 'All staffed buildings currently avoid the temperature maintenance penalty.',
          supportedBuildings: 'Aerostat-supported buildings:',
          supportedBuildingEntry: '• {name}: {supported} of {active} active covered (can support {capacity}; {perAerostat} per aerostat).',
          noSupportedBuildings: 'No buildings currently list an Aerostat Support value.',
          remainingCapacity: 'Remaining aerostat capacity: {value}.'
        }
      }
    },
    tooltips: {
      randomWorld: 'Random World',
      randomWorldNamed: 'Random World: {name}',
      wgcRD: 'Warp Gate Command R&D',
      unknownEffect: 'Unknown effect',
      baseCost: 'Base cost: {value}',
      baseProduction: 'Base production: {value}',
      baseWorkers: 'Base workers: {value}',
      addedWorkers: 'Added workers: {value}',
      innateMaintenance: 'Innate maintenance multiplier: x{value}',
      multipliers: 'Multipliers:',
      multipliersNone: 'Multipliers: none',
      kesslerWarning: 'Extra Cost from Kessler x{multiplier} will create debris',
      debrisFromBuild: 'Debris from this build: +{value} t',
      costMultiplierTransition: 'Cost multiplier: {current}x -> {next}x',
      smallFailureTransition: 'Small project failure: {current}% -> {next}%',
      largeFailureTransition: 'Large project failure: {current}% -> {next}%'
    },
    empty: {
      allHidden: 'Everything hidden',
      nothingAvailable: 'Nothing available for now.'
    }
  },
  buildingsParameters: {
    oreMine: {
      name: 'Ore Mine',
      description: 'Extracts minerals from the ground to produce metal, requires energy and minerals to operate. Requires a free ore deposit.',
    },
    sandQuarry: {
      name: 'Sand Quarry',
      description: 'Digs through regolith to extract silica.',
    },
    iceHarvester: {
      name: 'Ice Harvesters',
      description: 'Drones that roam the surface looking for ice. Self sufficient, but require heavy maintenance and only work during the day.',
    },
    waterPump: {
      name: 'Water Pump',
      description: 'A pump for liquid water.  Requires liquid water to actually exist.',
    },
    atmosphericWaterCollector: {
      name: 'Vapor Collector',
      description: 'Condenses atmospheric moisture when little surface water remains.',
    },
    glassSmelter: {
      name: 'Glass Smelter',
      description: 'Uses high heat to turn silicon into glass.',
    },
    hydroponicFarm: {
      name: 'Hydroponic Farm',
      description: 'Botanists work hard to grow potatoes using local soil.  Water is provided by colonies, and recovered when the food is consumed.',
    },
    componentFactory: {
      name: 'Component Factory',
      description: 'Turns metals into valuable machine components. Requires workers.',
    },
    electronicsFactory: {
      name: 'Electronics Factory',
      description: 'Turns metals and silicon into electronics.  Requires workers.',
    },
    grapheneFactory: {
      name: 'Graphene Factory',
      description: 'Refines surface graphite into graphene using intense energy.  Graphene can be used as a metal substitute.',
    },
    superconductorFactory: {
      name: 'Superconductor Factory',
      description: 'Produces superconductors from metal.  Requires workers.',
    },
    superalloyFoundry: {
      name: 'Superalloy Foundry',
      description: 'Uses extreme energy and metal to forge advanced superalloys.',
    },
    androidFactory: {
      name: 'Androids Factory',
      description: 'Produces androids.  Difficult and takes a lot of manufacturing operations, but can act as a worker and requires little consumer goods.  ',
    },
    shipyard: {
      name: 'Shipyard',
      description: 'Produces spaceships that can be used for various space missions.  ',
    },
    cloningFacility: {
      name: 'Cloning Facility',
      description: 'Consumes energy to grow and educate new colonists.',
    },
    solarPanel: {
      name: 'Solar Panel Array',
      description: 'Generates energy during the day using sunlight, but is inactive during nighttime.',
    },
    windTurbine: {
      name: 'Wind Turbine Array',
      description: 'Produces energy consistently, unaffected by the day or night cycle, harnessing wind power.',
    },
    geothermalGenerator: {
      name: 'Geothermal Generator',
      description: 'Generates consistent energy by harnessing heat from geothermal vents. Requires a free geothermal vent deposit to build. Requires water to function and minimal maintenance.',
    },
    hydrocarbonGenerator: {
      name: 'Methane Flare',
      description: 'Burns atmospheric methane and oxygen to generate energy, releasing water vapour and carbon dioxide.',
    },
    nuclearPowerPlant: {
      name: 'Nuclear Power Plant',
      description: 'Harnesses the power of the atom to generate energy.  Consumes water.',
    },
    dysonReceiver: {
      name: 'Dyson Receiver',
      description: 'Receives beamed energy from space.',
    },
    fusionPowerPlant: {
      name: 'Fusion Reactor',
      description: 'Produces energy from almost nothing.',
      recipes: {
        water: {
          shortName: 'Water -> Energy',
        },
        hydrogen: {
          shortName: 'Hydrogen -> Energy',
        },
      },
    },
    superalloyFusionReactor: {
      name: 'Superalloy Fusion Reactor',
      description: 'Enormous fusion plant using superalloys for containment.',
      recipes: {
        water: {
          shortName: 'Water -> Energy',
        },
        hydrogen: {
          shortName: 'Hydrogen -> Energy',
        },
      },
    },
    antimatterFarm: {
      name: 'Antimatter Farm',
      description: 'Harvests microscopic antimatter using staggering amounts of power.',
    },
    battery: {
      name: 'Battery',
      description: 'Stores energy generated by renewable sources to ensure uninterrupted power supply.  Requires low maintenance.',
    },
    storageDepot: {
      name: 'Storage Depot',
      description: 'A facility for storing large quantities of essential resources like metal and food.',
    },
    waterTank: {
      name: 'Water Tank',
      description: 'Dedicated reservoir that preserves large water reserves with minimal upkeep.',
    },
    hydrogenBattery: {
      name: 'Hydrogen Battery',
      description: 'Stores energy in the form of hydrogen.',
    },
    antimatterBattery: {
      name: 'Antimatter Battery',
      description: 'Stores staggering amounts of energy by containing antimatter safely.',
    },
    androidHousing: {
      name: 'Android Housing',
      description: 'Recharges and stores androids.',
    },
    dustFactory: {
      name: 'Black Dust Factory',
      description: 'Generates large amount of black dust and spreads it over the surface.  Choose a dust color to set its albedo between 0.05 and 0.80, letting the ground absorb or reflect more heat.  May need millions to have any meaningful effect.',
      recipes: {
        black: {
          displayName: 'Black Dust Factory',
        },
        white: {
          displayName: 'White Dust Factory',
        },
      },
    },
    spaceMirror: {
      name: 'Space Mirror',
      description: 'Expands the space mirror facility.  Increases the effective luminosity.  Will cost only glass and energy after the space elevator is built.  May need billions to have any meaningful effect.',
    },
    hyperionLantern: {
      name: 'Hyperion Lantern',
      description: 'Orbital array that beams artificial sunlight onto the planet.  Controlled by Space Mirror Facility.',
    },
    ghgFactory: {
      name: 'Greenhouse Gas factory',
      description: 'Produces very potent, safe greenhouse gases.',
      recipes: {
        ghg: {
          displayName: 'Greenhouse Gas factory',
        },
        calcite: {
          displayName: 'Calcite Aerosol Factory',
        },
      },
    },
    oxygenFactory: {
      name: 'Oxygen Factory',
      description: 'Extracts oxygen from liquid water via electrolysis or uses a lot of energy to liberate oxygen from rocks.',
      recipes: {
        water: {
          shortName: 'Water -> Oxygen',
        },
        silicates: {
          shortName: 'Silicates -> Oxygen',
        },
        rocks: {
          shortName: 'Rocks -> Oxygen',
        },
      },
    },
    boschReactor: {
      name: 'Chemical Reactor',
      description: 'Configurable reactors that combine imported hydrogen with atmospheric resources to synthesize vital compounds.',
      recipes: {
        recipe1: {
          shortName: 'Bosch Reaction',
        },
        recipe2: {
          shortName: 'Water Synthesis',
        },
        recipe3: {
          shortName: 'Methane Synthesis',
        },
        haberBosch: {
          shortName: 'Haber-Bosch',
        },
        ammoniaCombustion: {
          shortName: 'Ammonia Combustion',
        },
      },
    },
    massDriver: {
      name: 'Mass Driver',
      description: 'Electromagnetic launcher capable of sending vast amount of mass every day through the Resource Disposal project.',
    },
    biodome: {
      name: 'Biodome',
      description: 'Produces life using the active life metabolism inputs and artificial light, pulling any water input from colony water.  Requires an active life design that can survive somewhere to function.  Also produces life design points regardless.',
    },
    scrapRecycler: {
      name: 'Scrap Recycler',
      description: 'Recycles scrap metal into usable metal using energy.',
    },
    garbageSorter: {
      name: 'Garbage Sorter',
      description: 'Sorts garbage into trash, junk, and scrap metal for further processing.',
    },
    trashIncinerator: {
      name: 'Trash Incinerator',
      description: 'Burns trash using oxygen to produce carbon dioxide.  Suitable for trash and hazardous biomass.  Not suitable for friendly biomass and the companion satellite.',
      recipes: {
        trash: {
          shortName: 'Trash',
        },
        hazardousBiomass: {
          shortName: 'Hazardous Biomass',
        },
      },
    },
    junkRecycler: {
      name: 'Junk Recycler',
      description: 'Recycles junk into glass using energy.',
    },
    radioactiveRecycler: {
      name: 'Radioactive Recycler',
      description: 'Processes radioactive waste with android labor to recover metal.  The androids are lost in the process.',
    },
    laserCannon: {
      name: 'Laser Cannon',
      description: 'Vaporizes or knocks away orbital debris with sustained laser fire, prioritizing the highest bins.',
    },
  },
  projectsParameters: {
    cargo_rocket: {
      name: 'Cargo Rocket',
      description: 'Launch a cargo rocket to bring in essential supplies including metal and water to boost the colony\'s infrastructure.',
    },
    galactic_market: {
      name: 'Galactic Market',
      description: 'Open trading lanes with the wider galaxy to import resources funded through market exchanges.',
    },
    import_colonists_1: {
      name: 'Import colonists',
      description: 'Use chemical rockets to import colonists',
    },
    exportResources: {
      name: 'Metal Exportation',
      description: 'Use your spaceships to export resources to the market.  Generates funding.  The first 100 spaceship assignments reduce the duration, every spaceship assignment afterward provides a multiplier.',
    },
    satellite: {
      name: 'Ore satellite',
      description: 'Deploy a satellite to enhance the discovery of valuable ore deposits. The satellite scans the surface for untapped ore veins, accelerating resource extraction. Each additional satellite increases scanning efficiency, but locating new veins becomes progressively more challenging as deposits are exhausted.',
    },
    geo_satellite: {
      name: 'Geothermal satellite',
      description: 'Deploy a highly sensitive satellite to scan for geothermal energy. The satellite identifies suitable geothermal vents for energy extraction.',
    },
    spaceMirrorFacility: {
      name: 'Space mirror facility',
      description: 'Built at a Lagrangian point, this facility will allow the construction of space mirrors from the buildings terraforming tab.',
    },
    ringworldTerraforming: {
      name: 'Ringworld Terraforming',
      description: 'This project keeps track of the Ringworld\'s spin and its effects.',
    },
    deeperMining: {
      name: 'Deeper mining',
      description: 'Deepen all ore mines to improve production, adding one layer. Each completion improves metal production by an additive 100%. Most of the cost scales with ore mines built while a small portion also scales with their average depth.',
    },
    undergroundExpansion: {
      name: 'Underground Land Expansion',
      description: 'Build subterranean habitats to slightly expand usable land. Each completion increases land by a small amount.',
    },
    oreSpaceMining: {
      name: 'Metal Asteroid Mining',
      description: 'Use your spaceships to mine asteroids for metal. The first 100 spaceship assignments reduce the duration, every spaceship assignment afterward provides a multiplier. Without a space elevator, the metal cost per ship reduces the metal returned.',
    },
    siliconSpaceMining: {
      name: 'Silica Asteroid Mining',
      description: 'Use your spaceships to mine asteroids for silicon. The first 100 spaceship assignments reduce the duration, every spaceship assignment afterward provides a multiplier. Without a space elevator, the metal cost per ship reduces the silicon returned.',
    },
    carbonSpaceMining: {
      name: 'Carbon Asteroid Mining',
      description: 'Use your spaceships to recover carbon from C-type asteroids, brought back as CO2. The first 100 spaceship assignments reduce the duration, every spaceship assignment afterward provides a multiplier.',
    },
    waterSpaceMining: {
      name: 'Ice and Water importation',
      description: 'Ships haul ice from space. If any zone is warm enough, it\'s delivered as liquid water there; otherwise it arrives frozen. The first 100 spaceship assignments reduce the duration, every spaceship assignment afterward provides a multiplier.',
    },
    nitrogenSpaceMining: {
      name: 'Nitrogen harvesting',
      description: 'Use your spaceships to recover nitrogen from the outer solar system. The first 100 spaceship assignments reduce the duration, every spaceship assignment afterward provides a multiplier.',
    },
    hydrogenSpaceMining: {
      name: 'Hydrogen Importation',
      description: 'Use your spaceships to recover hydrogen from the outer solar system. The first 100 spaceship assignments reduce the duration, every spaceship assignment afterward provides a multiplier.',
    },
    spaceElevator: {
      name: 'Space Elevator',
      description: 'This cable eliminates all metal costs from multiple space activities.',
    },
    magneticShield: {
      name: 'Magnetic Shield',
      description: 'This very expensive cable can carry enough current to protect the planet and its atmosphere.  The reduction in cancer rates negates the radiation penalty for life.  The cost of this project includes all the machinery and infrastructure required to build, house, cool and secure the cable.',
    },
    planetaryThruster: {
      name: 'Planetary Thrusters',
      description: 'Install planetary fusion thrusters for subtle maneuvering.',
    },
    dysonSwarmReceiver: {
      name: 'Dyson Swarm',
      description: 'Expand your Dyson Swarm to produce power from the sun.  Build cheap receivers to receive power.  All colonies on terraformed worlds can help deploy collectors when materials are provided, shortening the process.  Collectors persist between worlds.  Collectors can be expanded even without the Dyson Swarm Receiver research.',
    },
    dysonSphere: {
      name: 'Dyson Sphere',
      description: 'Assemble a Dyson Sphere frame, enabling 100x faster collectors expansion.  Disables Dyson Swarm on completion, transferring all collectors.',
    },
    hephaestusMegaconstruction: {
      name: 'Hephaestus Megaconstruction Yard',
      description: 'Assemble a legendary construction yard that accelerates repeatable mega and giga projects. Each completion adds a yard that can be assigned, counting as an extra world.  Project duration scales with terraformed worlds.',
    },
    orbitalRing: {
      name: 'Orbital Ring',
      description: 'Orbital rings count as an additional terraformed world.  Does not grant a skill point.  You can build a ring on previously terraformed worlds, and on the current one if terraformed.  Building a ring on the current world also increases its land by its initial land value.  You can prepay rings for each world without a ring.',
    },
    spaceStorage: {
      name: 'Space Storage',
      description: 'Construct an orbital facility for massive resource storage. Each terraformed world reduces expansion time.  Resources in space storage may also be used to pay for most mega projects (planetary thrusters excepted).  Space storage capacity and resources in storage persist between worlds.',
    },
    particleAccelerator: {
      name: 'Particle Accelerator',
      description: 'Physicists can always use a bigger particle accelerator.',
    },
    megaHeatSink: {
      name: 'Mega Heat Sink',
      description: 'Construct a titanic heatsink complex to siphon planetary heat at unprecedented scales, fully equipped with its own pumps.  Each heat sink will accelerate planet cooling by 1 PW.  Will not take the current temperature below its trend.',
    },
    lifters: {
      name: 'Lifters',
      description: 'Assemble space-rated lifting platforms that either siphon hydrogen into space storage or peel away the local atmosphere, using inefficient energy beams.  Persists between worlds, duration scales with terraformed worlds, and taps unused Dyson power.',
    },
    bioworld: {
      name: 'Bioworld',
      description: 'Cultivate a bioworld-scale ecosystem. Completion removes all Ecumenopolis Districts and permanently disables new ones. Completed bioworlds grant evolution points when travelling based on total biomass.',
    },
    foundryWorld: {
      name: 'Foundry World',
      description: 'Tap into the metal-rich molten planetary core and convert the surface into a mega-scale casting hub. Completion converts all Ecumenopolis Districts into Metropolises and permanently disables new ones. Each completed foundry world adds +100B * sqrt(initial land / 50B) to the metal mining cap. Completed foundry worlds grant 10 metallurgy points times sqrt(initial land / 50B) when travelling.',
    },
    disposeResources: {
      name: 'Resource Disposal',
      description: 'Use your spaceships to dispose of unwanted resources somewhere.  Cheaper than importing.',
    },
  },
  resourcesPanel: {
    categories: {
      colony: 'Colony Resources',
      surface: 'Surface Resources',
      underground: 'Underground Resources',
      atmospheric: 'Atmospheric Resources',
      special: 'Special Resources'
    },
    tooltip: {
      notes: {
        landRecover: 'Land can be recovered by turning off the corresponding building',
        wasteProcessing: 'Waste processing buildings display their consumption based on their available staffing and power, ignoring waste shortages.  The numbers here are not their actual consumption.'
      },
      sections: {
        production: 'Production:',
        consumptionMaintenance: 'Consumption and Maintenance:',
        overflow: 'Overflow:',
        autobuildCost: 'Autobuild Cost (avg 10s):',
        total: 'Total :',
        assignments: 'Assignments:'
      },
      assignments: {
        workersRatio: '{percent}% of colonists provide workers',
        fromColonists: '{value} from colonists',
        fromAndroids: '{value} from androids',
        fromBioworkers: '{value} from bioworkers',
        total: 'Total {value}',
        unassigned: 'Unassigned {value}'
      },
      resources: {
        workers: 'Workers'
      },
      warnings: {
        biomassDyingZones: 'Biomass is dying in the {zones} zone{suffix}.',
        androidCap: 'Android production has reached its current cap.',
        autobuildShortage: 'Autobuild is short on required inputs for queued construction.',
        biomassLimiter: 'Biomass growth is limited by {resource} availability{scope}.',
        scopeZones: ' in the {zones} zone{suffix}',
        scopeAtmospheric: ' across the atmosphere',
        aerostat: {
          pressureBelow: '▲ Active aerostats only have {pressure} kPa of surface pressure, below the {minPressure} kPa minimum needed to stay buoyant. ▲',
          liftBelowMinimum: '▲ Active aerostats only have {lift} kg/m³ of lift, below the {minLift} kg/m³ minimum needed to stay aloft. ▲',
          liftBelowSafety: 'Active aerostats only have {lift} kg/m³ of lift, below the {warningLift} kg/m³ safety margin.'
        },
        hydrogen: {
          base: 'Hydrogen slowly escapes to space depending on solar flux and gravity.',
          photodissociation: 'Stellar UV can photodissociate up to {percent}% of that gas, creating atoms that escape about {speedup}× faster than molecules.',
          gravityLow: ', so expect ongoing decay.',
          gravityHigh: ', so the atmosphere can retain hydrogen.',
          gravitySentence: 'Current gravity is {gravity} m/s²{relation}',
          solarHigh: 'accelerating the photodissociation that feeds this loss',
          solarLow: 'keeping most hydrogen molecular and slowing the loss',
          solarSentence: 'Solar flux is {flux} W/m², {effect}.'
        }
      },
      scanningProgress: 'Scanning Progress: {percent}%',
      rates: {
        unstable: 'Unstable'
      },
      values: {
        available: 'Available {value}',
        used: 'Used {value}',
        hazardousBiomass: 'Hazardous biomass {value}',
        value: 'Value {value}{unit}'
      },
      time: {
        toTerraformingTarget: 'Time to {label} terraforming target: {duration}',
        terraformingTargetReached: '{label} terraforming target reached.',
        toTargetPressure: 'Time to target pressure: {duration}',
        targetReached: 'Terraforming target reached.',
        toFullUnstable: 'Time to full : unstable.',
        toFull: 'Time to full: {duration}',
        toEmpty: 'Time to empty: {duration}'
      },
      zones: {
        header: 'Zonal Amounts:',
        row: '{zone}: {value}',
        rowSurfaceBuried: '{zone}: {surface} / {buried} ({label})',
        surfaceBuried: 'surface/buried',
        names: {
          tropical: 'Tropical',
          temperate: 'Temperate',
          polar: 'Polar'
        }
      },
      net: {
        includingAutobuild: 'Net Change (including autobuild):'
      },
      limits: {
        importsAutomation: 'Imports are being limited by automation settings'
      },
      sources: {
        lifting: 'Lifting'
      }
    }
  },
  resourcesParameters: {
    colony: {
      funding: 'Funding',
      colonists: 'Colonists',
      workers: 'Workers',
      energy: 'Energy',
      metal: 'Metal',
      silicon: 'Silica',
      glass: 'Glass',
      water: 'Water',
      food: 'Food',
      components: 'Components',
      electronics: 'Electronics',
      superconductors: 'Supercond.',
      superalloys: 'Superalloys',
      androids: 'Android',
      research: 'Research',
      advancedResearch: 'Adv. Research',
    },
    surface: {
      land: 'Land',
      ice: 'Ice',
      liquidWater: 'Water',
      dryIce: 'Dry Ice',
      liquidCO2: 'Liquid CO2',
      liquidMethane: 'Liquid Methane',
      hydrocarbonIce: 'Methane Ice',
      liquidAmmonia: 'Liquid Ammonia',
      ammoniaIce: 'Ammonia Ice',
      liquidOxygen: 'Liquid Oxygen',
      oxygenIce: 'Oxygen Ice',
      liquidNitrogen: 'Liquid Nitrogen',
      nitrogenIce: 'Nitrogen Ice',
      biomass: 'Biomass',
      hazardousBiomass: 'Hazardous Biomass',
      graphite: 'Graphite',
      scrapMetal: 'Scrap Metal',
      garbage: 'Garbage',
      trash: 'Trash',
      junk: 'Junk',
      radioactiveWaste: 'Radioactive Waste',
    },
    underground: {
      ore: 'Ore deposits',
      geothermal: 'Geo. vent',
    },
    atmospheric: {
      carbonDioxide: 'CO2',
      inertGas: 'Nitrogen',
      oxygen: 'Oxygen',
      atmosphericWater: 'Water Vap.',
      greenhouseGas: 'Safe GHG',
      atmosphericMethane: 'Methane',
      atmosphericAmmonia: 'Ammonia',
      hydrogen: 'Hydrogen',
      sulfuricAcid: 'Sulfuric Acid',
      calciteAerosol: 'Calcite Aerosol',
    },
    special: {
      albedoUpgrades: 'Black Dust',
      whiteDust: 'White Dust',
      orbitalDebris: 'Orbital Debris',
      spaceships: 'Spaceships',
      alienArtifact: 'Alien artifact',
      crusaders: 'Crusaders',
      antimatter: 'Antimatter',
    },
  },
  saveSettings: {
    save: {
      title: 'Save',
      headers: {
        slot: 'Slot',
        date: 'Date',
        actions: 'Actions'
      },
      rows: {
        autosave: 'Autosave',
        pretravel: 'Pre-travel',
        slot1: 'Slot 1',
        slot2: 'Slot 2',
        slot3: 'Slot 3',
        slot4: 'Slot 4',
        slot5: 'Slot 5'
      },
      empty: 'Empty',
      buttons: {
        save: 'Save',
        load: 'Load',
        delete: 'Delete',
        newGame: 'New Game',
        saveToFile: 'Save to File',
        loadFromFile: 'Load from File',
        saveToClipboard: 'Save to Clipboard',
        loadFromString: 'Load from string',
        pause: 'Pause'
      },
      status: {
        saveFailedStorage: 'SAVE FAILED: Game needs cookies/local storage permission.',
        autosaveDisabled: 'Autosave disabled',
        nextAutosaveIn: 'Next autosave in {minutes}m {seconds}s'
      },
      confirm: {
        deleteSlot: 'Are you sure you want to delete the save file in slot {slot}? This action cannot be undone.',
        newGame: 'Are you sure you want to start a new game? Any unsaved progress will be lost.'
      },
      prompts: {
        pasteSave: 'Paste save data to load:',
        copySave: 'Copy save data:'
      }
    },
    settings: {
      title: 'Settings',
      language: {
        label: 'Language',
        option: {
          en: 'English',
          la: 'Lorem Ipsum'
        }
      },
      keepTabRunningAudio: {
        label: 'Use white noise to keep tab active',
        tooltip: 'After your first click or keypress it plays a quiet white noise loop to prevent the browser from throttling background execution.  Much more quiet on Firefox.  May still work even if the tab is muted.'
      },
      disableAutosave: {
        label: 'Disable autosave'
      },
      useCelsius: {
        label: 'Display temperature in Celsius'
      },
      darkMode: {
        label: 'Enable Dark Mode'
      },
      disableUnlockAlerts: {
        label: 'Disable unlock alerts'
      },
      disableDayNightCycle: {
        label: 'Disable day-night cycle',
        tooltip: 'Stops time of day changes. Solar Panels and Ice Harvesters run at half efficiency and half maintenance.  Leads to a more realistic, slightly easier and more relaxed experience.'
      },
      preserveProjectAutoStart: {
        label: 'Preserve project auto-start between worlds',
        tooltip: 'Keeps project auto-start selections when travelling.'
      },
      preserveProjectSettings: {
        label: 'Preserve most project settings on travel',
        tooltip: 'Preserves most project settings when traveling.',
        dynamicTooltip: 'Keeps most project settings when travelling, including import disable limits, Space Mirror Facility oversight settings, and resource disposal selections. On World 11, a much more powerful version of this setting will be available.'
      },
      keepHiddenStructures: {
        label: 'Keep hidden buildings on travel',
        tooltip: 'Keeps buildings you hide hidden after travelling to another world instead of revealing them when you arrive.'
      },
      autobuildAlsoSetsActive: {
        label: 'Checking autobuild also checks Set Active to Target'
      },
      colonyUpgradeUnchecksAutobuild: {
        label: 'Checking Colony Upgrade unchecks autobuild'
      },
      roundBuildingConstruction: {
        label: 'Round building construction',
        tooltip: 'When manually constructing buildings, your number of constructed buildings will round to your build count. For example, with a build count of 100 and a current amount of 157, manually building will result in 200 buildings.  Does not apply if autobuild is on.'
      },
      scientificNotation: {
        label: 'Use scientific notation above',
        tooltip: 'Values at or above this threshold are displayed in scientific notation, such as 1e30.'
      },
      simplifyGoldenAsteroid: {
        label: 'Simplify Golden Asteroid',
        tooltip: 'When enabled, the Golden Asteroid appears as a clickable golden button where the effect text is shown, instead of a moving image on the screen.'
      }
    },
    statistics: {
      title: 'Statistics',
      totalPlaytime: 'Total Playtime:'
    }
  }
});
