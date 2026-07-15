const path = require('path');

function loadResourceModule(initialStructures) {
  jest.resetModules();

  global.EffectableEntity = require(path.resolve(__dirname, '../src/js/effectable-entity.js'));
  global.structures = initialStructures;
  global.followersManager = {};
  global.isManagerEffectivelyEnabled = () => false;
  global.hazardManager = {
    parameters: { kessler: false },
    kesslerHazard: { isCleared: () => true }
  };

  return require(path.resolve(__dirname, '../src/js/resource.js'));
}

function makeResource(Resource, name) {
  return new Resource({
    name,
    category: 'colony',
    hasCap: true,
    baseCap: 100
  });
}

function makeStorageProvider(storage, active = 1) {
  return {
    storage,
    active,
    getStorageContribution(category, resourceName) {
      return this.active * (this.storage[category]?.[resourceName] || 0);
    }
  };
}

afterEach(() => {
  delete global.structures;
  delete global.followersManager;
  delete global.isManagerEffectivelyEnabled;
  delete global.hazardManager;
});

describe('resource storage-provider cache', () => {
  test('rebuilds after travel replaces the structures collection', () => {
    const marsDepot = makeStorageProvider({ colony: { metal: 10 } });
    const { Resource } = loadResourceModule({ storageDepot: marsDepot });
    const metal = makeResource(Resource, 'metal');

    metal.updateStorageCap();
    expect(metal.cap).toBe(110);

    const destinationDepot = makeStorageProvider({ colony: { metal: 40 } });
    global.structures = { storageDepot: destinationDepot };
    metal.updateStorageCap();

    expect(metal.cap).toBe(140);
  });

  test('uses current storage values when a depot switches away from deep warp', () => {
    const depot = makeStorageProvider({ colony: { metal: 5_000_000 } }, 2);
    const { Resource } = loadResourceModule({ storageDepot: depot });
    const metal = makeResource(Resource, 'metal');

    metal.updateStorageCap();
    expect(metal.cap).toBe(10_000_100);

    depot.storage = { colony: { metal: 5_000 } };
    metal.updateStorageCap();

    expect(metal.cap).toBe(10_100);
  });

  test('uses current aerostat colonist and android assignments', () => {
    const aerostat = makeStorageProvider({ colony: { colonists: 10, androids: 0 } }, 3);
    const { Resource } = loadResourceModule({ aerostat_colony: aerostat });
    const colonists = makeResource(Resource, 'colonists');
    const androids = makeResource(Resource, 'androids');

    colonists.updateStorageCap();
    androids.updateStorageCap();
    expect(colonists.cap).toBe(130);
    expect(androids.cap).toBe(100);

    aerostat.storage.colony.colonists = 4;
    aerostat.storage.colony.androids = 6;
    colonists.updateStorageCap();
    androids.updateStorageCap();

    expect(colonists.cap).toBe(112);
    expect(androids.cap).toBe(118);
  });

  test('discovers a new storage target after a storage recipe changes the depot mapping', () => {
    const depot = makeStorageProvider({ colony: { metal: 5_000 } }, 2);
    const { Resource, invalidateStorageProviderCache } = loadResourceModule({ storageDepot: depot });
    const silicon = makeResource(Resource, 'silicon');

    silicon.updateStorageCap();
    expect(silicon.cap).toBe(100);

    depot.storage.colony.silicon = 5_000;
    invalidateStorageProviderCache();
    silicon.updateStorageCap();

    expect(silicon.cap).toBe(10_100);
  });
});
