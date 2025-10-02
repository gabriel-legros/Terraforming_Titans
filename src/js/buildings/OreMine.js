class OreMine extends Building {
  build(buildCount = 1, activate = true) {
    const built = super.build(buildCount, activate);
    if (built) {
      projectManager?.projects?.deeperMining?.registerMine?.();
    }
    return built;
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { OreMine };
} else {
  globalThis.OreMine = OreMine;
}
