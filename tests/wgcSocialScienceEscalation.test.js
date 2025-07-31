const EffectableEntity = require('../src/js/effectable-entity.js');
global.EffectableEntity = EffectableEntity;
const { WGCTeamMember } = require('../src/js/team-member.js');
const { WarpGateCommand } = require('../src/js/wgc.js');

describe('WGC social science escalation', () => {
  test('failed social science challenge triggers harder combat next', () => {
    const wgc = new WarpGateCommand();
    for (let i = 0; i < 4; i++) {
      wgc.recruitMember(0, i, WGCTeamMember.create('A'+i, '', 'Soldier', {}));
    }
    const socialEvent = { name: 'Social Science challenge', type: 'science', specialty: 'Social Scientist', escalate: true };
    wgc.roll = () => ({ sum: 1, rolls: [1] });
    const res = wgc.resolveEvent(0, socialEvent);
    expect(res.success).toBe(false);
    expect(wgc.logs[0].length).toBe(1);
    const next = wgc.chooseEvent(0);
    expect(next.type).toBe('combat');
    expect(next.difficultyMultiplier).toBeCloseTo(1.25);
  });
});
