const fs = require('fs');
const path = require('path');
const vm = require('vm');

const EffectableEntity = require('../effectable-entity.js');

describe('researchCostMultiplier effect', () => {
  let context;
  beforeEach(() => {
    context = {
      EffectableEntity,
      buildings: {},
      colonies: {},
      projectManager: {},
      populationModule: {},
      tabManager: {},
      fundingModule: {},
      terraforming: {},
      lifeDesigner: {},
      lifeManager: {},
      oreScanner: {},
      resources: { colony: { research: { value: 0 } } },
      globalGameIsLoadingFromSave: false
    };
    vm.createContext(context);
    const researchCode = fs.readFileSync(path.join(__dirname, '..', 'research.js'), 'utf8');
    vm.runInContext(researchCode + '; this.ResearchManager = ResearchManager;', context);
  });

  test('multiplies research cost', () => {
    const params = {
      energy: [
        { id: 'fission_plant1', name: 'Fission', description: '', cost: { research: 10000 }, prerequisites: [], effects: [] }
      ],
      advanced: []
    };
    context.researchManager = new context.ResearchManager(params);
    context.addEffect = () => {};

    context.researchManager.addAndReplace({
      target: 'researchManager',
      targetId: 'fission_plant1',
      type: 'researchCostMultiplier',
      value: 0.5,
      effectId: 'test',
      sourceId: 'test'
    });

    const research = context.researchManager.getResearchById('fission_plant1');
    expect(research.cost.research).toBeCloseTo(5000);
  });
});
