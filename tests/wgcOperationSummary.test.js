const EffectableEntity = require('../src/js/effectable-entity.js');
global.EffectableEntity = EffectableEntity;
const { WGCTeamMember } = require('../src/js/team-member.js');
const { WarpGateCommand } = require('../src/js/wgc.js');

describe('WGC operation summary', () => {
  test('startOperation sets default summary text', () => {
    const wgc = new WarpGateCommand();
    for (let i = 0; i < 4; i++) {
      wgc.recruitMember(0, i, WGCTeamMember.create('A'+i, '', 'Soldier', {}));
    }
    expect(wgc.startOperation(0)).toBe(true);
    expect(wgc.operations[0].summary).toBe('Setting out through Warp Gate');
  });
});
