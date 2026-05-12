#!/usr/bin/env node

const { performance } = require('perf_hooks');
const { createGameDom, advanceTicks } = require('../__tests__/helpers/jsdom-game-harness.js');

const TRAVEL_COUNT = process.argv.length > 2 ? Number(process.argv[2]) : 100;
const TRAVEL_TICK_MS = 10;

function now() {
  return performance.now();
}

function getGameGlobal(window, name) {
  return window.eval(name);
}

function getSpaceManager(window) {
  return getGameGlobal(window, 'spaceManager');
}

async function waitForGameReady(window, timeoutMs = 20000) {
  const start = now();
  while (now() - start < timeoutMs) {
    const manager = getSpaceManager(window);
    if (manager && manager.randomWorldStatuses) {
      return manager;
    }
    await new Promise(resolve => setTimeout(resolve, 25));
  }
  throw new Error('Timed out waiting for spaceManager initialization');
}

function click(window, element) {
  element.dispatchEvent(new window.MouseEvent('click', {
    bubbles: true,
    cancelable: true,
    view: window
  }));
}

function setAutoTravelVisualizerSkip(window) {
  window.eval(`autoTravelContext = {
    active: true,
    skipWorldVisualizerInitialization: true,
    suppressTabSwitch: true,
    restoreTabState: null
  };`);
}

function clearAutoTravelContext(window) {
  window.eval(`autoTravelContext = {
    active: false,
    skipWorldVisualizerInitialization: false,
    suppressTabSwitch: false,
    restoreTabState: null
  };`);
}

function enableRandomTabFlag(window) {
  const manager = getSpaceManager(window);
  manager.randomTabEnabled = true;
  if (manager.setRwgLock) {
    manager.setRwgLock('mars', true);
  }
}

function measureRandomTabOpen(window) {
  enableRandomTabFlag(window);

  const showStart = now();
  if (typeof window.showSpaceRandomTab === 'function') {
    window.showSpaceRandomTab();
  }
  const showRandomTabMs = now() - showStart;

  const updateSpaceStart = now();
  if (typeof window.updateSpaceUI === 'function') {
    window.updateSpaceUI();
  }
  const updateSpaceUiMs = now() - updateSpaceStart;

  const spaceTab = window.document.querySelector('.tab[data-tab="space"]');
  const randomSubtab = window.document.querySelector('.space-subtab[data-subtab="space-random"]');

  const spaceClickStart = now();
  if (spaceTab) click(window, spaceTab);
  const spaceClickMs = now() - spaceClickStart;

  const randomClickStart = now();
  if (randomSubtab) click(window, randomSubtab);
  const randomClickMs = now() - randomClickStart;

  const updateStart = now();
  if (typeof window.updateRandomWorldUI === 'function') {
    window.updateRandomWorldUI();
  }
  const updateRandomWorldUiMs = now() - updateStart;

  const renderTickStart = now();
  advanceTicks(window, 1, TRAVEL_TICK_MS);
  const renderTickMs = now() - renderTickStart;

  const historyList = window.document.getElementById('rwg-history-list');
  const randomContent = window.document.getElementById('space-random');

  return {
    showRandomTabMs,
    updateSpaceUiMs,
    spaceClickMs,
    randomClickMs,
    updateRandomWorldUiMs,
    renderTickMs,
    domNodes: window.document.querySelectorAll('*').length,
    randomSubtabNodes: randomContent ? randomContent.querySelectorAll('*').length : 0,
    historyRows: historyList ? historyList.querySelectorAll('.rwg-history-row').length : 0,
    historyHtmlLength: historyList ? historyList.innerHTML.length : 0,
    randomSubtabBreakdown: collectRandomSubtabBreakdown(window)
  };
}


function collectRandomSubtabBreakdown(window) {
  const randomContent = window.document.getElementById('space-random');
  if (!randomContent) return [];
  return Array.from(randomContent.children).map((child) => ({
    tag: child.tagName ? child.tagName.toLowerCase() : '',
    id: child.id || '',
    className: typeof child.className === 'string' ? child.className : '',
    nodeCount: child.querySelectorAll('*').length + 1,
    htmlLength: child.outerHTML.length
  }));
}

function countObjectKeys(object) {
  return Object.keys(object || {}).length;
}

function collectState(window) {
  const sm = getSpaceManager(window);
  const randomStatuses = sm.randomWorldStatuses || {};
  const artificialStatuses = sm.artificialWorldStatuses || {};
  const currentSeed = sm.currentRandomSeed === null ? null : String(sm.currentRandomSeed);
  const inactiveRandomCount = Object.keys(randomStatuses).filter(key => key !== currentSeed).length;
  const randomOriginalCount = Object.values(randomStatuses).filter(status => status && status.original).length;
  const randomVisitedCount = Object.values(randomStatuses).filter(status => status && status.visited).length;
  const randomTerraformedCount = Object.values(randomStatuses).filter(status => status && status.terraformed).length;

  return {
    currentPlanetKey: sm.currentPlanetKey,
    currentRandomSeed: currentSeed,
    randomStatusCount: countObjectKeys(randomStatuses),
    inactiveRandomCount,
    randomOriginalCount,
    randomVisitedCount,
    randomTerraformedCount,
    artificialStatusCount: countObjectKeys(artificialStatuses),
    rwgSummaryTerraformed: sm.rwgSummary ? sm.rwgSummary.terraformedCount : null,
    randomStatusesJsonLength: JSON.stringify(randomStatuses).length,
    rwgSummaryJsonLength: JSON.stringify(sm.rwgSummary || {}).length,
    saveSpaceJsonLength: JSON.stringify(sm.saveState ? sm.saveState() : {}).length,
    rwgSummaryDepartedColonists: sm.rwgSummary ? sm.rwgSummary.departedColonistsTotal : null,
    terraformHistoryCount: Array.isArray(sm.terraformHistory) ? sm.terraformHistory.length : null,
    spacePerf: sm.getTravelPerfStats ? sm.getTravelPerfStats() : null
  };
}

