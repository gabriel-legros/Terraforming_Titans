const fs = require('fs');
const http = require('http');
const path = require('path');
const { createHash } = require('crypto');
const { chromium } = require('playwright');

const root = path.resolve(__dirname, '../..');
const args = process.argv.slice(2);
const seeds = [];
let solverSource;
let output;
let maximumSteps = 12000;
let verificationSteps = 2000;
let phaseChangeHeat = false;
let matrix = false;
let jobs = 1;
let check = false;
let sync = false;
let invariants = false;
let controls = false;
for (let index = 0; index < args.length; index++) {
  if (args[index] === '--solver-source') solverSource = fs.readFileSync(path.resolve(args[++index]), 'utf8');
  else if (args[index] === '--output') output = path.resolve(args[++index]);
  else if (args[index] === '--steps') maximumSteps = Number(args[++index]);
  else if (args[index] === '--verification-steps') verificationSteps = Number(args[++index]);
  else if (args[index] === '--phase-change-heat') phaseChangeHeat = true;
  else if (args[index] === '--matrix') matrix = true;
  else if (args[index] === '--jobs') jobs = Number(args[++index]);
  else if (args[index] === '--check') check = true;
  else if (args[index] === '--sync') sync = true;
  else if (args[index] === '--invariants') invariants = true;
  else if (args[index] === '--controls') controls = true;
  else if (args[index].startsWith('--')) throw new Error('Unknown option: ' + args[index]);
  else seeds.push(args[index]);
}
for (const [name, value] of Object.entries({ jobs, maximumSteps, verificationSteps })) {
  if (!Number.isInteger(value) || value < 1) throw new Error(name + ' must be a positive integer');
}
if (!seeds.length && !matrix) seeds.push(
  '770121835|planet|jupiter-like|hz-inner',
  '1982065114|planet|icy-moon|hz-mid',
  '42|planet|titan-like|cold',
  '9001|planet|cold-desert|hz-outer'
);
const rawSolverSource = solverSource || fs.readFileSync(path.join(root, 'src/js/rwg/rwgEquilibrate.js'), 'utf8');
let browserSolverSource = rawSolverSource;
if (invariants) {
  if (!rawSolverSource.includes('function relaxEquilibrationFamily(')) throw new Error('--invariants requires the implicit solver');
  browserSolverSource = rawSolverSource.replace('  window.runEquilibration = runEquilibration;', `
  const conservation = window.__equilibrationInvariants = { observations: 0, failures: 0, maximumRelativeMassError: 0 };
  function observeInventory(before, after) {
    conservation.observations++;
    const initial = before.reduce((a,b) => a+b, 0), final = after.reduce((a,b) => a+b, 0);
    conservation.maximumRelativeMassError = Math.max(conservation.maximumRelativeMassError, Math.abs(final-initial)/Math.max(1,initial,final));
    if (after.some(value => !Number.isFinite(value) || value < 0) || Math.abs(final-initial) > Math.max(.01, Math.max(initial,final)*1e-12)) conservation.failures++;
  }
  const originalRelax = relaxEquilibrationFamily;
  relaxEquilibrationFamily = function(terra, family) {
    const before = family.nodes.map(node => node.zone ? Number(terra.zonalSurface[node.key][node.zone]) : terra.resources.atmospheric[node.key].value);
    const after = originalRelax(terra, family);
    observeInventory(before, after);
    return after;
  };
  window.runEquilibration = runEquilibration;`).replaceAll('const candidate = captureEquilibrationState(terra);', `
  const candidate = captureEquilibrationState(terra);
  for (const family of families) {
    const values = state => family.nodes.map(node => node.zone ? Number(state.zonalSurface[node.key][node.zone]) : state.resources.atmospheric[node.key]);
    observeInventory(values(accepted), values(candidate));
  }`);
}

