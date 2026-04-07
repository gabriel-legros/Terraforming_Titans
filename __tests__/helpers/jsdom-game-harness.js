const fs = require('fs');
const path = require('path');
const { JSDOM, ResourceLoader } = require('jsdom');

const REPO_ROOT = path.resolve(__dirname, '..', '..');
const DEFAULT_LOAD_TIMEOUT_MS = 20000;
const DEFAULT_TICK_COUNT = 5;
const DEFAULT_TICK_MS = 10;
const MAX_TRAVERSE_DEPTH = 7;
const MAX_TRAVERSE_ENTRIES = 50;
const MAX_DETACHED_RESULTS = 100;

const SUBTAB_SELECTORS_BY_TAB = {
  buildings: '.buildings-subtabs .building-subtab:not(.hidden)',
  'special-projects': '.projects-subtabs .projects-subtab:not(.hidden)',
  colonies: '.colonies-subtabs .colony-subtab:not(.hidden)',
  research: '.research-subtabs .research-subtab:not(.hidden)',
  terraforming: '.terraforming-subtabs .terraforming-subtab:not(.hidden)',
  space: '.space-subtabs .space-subtab:not(.hidden)',
  hope: '.hope-subtabs .hope-subtab:not(.hidden)',
  settings: '.settings-subtabs .settings-subtab:not(.hidden)'
};

class GameResourceLoader extends ResourceLoader {
  fetch(url, options) {
    if (url.includes('phaser.min.js') || url.includes('three.min.js')) {
      return Promise.resolve(Buffer.from(''));
    }
    if (url.includes('/planet-visualizer/')) {
      if (url.endsWith('/planet-visualizer/core.js')) {
        return Promise.resolve(Buffer.from(
          'window.PlanetVisualizer = function PlanetVisualizer() {};\n'
          + 'window.initializePlanetVisualizerUI = window.initializePlanetVisualizerUI || function initializePlanetVisualizerUI() {};'
        ));
      }
      return Promise.resolve(Buffer.from(''));
    }
    return super.fetch(url, options);
  }
}

function createStorageFactory() {
  const store = new Map();
  return {
    get length() {
      return store.size;
    },
    clear() {
      store.clear();
    },
    getItem(key) {
      return store.has(key) ? store.get(key) : null;
    },
    key(index) {
      return Array.from(store.keys())[index] ?? null;
    },
    removeItem(key) {
      store.delete(key);
    },
    setItem(key, value) {
      store.set(String(key), String(value));
    }
  };
}

function createPlanetVisualizerStub(window) {
  return {
    renderer: { domElement: null },
    debug: { mode: 'game', container: null },
    viz: { coverage: {} },
    onResize() {},
    resetSurfaceTextureThrottle() {},
    updateSurfaceTextureFromPressure() {},
    setBaseColor() {}
  };
}

