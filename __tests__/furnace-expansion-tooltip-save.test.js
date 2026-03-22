const fs = require('fs');
const path = require('path');
const { JSDOM, ResourceLoader } = require('jsdom');

class GameResourceLoader extends ResourceLoader {
  fetch(url, options) {
    if (url.includes('phaser.min.js') || url.includes('three.min.js')) {
      return Promise.resolve(Buffer.from(''));
    }
    if (url.includes('/planet-visualizer/')) {
      if (url.endsWith('/planet-visualizer/core.js')) {
        return Promise.resolve(Buffer.from(
          'window.PlanetVisualizer = function PlanetVisualizer() {};\n' +
          'window.initializePlanetVisualizerUI = function initializePlanetVisualizerUI() {};'
        ));
      }
      return Promise.resolve(Buffer.from(''));
    }
    return super.fetch(url, options);
  }
}

function setupWindow(window) {
  window.console.log = () => {};
  window.console.warn = () => {};

  window.requestAnimationFrame = (callback) => window.setTimeout(() => callback(Date.now()), 16);
  window.cancelAnimationFrame = (handle) => window.clearTimeout(handle);

  window.matchMedia = () => ({
    matches: false,
    media: '',
    onchange: null,
    addListener() {},
    removeListener() {},
    addEventListener() {},
    removeEventListener() {},
    dispatchEvent() { return false; },
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
    setTransform() {},
  });

  window.HTMLMediaElement.prototype.play = () => Promise.resolve();
  window.HTMLMediaElement.prototype.pause = () => {};

  window.Phaser = {
    AUTO: 'AUTO',
    Game: class {
      constructor(config = {}) {
        this.config = config;
        this.scene = {
          pause() {},
          resume() {},
        };
        const scene = config.scene || {};
        const preload = scene.preload || (() => {});
        const create = scene.create || (() => {});
        preload.call(window);
        window.setTimeout(() => create.call(window), 0);
      }
      destroy() {}
    },
  };

  window.initializePlanetVisualizerUI = window.initializePlanetVisualizerUI || (() => {});
  window.Image = class {};
  window.structuredClone = (value) => JSON.parse(JSON.stringify(value));

  const storageFactory = () => {
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
      },
    };
  };

  Object.defineProperty(window, 'localStorage', {
    value: storageFactory(),
    configurable: true,
  });
  Object.defineProperty(window, 'sessionStorage', {
    value: storageFactory(),
    configurable: true,
  });
}

function getGlobal(window, expression) {
  return window.eval(expression);
}

function installPlanetVisualizerStub(window) {
  window.initializePlanetVisualizerUI = () => {};
  const stub = {
    updateSurfaceTexture: () => {},
    updateSurfaceTextureFromPressure: () => {},
    updateZoneOverlays: () => {},
    updateLighting: () => {},
    updateClouds: () => {},
    updateAtmosphere: () => {},
    updateRings: () => {},
    updateWorldEffects: () => {},
    updateStructures: () => {},
    updateMirrorBeams: () => {},
    updateStarfield: () => {},
    updateBackground: () => {},
    resize: () => {},
    render: () => {},
    resetSurfaceTextureThrottle: () => {},
    setDebugMode: () => {},
  };
  window.updateRender = () => {
    window.planetVisualizer = stub;
  };
  window.planetVisualizer = stub;
  try {
    window.eval('planetVisualizer = window.planetVisualizer;');
  } catch (error) {}
}

async function createGameDom() {
  const htmlPath = path.resolve(__dirname, '..', 'index.html');
  const dom = await JSDOM.fromFile(htmlPath, {
    runScripts: 'dangerously',
    resources: new GameResourceLoader(),
    pretendToBeVisual: true,
    url: `file://${htmlPath}`,
    beforeParse: setupWindow,
  });

  const { window } = dom;
  await (window.document.readyState === 'complete'
    ? Promise.resolve()
    : new Promise((resolve, reject) => {
        const timer = window.setTimeout(() => reject(new Error('Timed out waiting for window load')), 15000);
        window.addEventListener('load', () => {
          window.clearTimeout(timer);
          resolve();
        }, { once: true });
      }));

  installPlanetVisualizerStub(window);
  return dom;
}

