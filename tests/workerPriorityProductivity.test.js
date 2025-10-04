const fs = require('fs');
const path = require('path');
const jsdomPath = path.join(process.execPath, '..', '..', 'lib', 'node_modules', 'jsdom');
const { JSDOM } = require(jsdomPath);
const vm = require('vm');

test('worker priority tiers allocate workers appropriately', () => {
  const dom = new JSDOM(`<!DOCTYPE html>`, { runScripts: 'outside-only' });
  const ctx = dom.getInternalVMContext();
  ctx.resources = { colony: { colonists: { value: 0 }, workers: { value: 0, cap: 15 }, androids: { value: 0, cap: 0 } } };
  const effectCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'effectable-entity.js'), 'utf8');
  const buildingCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'building.js'), 'utf8');
  const populationCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'population.js'), 'utf8');
  vm.runInContext(effectCode + '\n' + buildingCode + '\n' + populationCode + '; this.Building = Building; this.PopulationModule = PopulationModule;', ctx);

  const pop = new ctx.PopulationModule(ctx.resources, { workerRatio: 1 });
  ctx.populationModule = pop;

  const config = { name: 'A', category: 'resource', description: '', cost: {}, consumption: {}, production: {}, storage: {}, dayNightActivity: true, canBeToggled: false, maintenanceFactor: 0, requiresMaintenance: false, requiresDeposit: false, requiresWorker: 10, unlocked: true, surfaceArea: 0, requiresProductivity: true, requiresLand: 0 };
  const b1 = new ctx.Building(config, 'A');
  b1.active = 1;
  b1.workerPriority = 1; // high
  const b2 = new ctx.Building(config, 'B');
  b2.active = 1; // normal
  const b3 = new ctx.Building(config, 'C');
  b3.active = 1;
  b3.workerPriority = -1; // low
  ctx.buildings = { A: b1, B: b2, C: b3 };

  pop.updateWorkerRequirements();
  const ratio1 = b1.calculateBaseMinRatio(ctx.resources, 1000);
  const ratio2 = b2.calculateBaseMinRatio(ctx.resources, 1000);
  const ratio3 = b3.calculateBaseMinRatio(ctx.resources, 1000);
  expect(ratio1).toBe(1);
  expect(ratio2).toBeCloseTo(0.5);
  expect(ratio3).toBe(0);
});
