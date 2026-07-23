# Custom Classes Example

This example demonstrates the complete additive-content path:

- `scripts/custom-classes.js` defines and registers a custom `Building` subclass and a custom `Project` subclass.
- `patches/buildings.json` and `patches/projects.json` add parameter entries that select those registered types.
- `patches/language.json` localizes their player-facing names and descriptions.
- `styles/custom-classes.css` styles both cards and references the declared SVG under `assets/`.
- The custom project saves and loads its own completion counter.

Copy this folder into `local-mods` or the Electron user-data `mods/local` directory, then enable **Custom Classes Example** in Launch Control.
