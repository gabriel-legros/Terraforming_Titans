const fs = require('fs');
const path = require('path');
const vm = require('vm');

describe('autobuild strategic reserve for colony buildings', () => {
  test('avoids building below reserve', () => {
    const ctx = {
      console,
      module: { exports: {} },
      resources: {
        colony: {
          colonists: { value: 100, cap: 100 },
          metal: { value: 80, cap: 100, decrease(v) { this.value -= v; } },
        },
        surface: {},
        underground: {},
      },
      buildings: {},
      maintenanceFraction: 0,
    };
    vm.createContext(ctx);

    let code = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'effectable-entity.js'), 'utf8');
    vm.runInContext(code + '\nthis.EffectableEntity = EffectableEntity;', ctx);
    code = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'building.js'), 'utf8');
    vm.runInContext(code + '\nthis.Building = Building;', ctx);
    code = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'colony.js'), 'utf8');
    vm.runInContext(code + '\nthis.Colony = Colony;', ctx);
    code = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'autobuild.js'), 'utf8');
    vm.runInContext(code, ctx);

    const config = {
      name: 'Base',
      category: 'Colony',
      cost: { colony: { metal: 50 } },
      consumption: {},
      production: {},
      storage: {},
      dayNightActivity: {},
      canBeToggled: false,
      maintenanceFactor: 1,
      requiresMaintenance: false,
      requiresDeposit: null,
      requiresWorker: 0,
      unlocked: true,
      surfaceArea: 0,
      requiresProductivity: true,
    };

    const colony = new ctx.Colony(config, 'base');
    colony.autoBuildEnabled = true;
    colony.autoBuildPercent = 100;

    ctx.module.exports.setStrategicReserve(50);
    ctx.module.exports.autoBuild({ base: colony });
    expect(colony.count).toBe(0);

    ctx.resources.colony.metal.value = 150;
    ctx.resources.colony.metal.cap = 200;
    ctx.module.exports.autoBuild({ base: colony });
    expect(colony.count).toBe(1);
    expect(ctx.resources.colony.metal.value).toBe(100);
  });
});
