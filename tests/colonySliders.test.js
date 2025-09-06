const EffectableEntity = require('../src/js/effectable-entity.js');
global.EffectableEntity = EffectableEntity;
const {
  setWorkforceRatio,
  setFoodConsumptionMultiplier,
  setLuxuryWaterMultiplier,
  setOreMineWorkerAssist,
  setMechanicalAssistance,
  resetColonySliders,
  colonySliderSettings,
  ColonySlidersManager
} = require('../src/js/colonySliders.js');
const { initializeColonySlidersUI, updateColonySlidersUI } = require('../src/js/colonySlidersUI.js');

const researchColonies = ['t1_colony','t2_colony','t3_colony','t4_colony','t5_colony','t6_colony','t7_colony'];
const sixResearchColonies = researchColonies.slice(0,6);

describe('colony sliders', () => {
  beforeEach(() => {
    global.addEffect = jest.fn();
    global.removeEffect = jest.fn();
    resetColonySliders();
  });

  test('manager inherits from EffectableEntity', () => {
    expect(colonySliderSettings).toBeInstanceOf(ColonySlidersManager);
    expect(colonySliderSettings).toBeInstanceOf(EffectableEntity);
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

  test('setFoodConsumptionMultiplier adds effects', () => {
    setFoodConsumptionMultiplier(2);
    expect(colonySliderSettings.foodConsumption).toBe(2);
    const growth = 1 + (2 - 1) * 0.02;
    expect(addEffect).toHaveBeenCalledWith(expect.objectContaining({
      target: 'population',
      type: 'growthMultiplier',
      value: growth
    }));
    sixResearchColonies.forEach(colonyId => {
      expect(addEffect).toHaveBeenCalledWith(expect.objectContaining({
        target: 'colony',
        targetId: colonyId,
        type: 'resourceConsumptionMultiplier',
        resourceCategory: 'colony',
        resourceTarget: 'food',
        value: 2
      }));
    });
  });

  test('setLuxuryWaterMultiplier adds effects', () => {
    setLuxuryWaterMultiplier(3);
    expect(colonySliderSettings.luxuryWater).toBe(3);
    const growth = 1 + (3 - 1) * 0.01;
    expect(addEffect).toHaveBeenCalledWith(expect.objectContaining({
      target: 'population',
      type: 'growthMultiplier',
      value: growth
    }));
    sixResearchColonies.forEach(colonyId => {
      expect(addEffect).toHaveBeenCalledWith(expect.objectContaining({
        target: 'colony',
        targetId: colonyId,
        type: 'maintenanceCostMultiplier',
        resourceCategory: 'colony',
        resourceId: 'water',
        value: 3
      }));
    });
  });

  test('setOreMineWorkerAssist adds effects', () => {
    setOreMineWorkerAssist(5);
    expect(colonySliderSettings.oreMineWorkers).toBe(5);
    expect(addEffect).toHaveBeenCalledWith(expect.objectContaining({
      target: 'building',
      targetId: 'oreMine',
      type: 'addedWorkerNeed',
      value: 50
    }));
    expect(addEffect).toHaveBeenCalledWith(expect.objectContaining({
      target: 'building',
      targetId: 'oreMine',
      type: 'productionMultiplier',
      value: 6
    }));
  });

  test('setMechanicalAssistance adds component consumption and clamps', () => {
    addEffect.mockClear();
    removeEffect.mockClear();
    setMechanicalAssistance(1.2);
    expect(colonySliderSettings.mechanicalAssistance).toBeCloseTo(1.2);
    researchColonies.forEach(colonyId => {
      const tier = parseInt(colonyId.match(/^t(\d)_/)[1], 10);
      const expectedAmount = 1.2 * Math.pow(10, tier - 2);
      expect(addEffect).toHaveBeenCalledWith(expect.objectContaining({
        target: 'colony',
        targetId: colonyId,
        type: 'addResourceConsumption',
        resourceCategory: 'colony',
        resourceId: 'components',
        amount: expectedAmount
      }));
    });

    addEffect.mockClear();
    removeEffect.mockClear();
    setMechanicalAssistance(-1);
    expect(colonySliderSettings.mechanicalAssistance).toBe(0);
    researchColonies.forEach(colonyId => {
      expect(removeEffect).toHaveBeenCalledWith(expect.objectContaining({
        target: 'colony',
        targetId: colonyId,
        effectId: 'mechanicalAssistanceComponents'
      }));
    });

    addEffect.mockClear();
    setMechanicalAssistance(5);
    expect(colonySliderSettings.mechanicalAssistance).toBe(2);
    researchColonies.forEach(colonyId => {
      const tier = parseInt(colonyId.match(/^t(\d)_/)[1], 10);
      const expectedAmount = 2 * Math.pow(10, tier - 2);
      expect(addEffect).toHaveBeenCalledWith(expect.objectContaining({
        target: 'colony',
        targetId: colonyId,
        amount: expectedAmount
      }));
    });
  });

  test('resetColonySliders resets to default', () => {
    colonySliderSettings.workerRatio = 0.7;
    colonySliderSettings.foodConsumption = 2;
    colonySliderSettings.luxuryWater = 3;
    colonySliderSettings.oreMineWorkers = 5;
    colonySliderSettings.mechanicalAssistance = 1;
    resetColonySliders();
    expect(colonySliderSettings.workerRatio).toBe(0.5);
    expect(colonySliderSettings.foodConsumption).toBe(1);
    expect(colonySliderSettings.luxuryWater).toBe(1);
    expect(colonySliderSettings.oreMineWorkers).toBe(0);
    expect(colonySliderSettings.mechanicalAssistance).toBe(0);
  });

  test('initializeColonySlidersUI sets default text values', () => {
    const fs = require('fs');
    const path = require('path');
    const jsdomPath = path.join(process.execPath, '..', '..', 'lib', 'node_modules', 'jsdom');
    const { JSDOM } = require(jsdomPath);
    const vm = require('vm');

    const dom = new JSDOM(`<!DOCTYPE html><div id="colony-sliders-container"></div>` , { runScripts: 'outside-only' });
    const ctx = dom.getInternalVMContext();
    ctx.EffectableEntity = EffectableEntity;
    ctx.colonySliderSettings = {
      workerRatio: 0.5,
      foodConsumption: 1,
      luxuryWater: 1,
      oreMineWorkers: 0,
      mechanicalAssistance: 0,
      isBooleanFlagSet: (flag) => flag === 'mechanicalAssistance'
    };
    const logicCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'colonySliders.js'), 'utf8');
    vm.runInContext(logicCode, ctx);
    const uiCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'colonySlidersUI.js'), 'utf8');
    vm.runInContext(uiCode, ctx);

    ctx.initializeColonySlidersUI();
    const worker = dom.window.document.getElementById('workforce-slider-value').textContent;
    const scientist = dom.window.document.getElementById('workforce-slider-effect').textContent;
    const foodEffect = dom.window.document.getElementById('food-slider-effect').textContent;
    const waterEffect = dom.window.document.getElementById('water-slider-effect').textContent;
    const oreWorkers = dom.window.document.getElementById('ore-worker-slider-value').textContent;
    const oreBoost = dom.window.document.getElementById('ore-worker-slider-effect').textContent;
    const mechVal = dom.window.document.getElementById('mechanical-assistance-slider-value').textContent;
    const mechEffect = dom.window.document.getElementById('mechanical-assistance-slider-effect').textContent;
    expect(worker).toBe('Workers: 50%');
    expect(scientist).toBe('Scientists: 50%');
    expect(foodEffect).toBe('Growth: +0.0%');
    expect(waterEffect).toBe('Growth: +0.0%');
    expect(oreWorkers).toBe('0');
    expect(oreBoost).toBe('Boost: 0%');
    expect(mechVal).toBe('0.0x');
    expect(mechEffect).toBe('');
  });

  test('initializeColonySlidersUI keeps container hidden', () => {
    const fs = require('fs');
    const path = require('path');
    const jsdomPath = path.join(process.execPath, '..', '..', 'lib', 'node_modules', 'jsdom');
    const { JSDOM } = require(jsdomPath);
    const vm = require('vm');

    const dom = new JSDOM(`<!DOCTYPE html><div id="colony-sliders-container"></div>`, { runScripts: 'outside-only' });
    const ctx = dom.getInternalVMContext();
    ctx.EffectableEntity = EffectableEntity;
    ctx.colonySliderSettings = {
      workerRatio: 0.5,
      foodConsumption: 1,
      luxuryWater: 1,
      oreMineWorkers: 0,
      mechanicalAssistance: 0,
      isBooleanFlagSet: () => false
    };
    const logicCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'colonySliders.js'), 'utf8');
    vm.runInContext(logicCode, ctx);
    const uiCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'colonySlidersUI.js'), 'utf8');
    vm.runInContext(uiCode, ctx);

    ctx.initializeColonySlidersUI();
    const container = dom.window.document.getElementById('colony-sliders-container');
    expect(container.classList.contains('invisible')).toBe(true);
  });

  test('new game reinitializes sliders as hidden', () => {
    const fs = require('fs');
    const path = require('path');
    const jsdomPath = path.join(process.execPath, '..', '..', 'lib', 'node_modules', 'jsdom');
    const { JSDOM } = require(jsdomPath);
    const vm = require('vm');

    const dom = new JSDOM(`<!DOCTYPE html><div id="colony-sliders-container"></div>`, { runScripts: 'outside-only' });
    const ctx = dom.getInternalVMContext();
    ctx.EffectableEntity = EffectableEntity;
    ctx.colonySliderSettings = {
      workerRatio: 0.5,
      foodConsumption: 1,
      luxuryWater: 1,
      oreMineWorkers: 0,
      mechanicalAssistance: 0,
      isBooleanFlagSet: () => false
    };
    const logicCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'colonySliders.js'), 'utf8');
    vm.runInContext(logicCode, ctx);
    const uiCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'colonySlidersUI.js'), 'utf8');
    vm.runInContext(uiCode, ctx);

    // Simulate unlocked state from previous game
    const container = dom.window.document.getElementById('colony-sliders-container');
    container.classList.remove('invisible');

    // Starting a new game should hide sliders again
    ctx.initializeColonySlidersUI();

    expect(container.classList.contains('invisible')).toBe(true);
  });

  test('slider functions update UI values', () => {
    const fs = require('fs');
    const path = require('path');
    const jsdomPath = path.join(process.execPath, '..', '..', 'lib', 'node_modules', 'jsdom');
    const { JSDOM } = require(jsdomPath);
    const vm = require('vm');

    const dom = new JSDOM(`<!DOCTYPE html><div id="colony-sliders-container"></div>`, { runScripts: 'outside-only' });
    const ctx = dom.getInternalVMContext();
    ctx.EffectableEntity = EffectableEntity;
    ctx.colonySliderSettings = {
      workerRatio: 0.5,
      foodConsumption: 1,
      luxuryWater: 1,
      oreMineWorkers: 0,
      mechanicalAssistance: 0,
      isBooleanFlagSet: (flag) => flag === 'mechanicalAssistance'
    };
    ctx.addEffect = jest.fn();
    const logicCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'colonySliders.js'), 'utf8');
    vm.runInContext(logicCode, ctx);
    const uiCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'colonySlidersUI.js'), 'utf8');
    vm.runInContext(uiCode, ctx);

    ctx.initializeColonySlidersUI();
    ctx.setWorkforceRatio(0.7);
    ctx.setFoodConsumptionMultiplier(2);
    ctx.setLuxuryWaterMultiplier(3);
    ctx.setOreMineWorkerAssist(4);
    ctx.setMechanicalAssistance(1.2);

    const worker = dom.window.document.getElementById('workforce-slider-value').textContent;
    const scientist = dom.window.document.getElementById('workforce-slider-effect').textContent;
    const foodVal = dom.window.document.getElementById('food-slider-value').textContent;
    const foodEffect = dom.window.document.getElementById('food-slider-effect').textContent;
    const waterVal = dom.window.document.getElementById('water-slider-value').textContent;
    const waterEffect = dom.window.document.getElementById('water-slider-effect').textContent;
    const oreWorkers = dom.window.document.getElementById('ore-worker-slider-value').textContent;
    const oreBoost = dom.window.document.getElementById('ore-worker-slider-effect').textContent;
    const mechVal = dom.window.document.getElementById('mechanical-assistance-slider-value').textContent;
    const mechEffect = dom.window.document.getElementById('mechanical-assistance-slider-effect').textContent;

    expect(worker).toBe('Workers: 70%');
    expect(scientist).toBe('Scientists: 30%');
    expect(foodVal).toBe('2.0x');
    expect(foodEffect).toBe('Growth: +2.0%');
    expect(waterVal).toBe('3.0x');
    expect(waterEffect).toBe('Growth: +2.0%');
    expect(oreWorkers).toBe('40');
    expect(oreBoost).toBe('Boost: 400%');
    expect(mechVal).toBe('1.2x');
    expect(mechEffect).toBe('');
  });

  test('mechanical assistance slider visibility toggles with flag', () => {
    const fs = require('fs');
    const path = require('path');
    const jsdomPath = path.join(process.execPath, '..', '..', 'lib', 'node_modules', 'jsdom');
    const { JSDOM } = require(jsdomPath);
    const vm = require('vm');

    const dom = new JSDOM(`<!DOCTYPE html><div id="colony-sliders-container"></div>` , { runScripts: 'outside-only' });
    const ctx = dom.getInternalVMContext();
    ctx.EffectableEntity = EffectableEntity;
    const logicCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'colonySliders.js'), 'utf8');
    vm.runInContext(logicCode, ctx);
    const uiCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'colonySlidersUI.js'), 'utf8');
    vm.runInContext(uiCode, ctx);

    ctx.initializeColonySlidersUI();
    let row = dom.window.document.getElementById('mechanical-assistance-row');
    expect(row.classList.contains('hidden')).toBe(true);

    ctx.colonySliderSettings.sortAllResearches = () => {};
    ctx.colonySliderSettings.applyBooleanFlag({ flagId: 'mechanicalAssistance', value: true });
    ctx.updateColonySlidersUI();
    row = dom.window.document.getElementById('mechanical-assistance-row');
    expect(row.classList.contains('hidden')).toBe(false);
  });
});
