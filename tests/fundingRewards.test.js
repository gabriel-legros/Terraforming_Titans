const fs = require('fs');
const path = require('path');
const vm = require('vm');

const EffectableEntity = require('../src/js/effectable-entity.js');

class DummyResource extends EffectableEntity {
  constructor() {
    super({});
    this.value = 0;
  }
  increase(amount) {
    this.value += amount;
  }
}

describe('funding rewards', () => {
  let context;
  beforeEach(() => {
    context = {
      console,
      setTimeout: (fn) => fn(),
      clearTimeout: () => {},
      window: {},
      document: { addEventListener: () => {}, removeEventListener: () => {} },
      clearJournal: () => {},
      createPopup: () => {},
      addJournalEntry: () => {},
      buildings: {},
      colonies: {},
      terraforming: {},
      projectManager: { projects: {} },
      populationModule: { addAndReplace: () => {}, removeEffect: () => {} },
      tabManager: {},
      globalEffects: new EffectableEntity({ description: 'global' }),
      lifeDesigner: {},
      lifeManager: {},
      oreScanner: {}
    };
    vm.createContext(context);
    context.EffectableEntity = EffectableEntity;
    const fundingCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'funding.js'), 'utf8');
    vm.runInContext(fundingCode + '; this.FundingModule = FundingModule;', context);
    const progressCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'progress.js'), 'utf8');
    vm.runInContext(`${progressCode}; this.StoryManager = StoryManager;`, context);
    context.addEffect = (effect) => {
      if (effect.target === 'fundingModule') {
        context.fundingModule.applySetFundingRate(effect);
      } else if (effect.target === 'resource') {
        context.resources[effect.resourceType][effect.targetId].increase(effect.quantity);
      }
    };

    context.resources = { colony: { funding: new DummyResource() } };
    context.fundingModule = new context.FundingModule(context.resources, 100);
  });

  test('setFundingRate reward overrides funding rate', () => {
    const manager = new context.StoryManager({ chapters: [] });
    context.window.storyManager = manager;
    const event = { id: 'e1', reward: [{ target: 'fundingModule', type: 'setFundingRate', value: 50, oneTimeFlag: true }], rewardDelay: 0 };

    manager.applyRewards(event);

    expect(context.fundingModule.fundingRate).toBe(50);
  });

  test('instantResourceGain increases resource immediately', () => {
    const manager = new context.StoryManager({ chapters: [] });
    context.window.storyManager = manager;
    const event = { id: 'e2', reward: [{ target: 'resource', resourceType: 'colony', targetId: 'funding', type: 'instantResourceGain', quantity: 200, oneTimeFlag: true }], rewardDelay: 0 };

    manager.applyRewards(event);

    expect(context.resources.colony.funding.value).toBe(200);
  });
});
