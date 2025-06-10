function initializeHopeUI() {
    if (typeof initializeSkillsUI === 'function') {
        initializeSkillsUI();
    }
}

function updateHopeUI() {
    if (typeof updateSkillTreeUI === 'function') {
        updateSkillTreeUI();
    }
}

