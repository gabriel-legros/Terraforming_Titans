const GAME_BUILD_TARGET = 'browser';
const STEAM_APP_ID = null;
const GAME_FEATURES = {
    patienceDailyClaimButton: GAME_BUILD_TARGET === 'steam',
    patienceDailyRewardFromExport: GAME_BUILD_TARGET === 'browser',
    whiteNoiseKeepAlive: GAME_BUILD_TARGET === 'browser'
};
