const hadUhfFactionId = Object.prototype.hasOwnProperty.call(global, 'UHF_FACTION_ID');
const previousUhfFactionId = global.UHF_FACTION_ID;
global.UHF_FACTION_ID = 'uhf';
const hadBorderEpsilon = Object.prototype.hasOwnProperty.call(global, 'BORDER_CONTROL_EPSILON');
const previousBorderEpsilon = global.BORDER_CONTROL_EPSILON;
global.BORDER_CONTROL_EPSILON = 1e-6;

const { GalaxyFaction } = require('../src/js/galaxy/faction.js');

function createSector({ q = 0, r = 0, control = {} } = {}) {
  return {
    q,
    r,
    key: `${q},${r}`,
    control: { ...control },
    getControlValue(id) {
      return this.control[id] || 0;
    },
  };
}

describe('UHF auto defense assignments', () => {
  afterAll(() => {
    if (!hadUhfFactionId) {
      delete global.UHF_FACTION_ID;
    } else {
      global.UHF_FACTION_ID = previousUhfFactionId;
    }
    if (!hadBorderEpsilon) {
      delete global.BORDER_CONTROL_EPSILON;
      return;
    }
    global.BORDER_CONTROL_EPSILON = previousBorderEpsilon;
  });

  test('auto defense uses leftover power without blocking operations', () => {
    const uhf = new GalaxyFaction({ id: 'uhf', name: 'UHF' });
    const sector = createSector({ control: { uhf: 1 } });
    const manager = {
      getSector(q, r) {
        if (q === sector.q && r === sector.r) {
          return sector;
        }
        return null;
      },
    };

    uhf.fleetCapacity = 100;
    uhf.fleetPower = 80;
    uhf.borderCacheDirty = false;
    uhf.borderSectors = [sector.key];
    uhf.borderSectorLookup = new Set([sector.key]);

    const reservation = uhf.getDefenseReservation(manager);
    expect(reservation).toBe(0);

    const assignment = uhf.getDefenseAssignment(sector.key);
    expect(assignment).toBeCloseTo(80, 6);

    const scale = uhf.getDefenseScale(manager);
    expect(scale).toBe(1);

    const operational = uhf.getOperationalFleetPower(manager);
    expect(operational).toBe(80);
  });
});
