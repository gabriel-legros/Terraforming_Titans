// Skills tree display and interactions
let skillPrereqs = {};
const skillPaths = {};
let skillConnectionsDirty = false;

function buildSkillPrereqs() {
    skillPrereqs = {};
    for (const id in skillManager.skills) {
        const skill = skillManager.skills[id];
        skillPrereqs[id] = Array.isArray(skill.requires) ? skill.requires.slice() : [];
    }
}

function canUnlockSkill(id) {
    const prereqs = skillPrereqs[id];
    if (!prereqs || prereqs.length === 0) return true;
    return prereqs.every(p => skillManager.skills[p] && skillManager.skills[p].unlocked);
}

const skillLayout = {
    build_cost: { row: 0, col: 3 },
    research_boost: { row: 1, col: 2 },
    worker_reduction: { row: 1, col: 4 },
    maintenance_reduction: { row: 3, col: 4 },
    pop_growth: { row: 2, col: 4 },
    android_efficiency: { row: 3, col: 0 },
    ship_efficiency: { row: 3, col: 2 },
    project_speed: { row: 2, col: 2 },
    life_design_points: { row: 3, col: 6 }
};

function updateSkillPointDisplay() {
    const span = document.getElementById('skill-points-value');
    if (span) span.textContent = skillManager.skillPoints;
}

function updateSkillButton(skill) {
    const button = document.getElementById(`skill-${skill.id}`);
    if (!button) return;
    const els = button._skillEls;
    if (!els) return;

    if (els.name.textContent !== skill.name) {
        els.name.textContent = skill.name;
    }
    if (els.desc.textContent !== skill.description) {
        els.desc.textContent = skill.description;
    }

    const rankText = `Rank ${skill.rank}/${skill.maxRank}`;
    if (els.rank.textContent !== rankText) {
        els.rank.textContent = rankText;
    }

    const cost = skillManager.getUpgradeCost(skill.id);
    const costText = skill.rank < skill.maxRank ? `Cost: ${cost}` : 'Max';
    if (els.cost.textContent !== costText) {
        els.cost.textContent = costText;
    }

    const canAfford = skillManager.skillPoints >= cost;
    const isMaxRank = skill.rank >= skill.maxRank;
    const canUnlock = canUnlockSkill(skill.id);

    button.disabled = (!skill.unlocked && !canUnlock) || isMaxRank || !canAfford;

    button.classList.toggle('unlocked', skill.unlocked && !isMaxRank);
    button.classList.toggle('max-rank', isMaxRank);
    button.classList.toggle('can-purchase', canAfford && !isMaxRank && (skill.unlocked || canUnlock));
    button.classList.toggle('locked', !skill.unlocked && !canUnlock);
}

function createSkillTree() {
    buildSkillPrereqs();
    const container = document.getElementById('skill-tree');
    if (!container || container.nodeType !== 1) return;

    container.innerHTML = ''; // Clear previous content
    for (const key in skillPaths) {
        delete skillPaths[key];
    }

    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.id = 'skill-lines';
    container.appendChild(svg);

    for (const id in skillManager.skills) {
        const skill = skillManager.skills[id];
        const pos = skillLayout[id];
        if (!pos) continue;

        const button = document.createElement('button');
        button.id = `skill-${id}`;
        button.classList.add('skill-button');
        button.style.gridRow = pos.row + 1;
        button.style.gridColumn = pos.col + 1;

        const nameEl = document.createElement('strong');
        const descEl = document.createElement('span');
        const rankEl = document.createElement('span');
        const costEl = document.createElement('span');

        button.appendChild(nameEl);
        button.appendChild(document.createElement('br'));
        button.appendChild(descEl);
        button.appendChild(document.createElement('br'));
        button.appendChild(rankEl);
        button.appendChild(document.createElement('br'));
        button.appendChild(costEl);

        button._skillEls = { name: nameEl, desc: descEl, rank: rankEl, cost: costEl };

        button.addEventListener('click', () => purchaseSkill(id));
        container.appendChild(button);
        updateSkillButton(skill);
    }
    skillConnectionsDirty = true;
    if (typeof requestAnimationFrame === 'function') {
        requestAnimationFrame(() => {
            if (skillConnectionsDirty) drawSkillConnections();
        });
    } else {
        drawSkillConnections();
    }
}

function drawSkillConnections() {
    const svg = document.getElementById('skill-lines');
    const container = document.getElementById('skill-tree');
    if (!svg || !container || container.nodeType !== 1) return;

    const containerRect = container.getBoundingClientRect();
    const used = new Set();

    for (const id in skillManager.skills) {
        const skill = skillManager.skills[id];
        if (!skill.requires || skill.requires.length === 0) continue;

        const toButton = document.getElementById(`skill-${id}`);
        if (!toButton) continue;

        const toRect = toButton.getBoundingClientRect();
        const toX = toRect.left - containerRect.left + toRect.width / 2;
        const toY = toRect.top - containerRect.top;

        for (const prereqId of skill.requires) {
            const fromButton = document.getElementById(`skill-${prereqId}`);
            if (!fromButton) continue;

            const fromRect = fromButton.getBoundingClientRect();
            const fromX = fromRect.left - containerRect.left + fromRect.width / 2;
            const fromY = fromRect.top - containerRect.top + fromRect.height;

            const key = `${prereqId}-${id}`;
            let path = skillPaths[key];
            if (!path) {
                path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
                path.setAttribute('class', 'skill-connector');
                svg.appendChild(path);
                skillPaths[key] = path;
            }
            const d = `M ${fromX},${fromY} C ${fromX},${fromY + 40} ${toX},${toY - 40} ${toX},${toY}`;
            path.setAttribute('d', d);

            const prereqSkill = skillManager.skills[prereqId];
            path.classList.toggle('unlocked', prereqSkill && prereqSkill.unlocked);

            used.add(key);
        }
    }

    for (const key in skillPaths) {
        if (!used.has(key)) {
            const path = skillPaths[key];
            if (path && path.parentNode) path.parentNode.removeChild(path);
            delete skillPaths[key];
        }
    }
    skillConnectionsDirty = false;
}

function purchaseSkill(id) {
    const cost = skillManager.getUpgradeCost(id);
    if (skillManager.skillPoints < cost) return;
    const skill = skillManager.skills[id];
    if (!skill.unlocked) {
        if (!canUnlockSkill(id)) return;
        skillManager.unlockSkill(id);
    } else {
        skillManager.upgradeSkill(id);
    }
    skillManager.skillPoints -= cost;
    skillConnectionsDirty = true;
    updateSkillTreeUI();
}

function updateSkillTreeUI() {
    updateSkillPointDisplay();
    for (const id in skillManager.skills) {
        updateSkillButton(skillManager.skills[id]);
    }
    if (skillConnectionsDirty) {
        drawSkillConnections();
    }
}

function initializeSkillsUI() {
    updateSkillPointDisplay();
    createSkillTree();
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { canUnlockSkill };
}
