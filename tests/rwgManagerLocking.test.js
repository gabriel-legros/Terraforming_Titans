const { RwgManager } = require('../src/js/rwg.js');

describe('RwgManager locking system', () => {
  test('locks are tracked and generation respects them', () => {
    const mgr = new RwgManager();
    // hot orbit locked by default
    expect(mgr.isOrbitLocked('hot')).toBe(true);
    mgr.unlockOrbit('hot');
    expect(mgr.isOrbitLocked('hot')).toBe(false);
    mgr.lockOrbit('cold');
    const res = mgr.generateRandomPlanet('lock-test', { orbitPreset: 'auto' });
    expect(res.orbitPreset).not.toBe('cold');
  });

  test('unlocking types exposes them in available list', () => {
    const mgr = new RwgManager();
    expect(mgr.isTypeLocked('venus-like')).toBe(true);
    mgr.unlockType('venus-like');
    expect(mgr.isTypeLocked('venus-like')).toBe(false);
    const types = mgr.getAvailableTypes(false);
    expect(types).toContain('venus-like');
  });
});