function loadSave(window, saveName) {
  installPlanetVisualizerStub(window);
  const savePath = path.resolve(__dirname, '..', 'test_saves', 'player_saves', saveName);
  const saveText = fs.readFileSync(savePath, 'utf8');
  window.loadGame(saveText, true);
}

function forEachResource(resources, iteratee) {
  for (const category in resources) {
    for (const resourceName in resources[category]) {
      iteratee(resources[category][resourceName], category, resourceName);
    }
  }
}

function resetAllResourceRates(window) {
  const resources = getGlobal(window, 'resources');
  forEachResource(resources, (resource) => {
    resource.resetRates();
  });
  window.eval('recalculateTotalRates()');
}

function setResourceValue(resource, value) {
  resource.value = value;
  if (Number.isFinite(resource.cap) && resource.cap < value) {
    resource.cap = value;
  }
}

function provisionExpansionResources(window, costMap) {
  const resources = getGlobal(window, 'resources');
  const projectManager = getGlobal(window, 'projectManager');
  const huge = 1e60;

  projectManager.projects.spaceStorage.megaProjectResourceMode = 'colony-only';

  for (const category in costMap) {
    for (const resourceName in costMap[category]) {
      const resource = resources[category]?.[resourceName];
      if (!resource) {
        continue;
      }
      setResourceValue(resource, huge);
      resource.reserved = 0;
    }
  }

  const extraResources = [
    ['space', 'energy'],
    ['spaceStorage', 'hydrogen'],
    ['spaceStorage', 'metal'],
    ['spaceStorage', 'superalloys'],
  ];
  extraResources.forEach(([category, resourceName]) => {
    const resource = resources[category]?.[resourceName];
    if (!resource) {
      return;
    }
    setResourceValue(resource, huge);
    resource.reserved = 0;
  });
}

function scaleCostMap(costMap, factor) {
  const scaled = {};
  for (const category in costMap) {
    scaled[category] = {};
    for (const resourceName in costMap[category]) {
      scaled[category][resourceName] = costMap[category][resourceName] * factor;
    }
  }
  return scaled;
}

function getTooltipRate(window, resource, label) {
  const getDisplayConsumptionRates = getGlobal(window, 'getDisplayConsumptionRates');
  const display = getDisplayConsumptionRates(resource);
  return display.bySource[label] || 0;
}

function expectRelativeClose(actual, expected, context) {
  const tolerance = Math.max(1e-6, Math.abs(expected) * 1e-9);
  expect(Math.abs(actual - expected)).toBeLessThanOrEqual(tolerance);
  expect(actual).toBeGreaterThan(0);
  expect(expected).toBeGreaterThan(0);
  void context;
}

function configureContinuousExpansionProject(project, mode, preRun = false) {
  project.isActive = true;
  project.isPaused = false;
  project.isCompleted = false;
  project.autoStart = true;
  project.operationPreRunThisTick = preRun === true;
  project.continuousThreshold = mode === 'continuous' ? Number.MAX_SAFE_INTEGER : 0;
}

function configureDysonSphereProject(project, mode, preRun = false) {
  project.isActive = false;
  project.isPaused = false;
  project.isCompleted = true;
  project.autoContinuousOperation = true;
  project.operationPreRunThisTick = preRun === true;
  project.continuousThreshold = mode === 'continuous' ? Number.MAX_SAFE_INTEGER : 0;
  project.collectors = 1;
  project.fractionalCollectors = 0;
  project.collectorProgress = mode === 'discrete' ? (project.collectorDuration / 2) : 0;
  project.lastCollectorColonyCost = project.getCollectorCost();
}

function configureSpaceStorageProject(project, mode) {
  configureContinuousExpansionProject(project, mode, false);
  project.shipOperationIsActive = false;
  project.shipOperationAutoStart = false;
  project.assignedSpaceships = 0;
}