function installEventListenerTracker(window) {
  if (window.__listenerTracker) {
    return;
  }

  const originalAddEventListener = window.EventTarget.prototype.addEventListener;
  const originalRemoveEventListener = window.EventTarget.prototype.removeEventListener;
  const targetIds = new WeakMap();
  const listenerIds = new WeakMap();
  const activeEntries = new Map();
  let nextTargetId = 1;
  let nextListenerId = 1;

  function getObjectId(map, value, nextIdFactory) {
    if (!value || (typeof value !== 'object' && typeof value !== 'function')) {
      return 'primitive';
    }
    let id = map.get(value);
    if (!id) {
      id = nextIdFactory();
      map.set(value, id);
    }
    return id;
  }

  function normalizeCapture(options) {
    if (options === true || options === false) {
      return options;
    }
    return !!(options && options.capture);
  }

  function makeKey(target, type, listener, capture) {
    const targetId = getObjectId(targetIds, target, () => `t${nextTargetId++}`);
    const listenerId = getObjectId(listenerIds, listener, () => `l${nextListenerId++}`);
    return `${targetId}|${type}|${listenerId}|${capture ? 1 : 0}`;
  }

  function describeNode(node) {
    if (!node || typeof node.nodeType !== 'number') {
      return String(node);
    }
    if (node === window.document) {
      return 'document';
    }
    if (node === window.document.body) {
      return 'body';
    }
    if (node === window.document.documentElement) {
      return 'html';
    }
    const nodeName = String(node.nodeName || 'node').toLowerCase();
    const id = node.id ? `#${node.id}` : '';
    const className = typeof node.className === 'string'
      ? node.className.trim().split(/\s+/).filter(Boolean).slice(0, 3).map(name => `.${name}`).join('')
      : '';
    const dataTab = node.dataset && node.dataset.tab ? `[data-tab="${node.dataset.tab}"]` : '';
    const dataSubtab = node.dataset && node.dataset.subtab ? `[data-subtab="${node.dataset.subtab}"]` : '';
    return `${nodeName}${id}${className}${dataTab}${dataSubtab}`;
  }

  function describeTarget(target) {
    if (target === window) {
      return 'window';
    }
    if (target === window.document) {
      return 'document';
    }
    if (target && typeof target.nodeType === 'number') {
      return describeNode(target);
    }
    if (target && target.constructor && target.constructor.name) {
      return target.constructor.name;
    }
    return String(target);
  }

  window.__listenerTracker = {
    getActiveEntries() {
      return Array.from(activeEntries.values())
        .filter(entry => entry.count > 0)
        .map(entry => ({
          target: entry.target,
          type: entry.type,
          listener: entry.listener,
          capture: entry.capture,
          count: entry.count,
          targetLabel: describeTarget(entry.target)
        }));
    },
    summarizeByTarget() {
      const summary = {};
      this.getActiveEntries().forEach(entry => {
        summary[entry.targetLabel] = (summary[entry.targetLabel] || 0) + entry.count;
      });
      return summary;
    }
  };

  window.EventTarget.prototype.addEventListener = function addEventListener(type, listener, options) {
    const capture = normalizeCapture(options);
    const key = makeKey(this, type, listener, capture);
    const existing = activeEntries.get(key);
    if (existing) {
      existing.count += 1;
    } else {
      activeEntries.set(key, {
        target: this,
        type,
        listener,
        capture,
        count: 1
      });
    }
    return originalAddEventListener.call(this, type, listener, options);
  };

  window.EventTarget.prototype.removeEventListener = function removeEventListener(type, listener, options) {
    const capture = normalizeCapture(options);
    const key = makeKey(this, type, listener, capture);
    const existing = activeEntries.get(key);
    if (existing) {
      existing.count -= 1;
      if (existing.count <= 0) {
        activeEntries.delete(key);
      }
    }
    return originalRemoveEventListener.call(this, type, listener, options);
  };
}

function setupBrowserStubs(window) {
  installEventListenerTracker(window);

  window.console.log = () => {};
  window.console.warn = () => {};
  window.console.error = () => {};

  window.requestAnimationFrame = callback => window.setTimeout(() => callback(Date.now()), 16);
  window.cancelAnimationFrame = handle => window.clearTimeout(handle);

  window.matchMedia = () => ({
    matches: false,
    media: '',
    onchange: null,
    addListener() {},
    removeListener() {},
    addEventListener() {},
    removeEventListener() {},
    dispatchEvent() { return false; }
  });

  window.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };

  const canvasProto = window.HTMLCanvasElement.prototype;
  canvasProto.getContext = () => ({
    fillRect() {},
    clearRect() {},
    getImageData() { return { data: [] }; },
    putImageData() {},
    createImageData() { return {}; },
    drawImage() {},
    save() {},
    restore() {},
    beginPath() {},
    closePath() {},
    moveTo() {},
    lineTo() {},
    stroke() {},
    arc() {},
    fill() {},
    fillText() {},
    measureText() { return { width: 0 }; },
    createLinearGradient() {
      return { addColorStop() {} };
    },
    createPattern() { return {}; },
    setTransform() {}
  });

  if (window.HTMLMediaElement && window.HTMLMediaElement.prototype) {
    window.HTMLMediaElement.prototype.play = () => Promise.resolve();
    window.HTMLMediaElement.prototype.pause = () => {};
  }

  window.Phaser = {
    AUTO: 'AUTO',
    Game: class {
      constructor(config = {}) {
        this.config = config;
        this.scene = {
          pause() {},
          resume() {}
        };
        const scene = config.scene || {};
        const preload = scene.preload || (() => {});
        const create = scene.create || (() => {});
        preload.call(window);
        window.setTimeout(() => create.call(window), 0);
      }
      destroy() {}
    }
  };

  window.PlanetVisualizer = function PlanetVisualizer() {};
  window.initializePlanetVisualizerUI = function initializePlanetVisualizerUI() {
    const stub = createPlanetVisualizerStub(window);
    window.planetVisualizer = stub;
    return stub;
  };
  window.Image = class {};
  window.structuredClone = value => JSON.parse(JSON.stringify(value));

  Object.defineProperty(window, 'localStorage', {
    value: createStorageFactory(),
    configurable: true
  });
  Object.defineProperty(window, 'sessionStorage', {
    value: createStorageFactory(),
    configurable: true
  });
}

