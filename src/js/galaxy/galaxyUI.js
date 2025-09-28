let galaxyUICache = null;

function cacheGalaxyElements() {
    if (galaxyUICache) {
        return galaxyUICache;
    }
    if (typeof document === 'undefined') {
        return null;
    }
    const container = document.getElementById('space-galaxy');
    if (!container) {
        return null;
    }
    const placeholder = document.createElement('div');
    placeholder.className = 'galaxy-placeholder-message';
    placeholder.textContent = 'The galaxy awaits further updates.';
    container.appendChild(placeholder);
    galaxyUICache = { container, placeholder };
    return galaxyUICache;
}

function initializeGalaxyUI() {
    const cache = galaxyUICache || cacheGalaxyElements();
    if (!cache) {
        return;
    }
    updateGalaxyUI();
}

function updateGalaxyUI() {
    if (!galaxyUICache) {
        if (!cacheGalaxyElements()) {
            return;
        }
    }
    const manager = typeof galaxyManager !== 'undefined' ? galaxyManager : null;
    const enabled = !!(manager && manager.enabled);
    if (galaxyUICache && galaxyUICache.placeholder) {
        galaxyUICache.placeholder.textContent = enabled
            ? 'Enabled but Work in progress.'
            : 'Work in progress.';
    }
}

if (typeof window !== 'undefined') {
    window.initializeGalaxyUI = initializeGalaxyUI;
    window.updateGalaxyUI = updateGalaxyUI;
}
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { initializeGalaxyUI, updateGalaxyUI };
}
