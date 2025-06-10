function initializeHopeUI() {
    updateSkillPointDisplay();
    createSkillTree();
}

function updateSkillPointDisplay() {
    const span = document.getElementById('skill-points-value');
    if (span) span.textContent = skillManager.skillPoints;
}

function formatSkillButtonText(skill) {
    let text = `${skill.name} (Rank ${skill.rank}/${skill.maxRank})`;
    if (skill.effect) {
        const value = skill.effect.perRank ? skill.effect.baseValue * skill.rank : skill.effect.baseValue;
        text += ` - Current: ${value}`;
    }
    if (skill.rank < skill.maxRank) {
        text += ` - Cost: ${skillManager.getUpgradeCost(skill.id)}`;
    } else {
        text += ' - Max';
    }
    return text;
}

function updateSkillButton(skill) {
    const button = document.getElementById(`skill-${skill.id}`);
    if (!button) return;
    button.textContent = formatSkillButtonText(skill);
    button.disabled = skill.rank >= skill.maxRank || skillManager.getUpgradeCost(skill.id) > skillManager.skillPoints;
}

function createSkillTree() {
    const container = document.getElementById('skill-tree');
    if (!container) return;
    container.innerHTML = '';
    for (const id in skillManager.skills) {
        const skill = skillManager.skills[id];
        const button = document.createElement('button');
        button.id = `skill-${id}`;
        button.classList.add('skill-button');
        button.addEventListener('click', () => purchaseSkill(id));
        container.appendChild(button);
        updateSkillButton(skill);
    }
}

function purchaseSkill(id) {
    const cost = skillManager.getUpgradeCost(id);
    if (skillManager.skillPoints < cost) return;
    const skill = skillManager.skills[id];
    if (!skill.unlocked) {
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
}

function updateHopeUI() {
    updateSkillTreeUI();
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { formatSkillButtonText };
}