function makeRandomWorld(window, index) {
  const seed = `jsdom-diagnostic-${index}-${(index * 2654435761) >>> 0}`;
  return getGameGlobal(window, 'generateRandomPlanet')(seed, {
    target: 'planet',
    type: 'mars-like',
    orbitPreset: 'habitable',
    hazards: []
  });
}

async function travelRandomWorlds(window, count) {
  getSpaceManager(window).setRwgLock('mars', true);
  getSpaceManager(window).randomTabEnabled = true;

  const travelTimes = [];
  for (let index = 0; index < count; index += 1) {
    getSpaceManager(window).updateCurrentPlanetTerraformedStatus(true, {
      playTimeSeconds: index + 1,
      realPlayTimeSeconds: index + 1
    });

    const result = makeRandomWorld(window, index);
    setAutoTravelVisualizerSkip(window);
    const travelStart = now();
    const traveled = getSpaceManager(window).travelToRandomWorld(result, result.seedString || String(index));
    const travelMs = now() - travelStart;
    travelTimes.push(travelMs);

    if (!traveled) {
      throw new Error(`travelToRandomWorld failed at index ${index}`);
    }

    clearAutoTravelContext(window);
    if ((index + 1) % 10 === 0) {
      const state = collectState(window);
      console.log(`travelled ${index + 1}/${count} statuses=${state.randomStatusCount} summary=${state.rwgSummaryTerraformed} statusJson=${state.randomStatusesJsonLength} domNodes=${window.document.querySelectorAll('*').length}`);
    }
    await new Promise(resolve => setImmediate(resolve));
  }

  getSpaceManager(window).updateCurrentPlanetTerraformedStatus(true, {
    playTimeSeconds: count + 1,
    realPlayTimeSeconds: count + 1
  });

  return travelTimes;
}

function summarizeTimes(times) {
  const sorted = times.slice().sort((a, b) => a - b);
  const sum = times.reduce((total, value) => total + value, 0);
  const pick = percentile => sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * percentile))] || 0;
  return {
    count: times.length,
    totalMs: sum,
    avgMs: times.length ? sum / times.length : 0,
    p50Ms: pick(0.50),
    p95Ms: pick(0.95),
    maxMs: sorted[sorted.length - 1] || 0
  };
}

async function runScenario(label, travelCount) {
  const dom = await createGameDom({ trackEventListeners: false });
  try {
    const { window } = dom;
    await waitForGameReady(window);
    const travelTimes = travelCount > 0 ? await travelRandomWorlds(window, travelCount) : [];
    const beforeOpenState = collectState(window);
    const tabMetrics = measureRandomTabOpen(window);
    const afterOpenState = collectState(window);
    return {
      label,
      travelCount,
      travelTimes: summarizeTimes(travelTimes),
      beforeOpenState,
      tabMetrics,
      afterOpenState
    };
  } finally {
    dom.window.close();
  }
}

async function main() {
  console.log(`Running RWG Random tab diagnostic with ${TRAVEL_COUNT} travels...`);
  const baseline = await runScenario('baseline-no-travel', 0);
  console.log('baseline complete');
  const travelled = await runScenario(`after-${TRAVEL_COUNT}-travels`, TRAVEL_COUNT);

  const result = {
    baseline,
    travelled,
    deltas: {
      showRandomTabMs: travelled.tabMetrics.showRandomTabMs - baseline.tabMetrics.showRandomTabMs,
      updateSpaceUiMs: travelled.tabMetrics.updateSpaceUiMs - baseline.tabMetrics.updateSpaceUiMs,
      spaceClickMs: travelled.tabMetrics.spaceClickMs - baseline.tabMetrics.spaceClickMs,
      randomClickMs: travelled.tabMetrics.randomClickMs - baseline.tabMetrics.randomClickMs,
      updateRandomWorldUiMs: travelled.tabMetrics.updateRandomWorldUiMs - baseline.tabMetrics.updateRandomWorldUiMs,
      renderTickMs: travelled.tabMetrics.renderTickMs - baseline.tabMetrics.renderTickMs,
      domNodes: travelled.tabMetrics.domNodes - baseline.tabMetrics.domNodes,
      randomSubtabNodes: travelled.tabMetrics.randomSubtabNodes - baseline.tabMetrics.randomSubtabNodes,
      historyRows: travelled.tabMetrics.historyRows - baseline.tabMetrics.historyRows,
      randomStatusCount: travelled.beforeOpenState.randomStatusCount - baseline.beforeOpenState.randomStatusCount,
      rwgSummaryTerraformed: travelled.beforeOpenState.rwgSummaryTerraformed - baseline.beforeOpenState.rwgSummaryTerraformed
    }
  };

  console.log(JSON.stringify(result, null, 2));
}

main().catch(error => {
  console.error(error && error.stack ? error.stack : error);
  process.exitCode = 1;
});