function getExpansionExpectation(projectKey, project) {
  if (projectKey === 'dysonSphere') {
    const costMap = project.lastCollectorColonyCost || project.getCollectorCost();
    return {
      label: 'Dyson Collector',
      rates: scaleCostMap(costMap, 1000 / project.collectorDuration),
    };
  }
  if (projectKey === 'spaceStorage') {
    return {
      label: 'Space storage expansion',
      rates: scaleCostMap(project.getScaledCost(), 1000 / project.getEffectiveDuration()),
    };
  }
  if (projectKey === 'lifters') {
    return {
      label: 'Lifter expansion',
      rates: scaleCostMap(project.getScaledCost(), 1000 / project.getEffectiveDuration()),
    };
  }
  return {
    label: project.getExpansionRateSourceLabel(),
    rates: scaleCostMap(project.getScaledCost(), 1000 / project.getEffectiveDuration()),
  };
}

const MATRIX_CASES = [
  { projectKey: 'lifters', mode: 'discrete', preRun: false },
  { projectKey: 'lifters', mode: 'discrete', preRun: true },
  { projectKey: 'lifters', mode: 'continuous', preRun: false },
  { projectKey: 'lifters', mode: 'continuous', preRun: true },
  { projectKey: 'nuclearAlchemyFurnace', mode: 'discrete', preRun: false },
  { projectKey: 'nuclearAlchemyFurnace', mode: 'discrete', preRun: true },
  { projectKey: 'nuclearAlchemyFurnace', mode: 'continuous', preRun: false },
  { projectKey: 'nuclearAlchemyFurnace', mode: 'continuous', preRun: true },
  { projectKey: 'superalloyGigafoundry', mode: 'discrete', preRun: false },
  { projectKey: 'superalloyGigafoundry', mode: 'discrete', preRun: true },
  { projectKey: 'superalloyGigafoundry', mode: 'continuous', preRun: false },
  { projectKey: 'superalloyGigafoundry', mode: 'continuous', preRun: true },
  { projectKey: 'dysonSphere', mode: 'discrete', preRun: false },
  { projectKey: 'dysonSphere', mode: 'discrete', preRun: true },
  { projectKey: 'dysonSphere', mode: 'continuous', preRun: false },
  { projectKey: 'dysonSphere', mode: 'continuous', preRun: true },
  { projectKey: 'spaceStorage', mode: 'discrete', preRun: false },
  { projectKey: 'spaceStorage', mode: 'continuous', preRun: false },
  { projectKey: 'hephaestusMegaconstruction', mode: 'discrete', preRun: false },
  { projectKey: 'hephaestusMegaconstruction', mode: 'continuous', preRun: false },
];

describe('furnace expansion tooltip save repro', () => {
  it('keeps actual furnace expansion consumption after load and tick', async () => {
    const dom = await createGameDom();
    try {
      const { window } = dom;
      loadSave(window, 'furnace_expansion_tooltip_bug.json');

      const resources = getGlobal(window, 'resources');
      const projectManager = getGlobal(window, 'projectManager');
      const furnace = projectManager.projects.nuclearAlchemyFurnace;

      expect(furnace.isActive).toBe(true);
      expect(furnace.autoStart).toBe(true);
      expect(furnace.isExpansionContinuous()).toBe(false);

      const beforeActual = resources.colony.components.consumptionRateBySource['Nuclear Alchemical Furnace expansion'] || 0;
      const beforeProjected = resources.colony.components.projectedConsumptionRateBySource['Nuclear Alchemical Furnace expansion'] || 0;

      window.eval('updateLogic(1000)');
      const afterActual = resources.colony.components.consumptionRateBySource['Nuclear Alchemical Furnace expansion'] || 0;
      const afterProjected = resources.colony.components.projectedConsumptionRateBySource['Nuclear Alchemical Furnace expansion'] || 0;

      expect(beforeProjected).toBeGreaterThan(0);
      expect(afterProjected).toBeGreaterThan(0);
      expect(beforeActual).toBe(0);
      expect(afterActual).toBeGreaterThan(0);
      expect(afterActual).toBeCloseTo(afterProjected, 6);
    } finally {
      dom.window.close();
    }
  }, 60000);
});

