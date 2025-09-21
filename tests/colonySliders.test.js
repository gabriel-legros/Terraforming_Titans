const EffectableEntity = require('../src/js/effectable-entity.js');
global.EffectableEntity = EffectableEntity;
const {
  setWorkforceRatio,
  setFoodConsumptionMultiplier,
  setLuxuryWaterMultiplier,
  setOreMineWorkerAssist,
  setMechanicalAssistance,
  updateColonySlidersEffect,
  resetColonySliders,
  colonySliderSettings,
  ColonySlidersManager
} = require('../src/js/colonySliders.js');
const { initializeColonySlidersUI, updateColonySlidersUI } = require('../src/js/colonySlidersUI.js');

const researchColonies = ['aerostat_colony','t1_colony','t2_colony','t3_colony','t4_colony','t5_colony','t6_colony','t7_colony'];
const sevenResearchColonies = researchColonies.slice(0,7);

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
    sevenResearchColonies.forEach(colonyId => {
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
    sevenResearchColonies.forEach(colonyId => {
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
      const match = colonyId.match(/^t(\d)_/);
      const tier = match ? parseInt(match[1], 10) : 2;
      const expectedAmount = 1.2 * Math.pow(10, tier - 3);
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
      expect(addEffect).toHaveBeenCalledWith(expect.objectContaining({
        target: 'colony',
        targetId: colonyId,
        type: 'addResourceConsumption',
        resourceCategory: 'colony',
        resourceId: 'components',
        amount: 0,
        effectId: 'mechanicalAssistanceComponents'
      }));
    });
    expect(removeEffect).not.toHaveBeenCalled();

    addEffect.mockClear();
    setMechanicalAssistance(5);
    expect(colonySliderSettings.mechanicalAssistance).toBe(2);
    researchColonies.forEach(colonyId => {
      const match = colonyId.match(/^t(\d)_/);
      const tier = match ? parseInt(match[1], 10) : 2;
      const expectedAmount = 2 * Math.pow(10, tier - 3);
      expect(addEffect).toHaveBeenCalledWith(expect.objectContaining({
        target: 'colony',
        targetId: colonyId,
        amount: expectedAmount
      }));
    });
  });

  test('updateColonySlidersEffect reapplies current slider modifiers', () => {
    setWorkforceRatio(0.6);
    setFoodConsumptionMultiplier(2);
    setLuxuryWaterMultiplier(3);
    setOreMineWorkerAssist(2);
    setMechanicalAssistance(1);

    addEffect.mockClear();
    removeEffect.mockClear();

    updateColonySlidersEffect();

    expect(addEffect).toHaveBeenCalledWith(expect.objectContaining({
      effectId: 'workforceRatio',
      value: 0.6
    }));
    expect(addEffect).toHaveBeenCalledWith(expect.objectContaining({
      effectId: 'researchSlider',
      value: (1 - 0.6) / 0.5
    }));
    expect(addEffect).toHaveBeenCalledWith(expect.objectContaining({
      effectId: 'foodGrowth',
      value: 1.02
    }));
    expect(addEffect).toHaveBeenCalledWith(expect.objectContaining({
      effectId: 'foodConsumption',
      value: 2
    }));
    expect(addEffect).toHaveBeenCalledWith(expect.objectContaining({
      effectId: 'waterGrowth',
      value: 1.02
    }));
    expect(addEffect).toHaveBeenCalledWith(expect.objectContaining({
      effectId: 'luxuryWaterMaintenance',
      value: 3
    }));
    expect(addEffect).toHaveBeenCalledWith(expect.objectContaining({
      effectId: 'oreMineWorkerNeed',
      value: 20
    }));
    expect(addEffect).toHaveBeenCalledWith(expect.objectContaining({
      effectId: 'oreMineProductionBoost',
      value: 3
    }));
    expect(addEffect).toHaveBeenCalledWith(expect.objectContaining({
      effectId: 'mechanicalAssistanceComponents'
    }));
    expect(removeEffect).not.toHaveBeenCalled();
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

  test('saveState and loadState round trip', () => {
    colonySliderSettings.applyBooleanFlag({ flagId: 'mechanicalAssistance', value: true });
    setWorkforceRatio(0.7);
    setFoodConsumptionMultiplier(2);
    setLuxuryWaterMultiplier(3);
    setOreMineWorkerAssist(4);
    setMechanicalAssistance(1.5);

    const saved = colonySliderSettings.saveState();
    resetColonySliders();
    colonySliderSettings.loadState(saved);

    expect(colonySliderSettings.workerRatio).toBe(0.7);
    expect(colonySliderSettings.foodConsumption).toBe(2);
    expect(colonySliderSettings.luxuryWater).toBe(3);
    expect(colonySliderSettings.oreMineWorkers).toBe(4);
    expect(colonySliderSettings.mechanicalAssistance).toBeCloseTo(1.5);
    expect(colonySliderSettings.isBooleanFlagSet('mechanicalAssistance')).toBe(true);
  });

  test('loadState handles legacy plain object', () => {
    resetColonySliders();
    const legacy = { workerRatio: 0.6, foodConsumption: 2, luxuryWater: 4, oreMineWorkers: 3, mechanicalAssistance: 1 };
    colonySliderSettings.loadState(legacy);
    expect(colonySliderSettings.workerRatio).toBe(0.6);
    expect(colonySliderSettings.foodConsumption).toBe(2);
    expect(colonySliderSettings.luxuryWater).toBe(4);
    expect(colonySliderSettings.oreMineWorkers).toBe(3);
    expect(colonySliderSettings.mechanicalAssistance).toBe(1);
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
    expect(mechEffect).toBe('Mitigation: -0%');
  });

  test('setMechanicalAssistance updates mitigation text', () => {
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
      isBooleanFlagSet: () => true
    };
    ctx.addEffect = () => {};
    ctx.removeEffect = () => {};
    const logicCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'colonySliders.js'), 'utf8');
    vm.runInContext(logicCode, ctx);
    const uiCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'colonySlidersUI.js'), 'utf8');
    vm.runInContext(uiCode, ctx);

    ctx.initializeColonySlidersUI();
    ctx.setMechanicalAssistance(0.4);
    const effect = dom.window.document.getElementById('mechanical-assistance-slider-effect').textContent;
    expect(effect).toBe('Mitigation: -10%');
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
    expect(mechEffect).toBe('Mitigation: -30%');
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
    ctx.terraforming = { celestialParameters: { gravity: 15 } };
    const logicCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'colonySliders.js'), 'utf8');
    vm.runInContext(logicCode, ctx);
    const uiCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'colonySlidersUI.js'), 'utf8');
    vm.runInContext(uiCode, ctx);

    ctx.initializeColonySlidersUI();
    let row = dom.window.document.getElementById('mechanical-assistance-row');
    expect(row.style.display).toBe('none');

    ctx.colonySliderSettings.sortAllResearches = () => {};
    ctx.colonySliderSettings.applyBooleanFlag({ flagId: 'mechanicalAssistance', value: true });
    ctx.updateColonySlidersUI();
    row = dom.window.document.getElementById('mechanical-assistance-row');
    expect(row.style.display).toBe('grid');
  });
});
