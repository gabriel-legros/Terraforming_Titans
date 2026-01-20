const { JSDOM } = require('jsdom');

describe("O'Neill cylinders advanced research", () => {
  let EffectableEntity;
  let SpaceManager;
  let oneillModule;

  beforeEach(() => {
    jest.resetModules();
    EffectableEntity = require('../src/js/effectable-entity');
    global.EffectableEntity = EffectableEntity;
    const { planetParameters } = require('../src/js/planet-parameters.js');
    global.planetParameters = planetParameters;
    SpaceManager = require('../src/js/space.js');
    oneillModule = require('../src/js/advanced-research/oneill-cylinders.js');
  });

  afterEach(() => {
    delete global.EffectableEntity;
    delete global.planetParameters;
    delete global.window;
    delete global.document;
    jest.resetModules();
  });

  const createGalaxy = (controlledSectors) => ({
    getFaction: () => ({
      getControlledSectorKeys: () => Array.from({ length: controlledSectors }, (_, idx) => `S${idx}`)
    })
  });

  it('grows cylinders based on effective worlds and adds them to the effective world total', () => {
    const manager = new SpaceManager({ mars: {}, titan: {} });
    manager.planetStatuses.mars.terraformed = true;
    manager.planetStatuses.titan.terraformed = true;
    manager.applyEffect({ type: 'booleanFlag', flagId: 'oneillCylinders', value: true });
    const galaxy = createGalaxy(2);

    oneillModule.updateOneillCylinders(100 * 3600 * 1000, { space: manager, galaxy });

    expect(manager.getOneillCylinderCount()).toBeCloseTo(2, 5);
    expect(manager.getTerraformedPlanetCount()).toBeCloseTo(4, 5);
  });

  it('keeps cylinder progress with minimum sector capacity when no sectors are secured', () => {
    const manager = new SpaceManager({ mars: {} });
    manager.setOneillCylinderCount(5);
    manager.applyEffect({ type: 'booleanFlag', flagId: 'oneillCylinders', value: true });
    const galaxy = createGalaxy(0);

    oneillModule.updateOneillCylinders(1000, { space: manager, galaxy });

    expect(manager.getOneillCylinderCount()).toBe(5);
  });

  it('reveals the stats column with formatted values once unlocked', () => {
    const dom = new JSDOM('<div id="card" class="space-stat-card hidden"></div><div id="value"></div><div id="rate"></div><span id="tip"></span>');
    global.window = dom.window;
    global.document = dom.window.document;

    const manager = new SpaceManager({ mars: {} });
    const galaxy = createGalaxy(2);

    oneillModule.setOneillStatsElements({
      card: document.getElementById('card'),
      value: document.getElementById('value'),
      rate: document.getElementById('rate'),
      tooltip: document.getElementById('tip')
    });

    oneillModule.updateOneillCylinderStatsUI({ space: manager, galaxy });
    expect(document.getElementById('card').classList.contains('hidden')).toBe(true);
    expect(document.getElementById('value').textContent).toBe('0.00');
    expect(document.getElementById('rate').textContent).toBe('+0.00/hr');

    manager.applyEffect({ type: 'booleanFlag', flagId: 'oneillCylinders', value: true });
    manager.setOneillCylinderCount(12.345, 5000);
    oneillModule.updateOneillCylinderStatsUI({ space: manager, galaxy });

    const card = document.getElementById('card');
    expect(card.classList.contains('hidden')).toBe(false);
    expect(document.getElementById('value').textContent).toBe('12.35');
    expect(document.getElementById('rate').textContent).toContain('/hr');
    expect(document.getElementById('tip').title).toContain('2,000');
  });
});
