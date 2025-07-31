let wgcTabVisible = false;
let wgcUIInitialized = false;
const rdItems = {
  wgtEquipment: 'Warpgate Teams Equipment',
  componentsEfficiency: 'Components production efficiency',
  electronicsEfficiency: 'Electronics production efficiency',
  superconductorEfficiency: 'Superconductor production efficiency',
  androidsEfficiency: 'Androids production efficiency'
};
const rdElements = {};
const teamNames = ['Alpha', 'Beta', 'Gamma', 'Delta', 'Epsilon'];
const teamUnlocks = [0, 100, 500, 1000, 5000];
const classImages = {
  'Team Leader': 'assets/images/team_leader.png',
  'Soldier': 'assets/images/soldier.png',
  'Natural Scientist': 'assets/images/natural_scientist.png',
  'Social Scientist': 'assets/images/social_scientist.png'
};
let activeDialog = null;

function showWGCTab() {
  wgcTabVisible = true;
  const tab = document.querySelector('.hope-subtab[data-subtab="wgc-hope"]');
  const content = document.getElementById('wgc-hope');
  if (tab) tab.classList.remove('hidden');
  if (content) content.classList.remove('hidden');
}

function hideWGCTab() {
  wgcTabVisible = false;
  const tab = document.querySelector('.hope-subtab[data-subtab="wgc-hope"]');
  const content = document.getElementById('wgc-hope');
  if (tab) tab.classList.add('hidden');
  if (content) content.classList.add('hidden');
}

function updateWGCVisibility() {
  if (typeof warpGateCommand === 'undefined') return;
  if (warpGateCommand.enabled) {
    if (!wgcTabVisible) showWGCTab();
  } else if (wgcTabVisible) {
    hideWGCTab();
  }
}

function generateWGCTeamCards() {
  return teamNames.map((name, tIdx) => {
    const slots = (typeof warpGateCommand !== 'undefined' && warpGateCommand.teams[tIdx]) ? warpGateCommand.teams[tIdx] : [null, null, null, null];
    const op = (typeof warpGateCommand !== 'undefined' && warpGateCommand.operations[tIdx]) ? warpGateCommand.operations[tIdx] : { active: false, progress: 0, summary: '' };
    const slotMarkup = slots.map((m, sIdx) => {
      if (m) {
        const img = classImages[m.classType] || '';
        const unspentPoints = m.getPointsToAllocate() > 0 ? '<div class="unspent-points-indicator">!</div>' : '';
        const hpPercent = Math.floor((m.health / m.maxHealth) * 100);
        const hpColor = hpPercent < 25 ? 'red' : 'green';
        return `<div class="team-slot filled" data-team="${tIdx}" data-slot="${sIdx}">
          <div class="team-hp-bar"><div class="team-hp-bar-fill" style="height:${hpPercent}%;background-color:${hpColor};"></div></div>
          <div class="team-member-name">${m.firstName}</div>
          <img src="${img}" class="team-icon">
          ${unspentPoints}
        </div>`;
      }
      return `<div class="team-slot" data-team="${tIdx}" data-slot="${sIdx}"><button>+</button></div>`;
    }).join('');
    const unlocked = (typeof warpGateCommand !== 'undefined' && warpGateCommand.totalOperations >= teamUnlocks[tIdx]);
    const lockMarkup = unlocked ? '' :
      `<div class="wgc-team-locked" data-team="${tIdx}">LOCKED<br>${teamUnlocks[tIdx]} Operations</div>`;
    const stanceVal = (typeof warpGateCommand !== 'undefined' && warpGateCommand.stances && warpGateCommand.stances[tIdx]) ? warpGateCommand.stances[tIdx].hazardousBiomass : 'Neutral';
    const artVal = (typeof warpGateCommand !== 'undefined' && warpGateCommand.stances && warpGateCommand.stances[tIdx]) ? warpGateCommand.stances[tIdx].artifact : 'Neutral';
    return `
      <div class="wgc-team-card" data-team="${tIdx}">
        <div class="team-header">Team ${name}</div>
        <div class="wgc-team-body">
          <div class="team-slots">${slotMarkup}</div>
          <div class="team-stances">
            <div class="team-stance">
              <label>Hazardous Biomass Interactions <span class="info-tooltip-icon" title="Negotiation halves combat challenge weight and doubles social science weight. Aggressive does the opposite.">&#9432;</span></label>
              <select class="hbi-select" data-team="${tIdx}">
                <option value="Neutral"${stanceVal === 'Neutral' ? ' selected' : ''}>Neutral</option>
                <option value="Negotiation"${stanceVal === 'Negotiation' ? ' selected' : ''}>Negotiation</option>
                <option value="Aggressive"${stanceVal === 'Aggressive' ? ' selected' : ''}>Aggressive</option>
              </select>
            </div>
            <div class="team-stance">
              <label>Scientific Artifact Retrieval <span class="info-tooltip-icon" title="Careful doubles artifact chance on Natural Science challenges but delays the next event by triple the time.">&#9432;</span></label>
              <select class="artifact-select" data-team="${tIdx}">
                <option value="Neutral"${artVal === 'Neutral' ? ' selected' : ''}>Neutral</option>
                <option value="Careful"${artVal === 'Careful' ? ' selected' : ''}>Careful</option>
              </select>
            </div>
          </div>
          <div class="team-controls">
            <div class="difficulty-container">
              <div class="difficulty-label">
                <span>Difficulty</span>
                <span class="info-tooltip-icon" title="Raises all challenge DCs (team +4 per level, individual +1 per level). Artifact and XP rewards increase by 10% per level. Failed individual checks deal 10 HP per level to the selected member while failed team checks damage all members for 10 HP.">&#9432;</span>
              </div>
              <input type="number" class="difficulty-input" data-team="${tIdx}" value="${op.difficulty || 0}" min="0" />
            </div>
            <button class="start-button" data-team="${tIdx}">Start</button>
            <button class="recall-button" data-team="${tIdx}">Recall</button>
            <button class="log-toggle" data-team="${tIdx}">Log</button>
          </div>
        </div>
        <div class="operation-progress${op.active ? '' : ' hidden'}">
          <div class="operation-progress-bar" style="width: ${op.progress * 100}%"></div>
        </div>
        <div class="operation-summary${op.active ? '' : ' hidden'}">${op.summary || ''}</div>
        <div class="team-log hidden"><pre></pre></div>
        ${lockMarkup}
      </div>`;
  }).join('');
}

