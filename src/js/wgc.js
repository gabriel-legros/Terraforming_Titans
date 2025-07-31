const isNodeWGC = (typeof module !== 'undefined' && module.exports);
if (typeof globalThis.WGCTeamMember === 'undefined' && isNodeWGC) {
  try {
    globalThis.WGCTeamMember = require('./team-member.js').WGCTeamMember;
  } catch (e) {}
}

const operationEvents = [
  { name: 'Team Power Challenge', type: 'team', skill: 'power', weight: 1 },
  { name: 'Team Athletics Challenge', type: 'team', skill: 'athletics', weight: 1 },
  { name: 'Team Wits Challenge', type: 'team', skill: 'wit', weight: 1 },
  { name: 'Individual Athletics Challenge', type: 'individual', skill: 'athletics', weight: 1 },
  { name: 'Natural Science challenge', type: 'science', specialty: 'Natural Scientist', escalate: true, weight: 1 },
  { name: 'Social Science challenge', type: 'science', specialty: 'Social Scientist', escalate: true, weight: 1 },
  { name: 'Combat challenge', type: 'combat', weight: 1 }
];

const operationStartText = 'Setting out through Warp Gate';

class WarpGateCommand extends EffectableEntity {
  constructor() {
    super({ description: 'Warp Gate Command manager' });
    this.enabled = false;
    this.teams = Array.from({ length: 5 }, () => Array(4).fill(null));
    this.operations = Array.from({ length: 5 }, () => ({ active: false, progress: 0, timer: 0, artifacts: 0, successes: 0, summary: '' }));
    this.logs = Array.from({ length: 5 }, () => []);
    this.totalOperations = 0;
    this.rdUpgrades = {
      wgtEquipment: { purchases: 0 },
      componentsEfficiency: { purchases: 0, max: 400 },
      electronicsEfficiency: { purchases: 0, max: 400 },
      superconductorEfficiency: { purchases: 0, max: 400 },
      androidsEfficiency: { purchases: 0, max: 400 },
    };
  }

  addLog(teamIndex, text) {
    if (!Array.isArray(this.logs[teamIndex])) return;
    const log = this.logs[teamIndex];
    log.push(text);
    if (log.length > 100) log.shift();
  }

  chooseEvent() {
    const total = operationEvents.reduce((s, e) => s + (e.weight || 1), 0);
    let r = Math.random() * total;
    for (const ev of operationEvents) {
      r -= ev.weight || 1;
      if (r < 0) return ev;
    }
    return operationEvents[0];
  }

  roll(dice) {
    const rolls = [];
    for (let i = 0; i < dice; i++) {
      rolls.push(Math.floor(Math.random() * 20) + 1);
    }
    return { sum: rolls.reduce((s, v) => s + v, 0), rolls };
  }

  resolveEvent(teamIndex, event) {
    const team = this.teams[teamIndex];
    if (!team) return { success: false, artifact: false };
    let success = false;
    let rollResult = { sum: 0, rolls: [] };
    let dc = 0;
    let skillTotal = 0;
    switch (event.type) {
      case 'team': {
        skillTotal = team.reduce((s, m) => s + (m ? m[event.skill] : 0), 0);
        rollResult = this.roll(4);
        dc = 40;
        success = rollResult.sum + skillTotal >= dc;
        break;
      }
      case 'individual': {
        const members = team.filter(m => m);
        if (members.length === 0) return { success: false, artifact: false };
        const member = members[Math.floor(Math.random() * members.length)];
        skillTotal = member[event.skill];
        rollResult = this.roll(1);
        dc = 10;
        success = rollResult.sum + skillTotal >= dc;
        break;
      }
      case 'science': {
        let m = team.find(t => t && t.classType === event.specialty);
        if (!m) {
          m = team[0];
          if (!m) return { success: false, artifact: false };
          skillTotal = Math.floor(m.wit / 2);
        } else {
          skillTotal = m.wit;
        }
        rollResult = this.roll(1);
        dc = 10;
        success = rollResult.sum + skillTotal >= dc;
        break;
      }
      case 'combat': {
        skillTotal = team.reduce((s, mem) => {
          if (!mem) return s;
          const mult = mem.classType === 'Soldier' ? 2 : 1;
          return s + mem.power * mult;
        }, 0);
        rollResult = this.roll(4);
        dc = 40;
        success = rollResult.sum + skillTotal >= dc;
        break;
      }
    }

    const artifact = success && Math.random() < 0.1;
    const op = this.operations[teamIndex];
    if (success) op.successes += 1;
    if (artifact) op.artifacts += 1;
    const rollsStr = rollResult.rolls.join(',');
    const summary = `${event.name}: roll [${rollsStr}] + skill ${skillTotal} (total ${rollResult.sum + skillTotal}) vs DC ${dc} => ${success ? 'Success' : 'Fail'}${artifact ? ' +1 Artifact' : ''}`;
    op.summary = summary;
    this.addLog(teamIndex, `Team ${teamIndex + 1} - ${summary}`);

    if (!success && event.escalate) {
      const combatEvent = operationEvents.find(e => e.type === 'combat');
      this.resolveEvent(teamIndex, combatEvent);
    }
    return { success, artifact };
  }

  enable() {
    this.enabled = true;
    if (typeof showWGCTab === 'function') {
      showWGCTab();
    }
  }

  getUpgradeCost(key) {
    const up = this.rdUpgrades[key];
    return up ? up.purchases + 1 : 0;
  }

  getMultiplier(key) {
    const up = this.rdUpgrades[key];
    if (!up) return 1;
    return 1 + (up.purchases / 100);
  }