async function waitForWindowLoad(window, timeoutMs = DEFAULT_LOAD_TIMEOUT_MS) {
  await (window.document.readyState === 'complete'
    ? Promise.resolve()
    : new Promise((resolve, reject) => {
        const timer = window.setTimeout(() => reject(new Error('Timed out waiting for window load')), timeoutMs);
        window.addEventListener('load', () => {
          window.clearTimeout(timer);
          resolve();
        }, { once: true });
      }));
}

async function createGameDom() {
  const indexPath = path.resolve(REPO_ROOT, 'index.html');
  const dom = await JSDOM.fromFile(indexPath, {
    runScripts: 'dangerously',
    resources: new GameResourceLoader(),
    pretendToBeVisual: true,
    url: `file://${indexPath}`,
    beforeParse(window) {
      setupBrowserStubs(window);
    }
  });

  await waitForWindowLoad(dom.window);
  dom.window.initializePlanetVisualizerUI();
  return dom;
}

function clickElement(window, element) {
  element.dispatchEvent(new window.MouseEvent('click', {
    bubbles: true,
    cancelable: true,
    view: window
  }));
}

function advanceTicks(window, tickCount = DEFAULT_TICK_COUNT, deltaMs = DEFAULT_TICK_MS) {
  for (let index = 0; index < tickCount; index += 1) {
    window.updateLogic(deltaMs);
    window.updateRender.lastDelta = deltaMs;
    window.updateRender(false, { forceAllSubtabs: false });
  }
}

function loadSaveFromRelativePath(window, relativePath) {
  const savePath = path.resolve(REPO_ROOT, relativePath);
  const saveText = fs.readFileSync(savePath, 'utf8');
  window.loadGame(saveText, true);
  window.updateRender.lastDelta = 0;
  window.updateRender(true, { forceAllSubtabs: true });
}

function getVisibleMainTabButtons(window) {
  return Array.from(window.document.querySelectorAll('.tab'))
    .filter(element => !element.classList.contains('hidden') && element.dataset && element.dataset.tab);
}

function getVisibleSubtabButtons(window, tabId) {
  const selector = SUBTAB_SELECTORS_BY_TAB[tabId];
  if (!selector) {
    return [];
  }
  return Array.from(window.document.querySelectorAll(selector))
    .filter(element => !element.classList.contains('hidden') && element.dataset && element.dataset.subtab);
}

function describeNode(node) {
  if (!node || typeof node.nodeType !== 'number') {
    return String(node);
  }
  if (node.nodeType === 9) {
    return 'document';
  }
  const nodeName = String(node.nodeName || 'node').toLowerCase();
  const id = node.id ? `#${node.id}` : '';
  const className = typeof node.className === 'string'
    ? node.className.trim().split(/\s+/).filter(Boolean).slice(0, 3).map(name => `.${name}`).join('')
    : '';
  const dataTab = node.dataset && node.dataset.tab ? `[data-tab="${node.dataset.tab}"]` : '';
  const dataSubtab = node.dataset && node.dataset.subtab ? `[data-subtab="${node.dataset.subtab}"]` : '';
  return `${nodeName}${id}${className}${dataTab}${dataSubtab}`;
}

function shouldSkipTraversalKey(key) {
  return key === 'ownerDocument'
    || key === 'parentNode'
    || key === 'parentElement'
    || key === 'children'
    || key === 'childNodes'
    || key === 'documentElement'
    || key === 'defaultView'
    || key === 'nextSibling'
    || key === 'previousSibling'
    || key === 'firstChild'
    || key === 'lastChild';
}

