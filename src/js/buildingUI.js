// Subtab functionality to show/hide building categories
if (typeof SubtabManager === 'undefined') {
    if (typeof require === 'function') {
        SubtabManager = require('./subtab-manager.js');
    } else if (typeof window !== 'undefined') {
        SubtabManager = window.SubtabManager;
    }
}
let buildingSubtabManager = null;

function createBuildingCategoryTabs() {
    const categories = typeof getBuildingCategories === 'function' ? getBuildingCategories() : [];
    if (categories.length === 0) return;

    const subtabsContainer = document.querySelector('.buildings-subtabs');
    const contentWrapper = document.querySelector('.building-subtab-content-wrapper');
    
    if (!subtabsContainer || !contentWrapper) return;

    // Clear existing tabs and content
    subtabsContainer.innerHTML = '';
    contentWrapper.innerHTML = '';

    // Create tabs and content for each category
    categories.forEach(category => {
        const categoryId = `${category}-buildings`;
        
        // Create tab button
        const tab = document.createElement('div');
        tab.id = `${categoryId}-tab`;
        tab.className = 'building-subtab';
        tab.dataset.subtab = categoryId;
        tab.innerHTML = `${category.charAt(0).toUpperCase() + category.slice(1)}<span id="${categoryId}-alert" class="unlock-alert">!</span>`;
        subtabsContainer.appendChild(tab);

        // Create content section
        const content = document.createElement('div');
        content.id = categoryId;
        content.className = 'building-subtab-content';
        content.innerHTML = `
            <div class="category-header">
                <h3>${category.charAt(0).toUpperCase() + category.slice(1)} Buildings</h3>
                <div class="unhide-obsolete-container" id="${category}-unhide-container" style="display: none;">
                    <button id="${category}-unhide-button" class="unhide-obsolete-button">Unhide Obsolete Buildings</button>
                </div>
            </div>
            <div class="building-list" id="${categoryId}-buttons"></div>
        `;
        contentWrapper.appendChild(content);
    });
}

function initializeBuildingTabs() {
    createBuildingCategoryTabs();
    if (typeof SubtabManager !== 'function') return;
    buildingSubtabManager = new SubtabManager('.buildings-subtabs .building-subtab', '.building-subtab-content');
    buildingSubtabManager.onActivate(id => {
        if (typeof markBuildingSubtabViewed === 'function') {
            markBuildingSubtabViewed(id);
        }
        updateBuildingDisplay(buildings);
    });
    buildingSubtabManager.activate('resource-buildings');
}

function activateBuildingSubtab(subtabId) {
    if (buildingSubtabManager) {
        buildingSubtabManager.activate(subtabId);
    } else {
        const tab = document.querySelector(`[data-subtab="${subtabId}"]`);
        const content = document.getElementById(subtabId);
        if (tab && content) {
            document.querySelectorAll('.building-subtab').forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.building-subtab-content').forEach(c => c.classList.remove('active'));
            tab.classList.add('active');
            content.classList.add('active');
        }
        markBuildingSubtabViewed(subtabId);
    }
    updateBuildingDisplay(buildings);
}

let buildingTabAlertNeeded = false;
let buildingSubtabAlerts = {};

function initializeBuildingSubtabAlerts() {
    const categories = typeof getBuildingCategories === 'function' ? getBuildingCategories() : [];
    buildingSubtabAlerts = {};
    categories.forEach(category => {
        buildingSubtabAlerts[`${category}-buildings`] = false;
    });
}

function registerBuildingUnlockAlert(subtabId) {
    buildingTabAlertNeeded = true;
    buildingSubtabAlerts[subtabId] = true;
    updateBuildingAlert();
    const activeTab = document.getElementById('buildings');
    const activeId = buildingSubtabManager
        ? buildingSubtabManager.activeId
        : (document.querySelector('.building-subtab.active') || {}).dataset?.subtab;
    if (
        activeTab &&
        activeTab.classList.contains('active') &&
        activeId === subtabId
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
    const active = buildingSubtabManager
        ? buildingSubtabManager.activeId
        : (document.querySelector('.building-subtab.active') || {}).dataset?.subtab;
    if (active && typeof markBuildingSubtabViewed === 'function') {
        markBuildingSubtabViewed(active);
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
    initializeBuildingSubtabAlerts();
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
    module.exports = {
        registerBuildingUnlockAlert,
        updateBuildingAlert,
        initializeBuildingAlerts,
        markBuildingSubtabViewed,
        markBuildingsViewed,
        initializeBuildingTabs,
        activateBuildingSubtab,
        buildingSubtabManager: () => buildingSubtabManager
    };
} else {
    window.registerBuildingUnlockAlert = registerBuildingUnlockAlert;
    window.updateBuildingAlert = updateBuildingAlert;
    window.initializeBuildingAlerts = initializeBuildingAlerts;
    window.markBuildingSubtabViewed = markBuildingSubtabViewed;
    window.markBuildingsViewed = markBuildingsViewed;
    window.initializeBuildingTabs = initializeBuildingTabs;
    window.activateBuildingSubtab = activateBuildingSubtab;
    window.buildingSubtabManager = () => buildingSubtabManager;
}
