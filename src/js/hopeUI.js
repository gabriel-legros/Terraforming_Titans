function initializeHopeTabs() {
    document.querySelectorAll('.hope-subtab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.hope-subtab').forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.hope-subtab-content').forEach(c => c.classList.remove('active'));
            tab.classList.add('active');
            const id = tab.dataset.subtab;
            document.getElementById(id).classList.add('active');
        });
    });
}

function activateHopeSubtab(subtabId) {
    activateSubtab('hope-subtab', 'hope-subtab-content', subtabId, true);
}

function initializeHopeUI() {
    initializeHopeTabs();
    if (typeof initializeSkillsUI === 'function') {
        initializeSkillsUI();
    }
    if (typeof initializeSolisUI === 'function') {
        initializeSolisUI();
    }
}

function updateHopeAlert() {
    const alertEl = document.getElementById('hope-alert');
    if (!alertEl) return;
    if (typeof gameSettings !== 'undefined' && gameSettings.silenceSolisAlert) {
        alertEl.style.display = 'none';
        return;
    }
    if (typeof solisManager !== 'undefined' && solisManager && solisManager.currentQuest && solisTabVisible) {
        alertEl.style.display = 'inline';
    } else {
        alertEl.style.display = 'none';
    }
}

function updateHopeUI() {
    if (typeof updateSkillTreeUI === 'function') {
        updateSkillTreeUI();
    }
    if (typeof updateSolisUI === 'function') {
        updateSolisUI();
    }
    updateHopeAlert();
}

