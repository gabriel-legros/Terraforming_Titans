#Instructions


#Overview of code
This repository hosts a browser‑based incremental game written in JavaScript.

The entry point **index.html** loads many scripts and stylesheets to build the
interface.  Gameplay logic runs in **game.js** using the Phaser framework.  At
startup the game creates resources, buildings, colonies, projects and research
items from parameter files.

Planet definitions and default resources live in **planet-parameters.js**.
Weather and surface modelling are implemented in **terraforming.js** with helper
calculations from **physics.js**, **hydrology.js**, **water-cycle.js** and
**dry-ice-cycle.js**.

Economy and colony management rely on **resource.js**, **building.js** and
**colony.js** plus corresponding UI modules.  Story progression is configured in
**progress-data.js** and handled by **StoryManager** within **progress.js**.
The **SpaceManager** (space.js) tracks which planet is active and its
terraforming status.

Each planet is divided into tropical, temperate and polar zones via **zones.js**
which maintain their own temperature and surface conditions.  Various CSS and UI
scripts implement the tabs, pop-ups and other interface elements.

Tests covering helper utilities and physics functions reside in the `__tests__`
directory and run under Jest.

#Testing
Run tests with npm test
