const fs = require('fs');
const path = require('path');
const vm = require('vm');
const EffectableEntity = require('../src/js/effectable-entity.js');

describe('LifeDesigner point cost scaling', () => {
  let ctx;
  beforeEach(() => {
    ctx = { console, EffectableEntity };
    vm.createContext(ctx);
    const lifeCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'life.js'), 'utf8');
    vm.runInContext(lifeCode + '; this.LifeDesigner = LifeDesigner;', ctx);

    ctx.resources = { surface: { biomass: { value: 0 } }, colony: {}, atmospheric: {} };
    ctx.buildings = {};
    ctx.colonies = {};
    ctx.projectManager = { projects: {} };
    ctx.populationModule = {};
    ctx.tabManager = {};
    ctx.fundingModule = {};
    ctx.terraforming = { zonalSurface: { tropical:{}, temperate:{}, polar:{} }, zonalWater:{}, celestialParameters:{surfaceArea:1,gravity:1,radius:1}, zonalTemperature:{}, getMagnetosphereStatus:()=>true };
    ctx.lifeManager = {};
    ctx.oreScanner = {};

    global.resources = ctx.resources;
    global.buildings = ctx.buildings;
    global.colonies = ctx.colonies;
    global.projectManager = ctx.projectManager;
    global.populationModule = ctx.populationModule;
    global.tabManager = ctx.tabManager;
    global.fundingModule = ctx.fundingModule;
    global.terraforming = ctx.terraforming;
    global.lifeManager = ctx.lifeManager;
    global.oreScanner = ctx.oreScanner;

    ctx.lifeDesigner = new ctx.LifeDesigner();
    global.lifeDesigner = ctx.lifeDesigner;
  });

  test('cost starts at 100 and doubles with each purchase', () => {
    const designer = ctx.lifeDesigner;
    expect(designer.getPointCost('research')).toBe(100);
    designer.purchaseCounts.research = 1;
    expect(designer.getPointCost('research')).toBe(200);
    designer.purchaseCounts.research = 2;
    expect(designer.getPointCost('research')).toBe(400);
  });
});