describe('ringworld furnace expansion double counting repro', () => {
  it('shows the live tooltip rate for space superalloys instead of a doubled furnace expansion rate', async () => {
    const dom = await createGameDom();
    try {
      const { window } = dom;
      loadSave(window, 'ringworld_double_counting.json');

      const resources = getGlobal(window, 'resources');
      const label = 'Nuclear Alchemical Furnace expansion';
      const resource = resources.spaceStorage.superalloys;

      const beforeProjected = resource.projectedConsumptionRateBySource[label] || 0;

      window.eval('updateLogic(1000)');

      const afterTooltip = getTooltipRate(window, resource, label);
      const afterProjected = resource.projectedConsumptionRateBySource[label] || 0;

      expect(beforeProjected).toBeGreaterThan(0);
      expect(afterProjected).toBeGreaterThan(0);
      expect(afterTooltip).toBeCloseTo(afterProjected, 6);
    } finally {
      dom.window.close();
    }
  }, 60000);
});

describe('ringworld hephaestus yard tooltip repro', () => {
  it('keeps live yard expansion tooltip rates on space superalloys after a tick', async () => {
    const dom = await createGameDom();
    try {
      const { window } = dom;
      loadSave(window, 'ringworld_double_counting.json');

      const resources = getGlobal(window, 'resources');
      const projectManager = getGlobal(window, 'projectManager');
      const label = 'Hephaestus Yard expansion';
      const resource = resources.spaceStorage.superalloys;

      window.eval('updateLogic(1000)');
      const afterTickRate = getTooltipRate(window, resource, label);

      resetAllResourceRates(window);
      projectManager.projects.hephaestusMegaconstruction.estimateCostAndGain(1000, true, 1, null);
      window.eval('recalculateTotalRates()');
      const expectedRate = getTooltipRate(window, resource, label);

      expect(afterTickRate).toBeGreaterThan(0);
      expect(expectedRate).toBeGreaterThan(0);
      expect(afterTickRate).toBeCloseTo(expectedRate, 6);
    } finally {
      dom.window.close();
    }
  }, 60000);
});

describe('megastructure expansion tooltip rate matrix', () => {
  let dom;
  let window;
  let resources;
  let projectManager;

  beforeAll(async () => {
    dom = await createGameDom();
    window = dom.window;
    loadSave(window, 'furnace_expansion_tooltip_bug.json');
    resources = getGlobal(window, 'resources');
    projectManager = getGlobal(window, 'projectManager');
  }, 60000);

  afterAll(() => {
    dom?.window?.close();
  });

  it.each(MATRIX_CASES)('$projectKey $mode mode preRun=$preRun writes tooltip rates that match actual /s consumption', ({ projectKey, mode, preRun }) => {
    resetAllResourceRates(window);

    const project = projectManager.projects[projectKey];
    expect(project).toBeTruthy();

    if (projectKey === 'dysonSphere') {
      configureDysonSphereProject(project, mode, preRun);
    } else if (projectKey === 'spaceStorage') {
      configureSpaceStorageProject(project, mode);
    } else {
      configureContinuousExpansionProject(project, mode, preRun);
    }

    const { label, rates } = getExpansionExpectation(projectKey, project);
    provisionExpansionResources(window, rates);

    resetAllResourceRates(window);
    project.estimateCostAndGain(1000, true, 1, null);
    window.eval('recalculateTotalRates()');

    for (const category in rates) {
      for (const resourceName in rates[category]) {
        const resource = resources[category]?.[resourceName];
        const expectedRate = rates[category][resourceName];
        const actualRate = getTooltipRate(window, resource, label);
        expectRelativeClose(
          actualRate,
          expectedRate,
          `${projectKey} ${mode} ${category}.${resourceName} ${label}`
        );
      }
    }
  });
});
