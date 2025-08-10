const path = require('path');
const jsdomPath = path.join(process.execPath, '..', '..', 'lib', 'node_modules', 'jsdom');
const { JSDOM } = require(jsdomPath);
const EffectableEntity = require('../src/js/effectable-entity.js');
global.EffectableEntity = EffectableEntity;
const SpaceManager = require('../src/js/space.js');

describe('RWG prevents travel to terraformed seeds', () => {
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
    global.runEquilibration = jest.fn(async (o) => ({ override: o }));
    global.deepMerge = (a,b) => ({ ...a, ...b });
    global.defaultPlanetParameters = {};
    global.spaceManager = new SpaceManager({ mars: {} });
  });

  test('travel button disabled when seed already terraformed', async () => {
    spaceManager.randomWorldStatuses['123'] = { name:'World', terraformed:true };
    const { renderWorldDetail, attachEquilibrateHandler } = require('../src/js/rwgUI.js');
    const res = {
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
    document.getElementById('rwg-equilibrate-btn').click();
    await new Promise(setImmediate);
    await new Promise(setImmediate);
    const btn = document.getElementById('rwg-travel-btn');
    expect(btn.disabled).toBe(true);
    expect(document.getElementById('rwg-travel-warning').textContent).toMatch(/already been terraformed/);
  });
});

delete global.EffectableEntity;