function collectDetachedNodeReferences(window) {
  const detachedRefs = [];
  const seenObjects = new WeakSet();
  const seenNodes = new WeakSet();
  const queue = [];
  const roots = [
    'tabManager',
    'resources',
    'buildings',
    'colonies',
    'structures',
    'projectManager',
    'researchManager',
    'skillManager',
    'terraforming',
    'spaceManager',
    'galaxyManager',
    'artificialManager',
    'atlasManager',
    'followersManager',
    'nanotechManager',
    'automationManager',
    'solisManager',
    'warpGateCommand',
    'lifeDesigner',
    'lifeManager',
    'milestonesManager',
    'hazardManager',
    'planetVisualizer'
  ];

  roots.forEach(rootName => {
    if (window[rootName]) {
      queue.push({ value: window[rootName], path: rootName, depth: 0 });
    }
  });

  while (queue.length > 0 && detachedRefs.length < MAX_DETACHED_RESULTS) {
    const current = queue.shift();
    const value = current.value;

    if (!value || (typeof value !== 'object' && typeof value !== 'function')) {
      continue;
    }

    if (value === window || value === window.document) {
      continue;
    }

    if (typeof value.nodeType === 'number') {
      if (!value.isConnected && !seenNodes.has(value)) {
        seenNodes.add(value);
        detachedRefs.push({
          path: current.path,
          node: describeNode(value)
        });
      }
      continue;
    }

    if (seenObjects.has(value)) {
      continue;
    }
    seenObjects.add(value);

    if (current.depth >= MAX_TRAVERSE_DEPTH) {
      continue;
    }

    if (Array.isArray(value)) {
      value.slice(0, MAX_TRAVERSE_ENTRIES).forEach((entry, index) => {
        queue.push({ value: entry, path: `${current.path}[${index}]`, depth: current.depth + 1 });
      });
      continue;
    }

    if (value instanceof Map) {
      Array.from(value.entries()).slice(0, MAX_TRAVERSE_ENTRIES).forEach(([key, entry]) => {
        queue.push({ value: entry, path: `${current.path}<${String(key)}>`, depth: current.depth + 1 });
      });
      continue;
    }

    if (value instanceof Set) {
      Array.from(value.values()).slice(0, MAX_TRAVERSE_ENTRIES).forEach((entry, index) => {
        queue.push({ value: entry, path: `${current.path}<set:${index}>`, depth: current.depth + 1 });
      });
      continue;
    }

    Object.keys(value)
      .filter(key => !shouldSkipTraversalKey(key))
      .slice(0, MAX_TRAVERSE_ENTRIES)
      .forEach(key => {
        queue.push({ value: value[key], path: `${current.path}.${key}`, depth: current.depth + 1 });
      });
  }

  return detachedRefs;
}

function collectDetachedListenerTargets(window) {
  const tracker = window.__listenerTracker;
  if (!tracker) {
    return [];
  }

  const seenTargets = new WeakSet();
  return tracker.getActiveEntries()
    .filter(entry => entry.target && typeof entry.target.nodeType === 'number' && !entry.target.isConnected)
    .filter(entry => {
      if (seenTargets.has(entry.target)) {
        return false;
      }
      seenTargets.add(entry.target);
      return true;
    })
    .map(entry => ({
      target: describeNode(entry.target),
      type: entry.type,
      count: entry.count
    }));
}

function captureLeakSnapshot(window, label) {
  const tracker = window.__listenerTracker;
  return {
    label,
    domNodeCount: window.document.querySelectorAll('*').length,
    detachedNodeReferences: collectDetachedNodeReferences(window),
    detachedListenerTargets: collectDetachedListenerTargets(window),
    persistentListenerSummary: tracker ? tracker.summarizeByTarget() : {}
  };
}

function buildDetachedRefKey(ref) {
  return `${ref.path} -> ${ref.node}`;
}

function buildDetachedListenerKey(ref) {
  return `${ref.target} (${ref.type}) x${ref.count}`;
}

function diffStepSnapshotAgainstBaseline(snapshot, baseline) {
  const baselineDetachedRefKeys = new Set(baseline.detachedNodeReferences.map(buildDetachedRefKey));
  const baselineDetachedListenerKeys = new Set(baseline.detachedListenerTargets.map(buildDetachedListenerKey));

  const detachedNodeReferences = snapshot.detachedNodeReferences.filter(ref => !baselineDetachedRefKeys.has(buildDetachedRefKey(ref)));
  const detachedListenerTargets = snapshot.detachedListenerTargets.filter(ref => !baselineDetachedListenerKeys.has(buildDetachedListenerKey(ref)));

  return {
    label: snapshot.label,
    detachedNodeReferences,
    detachedListenerTargets
  };
}

function diffPersistentListenerGrowth(beforeSnapshot, afterSnapshot) {
  const trackedTargets = ['window', 'document', 'body', 'html'];
  return trackedTargets
    .map(target => {
      const beforeCount = beforeSnapshot.persistentListenerSummary[target] || 0;
      const afterCount = afterSnapshot.persistentListenerSummary[target] || 0;
      return {
        target,
        before: beforeCount,
        after: afterCount,
        growth: afterCount - beforeCount
      };
    })
    .filter(entry => entry.growth > 0);
}

