global.EffectableEntity = class {};

const { generateRandomPlanet } = require('../src/js/rwg.js');
const SpaceManager = require('../src/js/space.js');

describe('Random world generator sector assignment', () => {
  afterEach(() => {
    delete global.galaxyManager;
    delete global.spaceManager;
  });

  test('assigns the default sector when no managers are available', () => {
    delete global.galaxyManager;
    delete global.spaceManager;
    const result = generateRandomPlanet(12345);
    expect(result?.merged?.celestialParameters?.sector).toBe('R5-07');
  });

  test('uses galaxy manager sector display names when available', () => {
    const stubSector = { getDisplayName: () => 'R2-03', q: 1, r: -1 };
    global.galaxyManager = {
      getSectors: () => [stubSector],
      radius: 6
    };
    const result = generateRandomPlanet(67890);
    expect(result?.merged?.celestialParameters?.sector).toBe('R2-03');
  });

  test('honors a locked sector provided by the space manager', () => {
    global.spaceManager = {
      getRwgSectorLock: () => 'Core'
    };
    delete global.galaxyManager;
    const result = generateRandomPlanet(98765);
    expect(result?.merged?.celestialParameters?.sector).toBe('Core');
  });

  test('selects only sectors with UHF control when unlocked', () => {
    const uncontrolled = { getDisplayName: () => 'R1-01', getControlValue: () => 0, control: { uhf: 0 } };
    const controlled = { getDisplayName: () => 'R1-02', getControlValue: () => 5, control: { uhf: 5 } };
    global.galaxyManager = {
      getSectors: () => [uncontrolled, controlled],
      radius: 6
    };
    const seen = new Set();
    for (let seed = 1; seed <= 10; seed += 1) {
      const result = generateRandomPlanet(seed * 17);
      seen.add(result?.merged?.celestialParameters?.sector);
    }
    expect(seen.has('R1-02')).toBe(true);
    expect(seen.has('R1-01')).toBe(false);
  });

  test('falls back to any sector when UHF presence is absent', () => {
    const first = { getDisplayName: () => 'R2-01', getControlValue: () => 0, control: { uhf: 0 } };
    const second = { getDisplayName: () => 'R2-02', getControlValue: () => 0, control: { uhf: 0 } };
    global.galaxyManager = {
      getSectors: () => [first, second],
      radius: 6
    };
    const result = generateRandomPlanet(2468);
    expect(['R2-01', 'R2-02']).toContain(result?.merged?.celestialParameters?.sector);
  });
});

describe('SpaceManager RWG sector lock persistence', () => {
  test('legacy saves default to unlocked when storing the original sector', () => {
    const manager = new SpaceManager({ mars: {} });
    manager.loadState({ planetStatuses: { mars: {} }, rwgSectorLock: 'R5-07' });
    expect(manager.getRwgSectorLock()).toBeNull();
  });

  test('restores manual locks when flagged in the save', () => {
    const manager = new SpaceManager({ mars: {} });
    manager.loadState({ planetStatuses: { mars: {} }, rwgSectorLock: 'Core', rwgSectorLockManual: true });
    expect(manager.getRwgSectorLock()).toBe('Core');
  });
});

afterAll(() => {
  delete global.EffectableEntity;
});
