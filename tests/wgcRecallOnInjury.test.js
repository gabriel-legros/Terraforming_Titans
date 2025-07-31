const EffectableEntity = require('../src/js/effectable-entity.js');
global.EffectableEntity = EffectableEntity;
const { WGCTeamMember } = require('../src/js/team-member.js');
const { WarpGateCommand } = require('../src/js/wgc.js');

describe('WGC auto recall on injury', () => {
  beforeEach(() => {
    global.addJournalEntry = jest.fn();
  });
  afterEach(() => {
    delete global.addJournalEntry;
  });

  test('operation recalls when member health drops to zero', () => {
    const wgc = new WarpGateCommand();
    const member = WGCTeamMember.create('Bob', '', 'Soldier', {});
    member.health = 10;
    const others = ['A','B','C'].map(n => WGCTeamMember.create(n, '', 'Soldier', {}));
    wgc.recruitMember(0, 0, member);
    others.forEach((m,i)=>wgc.recruitMember(0, i+1, m));
    wgc.startOperation(0, 1);
    wgc.roll = () => ({ sum: 1, rolls: [1] });
    jest.spyOn(Math, 'random').mockReturnValue(0);
    const event = { name: 'Test', type: 'individual', skill: 'power' };
    wgc.resolveEvent(0, event);
    Math.random.mockRestore();
    expect(member.health).toBe(1);
    expect(wgc.operations[0].active).toBe(false);
    expect(addJournalEntry).toHaveBeenCalled();
  });
});