async function main() {
  const staticFiles = new Map();
  const server = http.createServer((request, response) => {
    const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
    const filename = path.resolve(root, '.' + (pathname === '/' ? '/index.html' : pathname));
    if (!filename.startsWith(root + path.sep)) {
      response.writeHead(403).end();
      return;
    }
    fs.readFile(filename, (error, content) => {
      if (error) response.writeHead(404).end();
      else {
        const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' };
        response.setHeader('Content-Type', types[path.extname(filename)] || 'application/octet-stream');
        response.end(content);
      }
    });
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  let browser;
  const results = [];
  try {
    browser = await chromium.launch({ headless: true });
    async function createPage() {
      const page = await browser.newPage();
      await page.route(`http://127.0.0.1:${server.address().port}/**`, async route => {
        const pathname = decodeURIComponent(new URL(route.request().url()).pathname);
        const filename = path.resolve(root, '.' + pathname);
        if (!filename.startsWith(root + path.sep)) return route.fulfill({ status: 403 });
        if (!staticFiles.has(filename)) staticFiles.set(filename, fs.promises.readFile(filename));
        try {
          const body = await staticFiles.get(filename);
          const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json' };
          await route.fulfill({ body, contentType: types[path.extname(filename)] || 'application/octet-stream' });
        } catch {
          await route.fulfill({ status: 404 });
        }
      });
      return page;
    }
    const page = await createPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(`http://127.0.0.1:${server.address().port}/index.html`, { waitUntil: 'load' });
    await page.evaluate(enabled => {
      game.loop.stop();
      gameSettings.phaseChangeHeat = enabled;
    }, phaseChangeHeat);
    await page.evaluate(source => (0, eval)(source), browserSolverSource);
    if (controls) {
      const result = await page.evaluate(async () => {
        const seed = '296949711|planet|mars-like|hz-inner';
        const previous = { resources, currentPlanetParameters, terraforming, celestialParameters, calculateZoneSolarFluxWithFacility, luminosity: getStarLuminosity() };
        const initialValues = JSON.stringify(Object.fromEntries(Object.entries(resources).map(([category, bucket]) => [category, Object.fromEntries(Object.entries(bucket).map(([key, resource]) => [key, resource.value]))])));
        const checks = [];
        function restored(name) {
          if (resources !== previous.resources || currentPlanetParameters !== previous.currentPlanetParameters || terraforming !== previous.terraforming || celestialParameters !== previous.celestialParameters || calculateZoneSolarFluxWithFacility !== previous.calculateZoneSolarFluxWithFacility || getStarLuminosity() !== previous.luminosity || isEquilibrating) throw new Error(name + ': game globals were not restored');
          const values = JSON.stringify(Object.fromEntries(Object.entries(resources).map(([category, bucket]) => [category, Object.fromEntries(Object.entries(bucket).map(([key, resource]) => [key, resource.value]))])));
          if (values !== initialValues) throw new Error(name + ': live inventories changed');
          checks.push(name);
        }
        const input = () => buildEquilibrationInputParams(generateRandomPlanet(seed));
        const synchronous = await runEquilibration(input(), { sync: true });
        restored('sync completion');
        const asynchronous = await runEquilibration(input(), { chunkSteps: 7 });
        restored('async completion');
        if (synchronous.reason !== 'converged' || asynchronous.reason !== 'converged' || synchronous.steps !== asynchronous.steps || JSON.stringify(synchronous.override) !== JSON.stringify(asynchronous.override)) throw new Error('Chunk scheduling changed the result');
        checks.push('sync/async determinism');
        const limited = await runEquilibration(input(), { sync: true, maxSteps: 50 });
        if (limited.reason !== 'step-limit' || limited.steps !== 50) throw new Error('Work budget was not enforced');
        restored('work budget');
        let firstRelaxationStep;
        await runEquilibration(input(), { sync: true, maxSteps: 50, chunkSteps: 1, stepDays: 1 }, (_, info) => {
          if (firstRelaxationStep === undefined && info.phase === 'relaxing' && info.stepMs > 20) firstRelaxationStep = info.stepMs;
        });
        if (firstRelaxationStep !== 1000 * terraformingParameters.gameplay.equilibration.implicitGrowth) throw new Error('stepDays override was ignored');
        restored('stepDays override');
        const added = {};
        const extended = await runEquilibration(input(), { chunkSteps: 7, maxSteps: 40, cancelToken: added }, (_, info) => { if (info.step >= 28 && !added.extended) { added.addSteps = 1000; added.extended = true; } });
        if (extended.reason !== 'converged' || extended.steps <= 40) throw new Error('Add steps did not extend the budget');
        restored('add steps');
        const early = {};
        const ended = await runEquilibration(input(), { chunkSteps: 7, cancelToken: early }, (_, info) => { if (info.step >= 21) early.endEarly = true; });
        if (ended.reason !== 'ended-early') throw new Error('End Early was ignored');
        restored('end early');
        const cancel = {};
        const running = runEquilibration(input(), { chunkSteps: 7, cancelToken: cancel });
        setTimeout(() => { cancel.cancelled = true; }, 0);
        let cancelled = false;
        try { await running; } catch (error) { cancelled = error.message === 'cancelled'; }
        if (!cancelled) throw new Error('Async cancellation was ignored');
        restored('cancel between chunks');
        const originalUpdate = Terraforming.prototype.runResourceUpdateStep;
        let rejected = false;
        try {
          Terraforming.prototype.runResourceUpdateStep = () => { throw new Error('injected solver failure'); };
          await runEquilibration(input(), { sync: true });
        } catch (error) { rejected = error.message === 'injected solver failure'; }
        finally { Terraforming.prototype.runResourceUpdateStep = originalUpdate; }
        if (!rejected) throw new Error('Simulation errors were not propagated');
        restored('error cleanup');
        return { passed: checks.length, failed: 0, checks };
      });
      console.log(JSON.stringify(result));
      if (output) { fs.mkdirSync(path.dirname(output), { recursive: true }); fs.writeFileSync(output, JSON.stringify(result, null, 2) + '\n'); }
      return;
    }
    if (matrix) {
      const catalog = await page.evaluate(() => ({ types: Object.keys(RWG_WORLD_TYPES), orbits: Object.keys(ORBIT_PRESET_TO_FLUX_KEY) }));
      catalog.types.forEach((type, typeIndex) => catalog.orbits.forEach((orbit, orbitIndex) => {
        seeds.push((296949711 + typeIndex * 1000003 + orbitIndex * 9176) + '|planet|' + type + '|' + orbit);
      }));
      ['icy-moon', 'titan-like'].forEach((type, typeIndex) => catalog.orbits.forEach((orbit, orbitIndex) => {
        seeds.push((1296949711 + typeIndex * 1000003 + orbitIndex * 9176) + '|moon|' + type + '|' + orbit);
      }));
      seeds.push('296949711|planet|mars-like|hz-inner', '770121835|planet|jupiter-like|hz-inner');
      console.log('Matrix: ' + catalog.types.length + ' world types, ' + catalog.orbits.length + ' orbits, ' + seeds.length + ' cases');
    }
    let nextCase = 0;
    async function worker(page) {
      while (nextCase < seeds.length) {
        const index = nextCase++;
        const seed = seeds[index];
        try {
          let rejectCrash;
          const crashed = new Promise((_, reject) => { rejectCrash = reject; });
          const onCrash = () => rejectCrash(new Error('Browser renderer crashed while evaluating ' + seed));
          page.once('crash', onCrash);
          const evaluation = page.evaluate(async ({ seed, maximumSteps, verificationSteps, baseline, sync, invariants }) => {
            const generated = generateRandomPlanet(seed);
            const savedResources = resources;
            const savedParameters = currentPlanetParameters;
            const started = performance.now();
            let lastProgress;
            const adaptations = [];
            const settled = await runEquilibration(buildEquilibrationInputParams(generated), {
              maxSteps: maximumSteps,
              sync,
              minRunMs: 0,
              timeoutMs: 120000,
              ...(baseline ? { instabilityRefinementEveryChecks: 40 } : {})
            }, (progress, info) => {
              if (info.stepMs !== lastProgress?.stepMs) adaptations.push({ step: info.step, stepMs: info.stepMs, error: info.error });
              lastProgress = info;
            });
            const elapsedMs = performance.now() - started;
            const conservation = invariants ? { ...window.__equilibrationInvariants } : null;
            const savedLuminosity = getStarLuminosity();
            const savedFacilityFunction = calculateZoneSolarFluxWithFacility;
            const savedTerraforming = terraforming;
            const savedCelestialParameters = celestialParameters;
            const verification = { resources: {}, temperatureK: 0 };
            try {
              currentPlanetParameters = deepMerge(defaultPlanetParameters, settled.override);
              resources = createResources(currentPlanetParameters.resources);
              isEquilibrating = true;
              calculateZoneSolarFluxWithFacility = undefined;
              const normal = new Terraforming(resources, currentPlanetParameters.celestialParameters);
              terraforming = normal;
              celestialParameters = normal.celestialParameters;
              normal.calculateInitialValues(currentPlanetParameters);
              for (let step = 0; step < verificationSteps; step++) {
                normal.updateResources(20, {
                  refreshStandaloneRates: true,
                  skipTerraformingEffects: true,
                  skipHazardUpdates: true
                });
              }
              verification.temperatureK = normal.temperature.value;
              verification.zones = Object.fromEntries(['tropical', 'temperate', 'polar'].map(zone => [zone, { value: normal.temperature.zones[zone].value, day: normal.temperature.zones[zone].day, night: normal.temperature.zones[zone].night }]));
              verification.zonalSurface = Object.fromEntries(Object.keys(normal.zonalSurface).map(key => [key, Object.fromEntries(['tropical', 'temperate', 'polar'].map(zone => [zone, normal.zonalSurface[key][zone]]))]));
              for (const category of ['atmospheric', 'surface']) {
                verification.resources[category] = {};
                for (const key in resources[category]) verification.resources[category][key] = resources[category][key].value;
              }
            } finally {
              resources = savedResources;
              currentPlanetParameters = savedParameters;
              terraforming = savedTerraforming;
              celestialParameters = savedCelestialParameters;
              calculateZoneSolarFluxWithFacility = savedFacilityFunction;
              setStarLuminosity(savedLuminosity);
              isEquilibrating = false;
            }
            let maximumAllowedDriftRatio = 0;
            let worstDriftMetric = null;
            function observeDrift(metric, before, after, temperature = false) {
              const scale = Math.max(1, Math.abs(before), Math.abs(after));
              const tolerance = (temperature ? 1e-6 : Math.max(0.01, 1e-12 * scale)) * verificationSteps / 5 + Number.EPSILON * scale;
              const ratio = Math.abs(after - before) / tolerance;
              if (!Number.isFinite(ratio)) {
                maximumAllowedDriftRatio = Number.MAX_VALUE;
                worstDriftMetric = metric;
                return;
              }
              if (ratio > maximumAllowedDriftRatio) { maximumAllowedDriftRatio = ratio; worstDriftMetric = metric; }
            }
            for (const zone of ['tropical', 'temperate', 'polar']) {
              for (const [field, key] of [['temperatureK', 'value'], ['dayTemperatureK', 'day'], ['nightTemperatureK', 'night']]) observeDrift('temperature.' + zone + '.' + key, settled.diagnostics.zones[zone][field], verification.zones[zone][key], true);
            }
            for (const key of Object.keys(verification.zonalSurface)) for (const zone of ['tropical', 'temperate', 'polar']) observeDrift('zonal.' + key + '.' + zone, PreciseDecimal.from(settled.override.zonalSurface[key][zone]).toNumber(), verification.zonalSurface[key][zone]);
            let maximumRelativeDrift = 0;
            let worstResource = null;
            let worstResourceBeforeTons = 0;
            let absoluteDriftTons = 0;
            for (const category of ['atmospheric', 'surface']) {
              for (const key in settled.override.resources[category]) {
                if (category === 'surface' && key === 'land') continue;
                const before = settled.override.resources[category][key].initialValue || 0;
                const after = verification.resources[category][key] || 0;
                observeDrift(category + '.' + key, before, after);
                const drift = Math.abs(after - before) / Math.max(1, Math.abs(before), Math.abs(after));
                if (drift > maximumRelativeDrift) {
                  maximumRelativeDrift = drift;
                  worstResource = category + '.' + key;
                  worstResourceBeforeTons = before;
                  absoluteDriftTons = Math.abs(after - before);
                }
              }
            }
            if (resources !== savedResources || currentPlanetParameters !== savedParameters || isEquilibrating) {
              throw new Error('Equilibration did not restore game globals');
            }
            return {
              seed, canonicalSeed: generated.seedString,
              archetype: generated.archetype, orbitPreset: generated.orbitPreset,
              target: generated.isMoon ? 'moon' : 'planet',
              elapsedMs, steps: settled.steps, reason: settled.reason,
              passed: settled.reason === 'converged' && maximumAllowedDriftRatio <= 1 && (!conservation || conservation.failures === 0),
              conservation,
              zones: settled.diagnostics.zones,
              temperatureK: settled.diagnostics.temperatureK,
              temperatureDriftK: verification.temperatureK - settled.diagnostics.temperatureK,
              verificationSteps,
              maximumAllowedDriftRatio, worstDriftMetric,
              maximumRelativeDrift, worstResource, worstResourceBeforeTons, absoluteDriftTons,
              lastProgress, adaptations
            };
          }, { seed, maximumSteps, verificationSteps, baseline: rawSolverSource.includes('lastUnstableCheckTime'), sync, invariants });
          let result;
          try { result = await Promise.race([evaluation, crashed]); }
          finally { page.off('crash', onCrash); }

          results[index] = result;
          const { adaptations, zones, ...summary } = result;
          console.log(JSON.stringify({ case: index + 1, ...summary, adaptationCount: adaptations.length }));
        } catch (error) {
          results[index] = { seed, executionError: error.message };
          console.log(JSON.stringify(results[index]));
        }
        if (output) {
          fs.mkdirSync(path.dirname(output), { recursive: true });
          fs.writeFileSync(output, JSON.stringify(results.filter(Boolean), null, 2) + '\n');
        }
        // Resource creation and world initialization touch shared game globals.
        // Each independent seed must start in a fresh browser context.
        await page.close();
        if (nextCase < seeds.length) {
          page = await createPage();
          page.on('pageerror', error => errors.push(error.message));
          await page.goto(`http://127.0.0.1:${server.address().port}/index.html`, { waitUntil: 'load' });
          await page.evaluate(enabled => { game.loop.stop(); gameSettings.phaseChangeHeat = enabled; }, phaseChangeHeat);
          await page.evaluate(source => (0, eval)(source), browserSolverSource);
        }
      }
    }
    const pages = [page];
    for (let index = 1; index < jobs; index++) {
      const extra = await createPage();
      extra.on('pageerror', error => errors.push(error.message));
      await extra.goto(`http://127.0.0.1:${server.address().port}/index.html`, { waitUntil: 'load' });
      await extra.evaluate(enabled => { game.loop.stop(); gameSettings.phaseChangeHeat = enabled; }, phaseChangeHeat);
      await extra.evaluate(source => (0, eval)(source), browserSolverSource);
      pages.push(extra);
    }
    await Promise.all(pages.map(worker));
    const summary = {
      cases: results.length,
      passed: results.filter(result => result.passed).length,
      failed: results.filter(result => !result.passed).length,
      converged: results.filter(result => result.reason === 'converged').length,
      convergedButDrifting: results.filter(result => result.reason === 'converged' && !result.passed).length,
      stepLimited: results.filter(result => result.reason === 'step-limit').length,
      errors: results.filter(result => result.executionError).length,
      maximumSteps, verificationSteps, phaseChangeHeat, sync,
      conservationObservations: results.reduce((sum, result) => sum + (result.conservation?.observations || 0), 0),
      conservationFailures: results.reduce((sum, result) => sum + (result.conservation?.failures || 0), 0),
      maximumRelativeMassError: Math.max(0, ...results.map(result => result.conservation?.maximumRelativeMassError || 0)),
      worldTypes: [...new Set(results.map(result => result.archetype).filter(Boolean))].sort(),
      actualOrbits: [...new Set(results.map(result => result.orbitPreset).filter(Boolean))].sort(),
      solverSHA256: createHash('sha256').update(rawSolverSource).digest('hex')
    };
    console.log(JSON.stringify(summary));
    if (errors.length) throw new Error(errors.join('\n'));
    if (output) {
      fs.mkdirSync(path.dirname(output), { recursive: true });
      fs.writeFileSync(output, JSON.stringify(results, null, 2) + '\n');
      fs.writeFileSync(output.replace(/\.json$/, '') + '.summary.json', JSON.stringify(summary, null, 2) + '\n');
    }
    if (check && summary.failed > 0) process.exitCode = 1;
  } finally {
    if (browser) await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
}

main().catch(error => { console.error(error); process.exitCode = 1; });