function createRDItem(key, label) {
  const div = document.createElement('div');
  div.classList.add('wgc-rd-item');

  const nameSpan = document.createElement('span');
  nameSpan.classList.add('wgc-rd-label');
  nameSpan.textContent = label;
  div.appendChild(nameSpan);

  const multSpan = document.createElement('span');
  multSpan.id = `wgc-${key}-mult`;
  div.appendChild(multSpan);

  const button = document.createElement('button');
  button.id = `wgc-${key}-button`;
  button.textContent = 'Buy';
  button.addEventListener('click', () => {
    warpGateCommand.purchaseUpgrade(key);
    updateWGCUI();
  });
  div.appendChild(button);

  const costSpan = document.createElement('span');
  costSpan.id = `wgc-${key}-cost`;
  div.appendChild(costSpan);

  const countSpan = document.createElement('span');
  countSpan.id = `wgc-${key}-count`;
  div.appendChild(countSpan);

  rdElements[key] = { button, cost: costSpan, count: countSpan, mult: multSpan };
  return div;
}

function createRDHeader() {
  const div = document.createElement('div');
  div.classList.add('wgc-rd-item', 'wgc-rd-header');

  const label = document.createElement('span');
  label.classList.add('wgc-rd-label');
  label.textContent = 'Upgrade';
  div.appendChild(label);

  div.appendChild(document.createElement('span'));

  const spacer = document.createElement('span');
  spacer.style.marginLeft = 'auto';
  div.appendChild(spacer);

  const cost = document.createElement('span');
  cost.textContent = 'Cost (Alien Artifacts)';
  div.appendChild(cost);

  div.appendChild(document.createElement('span'));

  return div;
}

function populateRDMenu() {
  const menu = document.getElementById('wgc-rd-menu');
  if (!menu) return;
  menu.innerHTML = '';
  menu.appendChild(createRDHeader());
  for (const key in rdItems) {
    menu.appendChild(createRDItem(key, rdItems[key]));
  }
}

function closeRecruitDialog() {
  if (activeDialog && activeDialog.parentElement) {
    document.body.removeChild(activeDialog);
    activeDialog = null;
  }
}

