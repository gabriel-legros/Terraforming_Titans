function initializeHopeTabs() {
    document.querySelectorAll('.hope-subtab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.hope-subtab').forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.hope-subtab-content').forEach(c => c.classList.remove('active'));
            tab.classList.add('active');
            const id = tab.dataset.subtab;
            document.getElementById(id).classList.add('active');
            if (id === 'wgc-hope' && typeof markWGCViewed === 'function') {
                markWGCViewed();
            }
        });
    });
}

function activateHopeSubtab(subtabId) {
    activateSubtab('hope-subtab', 'hope-subtab-content', subtabId, true);
    if (subtabId === 'wgc-hope' && typeof markWGCViewed === 'function') {
        markWGCViewed();
    }
}

function initializeHopeUI() {
    initializeHopeTabs();
    if (typeof initializeSkillsUI === 'function') {
        initializeSkillsUI();
    }
    if (typeof initializeSolisUI === 'function') {
        initializeSolisUI();
    }
    if (typeof initializeWGCUI === 'function') {
        initializeWGCUI();
    }
}

function updateHopeAlert() {
    const alertEl = document.getElementById('hope-alert');
    const solisEl = document.getElementById('solis-subtab-alert');
    const wgcEl = document.getElementById('wgc-subtab-alert');
    if (!alertEl && !solisEl && !wgcEl) return;
    const solisAlert = typeof solisManager !== 'undefined' && solisManager && solisManager.currentQuest && solisTabVisible && !(typeof gameSettings !== 'undefined' && gameSettings.silenceSolisAlert);
    const wgcAlert = typeof wgcAlertNeeded !== 'undefined' && wgcAlertNeeded && (typeof wgcTabVisible === 'undefined' || wgcTabVisible);
    if (alertEl) alertEl.style.display = (solisAlert || wgcAlert) ? 'inline' : 'none';
    if (solisEl) solisEl.style.display = solisAlert ? 'inline' : 'none';
    if (wgcEl) wgcEl.style.display = wgcAlert ? 'inline' : 'none';
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
    if (typeof updateWGCVisibility === 'function') {
        updateWGCVisibility();
    }
    if (typeof updateWGCUI === 'function') {
        updateWGCUI();
    }
    updateHopeAlert();
}

