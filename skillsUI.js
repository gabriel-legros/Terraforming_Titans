// Skills tree display and interactions
let skillPrereqs = {};

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
    worker_reduction: { row: 1, col: 2 },
    research_boost: { row: 1, col: 4 },
    maintenance_reduction: { row: 2, col: 2 },
    pop_growth: { row: 2, col: 4 },
    scanning_speed: { row: 3, col: 0 },
    ship_efficiency: { row: 3, col: 2 },
    project_speed: { row: 3, col: 4 },
    life_design_points: { row: 3, col: 6 }
};

function updateSkillPointDisplay() {
    const span = document.getElementById('skill-points-value');
    if (span) span.textContent = skillManager.skillPoints;
}

function formatSkillButtonText(skill) {
    let text = `<strong>${skill.name}</strong><br>${skill.description}<br>`;
    text += `Rank ${skill.rank}/${skill.maxRank}`;
    if (skill.rank < skill.maxRank) {
        text += `<br>Cost: ${skillManager.getUpgradeCost(skill.id)}`;
    } else {
        text += '<br>Max';
    }
    return text;
}

function updateSkillButton(skill) {
    const button = document.getElementById(`skill-${skill.id}`);
    if (!button) return;

    button.innerHTML = formatSkillButtonText(skill);

    const cost = skillManager.getUpgradeCost(skill.id);
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

        button.addEventListener('click', () => purchaseSkill(id));
        container.appendChild(button);
        updateSkillButton(skill);
    }

    // Defer drawing connections to ensure buttons are in the DOM and have dimensions
    if (typeof requestAnimationFrame === 'function') {
        requestAnimationFrame(drawSkillConnections);
    } else {
        drawSkillConnections();
    }
}

function drawSkillConnections() {
    const svg = document.getElementById('skill-lines');
    const container = document.getElementById('skill-tree');
    if (!svg || !container || container.nodeType !== 1) return;

    svg.innerHTML = ''; // Clear existing lines

    const containerRect = container.getBoundingClientRect();

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

            const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            const d = `M ${fromX},${fromY} C ${fromX},${fromY + 40} ${toX},${toY - 40} ${toX},${toY}`;
            path.setAttribute('d', d);
            path.setAttribute('class', 'skill-connector');
            
            const prereqSkill = skillManager.skills[prereqId];
            if (prereqSkill && prereqSkill.unlocked) {
                path.classList.add('unlocked');
            }
            
            svg.appendChild(path);
        }
    }
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
    updateSkillTreeUI();
}

function updateSkillTreeUI() {
    updateSkillPointDisplay();
    for (const id in skillManager.skills) {
        updateSkillButton(skillManager.skills[id]);
    }
    if (typeof requestAnimationFrame === 'function') {
        requestAnimationFrame(drawSkillConnections);
    } else {
        drawSkillConnections();
    }
}

function initializeSkillsUI() {
    updateSkillPointDisplay();
    createSkillTree();
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { formatSkillButtonText, canUnlockSkill };
}
