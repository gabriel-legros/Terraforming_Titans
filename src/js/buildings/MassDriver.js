class MassDriver extends Building {}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { MassDriver };
} else {
  globalThis.MassDriver = MassDriver;
}
