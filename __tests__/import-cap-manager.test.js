const { describe, beforeEach, afterEach, test, expect } = global;

const { formatNumber } = require('../src/js/numbers.js');

const buildSector = ({ totalControl, uhfControl, rich, poor = [] }) => ({
  getTotalControlValue: () => totalControl,
  getControlValue: () => uhfControl,
  getRichResource: () => rich,
  getPoorResources: () => poor,
});

describe('ImportCapManager', () => {
  beforeEach(() => {
    jest.resetModules();

    global.window = {};
    global.formatNumber = formatNumber;
    global.UHF_FACTION_ID = 'uhf';
    global.FULL_CONTROL_EPSILON = 1e-6;
    global.warpGateCommand = { enabled: false };
    let cacheVersion = 0;
    global.galaxyManager = {
      enabled: false,
      getControlledSectorCacheVersion: () => cacheVersion,
      getUhfControlledSectors: () => [],
      bumpCache: () => {
        cacheVersion += 1;
      },
    };

    require('../src/js/galaxy/import-cap-manager.js');
  });

  afterEach(() => {
    delete global.window;
    delete global.formatNumber;
    delete global.UHF_FACTION_ID;
    delete global.FULL_CONTROL_EPSILON;
    delete global.warpGateCommand;
    delete global.galaxyManager;
  });

  test('uses base cap and unlimited hydrogen before warp gate', () => {
    const manager = new window.ImportCapManager();

    expect(manager.getCapForResource('metal')).toBe(1e9);
    expect(manager.getCapForResource('hydrogen')).toBe(Infinity);
  });

  test('uses warp gate cap before galaxy unlock', () => {
    warpGateCommand.enabled = true;
    const manager = new window.ImportCapManager();

    expect(manager.getCapForResource('water')).toBe(1e10);
  });

  test('applies sector control and rich/poor modifiers after galaxy unlock', () => {
    warpGateCommand.enabled = true;
    galaxyManager.enabled = true;
    galaxyManager.getUhfControlledSectors = () => [
      buildSector({ totalControl: 100, uhfControl: 100, rich: 'metal', poor: ['water'] }),
      buildSector({ totalControl: 50, uhfControl: 50, rich: 'water', poor: ['metal'] }),
    ];
    galaxyManager.bumpCache();

    const manager = new window.ImportCapManager();

    expect(manager.getCapForResource('metal')).toBe(25000000000);
    expect(manager.getCapForResource('water')).toBe(25000000000);
    expect(manager.getCapSummaryText()).toContain('Fully controlled sectors: 2');
  });

  test('falls back to the minimum cap when no sector is fully controlled', () => {
    warpGateCommand.enabled = true;
    galaxyManager.enabled = true;
    galaxyManager.getUhfControlledSectors = () => [];
    galaxyManager.bumpCache();

    const manager = new window.ImportCapManager();

    expect(manager.getCapForResource('metal')).toBe(1e10);
  });

  test('refreshes cached breakdown when the galaxy cache version changes', () => {
    warpGateCommand.enabled = true;
    galaxyManager.enabled = true;
    let controlled = [
      buildSector({ totalControl: 100, uhfControl: 100, rich: 'metal', poor: [] }),
    ];
    galaxyManager.getUhfControlledSectors = () => controlled;
    galaxyManager.bumpCache();

    const manager = new window.ImportCapManager();

    expect(manager.getCapForResource('metal')).toBe(20000000000);

    controlled = [
      buildSector({ totalControl: 100, uhfControl: 100, rich: 'water', poor: ['metal'] }),
    ];
    galaxyManager.getUhfControlledSectors = () => controlled;
    galaxyManager.bumpCache();

    expect(manager.getCapForResource('metal')).toBe(5000000000);
  });
});
