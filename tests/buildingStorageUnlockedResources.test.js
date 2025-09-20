const fs = require('fs');
const path = require('path');
const vm = require('vm');
const jsdomPath = path.join(process.execPath, '..', '..', 'lib', 'node_modules', 'jsdom');
const { JSDOM } = require(jsdomPath);

const EffectableEntity = require('../src/js/effectable-entity.js');
global.EffectableEntity = EffectableEntity;
const { Resource } = require('../src/js/resource.js');

function loadFormatStorageDetails(resources) {
  const dom = new JSDOM('<!DOCTYPE html><div></div>', { runScripts: 'outside-only' });
  const ctx = dom.getInternalVMContext();
  ctx.formatNumber = value => value;
  ctx.resources = resources;
  ctx.buildings = {};
  ctx.colonies = {};
  ctx.terraforming = { celestialParameters: {} };
  ctx.Colony = class {};
  const code = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'structuresUI.js'), 'utf8');
  vm.runInContext(code, ctx);
  return ctx.formatStorageDetails;
}

describe('building storage display handling', () => {
  let resource;

  beforeEach(() => {
    global.structures = {
      storageDepot: {
        storage: { colony: { metal: 1000 } },
        active: 1,
        getEffectiveStorageMultiplier: () => 1
      }
    };

    resource = new Resource({
      name: 'metal',
      category: 'colony',
      displayName: 'Metal',
      hasCap: true,
      baseCap: 0,
      unlocked: false
    });
  });

  afterEach(() => {
    global.structures = {};
  });

  test('building storage applies even when resource locked', () => {
    resource.updateStorageCap();
    expect(resource.cap).toBe(1000);
  });

  test('storage display omits locked resources', () => {
    const formatStorageDetails = loadFormatStorageDetails({
      colony: {
        metal: { displayName: 'Metal', unlocked: false },
        water: { displayName: 'Water', unlocked: true }
      }
    });

    const storageText = formatStorageDetails({ colony: { metal: 500, water: 200 } });
    expect(storageText).toBe('200 Water');
  });

  test('storage display returns empty when all resources locked', () => {
    const formatStorageDetails = loadFormatStorageDetails({
      colony: {
        metal: { displayName: 'Metal', unlocked: false }
      }
    });

    const storageText = formatStorageDetails({ colony: { metal: 500 } });
    expect(storageText).toBe('');
  });
});
