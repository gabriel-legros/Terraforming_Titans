const {
  setWorkforceRatio,
  setFoodConsumptionMultiplier,
  setLuxuryWaterMultiplier,
  setOreMineWorkerAssist,
  resetColonySliders
} = require('../colonySliders.js');
const { initializeColonySlidersUI } = require('../colonySlidersUI.js');

const researchColonies = ['t1_colony','t2_colony','t3_colony','t4_colony','t5_colony','t6_colony'];

describe('colony sliders', () => {
  beforeEach(() => {
    global.addEffect = jest.fn();
    global.colonySliderSettings = { workerRatio: 0.5, foodConsumption: 1, luxuryWater: 1, oreMineWorkers: 0 };
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
    researchColonies.forEach(colonyId => {
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
    researchColonies.forEach(colonyId => {
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
      value: 25
    }));
  });

  test('resetColonySliders resets to default', () => {
    colonySliderSettings.workerRatio = 0.7;
    colonySliderSettings.foodConsumption = 2;
    colonySliderSettings.luxuryWater = 3;
    colonySliderSettings.oreMineWorkers = 5;
    resetColonySliders();
    expect(colonySliderSettings.workerRatio).toBe(0.5);
    expect(colonySliderSettings.foodConsumption).toBe(1);
    expect(colonySliderSettings.luxuryWater).toBe(1);
    expect(colonySliderSettings.oreMineWorkers).toBe(0);
  });

  test('initializeColonySlidersUI sets default text values', () => {
    const fs = require('fs');
    const path = require('path');
    const jsdomPath = path.join(process.execPath, '..', '..', 'lib', 'node_modules', 'jsdom');
    const { JSDOM } = require(jsdomPath);
    const vm = require('vm');

    const dom = new JSDOM(`<!DOCTYPE html><div id="colony-sliders-container"></div>` , { runScripts: 'outside-only' });
    const ctx = dom.getInternalVMContext();
    ctx.colonySliderSettings = { workerRatio: 0.5, foodConsumption: 1, luxuryWater: 1, oreMineWorkers: 0 };
    const logicCode = fs.readFileSync(path.join(__dirname, '..', 'colonySliders.js'), 'utf8');
    vm.runInContext(logicCode, ctx);
    const uiCode = fs.readFileSync(path.join(__dirname, '..', 'colonySlidersUI.js'), 'utf8');
    vm.runInContext(uiCode, ctx);

    ctx.initializeColonySlidersUI();
    const worker = dom.window.document.getElementById('workforce-slider-value').textContent;
    const scientist = dom.window.document.getElementById('workforce-slider-effect').textContent;
    const foodEffect = dom.window.document.getElementById('food-slider-effect').textContent;
    const waterEffect = dom.window.document.getElementById('water-slider-effect').textContent;
    const oreWorkers = dom.window.document.getElementById('ore-worker-slider-value').textContent;
    const oreBoost = dom.window.document.getElementById('ore-worker-slider-effect').textContent;
    expect(worker).toBe('Workers: 50%');
    expect(scientist).toBe('Scientists: 50%');
    expect(foodEffect).toBe('Growth: +0.0%');
    expect(waterEffect).toBe('Growth: +0.0%');
    expect(oreWorkers).toBe('0');
    expect(oreBoost).toBe('Boost: 100%');
  });

  test('slider functions update UI values', () => {
    const fs = require('fs');
    const path = require('path');
    const jsdomPath = path.join(process.execPath, '..', '..', 'lib', 'node_modules', 'jsdom');
    const { JSDOM } = require(jsdomPath);
    const vm = require('vm');

    const dom = new JSDOM(`<!DOCTYPE html><div id="colony-sliders-container"></div>`, { runScripts: 'outside-only' });
    const ctx = dom.getInternalVMContext();
    ctx.colonySliderSettings = { workerRatio: 0.5, foodConsumption: 1, luxuryWater: 1, oreMineWorkers: 0 };
    ctx.addEffect = jest.fn();
    const logicCode = fs.readFileSync(path.join(__dirname, '..', 'colonySliders.js'), 'utf8');
    vm.runInContext(logicCode, ctx);
    const uiCode = fs.readFileSync(path.join(__dirname, '..', 'colonySlidersUI.js'), 'utf8');
    vm.runInContext(uiCode, ctx);

    ctx.initializeColonySlidersUI();
    ctx.setWorkforceRatio(0.7);
    ctx.setFoodConsumptionMultiplier(2);
    ctx.setLuxuryWaterMultiplier(3);
    ctx.setOreMineWorkerAssist(4);

    const worker = dom.window.document.getElementById('workforce-slider-value').textContent;
    const scientist = dom.window.document.getElementById('workforce-slider-effect').textContent;
    const foodVal = dom.window.document.getElementById('food-slider-value').textContent;
    const foodEffect = dom.window.document.getElementById('food-slider-effect').textContent;
    const waterVal = dom.window.document.getElementById('water-slider-value').textContent;
    const waterEffect = dom.window.document.getElementById('water-slider-effect').textContent;
    const oreWorkers = dom.window.document.getElementById('ore-worker-slider-value').textContent;
    const oreBoost = dom.window.document.getElementById('ore-worker-slider-effect').textContent;

    expect(worker).toBe('Workers: 70%');
    expect(scientist).toBe('Scientists: 30%');
    expect(foodVal).toBe('2.0x');
    expect(foodEffect).toBe('Growth: +2.0%');
    expect(waterVal).toBe('3.0x');
    expect(waterEffect).toBe('Growth: +2.0%');
    expect(oreWorkers).toBe('40');
    expect(oreBoost).toBe('Boost: 1600%');
  });
});