function openRecruitDialog(teamIndex, slotIndex, member) {
  closeRecruitDialog();
  const overlay = document.createElement('div');
  overlay.classList.add('wgc-popup-overlay');

  const win = document.createElement('div');
  win.classList.add('wgc-popup-window');

  const title = document.createElement('h2');
  title.textContent = member ? 'Edit Member' : 'Recruit Member';
  win.appendChild(title);

  const firstNameField = document.createElement('input');
  firstNameField.type = 'text';
  firstNameField.placeholder = 'First Name (required)';
  firstNameField.value = member ? member.firstName : '';
  win.appendChild(firstNameField);

  const lastNameField = document.createElement('input');
  lastNameField.type = 'text';
  lastNameField.placeholder = 'Last Name';
  lastNameField.value = member ? member.lastName : '';
  win.appendChild(lastNameField);

  const classSelect = document.createElement('select');
  let availableClasses = ['Team Leader', 'Soldier', 'Natural Scientist', 'Social Scientist'];
  if (slotIndex > 0) {
    availableClasses = availableClasses.filter(c => c !== 'Team Leader');
  }
  availableClasses.forEach(c => {
    const opt = document.createElement('option');
    opt.value = c;
    opt.textContent = c;
    classSelect.appendChild(opt);
  });

  if (member) {
    classSelect.value = member.classType;
    classSelect.disabled = true;
  } else if (slotIndex === 0) {
    classSelect.value = 'Team Leader';
    classSelect.disabled = true;
  }
  win.appendChild(classSelect);

  const lvl = member ? member.level : 1;
  const xp = member ? Math.floor(member.xp || 0) : 0;
  const xpReq = member ? member.getXPForNextLevel() : 10;
  const hp = member ? member.health : 100;
  const hpMax = member ? member.maxHealth : 100;
  const level = document.createElement('div');
  level.textContent = `Level: ${lvl} | XP: ${xp} / ${xpReq} | HP: ${hp} / ${hpMax}`;
  win.appendChild(level);

  const pointsToSpend = member ? member.getPointsToAllocate() : 5;
  const alloc = { power: 0, athletics: 0, wit: 0 };
  const remainingSpan = document.createElement('div');
  remainingSpan.textContent = `Points left: ${pointsToSpend}`;

  const statsDiv = document.createElement('div');
  statsDiv.classList.add('wgc-stats-grid');

  const baseStats = member ? WGCTeamMember.getBaseStats(member.classType) : WGCTeamMember.getBaseStats(classSelect.value);
  const statValues = {
    power: member ? member.power : baseStats.power,
    athletics: member ? member.athletics : baseStats.athletics,
    wit: member ? member.wit : baseStats.wit
  };

  ['power','athletics','wit'].forEach(stat => {
    const statContainer = document.createElement('div');
    statContainer.classList.add('wgc-stat-container');

    const label = document.createElement('span');
    label.textContent = stat.charAt(0).toUpperCase() + stat.slice(1);
    statContainer.appendChild(label);

    const valueSpan = document.createElement('span');
    valueSpan.textContent = statValues[stat];
    statContainer.appendChild(valueSpan);

    const addButton = document.createElement('button');
    addButton.textContent = '+';
    addButton.addEventListener('click', () => {
      const totalAllocated = alloc.power + alloc.athletics + alloc.wit;
      if (totalAllocated < pointsToSpend) {
        alloc[stat]++;
        valueSpan.textContent = statValues[stat] + alloc[stat];
        remainingSpan.textContent = `Points left: ${pointsToSpend - (totalAllocated + 1)}`;
      }
    });
    statContainer.appendChild(addButton);
    statsDiv.appendChild(statContainer);
  });

  classSelect.addEventListener('change', () => {
    const newBaseStats = WGCTeamMember.getBaseStats(classSelect.value);
    statValues.power = newBaseStats.power;
    statValues.athletics = newBaseStats.athletics;
    statValues.wit = newBaseStats.wit;
    const statContainers = statsDiv.querySelectorAll('.wgc-stat-container');
    statContainers.forEach((container, index) => {
      const statName = ['power', 'athletics', 'wit'][index];
      container.querySelector('span:nth-child(2)').textContent = statValues[statName];
    });
  });
  win.appendChild(statsDiv);
  win.appendChild(remainingSpan);

  const buttonContainer = document.createElement('div');
  buttonContainer.classList.add('wgc-dialog-buttons');

  const confirm = document.createElement('button');
  confirm.textContent = 'Confirm';
  confirm.addEventListener('click', () => {
    const firstName = firstNameField.value.trim();
    const lastName = lastNameField.value.trim();
    if (!firstName) return;

    if (member) {
      member.firstName = firstName;
      member.lastName = lastName;
      member.allocatePoints(alloc);
    } else {
      const m = WGCTeamMember.create(firstName, lastName, classSelect.value, alloc);
      warpGateCommand.recruitMember(teamIndex, slotIndex, m);
    }
    closeRecruitDialog();
    redrawWGCTeamCards();
  });
  buttonContainer.appendChild(confirm);

  const cancel = document.createElement('button');
  cancel.textContent = 'Cancel';
  cancel.addEventListener('click', closeRecruitDialog);
  buttonContainer.appendChild(cancel);

  win.appendChild(buttonContainer);

  if (member) {
    const dismiss = document.createElement('button');
    dismiss.textContent = 'Dismiss';
    const opActive = warpGateCommand && warpGateCommand.operations &&
      warpGateCommand.operations[teamIndex] && warpGateCommand.operations[teamIndex].active;
    dismiss.disabled = !!opActive;
    dismiss.addEventListener('click', () => {
      if (dismiss.disabled) return;
      if (dismiss.textContent === 'Dismiss') {
        dismiss.textContent = 'Are You Sure?';
      } else {
        warpGateCommand.dismissMember(teamIndex, slotIndex);
        closeRecruitDialog();
        redrawWGCTeamCards();
      }
    });
    win.appendChild(dismiss);
  }

  overlay.appendChild(win);
  overlay.addEventListener('click', e => { if (e.target === overlay) closeRecruitDialog(); });
  document.body.appendChild(overlay);
  activeDialog = overlay;
}

