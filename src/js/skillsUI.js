// Skills tree display and interactions
let skillPrereqs = {};
const skillPaths = {};
let skillConnectionsDirty = false;
let skillTreeContainerEl = null;
let skillSVGEl = null;
const skillButtonEls = {};
let skillResizeObserver = null;
let skillRedrawQueued = false;

function queueSkillRedraw() {
    if (skillRedrawQueued) return;
    skillRedrawQueued = true;
    if (typeof requestAnimationFrame === 'function') {
        requestAnimationFrame(() => {
            skillRedrawQueued = false;
            skillConnectionsDirty = true;
            drawSkillConnections();
        });
    } else {
        // Fallback without rAF
        skillRedrawQueued = false;
        skillConnectionsDirty = true;
        drawSkillConnections();
    }
}

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

    // Cache container
    skillTreeContainerEl = container;

    container.innerHTML = ''; // Clear previous content
    for (const key in skillPaths) {
        delete skillPaths[key];
    }

    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.id = 'skill-lines';
    container.appendChild(svg);
    // Cache SVG element
    skillSVGEl = svg;

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
        button.appendChild(descEl);
        button.appendChild(rankEl);
        button.appendChild(costEl);

        button._skillEls = { name: nameEl, desc: descEl, rank: rankEl, cost: costEl };

        button.addEventListener('click', () => purchaseSkill(id));
        container.appendChild(button);
        // Cache button element
        skillButtonEls[id] = button;
        updateSkillButton(skill);
    }

    // Observe container resize to keep lines aligned during zoom/layout changes
    try {
        if (typeof ResizeObserver !== 'undefined') {
            if (skillResizeObserver) {
                skillResizeObserver.disconnect();
            }
            skillResizeObserver = new ResizeObserver(() => queueSkillRedraw());
            skillResizeObserver.observe(container);
        }
    } catch (e) {
        // Ignore if ResizeObserver is not available
    }

    // Also handle window resize (covers browser zoom changes)
    try {
        window.addEventListener('resize', queueSkillRedraw);
    } catch (e) { /* no-op */ }

    queueSkillRedraw();
}

function drawSkillConnections() {
    const svg = skillSVGEl || document.getElementById('skill-lines');
    const container = skillTreeContainerEl || document.getElementById('skill-tree');
    if (!svg || !container || container.nodeType !== 1) return;

    const containerRect = container.getBoundingClientRect();
    if (containerRect.width === 0 || containerRect.height === 0) {
        // Skill tree is not visible; keep dirty flag so it redraws when shown
        skillConnectionsDirty = true;
        return;
    }
    // Ensure the SVG viewport matches the container for crisp alignment
    const w = Math.max(1, Math.round(container.clientWidth));
    const h = Math.max(1, Math.round(container.clientHeight));
    svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
    svg.setAttribute('width', String(w));
    svg.setAttribute('height', String(h));
    const used = new Set();

    for (const id in skillManager.skills) {
        const skill = skillManager.skills[id];
        if (!skill.requires || skill.requires.length === 0) continue;

        const toButton = skillButtonEls[id] || document.getElementById(`skill-${id}`);
        if (!toButton) continue;

        const toRect = toButton.getBoundingClientRect();
        const toX = Math.round(toRect.left - containerRect.left + toRect.width / 2);
        const toY = Math.round(toRect.top - containerRect.top);

        for (const prereqId of skill.requires) {
            const fromButton = skillButtonEls[prereqId] || document.getElementById(`skill-${prereqId}`);
            if (!fromButton) continue;

            const fromRect = fromButton.getBoundingClientRect();
            const fromX = Math.round(fromRect.left - containerRect.left + fromRect.width / 2);
            const fromY = Math.round(fromRect.top - containerRect.top + fromRect.height);

            const key = `${prereqId}-${id}`;
            let path = skillPaths[key];
            if (!path) {
                path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
                path.setAttribute('class', 'skill-connector');
                svg.appendChild(path);
                skillPaths[key] = path;
            }
            const ctrl = 40;
            const d = `M ${fromX},${fromY} C ${fromX},${fromY + ctrl} ${toX},${toY - ctrl} ${toX},${toY}`;
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
