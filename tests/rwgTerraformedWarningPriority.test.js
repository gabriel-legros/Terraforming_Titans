const path = require('path');
const jsdomPath = path.join(process.execPath, '..', '..', 'lib', 'node_modules', 'jsdom');
const { JSDOM } = require(jsdomPath);
const EffectableEntity = require('../src/js/effectable-entity.js');
global.EffectableEntity = EffectableEntity;
const SpaceManager = require('../src/js/space.js');

describe('RWG terraformed warning priority', () => {
  beforeEach(() => {
    jest.resetModules();
    const dom = new JSDOM('<div id="rwg-result"></div>');
    global.document = dom.window.document;
    global.window = dom.window;
    global.formatNumber = n => n;
    global.calculateAtmosphericPressure = () => 0;
    global.dayNightTemperaturesModel = () => ({ mean:0, day:0, night:0 });
    global.getGameSpeed = () => 1;
    global.setGameSpeed = () => {};
    global.runEquilibration = jest.fn(async o => ({ override:o }));
    global.deepMerge = (a,b) => ({ ...a, ...b });
    global.defaultPlanetParameters = {};
    global.spaceManager = new SpaceManager({ mars: {} });
    global.spaceManager.setRwgLock('mars', true);
  });

  test('shows terraformed warning even before equilibration', () => {
    spaceManager.randomWorldStatuses['canonical'] = { name:'World', terraformed:true };
    const { renderWorldDetail, attachEquilibrateHandler, attachTravelHandler } = require('../src/js/rwgUI.js');
    const res = {
      seedString: 'canonical',
      star: { name:'Sun', spectralType:'G', luminositySolar:1, massSolar:1, temperatureK:5800, habitableZone:{ inner:0.5, outer:1.5 } },
      merged: {
        celestialParameters:{ distanceFromSun:1, radius:6000, gravity:9.8, albedo:0.3, rotationPeriod:24 },
        resources:{ atmospheric:{ carbonDioxide:{ initialValue:1 }, inertGas:{ initialValue:1 } }, surface:{} },
        classification:{ archetype:'mars-like' }
      },
      override:{ resources:{ atmospheric:{} } }
    };
    const box = document.getElementById('rwg-result');
    box.innerHTML = renderWorldDetail(res, '123', 'mars-like');
    attachEquilibrateHandler(res, '123', 'mars-like', box);
    attachTravelHandler(res, '123');
    const warning = document.getElementById('rwg-travel-warning').textContent;
    expect(warning).toMatch(/already been terraformed/);
  });
});

delete global.EffectableEntity;