function generateWGCLayout() {
  return `
    <div class="wgc-container">
      <div class="wgc-main">
        <div id="wgc-rd-section">
          <h3>R&amp;D</h3>
          <div id="wgc-rd-menu"></div>
        </div>
        <div id="wgc-stats-section">
          <h3>Statistics</h3>
          <div id="wgc-stat-operation"></div>
          <div id="wgc-stat-artifact"></div>
        </div>
        <div id="wgc-teams-section">
          <h3>Teams</h3>
          <div id="wgc-team-cards"></div>
        </div>
      </div>
    </div>
  `;
}

function initializeWGCUI() {
  if (wgcUIInitialized) return;
  hideWGCTab();
  const container = document.getElementById('wgc-hope');
  if (container) {
    container.innerHTML = generateWGCLayout();
    const teamContainer = container.querySelector('#wgc-team-cards');
    if (teamContainer) {
      teamContainer.innerHTML = generateWGCTeamCards();
      teamContainer.addEventListener('click', e => {
        if (e.target.classList.contains('start-button')) {
          const t = parseInt(e.target.dataset.team, 10);
          const input = e.target.closest('.wgc-team-card').querySelector('.difficulty-input');
          const diff = input ? Math.floor(Math.max(0, parseInt(input.value, 10) || 0)) : 0;
          warpGateCommand.startOperation(t, diff);
          updateWGCUI();
          return;
        }
        if (e.target.classList.contains('recall-button')) {
          const t = parseInt(e.target.dataset.team, 10);
          warpGateCommand.recallTeam(t);
          updateWGCUI();
          return;
        }
        if (e.target.classList.contains('log-toggle')) {
          const t = parseInt(e.target.dataset.team, 10);
          const card = e.target.closest('.wgc-team-card');
          const log = card.querySelector('.team-log');
          if (log) log.classList.toggle('hidden');
          return;
        }

        const slot = e.target.closest('.team-slot');
        if (!slot) return;

        const t = parseInt(slot.dataset.team, 10);
        const s = parseInt(slot.dataset.slot, 10);
        const member = (typeof warpGateCommand !== 'undefined' && warpGateCommand.teams[t]) ? warpGateCommand.teams[t][s] : null;

        if (member) {
          openRecruitDialog(t, s, member);
        } else if (e.target.tagName === 'BUTTON') {
          openRecruitDialog(t, s, null);
        }
      });
      teamContainer.addEventListener('change', e => {
        if (e.target.classList.contains('hbi-select')) {
          const t = parseInt(e.target.dataset.team, 10);
          warpGateCommand.setStance(t, e.target.value);
          updateWGCUI();
        } else if (e.target.classList.contains('artifact-select')) {
          const t = parseInt(e.target.dataset.team, 10);
          warpGateCommand.setArtifactStance(t, e.target.value);
          updateWGCUI();
        }
      });
    }
    populateRDMenu();
  }
  wgcUIInitialized = true;
  if (typeof warpGateCommand !== 'undefined') {
    updateWGCUI();
  }
}

