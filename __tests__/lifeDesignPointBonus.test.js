const fs = require('fs');
const path = require('path');
const vm = require('vm');
const EffectableEntity = require('../effectable-entity.js');

describe('lifeDesignPointBonus effect', () => {
  let context;
  beforeEach(() => {
    context = { console, EffectableEntity };
    vm.createContext(context);
    const lifeCode = fs.readFileSync(path.join(__dirname, '..', 'life.js'), 'utf8');
    vm.runInContext(lifeCode + '; this.LifeDesigner = LifeDesigner;', context);

    context.resources = { surface: { biomass: { value: 0 } }, colony: {}, atmospheric: {} };
    context.buildings = {};
    context.colonies = {};
    context.projectManager = { projects: {} };
    context.populationModule = {};
    context.tabManager = {};
    context.fundingModule = {};
    context.terraforming = { zonalSurface: { tropical:{}, temperate:{}, polar:{} }, zonalWater:{}, celestialParameters:{surfaceArea:1,gravity:1,radius:1}, zonalTemperature:{}, getMagnetosphereStatus:()=>true };
    context.lifeManager = {};
    context.oreScanner = {};

    global.resources = context.resources;
    global.buildings = context.buildings;
    global.colonies = context.colonies;
    global.projectManager = context.projectManager;
    global.populationModule = context.populationModule;
    global.tabManager = context.tabManager;
    global.fundingModule = context.fundingModule;
    global.terraforming = context.terraforming;
    global.lifeManager = context.lifeManager;
    global.oreScanner = context.oreScanner;

    context.lifeDesigner = new context.LifeDesigner();
    global.lifeDesigner = context.lifeDesigner;
  });

  test('adds bonus points to maxLifeDesignPoints', () => {
    const designer = context.lifeDesigner;
    expect(designer.maxLifeDesignPoints()).toBe(50);
    designer.addAndReplace({ type: 'lifeDesignPointBonus', value: 10, effectId: 'skill', sourceId: 'skill' });
    expect(designer.maxLifeDesignPoints()).toBe(60);
  });
});
