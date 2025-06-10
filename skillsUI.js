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
    const locked = !skill.unlocked && !canUnlockSkill(skill.id);
    button.disabled = locked || skill.rank >= skill.maxRank || skillManager.getUpgradeCost(skill.id) > skillManager.skillPoints;
}

function createSkillTree() {
    buildSkillPrereqs();
    const container = document.getElementById('skill-tree');
    if (!container) return;
    container.innerHTML = '';
    container.style.position = 'relative';
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.id = 'skill-lines';
    svg.style.position = 'absolute';
    svg.style.left = '0';
    svg.style.top = '0';
    svg.style.width = '100%';
    svg.style.height = '100%';
    svg.style.pointerEvents = 'none';
    container.appendChild(svg);

    for (const id in skillManager.skills) {
        const skill = skillManager.skills[id];
        const button = document.createElement('button');
        button.id = `skill-${id}`;
        button.classList.add('skill-button');
        const pos = skillLayout[id] || { row: 0, col: 0 };
        button.style.position = 'absolute';
        button.style.left = `${pos.col * 120 + 10}px`;
        button.style.top = `${pos.row * 120 + 10}px`;
        button.addEventListener('click', () => purchaseSkill(id));
        container.appendChild(button);
        updateSkillButton(skill);
    }
    drawSkillConnections();
}

function drawSkillConnections() {
    const svg = document.getElementById('skill-lines');
    if (!svg) return;
    svg.innerHTML = '';
    const cell = 120;
    const margin = 10;
    for (const id in skillManager.skills) {
        const skill = skillManager.skills[id];
        const toPos = skillLayout[id];
        if (!toPos) continue;
        const endX = toPos.col * cell + margin + 100;
        const endY = toPos.row * cell + margin;
        for (const prereq of skill.requires || []) {
            const fromPos = skillLayout[prereq];
            if (!fromPos) continue;
            const startX = fromPos.col * cell + margin + 100;
            const startY = fromPos.row * cell + margin + 100;
            const midY = (startY + endY) / 2;
            const poly = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
            poly.setAttribute('points', `${startX},${startY} ${startX},${midY} ${endX},${midY} ${endX},${endY}`);
            poly.setAttribute('class', 'skill-connector');
            svg.appendChild(poly);
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
    drawSkillConnections();
}

function initializeSkillsUI() {
    updateSkillPointDisplay();
    createSkillTree();
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { formatSkillButtonText, canUnlockSkill };
}
