const path = require('path');
const jsdomPath = path.join(process.execPath, '..', '..', 'lib', 'node_modules', 'jsdom');
const { JSDOM } = require(jsdomPath);

describe('RWG progress bar', () => {
  beforeEach(() => {
    jest.resetModules();
    const dom = new JSDOM('<button id="rwg-equilibrate-btn"></button>');
    global.document = dom.window.document;
    global.window = dom.window;
    global.getGameSpeed = () => 1;
    global.setGameSpeed = () => {};
    global.deepMerge = (a, b) => ({ ...a, ...b });
    global.defaultPlanetParameters = {};
  });

  afterEach(() => {
    delete global.document;
    delete global.window;
    delete global.getGameSpeed;
    delete global.setGameSpeed;
    delete global.deepMerge;
    delete global.defaultPlanetParameters;
  });

  test('updates width for small progress', async () => {
    let widthSeen = null;
    global.runEquilibration = (_override, _opts, onProgress) => {
      return new Promise((resolve, reject) => {
        onProgress(0.001);
        const bar = document.body.querySelector('div > div > div > div');
        widthSeen = bar ? bar.style.width : null;
        reject(new Error('cancelled'));
      });
    };
    const { attachEquilibrateHandler } = require('../src/js/rwgUI.js');
    const res = { override: {} };
    const box = document.body;
    attachEquilibrateHandler(res, 'seed', 'type', box);
    document.getElementById('rwg-equilibrate-btn').click();
    await new Promise(setImmediate);
    expect(parseFloat(widthSeen)).toBeGreaterThan(0);
    delete global.runEquilibration;
  });
});
