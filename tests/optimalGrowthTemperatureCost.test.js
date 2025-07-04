const fs = require('fs');
const path = require('path');
const vm = require('vm');
const EffectableEntity = require('../src/js/effectable-entity.js');

describe('optimal growth temperature cost', () => {
  test('uses absolute value for cost', () => {
    const ctx = { console, EffectableEntity };
    vm.createContext(ctx);
    const lifeCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'life.js'), 'utf8');
    vm.runInContext(lifeCode + '; this.LifeDesign = LifeDesign;', ctx);

    const design = new ctx.LifeDesign(2, 0, 0, 0, 0, 0, 0, 0, 0);
    design.optimalGrowthTemperature.value = -3;
    expect(design.getDesignCost()).toBe(5); // 2 + | -3 | = 5

    design.optimalGrowthTemperature.value = 4;
    expect(design.getDesignCost()).toBe(6); // 2 + 4 = 6
  });
});
