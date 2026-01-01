const { autoBuild } = require('../src/js/autobuild');

function createResources({ metalValue, metalCap, siliconValue, siliconCap }) {
  return {
    colony: {
      colonists: { value: 0 },
      workers: { cap: 0 },
      metal: { value: metalValue, cap: metalCap },
      silicon: { value: siliconValue, cap: siliconCap }
    }
  };
}

function createStorageDepot() {
  return {
    name: 'storageDepot',
    displayName: 'Storage Depot',
    isHidden: false,
    autoBuildEnabled: true,
    autoActiveEnabled: false,
    autoBuildFillEnabled: true,
    autoBuildFillPercent: 95,
    autoBuildBasis: 'fill',
    autoBuildPriority: false,
    storage: { colony: { metal: 5000, silicon: 5000 } },
    count: 0,
    active: 0,
    getEffectiveStorageMultiplier() {
      return 1;
    },
    getEffectiveCost() {
      return { colony: { metal: 0 } };
    },
    canAfford() {
      return true;
    },
    build(amount) {
      this.count += amount;
      this.active += amount;
      return true;
    }
  };
}

describe('autobuild storage fill threshold', () => {
  afterEach(() => {
    delete global.resources;
  });

  test('builds storage when the most filled resource exceeds the threshold', () => {
    global.resources = createResources({
      metalValue: 980,
      metalCap: 1000,
      siliconValue: 500,
      siliconCap: 1000
    });
    const storageDepot = createStorageDepot();
    autoBuild({ storageDepot }, 0);
    expect(storageDepot.count).toBe(1);
  });

  test('skips storage when all tracked resources stay below the threshold', () => {
    global.resources = createResources({
      metalValue: 900,
      metalCap: 1000,
      siliconValue: 500,
      siliconCap: 1000
    });
    const storageDepot = createStorageDepot();
    autoBuild({ storageDepot }, 0);
    expect(storageDepot.count).toBe(0);
  });
});
