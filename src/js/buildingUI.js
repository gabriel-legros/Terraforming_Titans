// Subtab functionality to show/hide building categories
document.querySelectorAll('.buildings-subtabs .building-subtab').forEach(tab => {
    tab.addEventListener('click', function () {
        // Remove the 'active' class from all subtabs
        document.querySelectorAll('.buildings-subtabs .building-subtab').forEach(t => t.classList.remove('active'));

        // Add the 'active' class to the clicked subtab
        this.classList.add('active');

        // Get the corresponding content element ID from the data attribute
        const category = this.dataset.subtab;

        // Hide all subtab contents
        document.querySelectorAll('.building-subtab-content-wrapper .building-subtab-content').forEach(content => {
            content.classList.remove('active');
        });

        // Show the content of the selected subtab
        document.getElementById(category).classList.add('active');
        if (typeof markBuildingSubtabViewed === 'function') {
            markBuildingSubtabViewed(category);
        }
    });
});

function activateBuildingSubtab(subtabId) {
    // Deactivate all subtabs and subtab-content elements
    document.querySelectorAll('.building-subtab').forEach((tab) => tab.classList.remove('active'));
    document.querySelectorAll('.building-subtab-content').forEach((content) => content.classList.remove('active'));

    // Activate the clicked subtab and corresponding content
    document.getElementById(subtabId + '-tab').classList.add('active'); // Activate the subtab by concatenating '-tab'
    document.getElementById(subtabId).classList.add('active'); // Activate the corresponding content
    if (typeof markBuildingSubtabViewed === 'function') {
        markBuildingSubtabViewed(subtabId);
    }
}

function initializeBuildingTabs() {
    // Set the default active subtab for buildings
    activateBuildingSubtab('resource-buildings'); // Make 'resource' tab active by default

    document.getElementById('resource-buildings-tab').addEventListener('click', () => {
        activateBuildingSubtab('resource-buildings');
    });
    // Add event listeners to each subtab for switching
    document.getElementById('storage-buildings-tab').addEventListener('click', () => {
        activateBuildingSubtab('storage-buildings');
    });
    document.getElementById('production-buildings-tab').addEventListener('click', () => {
        activateBuildingSubtab('production-buildings');
    });
    document.getElementById('energy-buildings-tab').addEventListener('click', () => {
        activateBuildingSubtab('energy-buildings');
    });
    document.getElementById('terraforming-buildings-tab').addEventListener('click', () => {
        activateBuildingSubtab('terraforming-buildings');
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