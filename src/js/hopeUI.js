if (typeof SubtabManager === 'undefined') {
    if (typeof require === 'function') {
        SubtabManager = require('./subtab-manager.js');
    } else if (typeof window !== 'undefined') {
        SubtabManager = window.SubtabManager;
    }
}
let hopeSubtabManager = null;
let awakeningSubtabAlert = false;

function setAwakeningSubtabAlert(show) {
    const shouldShow = !!show;
    if (awakeningSubtabAlert === shouldShow) return;
    awakeningSubtabAlert = shouldShow;
    updateHopeAlert();
}

function clearAwakeningSubtabAlert() {
    setAwakeningSubtabAlert(false);
}

function initializeHopeTabs() {
    if (typeof SubtabManager !== 'function') return;
    hopeSubtabManager = new SubtabManager('.hope-subtab', '.hope-subtab-content', true);
    hopeSubtabManager.onActivate(id => {
        if (id === 'awakening-hope') {
            clearAwakeningSubtabAlert();
        } else if (id === 'solis-hope' && typeof solisManager !== 'undefined' && typeof solisManager.setSolisTabAlert === 'function') {
            solisManager.setSolisTabAlert(false);
        }
    });
    if (typeof consumePendingAwakeningAlert === 'function' && consumePendingAwakeningAlert()) {
        const awakeningContent = document.getElementById ? document.getElementById('awakening-hope') : null;
        const awakeningActive = !!(awakeningContent && awakeningContent.classList && awakeningContent.classList.contains('active'));
        if (awakeningActive) {
            clearAwakeningSubtabAlert();
        } else {
            setAwakeningSubtabAlert(true);
        }
    }
}

function activateHopeSubtab(subtabId) {
    if (hopeSubtabManager) {
        hopeSubtabManager.activate(subtabId);
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
    const awakeningEl = document.getElementById('awakening-subtab-alert');
    const solisEl = document.getElementById('solis-subtab-alert');
    const wgcEl = document.getElementById('wgc-subtab-alert');
    if (!alertEl && !awakeningEl && !solisEl && !wgcEl) return;
    const awakeningShow = awakeningSubtabAlert;
    if (awakeningEl) awakeningEl.style.display = awakeningShow ? 'inline' : 'none';
    let solisShow = false;
    if (typeof solisManager !== 'undefined' && solisManager && solisTabVisible) {
        if (solisManager.solisTabAlert) {
            solisShow = true;
        } else if (!(typeof gameSettings !== 'undefined' && gameSettings.silenceSolisAlert)) {
            solisShow = !!solisManager.currentQuest;
        }
    }
    const wgcShow = typeof warpGateCommand !== 'undefined' && warpGateCommand && wgcTabVisible && warpGateCommand.facilityCooldown <= 0;
    if (solisEl) solisEl.style.display = solisShow ? 'inline' : 'none';
    if (wgcEl) wgcEl.style.display = wgcShow ? 'inline' : 'none';
    if (alertEl) alertEl.style.display = (awakeningShow || solisShow || wgcShow) ? 'inline' : 'none';
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

