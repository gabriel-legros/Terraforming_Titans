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

function initializeHopeUI() {
    initializeHopeTabs();
    if (typeof initializeSkillsUI === 'function') {
        initializeSkillsUI();
    }
    if (typeof initializeSolisUI === 'function') {
        initializeSolisUI();
    }
}

function updateHopeUI() {
    if (typeof updateSkillTreeUI === 'function') {
        updateSkillTreeUI();
    }
    if (typeof updateSolisUI === 'function') {
        updateSolisUI();
    }
}

