const {
  advanceTicks,
  createGameDom,
  loadSaveFromRelativePath,
} = require('../../__tests__/helpers/jsdom-game-harness.js');

(async () => {
  const dom = await createGameDom();
  const { window } = dom;
  loadSaveFromRelativePath(window, 'test_saves/debug/expensive_oversight.json');

  const terraforming = window.eval('terraforming');
  const originalRunUpdateStep = terraforming.runUpdateStep;
  let projectionCalls = 0;
  terraforming.runUpdateStep = function (...args) {
    projectionCalls += 1;
    return originalRunUpdateStep.apply(this, args);
  };

  advanceTicks(window, 5, 10);
  projectionCalls = 0;
  const started = process.hrtime.bigint();
  advanceTicks(window, 20, 10);
  const elapsedMs = Number(process.hrtime.bigint() - started) / 1e6;
  process.stdout.write(JSON.stringify({
    advancedOversight: true,
    ticks: 20,
    elapsedMs,
    projectionCalls,
    assignments: window.eval('mirrorOversightSettings.assignments'),
    projectedZones: window.eval(
      'mirrorOversightSettings.lastProjectedTemperatureState.temperature.zones'
    ),
  }, null, 2) + '\n');

  window.eval('mirrorOversightSettings.advancedOversight = false');
  projectionCalls = 0;
  const disabledStarted = process.hrtime.bigint();
  advanceTicks(window, 20, 10);
  const disabledElapsedMs = Number(process.hrtime.bigint() - disabledStarted) / 1e6;
  process.stdout.write(JSON.stringify({
    advancedOversight: false,
    ticks: 20,
    elapsedMs: disabledElapsedMs,
    projectionCalls,
  }, null, 2) + '\n');
  dom.window.close();
})().catch((error) => {
  process.stderr.write(`${error.stack || error}\n`);
  process.exit(1);
});
