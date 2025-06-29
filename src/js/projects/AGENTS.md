# Instructions
This folder contains classes for repeatable projects. Any new module here should export an ES6 class and follow the existing naming convention of PascalCase filenames. Add unit tests in `tests` for any new functionality.

# Project overview
- **CargoRocketProject** – lets the player launch chemical rockets carrying a custom payload of resources to or from Titan.
- **SpaceExportBaseProject** – shared logic for any project that uses spaceships to export or jettison resources. Provides UI elements for selecting a resource and optional "wait for capacity" behaviour.
- **SpaceExportProject** – inherits from SpaceExportBaseProject and represents exporting goods to earn funding.
- **SpaceDisposalProject** – also extends SpaceExportBaseProject but dumps unwanted materials into space.
- **SpaceMiningProject** – sends ships to mine asteroids for metal, water, carbon or other resources.
- **HyperionLanternProject** – manages the enormous Hyperion Lantern which beams light and warms the planet. Additional investments increase its power.
- **SpaceMirrorFacilityProject** – displays the effect of space mirrors in orbit, updating mirror count and power output.
