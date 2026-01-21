class GrapheneFactory extends Building {}

try {
  module.exports = { GrapheneFactory };
} catch (error) {
  window.GrapheneFactory = GrapheneFactory;
}