  purchaseUpgrade(key) {
    const up = this.rdUpgrades[key];
    if (!up) return false;
    if (up.max && up.purchases >= up.max) return false;
    const cost = this.getUpgradeCost(key);
    const art = resources && resources.special && resources.special.alienArtifact;
    if (!art || art.value < cost) return false;
    if (typeof art.decrease === 'function') art.decrease(cost);
    up.purchases += 1;
    this.applyUpgradeEffect(key);
    return true;
  }

  applyUpgradeEffect(key) {
    const mult = this.getMultiplier(key);
    const effectId = `wgc-${key}`;
    const mapping = {
      componentsEfficiency: 'componentFactory',
      electronicsEfficiency: 'electronicsFactory',
      superconductorEfficiency: 'superconductorFactory',
      androidsEfficiency: 'androidFactory',
    };
    if (mapping[key]) {
      addEffect({
        target: 'building',
        targetId: mapping[key],
        type: 'productionMultiplier',
        value: mult,
        effectId,
        sourceId: 'wgcRD'
      });
    }
  }

  reapplyEffects() {
    for (const key in this.rdUpgrades) {
      if (this.rdUpgrades[key].purchases > 0) {
        this.applyUpgradeEffect(key);
      }
    }
  }

  update(_delta) {
    const seconds = _delta / 1000;
    this.operations.forEach((op, idx) => {
      if (op.active) {
        const prev = Math.floor(op.timer / 60);
        op.timer += seconds;
        const curr = Math.floor(op.timer / 60);
        for (let t = prev; t < curr && t < 9; t++) {
          this.resolveEvent(idx, this.chooseEvent());
        }

        const loops = Math.floor(op.timer / 600);
        if (loops > 0) {
          for (let i = 0; i < loops; i++) {
            this.finishOperation(idx);
          }
          this.totalOperations += loops;
          op.timer -= loops * 600;
        }
        op.progress = op.timer / 600;
      }
    });
  }

  finishOperation(teamIndex) {
    const op = this.operations[teamIndex];
    if (!op) return;
    const art = op.artifacts;
    const successes = op.successes;
    if (art > 0 && typeof resources !== 'undefined' && resources.special && resources.special.alienArtifact) {
      resources.special.alienArtifact.increase(art);
    }
    const team = this.teams[teamIndex];
    if (team) {
      team.forEach(m => { if (m) m.xp = (m.xp || 0) + successes; });
    }
    const summary = `Operation Complete: ${successes} success(es), ${art} artifact(s)`;
    op.summary = summary;
    this.addLog(teamIndex, `Team ${teamIndex + 1} - ${summary}`);
    op.artifacts = 0;
    op.successes = 0;
  }

  startOperation(teamIndex) {
    const team = this.teams[teamIndex];
    if (!team || team.some(m => !m)) return false;
    const op = this.operations[teamIndex];
    if (!op) return false;
    op.active = true;
    op.progress = 0;
    op.timer = 0;
    op.artifacts = 0;
    op.successes = 0;
    op.summary = operationStartText;
    return true;
  }

  recallTeam(teamIndex) {
    const op = this.operations[teamIndex];
    if (op) {
      op.active = false;
      op.progress = 0;
      op.timer = 0;
    }
  }

  recruitMember(teamIndex, slotIndex, member) {
    if (!this.teams[teamIndex] || this.teams[teamIndex][slotIndex]) return null;
    this.teams[teamIndex][slotIndex] = member;
    return member;
  }

  dismissMember(teamIndex, slotIndex) {
    const op = this.operations[teamIndex];
    if (op && op.active) return false;
    if (this.teams[teamIndex]) {
      this.teams[teamIndex][slotIndex] = null;
      return true;
    }
    return false;
  }

  renameMember(teamIndex, slotIndex, name) {
    const m = this.teams[teamIndex] && this.teams[teamIndex][slotIndex];
    if (m) m.name = name;
  }

  saveState() {
    return {
      enabled: this.enabled,
      upgrades: Object.keys(this.rdUpgrades).reduce((o, k) => {
        o[k] = this.rdUpgrades[k].purchases;
        return o;
      }, {}),
      teams: this.teams.map(team => team.map(m => m ? m.toJSON() : null)),
      operations: this.operations.map(op => ({
        active: op.active,
        progress: op.progress,
        timer: op.timer,
        artifacts: op.artifacts,
        successes: op.successes,
        summary: op.summary
      })),
      logs: this.logs.map(l => l.slice()),
      totalOperations: this.totalOperations
    };
  }

  loadState(data = {}) {
    this.enabled = data.enabled || false;
    if (data.upgrades) {
      for (const k in data.upgrades) {
        if (this.rdUpgrades[k]) {
          this.rdUpgrades[k].purchases = data.upgrades[k];
        }
      }
    }
    if (Array.isArray(data.teams)) {
      this.teams = data.teams.map(team =>
        Array.isArray(team) ? team.map(m => (m ? new WGCTeamMember(m) : null)) : [null, null, null, null]
      );
    }
    if (Array.isArray(data.operations)) {
      this.operations = data.operations.map(op => ({
        active: !!op.active,
        progress: op.progress || 0,
        timer: op.timer || 0,
        artifacts: op.artifacts || 0,
        successes: op.successes || 0,
        summary: op.summary || ''
      }));
    }
    if (Array.isArray(data.logs)) {
      this.logs = data.logs.map(l => l.slice(-100));
    }
    this.totalOperations = data.totalOperations || 0;
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { WarpGateCommand };
}
