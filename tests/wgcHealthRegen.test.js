const EffectableEntity = require('../src/js/effectable-entity.js');
global.EffectableEntity = EffectableEntity;
const { WGCTeamMember } = require('../src/js/team-member.js');
const { WarpGateCommand } = require('../src/js/wgc.js');

describe('WGC team health regeneration', () => {
  test('members heal 50 HP per step when not active', () => {
    const wgc = new WarpGateCommand();
    const m = WGCTeamMember.create('Bob', '', 'Soldier', {});
    m.health = 40;
    wgc.recruitMember(0, 0, m);
    wgc.update(60000); // one minute
    expect(m.health).toBeCloseTo(90);
  });

  test('members heal 1 HP per step during operations', () => {
    const wgc = new WarpGateCommand();
    for (let i = 0; i < 4; i++) {
      const mem = WGCTeamMember.create('A'+i, '', 'Soldier', {});
      wgc.recruitMember(0, i, mem);
    }
    wgc.roll = () => ({ sum: 80, rolls: [20, 20, 20, 20] });
    const member = wgc.teams[0][0];
    member.health = 90;
    wgc.startOperation(0);
    wgc.update(60000); // one minute
    expect(member.health).toBeCloseTo(91);
  });
});
