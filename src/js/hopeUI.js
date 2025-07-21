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
    const subtabEl = document.getElementById('solis-subtab-alert');
    if (!alertEl && !subtabEl) return;
    if (typeof gameSettings !== 'undefined' && gameSettings.silenceSolisAlert) {
        if (alertEl) alertEl.style.display = 'none';
        if (subtabEl) subtabEl.style.display = 'none';
        return;
    }
    if (typeof solisManager !== 'undefined' && solisManager && solisManager.currentQuest && solisTabVisible) {
        if (alertEl) alertEl.style.display = 'inline';
        if (subtabEl) subtabEl.style.display = 'inline';
    } else {
        if (alertEl) alertEl.style.display = 'none';
        if (subtabEl) subtabEl.style.display = 'none';
    }
}

function updateHopeUI() {
    if (typeof updateSolisVisibility === 'function') {
        updateSolisVisibility();
    }
    if (typeof updateSkillTreeUI === 'function') {
        updateSkillTreeUI();
    }
    if (typeof updateSolisUI === 'function') {
        updateSolisUI();
    }
    updateHopeAlert();
}