function updateWGCUI() {
  const opEl = document.getElementById('wgc-stat-operation');
  if (opEl) {
    opEl.textContent = `Operations Completed: ${warpGateCommand.totalOperations}`;
  }
  const artEl = document.getElementById('wgc-stat-artifact');
  if (artEl) {
    artEl.textContent = `Artifacts Collected: ${warpGateCommand.totalArtifacts}`;
  }
  for (const key in rdElements) {
    const el = rdElements[key];
    if (!el) continue;
    if (el.cost) el.cost.textContent = warpGateCommand.getUpgradeCost(key);
    if (el.count) el.count.textContent = warpGateCommand.rdUpgrades[key].purchases;
    if (el.mult && key !== 'wgtEquipment') {
      el.mult.textContent = `x${warpGateCommand.getMultiplier(key).toFixed(2)}`;
    } else if (el.mult) {
      el.mult.textContent = '';
    }
    if (el.button) {
      const art = (typeof resources !== 'undefined' && resources.special && resources.special.alienArtifact) ? resources.special.alienArtifact.value : 0;
      el.button.disabled = warpGateCommand.getUpgradeCost(key) > art ||
        (warpGateCommand.rdUpgrades[key].max && warpGateCommand.rdUpgrades[key].purchases >= warpGateCommand.rdUpgrades[key].max);
    }
  }

  teamNames.forEach((_, tIdx) => {
    const card = document.querySelector(`.wgc-team-card[data-team="${tIdx}"]`);
    if (!card) return;
    const startBtn = card.querySelector('.start-button');
    const recallBtn = card.querySelector('.recall-button');
    const diffInput = card.querySelector('.difficulty-input');
    const stanceSelect = card.querySelector('.hbi-select');
    const artSelect = card.querySelector('.artifact-select');
    const progressContainer = card.querySelector('.operation-progress');
    const progressBar = card.querySelector('.operation-progress-bar');
    const summaryEl = card.querySelector('.operation-summary');
    const lockOverlay = card.querySelector('.wgc-team-locked');
    const team = warpGateCommand.teams[tIdx] || [];
    const full = team.every(m => m);
    const op = warpGateCommand.operations[tIdx];
    const unlocked = warpGateCommand.totalOperations >= teamUnlocks[tIdx];
    if (lockOverlay) {
      if (unlocked) lockOverlay.classList.add('hidden');
      else lockOverlay.classList.remove('hidden');
    }
    if (startBtn) startBtn.disabled = !unlocked || !full || op.active;
    if (recallBtn) recallBtn.disabled = !unlocked || !op.active;
    if (diffInput) {
      diffInput.value = op.difficulty || 0;
      diffInput.disabled = op.active;
    }
    if (stanceSelect) {
      const val = warpGateCommand.stances && warpGateCommand.stances[tIdx] ? warpGateCommand.stances[tIdx].hazardousBiomass : 'Neutral';
      stanceSelect.value = val;
    }
    if (artSelect) {
      const val = warpGateCommand.stances && warpGateCommand.stances[tIdx] ? warpGateCommand.stances[tIdx].artifact : 'Neutral';
      artSelect.value = val;
    }
    if (progressContainer && progressBar) {
      if (op.active) {
        progressContainer.classList.remove('hidden');
        progressBar.style.width = `${Math.floor(op.progress * 100)}%`;
        if (summaryEl) {
          summaryEl.classList.remove('hidden');
          summaryEl.textContent = op.summary || '';
        }
      } else {
        progressContainer.classList.add('hidden');
        progressBar.style.width = '0%';
        if (summaryEl) {
          summaryEl.classList.add('hidden');
          summaryEl.textContent = '';
        }
      }
    }

    team.forEach((member, sIdx) => {
      const slot = card.querySelector(`.team-slot[data-slot="${sIdx}"]`);
      if (!slot || !member) return;
      const bar = slot.querySelector('.team-hp-bar-fill');
      if (bar) {
        const hpPercent = Math.floor((member.health / member.maxHealth) * 100);
        bar.style.height = `${hpPercent}%`;
        bar.style.backgroundColor = hpPercent < 25 ? 'red' : 'green';
      }
    });
  });

  teamNames.forEach((_, tIdx) => {
    const logEl = document.querySelector(`.wgc-team-card[data-team="${tIdx}"] .team-log pre`);
    if (logEl) {
      logEl.textContent = (warpGateCommand.logs[tIdx] || []).join('\n');
    }
  });
}

function redrawWGCTeamCards() {
  const teamContainer = document.getElementById('wgc-team-cards');
  if (teamContainer) {
    teamContainer.innerHTML = generateWGCTeamCards();
  }
  updateWGCUI();
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    hideWGCTab,
    showWGCTab,
    updateWGCVisibility,
    initializeWGCUI,
    updateWGCUI,
    redrawWGCTeamCards,
    populateRDMenu,
    generateWGCTeamCards,
    generateWGCLayout,
  };
}
