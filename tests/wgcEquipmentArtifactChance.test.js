const EffectableEntity = require('../src/js/effectable-entity.js');
global.EffectableEntity = EffectableEntity;
const { WGCTeamMember } = require('../src/js/team-member.js');
const { WarpGateCommand } = require('../src/js/wgc.js');

describe('WGC Equipment artifact chance', () => {
  beforeEach(() => {
    global.resources = { special: { alienArtifact: { value: 0, increase: jest.fn(), decrease: jest.fn() } } };
  });

  test('equipment upgrades raise artifact chance to 100% at max', () => {
    const wgc = new WarpGateCommand();
    for (let i = 0; i < 4; i++) {
      wgc.recruitMember(0, i, WGCTeamMember.create('A' + i, '', 'Soldier', {}));
    }
    wgc.roll = () => ({ sum: 80, rolls: [20,20,20,20] });

    const event = { name: 'Team Power Challenge', type: 'team', skill: 'power' };
    const rand = jest.spyOn(Math, 'random');
    rand.mockReturnValueOnce(0.15);
    let res = wgc.resolveEvent(0, event);
    expect(res.artifact).toBe(false);

    wgc.rdUpgrades.wgtEquipment.purchases = 600;
    rand.mockReturnValueOnce(0.15);
    res = wgc.resolveEvent(0, event);
    expect(res.artifact).toBe(true);

    wgc.rdUpgrades.wgtEquipment.purchases = 900;
    rand.mockReturnValueOnce(0.95);
    res = wgc.resolveEvent(0, event);
    expect(res.artifact).toBe(true);

    rand.mockReturnValueOnce(0.5);
    res = wgc.resolveEvent(0, event);
    expect(res.artifact).toBe(true);

    rand.mockRestore();
  });

  test('purchaseUpgrade respects max', () => {
    const wgc = new WarpGateCommand();
    wgc.rdUpgrades.wgtEquipment.purchases = 900;
    expect(wgc.purchaseUpgrade('wgtEquipment')).toBe(false);
  });
});
