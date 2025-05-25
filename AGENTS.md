This project is a game about terraforming.

Players start on Mars and will (eventually) be able to terraform other planet.  The game is played from index.html, which generates the UI.  The main game loop runs in game.js

Terraforming.js deals with the weather model.  Base planet parameters can be found in planet-parameters.js.  From there temperature is also calculated in physics.js. 

Each planet is broken up into three zones (see zones.js), which have their own temperatures and surface conditions (mostly ocean/ice).