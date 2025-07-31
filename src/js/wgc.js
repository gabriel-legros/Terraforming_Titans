const isNodeWGC = (typeof module !== 'undefined' && module.exports);
if (typeof globalThis.WGCTeamMember === 'undefined' && isNodeWGC) {
  try {
    globalThis.WGCTeamMember = require('./team-member.js').WGCTeamMember;
  } catch (e) {}
}

const baseOperationEvents = [
  { name: 'Team Power Challenge', type: 'team', skill: 'power', weight: 1 },
  { name: 'Team Athletics Challenge', type: 'team', skill: 'athletics', weight: 1 },
  { name: 'Team Wits Challenge', type: 'team', skill: 'wit', weight: 1 },
  { name: 'Individual Athletics Challenge', type: 'individual', skill: 'athletics', weight: 1 },
  { name: 'Natural Science challenge', type: 'science', specialty: 'Natural Scientist', escalate: true, weight: 1, artifactMultiplier: 2 },
  { name: 'Social Science challenge', type: 'science', specialty: 'Social Scientist', escalate: true, weight: 1 },
  { name: 'Combat challenge', type: 'combat', weight: 1 }
];

const operationStartText = 'Setting out through Warp Gate';

class WarpGateCommand extends EffectableEntity {
  constructor() {
    super({ description: 'Warp Gate Command manager' });
    this.enabled = false;
    this.teams = Array.from({ length: 5 }, () => Array(4).fill(null));
    this.operations = Array.from({ length: 5 }, () => ({ active: false, progress: 0, timer: 0, difficulty: 0, artifacts: 0, successes: 0, summary: '', number: 1 }));
    this.teamOperationCounts = Array(5).fill(0);
    this.teamNextOperationNumber = Array(5).fill(1);
    this.logs = Array.from({ length: 5 }, () => []);
    this.stances = Array.from({ length: 5 }, () => ({ hazardousBiomass: 'Neutral' }));
    this.totalOperations = 0;
    this.pendingCombat = false;
    this.combatDifficulty = 1;
    this.rdUpgrades = {
      wgtEquipment: { purchases: 0, max: 900 },
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

  chooseEvent(teamIndex = 0) {
    if (this.pendingCombat) {
      this.pendingCombat = false;
      const combatEvent = baseOperationEvents.find(e => e.type === 'combat');
      const event = Object.assign({}, combatEvent, { difficultyMultiplier: this.combatDifficulty });
      this.combatDifficulty = 1;
      return event;
    }

    const events = baseOperationEvents.map(ev => {
      const e = { ...ev };
      const stance = this.stances && this.stances[teamIndex] ? this.stances[teamIndex].hazardousBiomass : 'Neutral';
      if (e.name === 'Social Science challenge') {
        if (stance === 'Negotiation') e.weight *= 2;
        if (stance === 'Aggressive') e.weight *= 0.5;
      }
      if (e.type === 'combat') {
        if (stance === 'Negotiation') e.weight *= 0.5;
        if (stance === 'Aggressive') e.weight *= 2;
      }
      return e;
    });
    const total = events.reduce((s, e) => s + (e.weight || 1), 0);
    let r = Math.random() * total;
    for (const ev of events) {
      r -= ev.weight || 1;
      if (r < 0) return ev;
    }
    return events[0];
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
    let roller = null;
    const op = this.operations[teamIndex];
    const difficulty = op ? op.difficulty || 0 : 0;
    switch (event.type) {
      case 'team': {
        skillTotal = team.reduce((s, m) => s + (m ? m[event.skill] : 0), 0);
        rollResult = this.roll(4);
        dc = 40 + difficulty * 4;
        success = rollResult.sum + skillTotal >= dc;
        if (!success) {
          team.forEach(m => { if (m) m.health = Math.max(m.health - 10, 0); });
        }
        break;
      }
      case 'individual': {
        const members = team.filter(m => m);
        if (members.length === 0) return { success: false, artifact: false };
        const member = members[Math.floor(Math.random() * members.length)];
        roller = member;
        skillTotal = member[event.skill];
        const leader = team[0];
        if (leader && leader !== member) {
          skillTotal += Math.floor(leader[event.skill] / 2);
        }
        rollResult = this.roll(1);
        dc = 10 + difficulty;
        success = rollResult.sum + skillTotal >= dc;
        if (!success) {
          member.health = Math.max(member.health - 10 * difficulty, 0);
        }
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
          const leader = team[0];
          if (leader && leader !== m) {
            skillTotal += Math.floor(leader.wit / 2);
          }
        }
        roller = m;
        rollResult = this.roll(1);
        dc = 10 + difficulty;
        success = rollResult.sum + skillTotal >= dc;
        if (!success && event.specialty === 'Social Scientist') {
          this.pendingCombat = true;
          this.combatDifficulty = 1.25;
        }
        break;
      }
      case 'combat': {
        skillTotal = team.reduce((s, mem) => {
          if (!mem) return s;
          const mult = mem.classType === 'Soldier' ? 2 : 1;
          return s + mem.power * mult;
        }, 0);
        rollResult = this.roll(4);
        dc = 40 * (event.difficultyMultiplier || 1) + difficulty;
        success = rollResult.sum + skillTotal >= dc;
        break;
      }
    }

    const equip = this.rdUpgrades.wgtEquipment ? this.rdUpgrades.wgtEquipment.purchases : 0;
    const artifactChance = Math.min(0.1 + equip * 0.001, 1);
    let artifact = success && Math.random() < artifactChance;
    const critical = event.type === 'individual' && rollResult.rolls.includes(20);
    if (critical) {
      success = true;
      artifact = true;
    }
    if (success) op.successes += 1;
    let artifactReward = 0;
    if (artifact) {
      artifactReward = 1 + (difficulty > 0 ? difficulty * 0.1 : 0);
      const mult = event.artifactMultiplier || (event.specialty === 'Natural Scientist' ? 2 : 1);
      artifactReward *= mult;
      op.artifacts += artifactReward;
    }
    const rollsStr = rollResult.rolls.join(',');
    const outcome = success ? (critical ? 'Critical Success' : 'Success') : 'Fail';
    const rollerName = roller ? ` (${roller.firstName})` : '';
    const artText = artifact ? ` +${artifactReward} Artifact${artifactReward === 1 ? '' : 's'}` : '';
    const summary = `${event.name}${rollerName}: roll [${rollsStr}] + skill ${skillTotal} (total ${rollResult.sum + skillTotal}) vs DC ${dc} => ${outcome}${artText}`;
    op.summary = summary;
    this.addLog(teamIndex, `Team ${teamIndex + 1} - Op ${op.number} - ${summary}`);

    if (!success && event.escalate) {
      if (event.specialty === 'Social Scientist') {
        this.pendingCombat = true;
        this.combatDifficulty = 1.25;
      } else {
        const combatEvent = baseOperationEvents.find(e => e.type === 'combat');
        this.resolveEvent(teamIndex, combatEvent);
      }
    }

    const injured = team.find(m => m && m.health <= 0);
    if (injured) {
      injured.health = 1;
      this.recallTeam(teamIndex);
      if (typeof addJournalEntry === 'function') {
        addJournalEntry(`Team ${teamIndex + 1} recalled after ${injured.firstName} was injured.`);
      }
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
          this.resolveEvent(idx, this.chooseEvent(idx));
        }

        const loops = Math.floor(op.timer / 600);
        if (loops > 0) {
          for (let i = 0; i < loops; i++) {
            this.finishOperation(idx);
          }
          this.totalOperations += loops;
          op.timer -= loops * 600;
          op.number = this.teamNextOperationNumber[idx];
          this.teamNextOperationNumber[idx] += 1;
          op.summary = operationStartText;
          this.addLog(idx, `=== Operation #${op.number} ===`);
        }
        op.progress = op.timer / 600;
      }
    });

    const minuteFraction = seconds / 60;
    this.teams.forEach((team, idx) => {
      const op = this.operations[idx];
      const rate = op && op.active ? 1 : 5;
      const heal = rate * minuteFraction;
      team.forEach(m => {
        if (m) m.health = Math.min(m.health + heal, m.maxHealth);
      });
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
      const xpGain = successes * (1 + 0.1 * (op.difficulty || 0));
      const currentMax = team.reduce((mx, m) => m && m.xp > mx ? m.xp : mx, 0);
      const newMax = currentMax + xpGain;
      team.forEach(m => {
        if (!m) return;
        let gain = xpGain;
        if (m.xp < currentMax) gain *= 1.5;
        m.xp = Math.min(m.xp + gain, newMax);
      });
    }
    const summary = `Operation ${op.number} Complete: ${successes} success(es), ${art} artifact(s)`;
    op.summary = summary;
    this.addLog(teamIndex, `Team ${teamIndex + 1} - ${summary}`);
    this.teamOperationCounts[teamIndex] += 1;
    op.artifacts = 0;
    op.successes = 0;
    this.addLog(teamIndex, '');
  }

  startOperation(teamIndex, difficulty = 0) {
    const team = this.teams[teamIndex];
    if (!team || team.some(m => !m)) return false;
    const op = this.operations[teamIndex];
    if (!op) return false;
    const diff = Math.max(0, Math.floor(difficulty));
    op.active = true;
    op.progress = 0;
    op.timer = 0;
    op.artifacts = 0;
    op.successes = 0;
    op.number = this.teamNextOperationNumber[teamIndex];
    this.teamNextOperationNumber[teamIndex] += 1;
    op.difficulty = diff;
    op.summary = operationStartText;
    this.addLog(teamIndex, `=== Operation #${op.number} ===`);
    return true;
  }

  recallTeam(teamIndex) {
    const op = this.operations[teamIndex];
    if (op) {
      op.active = false;
      op.progress = 0;
      op.timer = 0;
      op.difficulty = 0;
    }
  }

  recruitMember(teamIndex, slotIndex, member) {
    if (!this.teams[teamIndex] || this.teams[teamIndex][slotIndex]) return null;
    this.teams[teamIndex][slotIndex] = member;
    return member;
  }

  dismissMember(teamIndex, slotIndex) {
    if (this.teams[teamIndex]) {
      this.teams[teamIndex][slotIndex] = null;
    }
  }

  renameMember(teamIndex, slotIndex, name) {
    const m = this.teams[teamIndex] && this.teams[teamIndex][slotIndex];
    if (m) m.name = name;
  }

  setStance(teamIndex, value) {
    if (this.stances[teamIndex]) {
      this.stances[teamIndex].hazardousBiomass = value;
    }
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
        difficulty: op.difficulty,
        artifacts: op.artifacts,
        successes: op.successes,
        summary: op.summary,
        number: op.number
      })),
      teamOperationCounts: this.teamOperationCounts.slice(),
      teamNextOperationNumber: this.teamNextOperationNumber.slice(),
      logs: this.logs.map(l => l.slice()),
      totalOperations: this.totalOperations,
      pendingCombat: this.pendingCombat,
      combatDifficulty: this.combatDifficulty,
      stances: this.stances.map(s => ({ hazardousBiomass: s.hazardousBiomass }))
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
        difficulty: op.difficulty || 0,
        artifacts: op.artifacts || 0,
        successes: op.successes || 0,
        summary: op.summary || '',
        number: op.number || 1
      }));
    }
    if (Array.isArray(data.teamOperationCounts)) {
      this.teamOperationCounts = data.teamOperationCounts.slice();
    }
    if (Array.isArray(data.teamNextOperationNumber)) {
      this.teamNextOperationNumber = data.teamNextOperationNumber.slice();
    }
    if (Array.isArray(data.logs)) {
      this.logs = data.logs.map(l => l.slice(-100));
    }
    if (Array.isArray(data.stances)) {
      this.stances = data.stances.map(s => ({ hazardousBiomass: s.hazardousBiomass || 'Neutral' }));
    }
    this.totalOperations = data.totalOperations || 0;
    this.pendingCombat = data.pendingCombat || false;
    this.combatDifficulty = data.combatDifficulty || 1;
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { WarpGateCommand };
}
