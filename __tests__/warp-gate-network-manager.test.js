const { describe, beforeEach, afterEach, test, expect } = global;

const { formatNumber } = require('../src/js/numbers.js');

const buildSector = ({ totalControl, uhfControl, rich, poor = [], warpGateNetworkLevel = 0 }) => ({
  getTotalControlValue: () => totalControl,
  getControlValue: () => uhfControl,
  getRichResource: () => rich,
  getPoorResources: () => poor,
  warpGateNetworkLevel,
});

describe('WarpGateNetworkManager', () => {
  beforeEach(() => {
    jest.resetModules();

    global.window = {};
    global.formatNumber = formatNumber;
    global.EffectableEntity = class {
      constructor() {
        this.booleanFlags = new Set();
      }

      applyBooleanFlag(effect) {
        if (effect.value) {
          this.booleanFlags.add(effect.flagId);
        } else {
          this.booleanFlags.delete(effect.flagId);
        }
      }

      isBooleanFlagSet(flagId) {
        return this.booleanFlags.has(flagId);
      }
    };
    global.UHF_FACTION_ID = 'uhf';
    global.FULL_CONTROL_EPSILON = 1e-6;
    global.warpGateCommand = { enabled: false };
    let cacheVersion = 0;
    global.galaxyManager = {
      enabled: false,
      getControlledSectorCacheVersion: () => cacheVersion,
      getUhfControlledSectors: () => [],
      getTerraformedWorldCountForSector: () => 0,
      bumpCache: () => {
        cacheVersion += 1;
      },
    };

    require('../src/js/galaxy/warp-gate-network-manager.js');
  });

  afterEach(() => {
    delete global.window;
    delete global.formatNumber;
    delete global.EffectableEntity;
    delete global.UHF_FACTION_ID;
    delete global.FULL_CONTROL_EPSILON;
    delete global.warpGateCommand;
    delete global.galaxyManager;
    delete global.spaceManager;
  });

  test('uses base cap and unlimited hydrogen before warp gate', () => {
    const manager = new window.WarpGateNetworkManager();

    expect(manager.getCapForResource('metal')).toBe(1e9);
    expect(manager.getCapForResource('hydrogen')).toBe(Infinity);
  });

  test('uses warp gate cap before galaxy unlock', () => {
    warpGateCommand.enabled = true;
    const manager = new window.WarpGateNetworkManager();

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

    const manager = new window.WarpGateNetworkManager();

    expect(manager.getCapForResource('metal')).toBe(25000000000);
    expect(manager.getCapForResource('water')).toBe(25000000000);
    expect(manager.getCapSummaryText()).toContain('Fully controlled sectors: 2');
  });

  test('falls back to the minimum cap when no sector is fully controlled', () => {
    warpGateCommand.enabled = true;
    galaxyManager.enabled = true;
    galaxyManager.getUhfControlledSectors = () => [];
    galaxyManager.bumpCache();

    const manager = new window.WarpGateNetworkManager();

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

    const manager = new window.WarpGateNetworkManager();

    expect(manager.getCapForResource('metal')).toBe(20000000000);

    controlled = [
      buildSector({ totalControl: 100, uhfControl: 100, rich: 'water', poor: ['metal'] }),
    ];
    galaxyManager.getUhfControlledSectors = () => controlled;
    galaxyManager.bumpCache();

    expect(manager.getCapForResource('metal')).toBe(5000000000);
  });

  test('applies warp gate network multipliers when fabrication is active', () => {
    warpGateCommand.enabled = true;
    galaxyManager.enabled = true;
    galaxyManager.getUhfControlledSectors = () => [
      buildSector({ totalControl: 100, uhfControl: 100, rich: 'metal', poor: [], warpGateNetworkLevel: 3 }),
    ];
    galaxyManager.bumpCache();

    const manager = new window.WarpGateNetworkManager();
    manager.applyBooleanFlag({ flagId: 'warpGateFabrication', value: true });

    expect(manager.getCapForResource('metal')).toBe(24000000000);
  });

  test('advances warp gate network levels based on terraformed worlds', () => {
    galaxyManager.enabled = true;
    const sector = {
      getDisplayName: () => 'R1-01',
      getRichResource: () => null,
      getPoorResources: () => [],
      warpGateNetworkLevel: 0,
      warpGateNetworkProgress: 0,
    };
    galaxyManager.getUhfControlledSectors = () => [sector];
    galaxyManager.getTerraformedWorldCountForSector = () => 2;
    galaxyManager.bumpCache();

    const manager = new window.WarpGateNetworkManager();
    manager.applyBooleanFlag({ flagId: 'warpGateFabrication', value: true });

    manager.update(3600000);

    expect(sector.warpGateNetworkLevel).toBe(1);
    expect(sector.warpGateNetworkProgress).toBe(1);
  });
});