function navigateAllTabsAndSubtabs(window, options = {}) {
  const tickCount = Number.isFinite(options.tickCount) ? options.tickCount : DEFAULT_TICK_COUNT;
  const deltaMs = Number.isFinite(options.deltaMs) ? options.deltaMs : DEFAULT_TICK_MS;
  const stopOnFirstSuspect = options.stopOnFirstSuspect === true;
  const baseline = captureLeakSnapshot(window, 'baseline');
  const visitedSteps = [];
  const perStepSnapshots = [];
  let firstSuspect = null;

  function runStep(label) {
    advanceTicks(window, tickCount, deltaMs);
    const snapshot = captureLeakSnapshot(window, label);
    const deltaFromBaseline = diffStepSnapshotAgainstBaseline(snapshot, baseline);
    visitedSteps.push(label);
    perStepSnapshots.push(snapshot);
    if (!firstSuspect && (deltaFromBaseline.detachedNodeReferences.length > 0 || deltaFromBaseline.detachedListenerTargets.length > 0)) {
      firstSuspect = deltaFromBaseline;
    }
    return deltaFromBaseline;
  }

  const mainTabButtons = getVisibleMainTabButtons(window);
  outerLoop:
  for (let mainTabIndex = 0; mainTabIndex < mainTabButtons.length; mainTabIndex += 1) {
    const mainTabButton = mainTabButtons[mainTabIndex];
    const tabId = mainTabButton.dataset.tab;
    clickElement(window, mainTabButton);
    const tabResult = runStep(`tab:${tabId}`);
    if (stopOnFirstSuspect && (tabResult.detachedNodeReferences.length > 0 || tabResult.detachedListenerTargets.length > 0)) {
      break;
    }

    const subtabButtons = getVisibleSubtabButtons(window, tabId);
    for (let subtabIndex = 0; subtabIndex < subtabButtons.length; subtabIndex += 1) {
      const subtabButton = subtabButtons[subtabIndex];
      clickElement(window, subtabButton);
      const subtabResult = runStep(`tab:${tabId} > subtab:${subtabButton.dataset.subtab}`);
      if (stopOnFirstSuspect && (subtabResult.detachedNodeReferences.length > 0 || subtabResult.detachedListenerTargets.length > 0)) {
        break outerLoop;
      }
    }
  }

  const finalSnapshot = captureLeakSnapshot(window, 'final');
  const persistentListenerGrowth = diffPersistentListenerGrowth(baseline, finalSnapshot);

  const suspects = perStepSnapshots
    .map(snapshot => diffStepSnapshotAgainstBaseline(snapshot, baseline))
    .filter(snapshot => snapshot.detachedNodeReferences.length > 0 || snapshot.detachedListenerTargets.length > 0);

  if (!stopOnFirstSuspect && persistentListenerGrowth.length > 0) {
    suspects.push({
      label: 'persistent-listener-growth',
      detachedNodeReferences: [],
      detachedListenerTargets: persistentListenerGrowth.map(entry => ({
        target: entry.target,
        type: 'listener-count-growth',
        count: entry.growth
      }))
    });
  }

  return {
    baseline,
    finalSnapshot,
    visitedSteps,
    suspects,
    firstSuspect,
    persistentListenerGrowth
  };
}

function formatLeakReport(report) {
  const lines = [];
  lines.push('Late-game UI memory-leak harness report');
  lines.push(`Visited steps: ${report.visitedSteps.length}`);
  lines.push(`Baseline DOM nodes: ${report.baseline.domNodeCount}`);
  lines.push(`Final DOM nodes: ${report.finalSnapshot.domNodeCount}`);

  if (report.suspects.length === 0) {
    lines.push('No orphaned node references, detached listener targets, or persistent listener growth detected.');
    return lines.join('\n');
  }

  lines.push(`Leak suspects: ${report.suspects.length}`);
  report.suspects.forEach((suspect, suspectIndex) => {
    lines.push(`${suspectIndex + 1}. ${suspect.label}`);
    suspect.detachedNodeReferences.forEach(ref => {
      lines.push(`   detached-ref: ${ref.path} -> ${ref.node}`);
    });
    suspect.detachedListenerTargets.forEach(ref => {
      lines.push(`   detached-listener: ${ref.target} (${ref.type}) x${ref.count}`);
    });
  });

  if (report.persistentListenerGrowth.length > 0) {
    lines.push('Persistent listener growth:');
    report.persistentListenerGrowth.forEach(entry => {
      lines.push(`   ${entry.target}: ${entry.before} -> ${entry.after} (+${entry.growth})`);
    });
  }

  return lines.join('\n');
}

module.exports = {
  advanceTicks,
  captureLeakSnapshot,
  createGameDom,
  formatLeakReport,
  loadSaveFromRelativePath,
  navigateAllTabsAndSubtabs
};
