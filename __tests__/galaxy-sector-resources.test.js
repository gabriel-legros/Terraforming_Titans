const hadUhfFactionId = Object.prototype.hasOwnProperty.call(global, 'UHF_FACTION_ID');
const previousUhfFactionId = global.UHF_FACTION_ID;
global.UHF_FACTION_ID = 'uhf';

const { GalaxyManager } = require('../src/js/galaxy/galaxy.js');

describe('Galaxy sector resources', () => {
  afterAll(() => {
    if (!hadUhfFactionId) {
      delete global.UHF_FACTION_ID;
      return;
    }
    global.UHF_FACTION_ID = previousUhfFactionId;
  });

  test('initializes rich and poor resource data from parameters', () => {
    const manager = new GalaxyManager();
    manager.initialize();

    const sector = manager.getSector(1, 0);
    expect(sector.richResource).toBe('metal');
    expect(sector.poorResources).toEqual(['carbon', 'water']);
  });
});
