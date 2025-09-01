// Subtab functionality to show/hide building categories
function activateBuildingSubtab(subtabId) {
    activateSubtab('building-subtab', 'building-subtab-content', subtabId);
    if (typeof markBuildingSubtabViewed === 'function') {
        markBuildingSubtabViewed(subtabId);
    }
}

function initializeBuildingTabs() {
    // Set the default active subtab for buildings
    activateBuildingSubtab('resource-buildings'); // Make 'resource' tab active by default

    document.querySelectorAll('.buildings-subtabs .building-subtab').forEach(tab => {
        tab.addEventListener('click', () => activateBuildingSubtab(tab.dataset.subtab));
    });
}

let buildingTabAlertNeeded = false;
const buildingSubtabAlerts = {
    'resource-buildings': false,
    'production-buildings': false,
    'energy-buildings': false,
    'storage-buildings': false,
    'terraforming-buildings': false,
};

function registerBuildingUnlockAlert(subtabId) {
    buildingTabAlertNeeded = true;
    buildingSubtabAlerts[subtabId] = true;
    updateBuildingAlert();
    const activeTab = document.getElementById('buildings');
    const activeSubtab = document.querySelector('.building-subtab.active');
    if (
        activeTab &&
        activeTab.classList.contains('active') &&
        activeSubtab &&
        activeSubtab.dataset.subtab === subtabId
    ) {
        markBuildingSubtabViewed(subtabId);
    }
}

function updateBuildingAlert() {
    const alertEl = document.getElementById('buildings-alert');
    if (alertEl) {
        const display = (!gameSettings.silenceUnlockAlert && buildingTabAlertNeeded) ? 'inline' : 'none';
        alertEl.style.display = display;
    }
    for (const key in buildingSubtabAlerts) {
        const el = document.getElementById(`${key}-alert`);
        if (el) {
            const display = (!gameSettings.silenceUnlockAlert && buildingSubtabAlerts[key]) ? 'inline' : 'none';
            el.style.display = display;
        }
    }
}

function markBuildingsViewed() {
    const active = document.querySelector('.building-subtab.active');
    if (active && typeof markBuildingSubtabViewed === 'function') {
        markBuildingSubtabViewed(active.dataset.subtab);
    }
    buildingTabAlertNeeded = false;
    updateBuildingAlert();
}

function markBuildingSubtabViewed(subtabId) {
    buildingSubtabAlerts[subtabId] = false;
    for (const name in buildings) {
        const b = buildings[name];
        if (b.category && `${b.category}-buildings` === subtabId && b.unlocked) {
            b.alertedWhenUnlocked = true;
        }
    }
    if (Object.values(buildingSubtabAlerts).every(v => !v)) {
        buildingTabAlertNeeded = false;
    }
    updateBuildingAlert();
}

function initializeBuildingAlerts() {
    buildingTabAlertNeeded = false;
    for (const k in buildingSubtabAlerts) buildingSubtabAlerts[k] = false;
    for (const name in buildings) {
        const b = buildings[name];
        if (b.unlocked && !b.alertedWhenUnlocked) {
            buildingTabAlertNeeded = true;
            buildingSubtabAlerts[`${b.category}-buildings`] = true;
        }
    }
    updateBuildingAlert();
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { registerBuildingUnlockAlert, updateBuildingAlert, initializeBuildingAlerts, markBuildingSubtabViewed, markBuildingsViewed };
}