class SandSeeder extends Building {}

try {
  module.exports = { SandSeeder };
} catch (error) {
  window.SandSeeder = SandSeeder;
}
