const followersUICache = {
  host: null,
  placeholder: null
};

function cacheFollowersUIElements() {
  if (!followersUICache.host || !followersUICache.host.isConnected) {
    followersUICache.host = document.getElementById('followers-colonies-content');
  }
}

function initializeFollowersUI() {
  cacheFollowersUIElements();
  if (!followersUICache.host) {
    return;
  }

  if (!followersUICache.placeholder || !followersUICache.placeholder.isConnected) {
    followersUICache.placeholder = document.createElement('div');
    followersUICache.placeholder.id = 'followers-placeholder-text';
    followersUICache.host.appendChild(followersUICache.placeholder);
  }

  updateFollowersUI();
}

function updateFollowersUI() {
  cacheFollowersUIElements();
  if (!followersUICache.host) {
    return;
  }

  if (!followersUICache.placeholder || !followersUICache.placeholder.isConnected) {
    initializeFollowersUI();
    return;
  }

  followersUICache.placeholder.textContent = 'Followers systems online. Additional controls will be added in a future update.';
}
