const fs = require('fs');
const path = require('path');
const vm = require('vm');
const EffectableEntity = require('../src/js/effectable-entity.js');

function createContext() {
  const ctx = {
    console,
    EffectableEntity,
    shipEfficiency: 1,
    projectElements: {},
    formatNumber: n => n,
    formatBigInteger: n => n,
    formatTotalCostDisplay: () => '',
    formatTotalResourceGainDisplay: () => '',
    formatTotalMaintenanceDisplay: () => '',
  };
  ctx.globalThis = ctx;
  ctx.projectManager = {
    projects: {},
    isBooleanFlagSet: () => false,
    getDurationMultiplier: () => 1,
  };
  ctx.spaceManager = {
    getTerraformedPlanetCountExcludingCurrent: () => 1,
    getTerraformedPlanetCount: () => 1,
    getCurrentPlanetKey: () => null,
    isPlanetTerraformed: () => false,
  };
  return ctx;
}

describe('GalacticMarketProject sell scaling', () => {
  test('scales each sell selection independently', () => {
    const ctx = createContext();
    ctx.resources = {
      surface: {
        metal: { value: 100 },
        glass: { value: 5 },
      },
      colony: {
        funding: { value: 0 },
      },
    };

    vm.createContext(ctx);

    const projectCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'projects.js'), 'utf8');
    vm.runInContext(`${projectCode}; this.Project = Project;`, ctx);

    const galacticMarketCode = fs.readFileSync(
      path.join(__dirname, '..', 'src/js', 'projects', 'GalacticMarketProject.js'),
      'utf8'
    );
    vm.runInContext(`${galacticMarketCode}; this.GalacticMarketProject = GalacticMarketProject;`, ctx);

    const config = {
      name: 'Galactic Market',
      category: 'space',
      cost: {},
      duration: 1000,
      description: '',
      repeatable: true,
      maxRepeatCount: Infinity,
      unlocked: true,
      attributes: {
        resourceChoiceGainCost: {
          surface: {
            metal: 2,
            glass: 4,
          },
        },
      },
    };

    const project = new ctx.GalacticMarketProject(config, 'galactic_market');
    project.autoStart = true;
    project.isActive = true;
    project.sellSelections = [
      { category: 'surface', resource: 'metal', quantity: 10 },
      { category: 'surface', resource: 'glass', quantity: 10 },
    ];

    const changes = {};
    project.applyCostAndGain(1000, changes, 1);

    expect(changes.surface.metal).toBeCloseTo(-10);
    expect(changes.surface.glass).toBeCloseTo(-5);

    const expectedFunding = (
      project.getSellPrice('surface', 'metal', 10) * 10 +
      project.getSellPrice('surface', 'glass', 5) * 5
    );
    expect(changes.colony.funding).toBeCloseTo(expectedFunding);
    expect(project.shortfallLastTick).toBe(true);
  });
});

