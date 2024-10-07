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
    });
});

function activateBuildingSubtab(subtabId) {
    // Deactivate all subtabs and subtab-content elements
    document.querySelectorAll('.building-subtab').forEach((tab) => tab.classList.remove('active'));
    document.querySelectorAll('.building-subtab-content').forEach((content) => content.classList.remove('active'));

    // Activate the clicked subtab and corresponding content
    document.getElementById(subtabId + '-tab').classList.add('active'); // Activate the subtab by concatenating '-tab'
    document.getElementById(subtabId).classList.add('active'); // Activate the corresponding content
}

function initializeBuildingTabs() {
    // Set the default active subtab for buildings
    activateBuildingSubtab('resource-buildings'); // Make 'production' tab active by default

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
}