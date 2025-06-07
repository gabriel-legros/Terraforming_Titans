const { setWorkforceRatio, resetColonySliders } = require('../colonySliders.js');

const researchColonies = ['t1_colony','t2_colony','t3_colony','t4_colony','t5_colony','t6_colony'];

describe('colony sliders', () => {
  beforeEach(() => {
    global.addEffect = jest.fn();
    global.colonySliderSettings = { workerRatio: 0.5 };
  });

  test('setWorkforceRatio stores value and adds effect', () => {
    setWorkforceRatio(0.8);
    expect(colonySliderSettings.workerRatio).toBe(0.8);
    expect(addEffect).toHaveBeenCalledWith(expect.objectContaining({
      target: 'population',
      type: 'workerRatio',
      value: 0.8
    }));

    const multiplier = (1 - 0.8) / 0.5;
    researchColonies.forEach(colonyId => {
      expect(addEffect).toHaveBeenCalledWith(expect.objectContaining({
        target: 'colony',
        targetId: colonyId,
        type: 'resourceProductionMultiplier',
        resourceCategory: 'colony',
        resourceTarget: 'research',
        value: multiplier
      }));
    });
  });

  test('setWorkforceRatio clamps to range', () => {
    setWorkforceRatio(0.1);
    expect(colonySliderSettings.workerRatio).toBe(0.25);
    setWorkforceRatio(1.0);
    expect(colonySliderSettings.workerRatio).toBe(0.9);
  });

  test('resetColonySliders resets to default', () => {
    colonySliderSettings.workerRatio = 0.7;
    resetColonySliders();
    expect(colonySliderSettings.workerRatio).toBe(0.5);
  });

  test('initializeColonySlidersUI sets text with worker and scientist ratios', () => {
    const fs = require('fs');
    const path = require('path');
    const jsdomPath = path.join(process.execPath, '..', '..', 'lib', 'node_modules', 'jsdom');
    const { JSDOM } = require(jsdomPath);
    const vm = require('vm');

    const dom = new JSDOM(`<!DOCTYPE html><div id="colony-sliders-container"></div>` , { runScripts: 'outside-only' });
    const ctx = dom.getInternalVMContext();
    ctx.colonySliderSettings = { workerRatio: 0.5 };
    const code = fs.readFileSync(path.join(__dirname, '..', 'colonySliders.js'), 'utf8');
    vm.runInContext(code, ctx);

    ctx.initializeColonySlidersUI();
    const text = dom.window.document.getElementById('workforce-slider-value').textContent;
    expect(text).toBe('Workers: 50% | Scientists: 50%');
  });
});
