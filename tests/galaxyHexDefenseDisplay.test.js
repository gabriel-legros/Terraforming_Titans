const { JSDOM } = require('jsdom');

describe('Galaxy map defense display', () => {
    let initializeGalaxyUI;
    let updateGalaxyUI;
    let GalaxyManager;
    let dom;

    beforeEach(() => {
        jest.resetModules();

        dom = new JSDOM('<!DOCTYPE html><div id="space-galaxy"></div>', { runScripts: 'outside-only' });
        global.window = dom.window;
        global.document = dom.window.document;
        global.navigator = dom.window.navigator;
        global.HTMLElement = dom.window.HTMLElement;
        global.Node = dom.window.Node;

        const EffectableEntity = require('../src/js/effectable-entity.js');
        global.EffectableEntity = EffectableEntity;
        ({ GalaxyManager } = require('../src/js/galaxy/galaxy'));
        ({ initializeGalaxyUI, updateGalaxyUI } = require('../src/js/galaxy/galaxyUI'));

        global.spaceManager = {
            getTerraformedPlanetCount: () => 3,
            getWorldCountPerSector: (label) => (label === 'Core' ? 3 : 0)
        };

        global.resources = {
            colony: {
                advancedResearch: {
                    value: 500000,
                    decrease() {}
                }
            },
            special: {
                antimatter: {
                    value: 1000,
                    decrease() {}
                },
                alienArtifact: {
                    value: 50,
                    decrease() {}
                }
            }
        };

        global.solisManager = {
            solisPoints: 500
        };

        global.skillManager = {
            skillPoints: 5
        };

        const manager = new GalaxyManager();
        manager.initialize();
        manager.enabled = true;

        const coreSector = manager.getSector(0, 0);
        coreSector.setControl('uhf', 100);
        const uhfFaction = manager.getFaction('uhf');
        uhfFaction.setFleetPower(900);
        uhfFaction.markControlDirty();

        global.galaxyManager = manager;

        initializeGalaxyUI();
        updateGalaxyUI();
    });

    afterEach(() => {
        delete global.galaxyManager;
        delete global.spaceManager;
        delete global.resources;
        delete global.solisManager;
        delete global.skillManager;
        delete global.EffectableEntity;
        delete global.window;
        delete global.document;
        delete global.navigator;
        delete global.HTMLElement;
        delete global.Node;
        if (dom) {
            dom.window.close();
            dom = null;
        }
    });

    it('renders a defense badge above the sector label on the map', () => {
        const coreHex = document.querySelector('.galaxy-hex[data-q="0"][data-r="0"]');
        expect(coreHex).not.toBeNull();
        const defenseNode = coreHex.querySelector('.galaxy-hex__defense');
        expect(defenseNode).not.toBeNull();
        const manager = global.galaxyManager;
        const faction = manager.getFaction('uhf');
        const sector = manager.getSector(0, 0);
        const defenseValue = faction.getSectorDefense(sector, manager);
        const rounded = Math.round(defenseValue);
        const formatter = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 });
        const renderedText = defenseNode.textContent;
        if (rounded > 0) {
            const expected = `\u{1F6E1}\u{FE0F} ${formatter.format(rounded)}`;
            expect(renderedText).toBe(expected);
        } else {
            expect(renderedText).toBe('');
        }
        const labelNode = coreHex.querySelector('.galaxy-hex__label');
        expect(labelNode.textContent).toBe('Core');
    });
});
