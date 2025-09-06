const fs = require('fs');
const path = require('path');
const jsdomPath = path.join(process.execPath, '..', '..', 'lib', 'node_modules', 'jsdom');
const { JSDOM } = require(jsdomPath);
const vm = require('vm');

describe('mechanical assistance components need', () => {
  function setupContext() {
    const dom = new JSDOM('<!DOCTYPE html><div id="root"></div>', { runScripts: 'outside-only' });
    const ctx = dom.getInternalVMContext();
    ctx.globalGameIsLoadingFromSave = false;
    ctx.resources = { colony: { energy: { displayName: 'Energy' }, food: { displayName: 'Food' }, electronics: { displayName: 'Electronics' }, components: { displayName: 'Components' } } };
    ctx.luxuryResources = { electronics: true, androids: true };
    ctx.colonies = {};
    ctx.invalidateColonyNeedCache = () => {};
    ctx.updateStructureDisplay = () => {};
    ctx.updateConstructionOfficeUI = () => {};
    ctx.milestonesManager = { getHappinessBonus: () => 0 };
    ctx.colonySliderSettings = { mechanicalAssistance: 0 };
    ctx.terraforming = { celestialParameters: { gravity: 15 } };

    const effectableCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'effectable-entity.js'), 'utf8');
    vm.runInContext(effectableCode, ctx);
    const buildingCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'building.js'), 'utf8');
    vm.runInContext(buildingCode, ctx);
    const colonyCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'colony.js'), 'utf8');
    vm.runInContext(colonyCode, ctx);
    const colonyUICode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'colonyUI.js'), 'utf8');
    vm.runInContext(colonyUICode, ctx);

    return { dom, ctx };
  }

  test('components need box toggles with mechanical assistance', () => {
    const { dom, ctx } = setupContext();
    const config = { name: 'Colony', category: 'colony', cost: { colony: {} }, consumption: { colony: { energy: 1, food: 1, electronics: 1 } }, production: {}, storage: {}, dayNightActivity: false, canBeToggled: true, requiresMaintenance: false, maintenanceFactor: 1, requiresDeposit: null, requiresWorker: 0, unlocked: true, baseComfort: 0 };
    const Colony = vm.runInContext('Colony', ctx);
    const colony = new Colony(config, 'col');

    const row = dom.window.document.createElement('div');
    const details = ctx.createColonyDetails(colony);
    row.appendChild(details);
    expect(row.textContent).not.toContain('Components');

    const effect = { type: 'addResourceConsumption', resourceCategory: 'colony', resourceId: 'components', amount: 1, effectId: 'e1', sourceId: 's1' };
    colony.addEffect(effect);
    ctx.rebuildColonyNeedCache(row, colony);
    const ids = Array.from(row.querySelectorAll('.need-box')).map(el => el.id);
    expect(ids).toEqual(['col-happiness', 'col-comfort', 'col-energy', 'col-food', 'col-components', 'col-electronics']);

    colony.removeEffect(effect);
    ctx.rebuildColonyNeedCache(row, colony);
    const idsAfter = Array.from(row.querySelectorAll('.need-box')).map(el => el.id);
    expect(idsAfter).not.toContain('col-components');
  });

  test('mitigation scales with components need', () => {
    const { ctx } = setupContext();
    const config = { name: 'Colony', category: 'colony', cost: { colony: {} }, consumption: { colony: { energy: 1, food: 1 } }, production: {}, storage: {}, dayNightActivity: false, canBeToggled: true, requiresMaintenance: false, maintenanceFactor: 1, requiresDeposit: null, requiresWorker: 0, unlocked: true, baseComfort: 0 };
    const Colony = vm.runInContext('Colony', ctx);
    const colony = new Colony(config, 'col');
    colony.updateNeedsRatio = () => {};
    ctx.colonySliderSettings.mechanicalAssistance = 1;

    colony.filledNeeds = { food: 1, energy: 1, components: 1 };
    colony.happiness = 0;
    colony.updateHappiness(1000);
    const full = colony.happiness;

    colony.filledNeeds.components = 0.5;
    colony.happiness = 0;
    colony.updateHappiness(1000);
    const partial = colony.happiness;

    ctx.colonySliderSettings.mechanicalAssistance = 0;
    delete colony.filledNeeds.components;
    colony.happiness = 0;
    colony.updateHappiness(1000);
    const none = colony.happiness;

    expect(full).toBeGreaterThan(partial);
    expect(partial).toBeGreaterThan(none);
  });
});
