const path = require('path');

const { KesslerHazard } = require(path.join('..', 'src/js/terraforming/hazards/kesslerHazard.js'));
const EffectableEntity = require(path.join('..', 'src/js/effectable-entity.js'));

describe('Kessler hazard', () => {
  beforeEach(() => {
    global.ZONES = ['tropical', 'temperate', 'polar'];
    global.getZonePercentage = () => 1 / global.ZONES.length;
  });

  test('initializes orbital debris from land', () => {
    global.resources = {
      special: {
        orbitalDebris: {
          value: 0,
          initialValue: 0,
          unlocked: false,
          modifyRate: jest.fn()
        }
      }
    };

    const hazard = new KesslerHazard(null);
    const terraforming = {
      initialLand: 100,
      exosphereHeightMeters: 0,
      updateLuminosity: jest.fn(),
      _updateExosphereHeightCache: jest.fn(() => {
        terraforming.exosphereHeightMeters = 150000;
      })
    };

    hazard.initializeResources(
      terraforming,
      { orbitalDebrisPerLand: 100 },
      { unlockOnly: false }
    );

    expect(global.resources.special.orbitalDebris.unlocked).toBe(true);
    expect(global.resources.special.orbitalDebris.value).toBe(10000);
    expect(global.resources.special.orbitalDebris.initialValue).toBe(10000);
  });

  test('caps solis resources and diverts water to the surface', () => {
    global.resources = {
      colony: {
        water: {
          value: 5000,
          activeEffects: [{ effectId: 'solisStorage-water' }],
          updateStorageCap: jest.fn()
        },
        metal: { value: 5000 },
        research: { value: 5000 },
        food: { value: 5000 },
        components: { value: 2000 },
        electronics: { value: 1500 },
        glass: { value: 1200 },
        androids: { value: 1300 }
      },
      surface: {
        liquidWater: {
          value: 0,
          unlocked: false
        }
      }
    };

    const terraforming = {
      zonalSurface: {
        tropical: { liquidWater: 0 },
        temperate: { liquidWater: 0 },
        polar: { liquidWater: 0 }
      },
      synchronizeGlobalResources: () => {
        const totalWater = terraforming.zonalSurface.tropical.liquidWater
          + terraforming.zonalSurface.temperate.liquidWater
          + terraforming.zonalSurface.polar.liquidWater;
        global.resources.surface.liquidWater.value = totalWater;
      },
      _updateZonalCoverageCache: () => {}
    };

    const hazard = new KesslerHazard(null);
    hazard.applySolisTravelAdjustments(terraforming);

    expect(global.resources.colony.water.value).toBe(1000);
    expect(global.resources.colony.water.activeEffects).toHaveLength(0);
    expect(global.resources.colony.water.updateStorageCap).toHaveBeenCalled();
    expect(global.resources.surface.liquidWater.value).toBeCloseTo(4000, 6);
    expect(global.resources.surface.liquidWater.unlocked).toBe(true);
    expect(global.resources.colony.food.value).toBe(1000);
    expect(global.resources.colony.components.value).toBe(1000);
    expect(global.resources.colony.electronics.value).toBe(1000);
    expect(global.resources.colony.glass.value).toBe(1000);
    expect(global.resources.colony.androids.value).toBe(1000);
    expect(global.resources.colony.metal.value).toBe(5000);
    expect(global.resources.colony.research.value).toBe(5000);
  });

  test('clears permanently once debris reaches zero', () => {
    global.resources = {
      special: {
        orbitalDebris: {
          value: 0,
          initialValue: 100,
          unlocked: true,
          modifyRate: jest.fn()
        }
      }
    };

    const hazard = new KesslerHazard(null);
    expect(hazard.isCleared()).toBe(true);
    global.resources.special.orbitalDebris.value = 50;
    expect(hazard.isCleared()).toBe(true);
  });

  test('computes project failure chances from debris density', () => {
    global.resources = {
      special: {
        orbitalDebris: {
          value: 100,
          initialValue: 100,
          unlocked: true,
          modifyRate: jest.fn()
        }
      }
    };

    const hazard = new KesslerHazard(null);
    const initialChances = hazard.getProjectFailureChances();
    expect(initialChances.smallFailure).toBeCloseTo(0.7, 6);
    expect(initialChances.largeFailure).toBeCloseTo(0.98, 6);

    global.resources.special.orbitalDebris.value = 0;
    const clearedChances = hazard.getProjectFailureChances();
    expect(clearedChances.smallFailure).toBeCloseTo(0, 6);
    expect(clearedChances.largeFailure).toBeCloseTo(0, 6);
  });

  test('decays debris faster in denser bins', () => {
    global.resources = {
      atmospheric: {
        carbonDioxide: { value: 5e15 }
      },
      special: {
        orbitalDebris: {
          value: 100,
          initialValue: 100,
          unlocked: true,
          modifyRate: jest.fn()
        }
      }
    };

    const hazard = new KesslerHazard(null);
    hazard.periapsisDistribution = [
      { periapsisMeters: 50000, massTons: 40 },
      { periapsisMeters: 200000, massTons: 60 }
    ];
    hazard.periapsisBaseline = [
      { periapsisMeters: 50000, massTons: 40 },
      { periapsisMeters: 200000, massTons: 60 }
    ];

    const terraforming = {
      resources: global.resources,
      temperature: { value: 288 },
      luminosity: { solarFlux: 1361 },
      celestialParameters: { gravity: 9.81, radius: 6371, distanceFromSun: 1, starLuminosity: 1 }
    };
    const beforeLower = hazard.periapsisDistribution[0].massTons;
    const beforeUpper = hazard.periapsisDistribution[1].massTons;
    hazard.update(1000, terraforming, { orbitalDebrisPerLand: 100 });

    expect(global.resources.special.orbitalDebris.value).toBeLessThan(100);
    const removedLower = beforeLower - hazard.periapsisDistribution[0].massTons;
    const removedUpper = beforeUpper - hazard.periapsisDistribution[1].massTons;
    expect(removedLower).toBeGreaterThan(removedUpper);
    const summary = hazard.getDecaySummary();
    expect(summary.dragThresholdDensity).toBeGreaterThan(0);
    expect(summary.dragThresholdHeightMeters).toBeGreaterThan(0);
    expect(summary.dragFraction).toBeGreaterThan(0);
    expect(summary.decayTonsPerSecond).toBeGreaterThan(0);
  });

  test('decay uses the larger of baseline and current mass', () => {
    const setupResources = () => ({
      special: {
        orbitalDebris: {
          value: 100,
          initialValue: 100,
          unlocked: true,
          modifyRate: jest.fn()
        }
      }
    });

    const managerA = { parameters: { kessler: {} } };
    const hazardA = new KesslerHazard(managerA);
    managerA.kesslerHazard = hazardA;
    global.resources = setupResources();
    hazardA.periapsisDistribution = [{ periapsisMeters: 0, massTons: 100 }];
    hazardA.periapsisBaseline = [{ periapsisMeters: 0, massTons: 10 }];

    const managerB = { parameters: { kessler: {} } };
    const hazardB = new KesslerHazard(managerB);
    managerB.kesslerHazard = hazardB;
    const resourcesB = setupResources();
    hazardB.periapsisDistribution = [{ periapsisMeters: 0, massTons: 100 }];
    hazardB.periapsisBaseline = [{ periapsisMeters: 0, massTons: 100 }];

    const terraforming = { exosphereHeightMeters: 100000 };
    hazardA.update(1000, terraforming, { orbitalDebrisPerLand: 100 });
    global.resources = resourcesB;
    hazardB.update(1000, terraforming, { orbitalDebrisPerLand: 100 });

    expect(hazardA.periapsisDistribution[0].massTons).toBeCloseTo(
      hazardB.periapsisDistribution[0].massTons,
      6
    );
  });

  test('adds debris from penalized space mirror builds', () => {
    global.EffectableEntity = EffectableEntity;
    global.maintenanceFraction = 0.001;
    global.resources = {
      colony: {
        metal: { value: 100, cap: 0, decrease: jest.fn(function (value) { this.value -= value; }) },
        energy: { value: 100, cap: 0, decrease: jest.fn(function (value) { this.value -= value; }) }
      },
      surface: { land: { value: 0, reserved: 0 } },
      underground: {},
      special: {
        orbitalDebris: {
          value: 100,
          initialValue: 100,
          unlocked: true,
          modifyRate: jest.fn()
        }
      }
    };

    const manager = { parameters: { kessler: {} } };
    const hazard = new KesslerHazard(manager);
    hazard.periapsisDistribution = [
      { periapsisMeters: 0, massTons: 40 },
      { periapsisMeters: 100000, massTons: 60 }
    ];
    hazard.periapsisBaseline = [
      { periapsisMeters: 0, massTons: 40 },
      { periapsisMeters: 100000, massTons: 60 }
    ];
    manager.kesslerHazard = hazard;
    global.hazardManager = manager;

    const { SpaceMirror } = require(path.join('..', 'src/js/buildings/SpaceMirror.js'));
    const building = new SpaceMirror({
      name: 'Space Mirror',
      category: 'terraforming',
      description: '',
      cost: { colony: { metal: 10, energy: 4 } },
      consumption: {},
      production: {},
      storage: {},
      dayNightActivity: false,
      canBeToggled: false,
      maintenanceFactor: 0,
      requiresMaintenance: false,
      requiresDeposit: null,
      requiresWorker: 0,
      unlocked: true,
      surfaceArea: 0,
      requiresProductivity: false,
      requiresLand: 0,
      automationBuildingsDropDown: null,
      autoBuildMaxOption: false,
      autoBuildFillEnabled: false,
      kesslerDebrisSize: 'small'
    }, 'spaceMirror');

    const cost = building.getEffectiveCost(1);
    expect(cost.colony.metal).toBeCloseTo(33.333333333333336, 6);
    expect(cost.colony.energy).toBeCloseTo(13.333333333333334, 6);

    const built = building.build(1, true);
    expect(built).toBe(true);
    expect(global.resources.colony.metal.value).toBeCloseTo(66.66666666666666, 6);
    expect(global.resources.colony.energy.value).toBeCloseTo(86.66666666666666, 6);
    expect(global.resources.special.orbitalDebris.value).toBeCloseTo(111.66666666666667, 6);
    expect(hazard.periapsisDistribution[0].massTons).toBeCloseTo(44.666666666666664, 6);
    expect(hazard.periapsisDistribution[1].massTons).toBeCloseTo(67, 6);
  });

  test('fails kessler-affected projects after the first second', () => {
    global.EffectableEntity = EffectableEntity;
    const addDebris = jest.fn();
    global.hazardManager = {
      kesslerHazard: {
        getSuccessChance: jest.fn(() => 0.4),
        addDebris
      }
    };
    global.resources = {
      colony: {
        metal: {
          value: 200,
          decrease: jest.fn(function (value) { this.value -= value; })
        },
        electronics: {
          value: 100,
          decrease: jest.fn(function (value) { this.value -= value; })
        },
        energy: {
          value: 1000,
          decrease: jest.fn(function (value) { this.value -= value; })
        }
      }
    };

    const { Project } = require(path.join('..', 'src/js/projects.js'));
    const project = new Project({
      name: 'Ore satellite',
      category: 'infrastructure',
      cost: {
        colony: {
          metal: 100,
          electronics: 50,
          energy: 10
        }
      },
      duration: 5000,
      description: '',
      repeatable: true,
      maxRepeatCount: 10,
      unlocked: true,
      kesslerDebrisSize: 'small'
    }, 'ore_satellite');

    const randomSpy = jest.spyOn(Math, 'random').mockReturnValue(0.9);
    expect(project.start(global.resources)).toBe(true);
    expect(global.resources.colony.metal.value).toBe(100);
    expect(global.resources.colony.electronics.value).toBe(50);
    expect(global.resources.colony.energy.value).toBe(990);

    project.update(1000);

    expect(project.isActive).toBe(false);
    expect(project.isCompleted).toBe(false);
    expect(project.remainingTime).toBe(project.startingDuration);
    expect(addDebris).toHaveBeenCalledWith(75);
    randomSpy.mockRestore();
  });

  test('rolls kessler chance on completion when duration is under one second', () => {
    global.EffectableEntity = EffectableEntity;
    global.hazardManager = {
      kesslerHazard: {
        getSuccessChance: jest.fn(() => 1),
        addDebris: jest.fn()
      }
    };
    global.resources = {
      colony: {
        metal: {
          value: 200,
          decrease: jest.fn(function (value) { this.value -= value; })
        }
      }
    };

    const { Project } = require(path.join('..', 'src/js/projects.js'));
    const project = new Project({
      name: 'Ore satellite',
      category: 'infrastructure',
      cost: {
        colony: {
          metal: 100
        }
      },
      duration: 500,
      description: '',
      repeatable: false,
      maxRepeatCount: 1,
      unlocked: true,
      kesslerDebrisSize: 'small'
    }, 'ore_satellite_short');

    const randomSpy = jest.spyOn(Math, 'random').mockReturnValue(0.2);
    expect(project.start(global.resources)).toBe(true);
    project.update(1000);

    expect(project.isCompleted).toBe(true);
    expect(project.kesslerRollElapsed).toBe(500);
    randomSpy.mockRestore();
  });

  test('fails discrete spaceship projects and destroys a ship', () => {
    global.EffectableEntity = EffectableEntity;
    global.shipEfficiency = 1;
    const addDebris = jest.fn();
    global.hazardManager = {
      kesslerHazard: {
        getSuccessChance: jest.fn(() => 0.2),
        addDebris
      },
      parameters: {}
    };
    global.resources = {
      colony: {
        metal: {
          value: 200,
          decrease: jest.fn(function (value) { this.value -= value; })
        },
        energy: {
          value: 200,
          decrease: jest.fn(function (value) { this.value -= value; })
        }
      },
      special: {
        spaceships: {
          value: 10
        }
      }
    };

    const { Project } = require(path.join('..', 'src/js/projects.js'));
    global.Project = Project;
    const SpaceshipProject = require(path.join('..', 'src/js/projects/SpaceshipProject.js'));
    const project = new SpaceshipProject({
      name: 'Metal Asteroid Mining',
      category: 'resources',
      cost: {},
      duration: 10000,
      description: '',
      repeatable: true,
      maxRepeatCount: Infinity,
      unlocked: true,
      attributes: {
        spaceMining: true,
        costPerShip: { colony: { metal: 100, energy: 10 } },
        resourceGainPerShip: { colony: { metal: 1000 } }
      }
    }, 'oreSpaceMining');

    project.assignSpaceships(1);
    expect(project.start(global.resources)).toBe(true);
    const randomSpy = jest.spyOn(Math, 'random').mockReturnValue(0.9);
    project.update(1000);

    expect(project.isActive).toBe(false);
    expect(project.pendingGain).toBe(null);
    expect(project.assignedSpaceships).toBe(0);
    expect(addDebris).toHaveBeenCalledWith(3050);
    randomSpy.mockRestore();
  });

  test('scales continuous spaceship gains and debris by kessler chance', () => {
    global.EffectableEntity = EffectableEntity;
    global.shipEfficiency = 1;
    const addDebris = jest.fn();
    global.hazardManager = {
      kesslerHazard: {
        getSuccessChance: jest.fn(() => 0.8),
        addDebris
      },
      parameters: {}
    };
    global.resources = {
      colony: {
        metal: {
          value: 10000,
          decrease: jest.fn(function (value) { this.value -= value; }),
          increase: jest.fn(function (value) { this.value += value; })
        },
        energy: {
          value: 10000,
          decrease: jest.fn(function (value) { this.value -= value; })
        }
      },
      special: {
        spaceships: {
          value: 500
        }
      }
    };

    const { Project } = require(path.join('..', 'src/js/projects.js'));
    global.Project = Project;
    const SpaceshipProject = require(path.join('..', 'src/js/projects/SpaceshipProject.js'));
    const project = new SpaceshipProject({
      name: 'Metal Asteroid Mining',
      category: 'resources',
      cost: {},
      duration: 100000,
      description: '',
      repeatable: true,
      maxRepeatCount: Infinity,
      unlocked: true,
      attributes: {
        spaceMining: true,
        costPerShip: { colony: { metal: 100, energy: 10 } },
        resourceGainPerShip: { colony: { metal: 1000 } },
        kesslerDebrisFromGainFraction: 0.25
      }
    }, 'oreSpaceMiningContinuous');

    project.assignSpaceships(200);
    project.isActive = true;
    project.applyCostAndGain(1000);

    expect(project.assignedSpaceships).toBe(200);
    expect(global.resources.colony.metal.value).toBe(11400);
    expect(global.resources.colony.energy.value).toBe(9980);
    const debrisCalls = addDebris.mock.calls.map(call => call[0]);
    const hasCostDebris = debrisCalls.some(value => Math.abs(value - 20) < 1e-6);
    const hasGainDebris = debrisCalls.some(value => Math.abs(value - 100) < 1e-6);
    const hasShipDebris = debrisCalls.some(value => Math.abs(value - 1200) < 1e-6);
    expect(hasCostDebris).toBe(true);
    expect(hasGainDebris).toBe(true);
    expect(hasShipDebris).toBe(true);
  });

  test('adds fractional debris when continuous ship losses are below one', () => {
    global.EffectableEntity = EffectableEntity;
    global.shipEfficiency = 1;
    const addDebris = jest.fn();
    global.hazardManager = {
      kesslerHazard: {
        getSuccessChance: jest.fn(() => 0.5),
        addDebris
      },
      parameters: {}
    };
    global.resources = {
      colony: {
        metal: {
          value: 10000,
          decrease: jest.fn(function (value) { this.value -= value; }),
          increase: jest.fn(function (value) { this.value += value; })
        },
        energy: {
          value: 10000,
          decrease: jest.fn(function (value) { this.value -= value; })
        }
      },
      special: {
        spaceships: {
          value: 500
        }
      }
    };

    const { Project } = require(path.join('..', 'src/js/projects.js'));
    global.Project = Project;
    const SpaceshipProject = require(path.join('..', 'src/js/projects/SpaceshipProject.js'));
    const project = new SpaceshipProject({
      name: 'Metal Asteroid Mining',
      category: 'resources',
      cost: {},
      duration: 100000,
      description: '',
      repeatable: true,
      maxRepeatCount: Infinity,
      unlocked: true,
      attributes: {
        spaceMining: true,
        costPerShip: { colony: { metal: 100, energy: 10 } },
        resourceGainPerShip: { colony: { metal: 1000 } }
      }
    }, 'oreSpaceMiningContinuousFraction');

    project.assignSpaceships(200);
    project.isActive = true;
    project.applyCostAndGain(500);

    expect(project.assignedSpaceships).toBe(200);
    expect(addDebris).toHaveBeenCalledWith(25);
    expect(addDebris).toHaveBeenCalledWith(1500);
  });
});
