const assert = require('node:assert/strict');
const { test } = require('node:test');
const { chromium } = require('playwright');
const { startServer, checkSave } = require('../check-saves');

// Runs inside the game page. The inputs are controlled, but the normal updateLogic
// handles construction, climate, project deliveries, pump settlement, and maintenance.
function measureWater() {
  const phases = ['liquidWater', 'ice', 'buriedIce'];
  function snapshot() {
    let surface = PreciseDecimal.zero();
    for (const zone of getZones()) {
      for (const phase of phases) {
        const mass = terraforming.zonalSurface[phase].getExact(zone);
        if (mass.compare(0) < 0) throw new Error('Negative ' + phase + ' in ' + zone);
        surface = surface.add(mass);
      }
    }
    const other = [
      resources.colony.water.value, resources.atmospheric.atmosphericWater.value,
      resources.spaceStorage.liquidWater.value
    ];
    if (!other.every(x => Number.isFinite(x) && x >= 0)) throw new Error('Invalid water inventory');
    return other.reduce((total, x) => total.add(x), surface);
  }

  const pump = buildings.waterPump;
  const tank = resources.colony.water;
  const mining = projectManager.projects.waterSpaceMining;
  const step = terraformingParameters.gameplay.simulation.resourceSubstepMs;
  const rows = [];
  function advance(stage, ticks) {
    let before = snapshot();
    for (let i = 0; i < ticks; i++) {
      const startingWater = tank.value;
      updateLogic(step, step);
      const after = snapshot();
      rows.push({
        stage, tick: i, dt: step, startingWater, tank: tank.value,
        gained: after.subtract(before).toNumber(),
        pumpRate: pump.currentProduction.colony.water / (step / 1000),
        returnedRate: resources.atmospheric.atmosphericWater.productionRateBySource['building:t6_colony'] || 0
      });
      before = after;
    }
  }

  advance('baseline', 8);
  setLuxuryWaterMultiplier(6);
  advance('drain', 48);
  pump.autoBuildEnabled = false;
  pump.autoActiveEnabled = false;
  pump.active = 5000000n;
  advance('five million pumps', 24);
  pump.active = 0n;
  advance('pumps off', 16);

  // Exercise a different arrival stage on the same depleted tank.
  mining.booleanFlags.add('waterImportTargeting');
  mining.waterImportTarget = 'colony';
  advance('direct colony import', 16);
  mining.waterImportTarget = 'surface';
  mining.assignedSpaceships = 0;
  pump.active = 5000000n;
  setLuxuryWaterMultiplier(1);
  advance('closed world', 24);
  return rows;
}

test('whole-game water budget through depletion, redirected imports, and recovery', async t => {
  const { server, origin } = await startServer();
  t.after(() => new Promise(resolve => server.close(resolve)));
  const browser = await chromium.launch({ args: ['--enable-webgl', '--ignore-gpu-blocklist'] });
  try {
    const result = await checkSave(browser, origin, 'test_saves/debug/water_conservation.json', {
      timeout: 60000, exercise: measureWater
    });
    assert.ok(result.passed, JSON.stringify(result.errors));
    const rows = result.tick;
    async function checkStage(name, verify) {
      await t.test(name, () => {
        const stage = rows.filter(row => row.stage === name);
        assert.ok(stage.length > 0);
        let drift = 0;
        for (const row of stage) {
          // This fixture imports 53B t/s until the ship assignment is withdrawn.
          const expected = (name === 'closed world' ? 0 : 53e9) * row.dt / 1000;
          const error = row.gained - expected;
          // At this planet's inventory, conversion to/from double can round a
          // reservoir by a fraction of a ton. Budget absolute tons, per tick.
          assert.ok(Math.abs(error) <= 2, name + ' tick ' + row.tick + ': unexplained tons ' + error);
          drift += error;
        }
        assert.ok(Math.abs(drift) <= 8, name + ': cumulative unexplained tons ' + drift);
        verify(stage);
      });
    }
    await checkStage('baseline', stage => assert.ok(stage.every(row => row.tank > 0 && row.returnedRate > 0)));
    await checkStage('drain', stage => {
      assert.ok(stage.some(row => row.tank > 0 && row.tank < row.startingWater));
      assert.ok(stage.some(row => row.startingWater > 0 && row.tank === 0));
      assert.ok(stage.at(-1).tank === 0 && stage.at(-1).pumpRate > 0);
    });
    await checkStage('five million pumps', stage => {
      for (const row of stage) {
        assert.equal(row.tank, 0);
        assert.ok(Math.abs(row.pumpRate - 5e9) < 0.01);
        assert.ok(Math.abs(row.returnedRate - 5e9) < 0.01);
      }
    });
    await checkStage('pumps off', stage => {
      assert.ok(stage.every(row => row.tank === 0 && row.pumpRate === 0 && row.returnedRate === 0));
    });
    await checkStage('direct colony import', stage => {
      const first = stage[0];
      assert.equal(first.startingWater, 0);
      assert.ok(first.tank > 0 && first.pumpRate === 0 && first.returnedRate > 0);
    });
    await checkStage('closed world', stage => {
      assert.ok(stage.every(row => row.returnedRate > 0));
      assert.ok(stage.some(row => row.tank < row.startingWater));
      assert.ok(stage.some(row => row.tank > row.startingWater && row.pumpRate > row.returnedRate));
    });
  } finally {
    await browser.close();
  }
});
