const fs = require('fs');
const path = require('path');
const vm = require('vm');
const EffectableEntity = require('../src/js/effectable-entity.js');
global.EffectableEntity = EffectableEntity;
const { SolisManager } = require('../src/js/solis.js');

describe('Solis funding upgrade', () => {
  let FundingModule;
  beforeAll(() => {
    const fundingCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'funding.js'), 'utf8');
    const context = { EffectableEntity };
    vm.createContext(context);
    vm.runInContext(fundingCode + '; this.FundingModule = FundingModule;', context);
    FundingModule = context.FundingModule;
  });

  test('increases funding rate with each purchase', () => {
    const fundingModule = new FundingModule({}, 5);
    global.fundingModule = fundingModule;
    global.addEffect = (effect) => fundingModule.addAndReplace(effect);

    const manager = new SolisManager();
    manager.solisPoints = 5;

    manager.purchaseUpgrade('funding');
    expect(fundingModule.fundingRate).toBe(6);

    manager.purchaseUpgrade('funding');
    expect(fundingModule.fundingRate).toBe(7);
  });

  test('setFundingRate effect persists when purchasing upgrades', () => {
    const fundingModule = new FundingModule({}, 0);
    global.fundingModule = fundingModule;
    global.addEffect = (effect) => fundingModule.addAndReplace(effect);

    // Apply story effect that sets funding rate to 3
    addEffect({ target: 'fundingModule', type: 'setFundingRate', value: 3 });

    const manager = new SolisManager();
    manager.solisPoints = 1;

    manager.purchaseUpgrade('funding');
    expect(fundingModule.fundingRate).toBe(4);
  });
});
