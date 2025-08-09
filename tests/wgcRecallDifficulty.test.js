const EffectableEntity = require('../src/js/effectable-entity.js');
global.EffectableEntity = EffectableEntity;
const { WGCTeamMember } = require('../src/js/team-member.js');
const { WarpGateCommand } = require('../src/js/wgc.js');

describe('WGC recall preserves difficulty', () => {
  test('recalling a team keeps its selected difficulty', () => {
    const wgc = new WarpGateCommand();
    for (let i = 0; i < 4; i++) {
      wgc.recruitMember(0, i, WGCTeamMember.create('A' + i, '', 'Soldier', {}));
    }
    wgc.startOperation(0, 3);
    wgc.recallTeam(0);
    expect(wgc.operations[0].difficulty).toBe(3);
  });
});
