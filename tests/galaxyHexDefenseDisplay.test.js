const { JSDOM } = require('jsdom');
const { loadGalaxyConstants } = require('./helpers/loadGalaxyConstants');

const UHF_ICON = '\u{1F6E1}\u{FE0F}';
const ALIEN_ICON = '\u2620\uFE0F';

describe('Galaxy map defense display', () => {
    let initializeGalaxyUI;
    let updateGalaxyUI;
    let GalaxyManager;
    let dom;
    let coreSector;
    let borderSector;
    let alienFaction;
    let coreAssignment;
    let borderAssignment;

    beforeEach(() => {
        jest.resetModules();

        loadGalaxyConstants();

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

        coreSector = manager.getSector(0, 0);
        coreSector.setValue(120);
        coreSector.setControl('uhf', 60);
        coreSector.setControl('cewinsii', 40);

        borderSector = manager.getSector(1, 0);
        borderSector.setValue(120);
        borderSector.setControl('cewinsii', 100);

        const uhfFaction = manager.getFaction('uhf');
        uhfFaction.getSectorDefense = jest.fn(() => 450);
        uhfFaction.resetControlCache?.();
        uhfFaction.markControlDirty?.();

        borderAssignment = 300;
        coreAssignment = 200;
        alienFaction = manager.getFaction('cewinsii');
        alienFaction.getBorderFleetAssignment = jest.fn((key) => {
            if (key === borderSector.key) {
                return borderAssignment;
            }
            if (key === coreSector.key) {
                return coreAssignment;
            }
            return 0;
        });
        alienFaction.resetControlCache?.();
        alienFaction.markControlDirty?.();

        jest.spyOn(manager, 'hasUhfNeighboringStronghold').mockImplementation((q, r) => {
            return q === 1 && r === 0;
        });

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
        const coreEntries = defenseNode.querySelectorAll('.galaxy-hex__defense-entry');
        expect(coreEntries.length).toBe(2);

        const uhfEntry = coreEntries[0];
        const uhfIcon = uhfEntry.querySelector('.galaxy-hex__defense-icon').textContent;
        const uhfValue = uhfEntry.querySelector('.galaxy-hex__defense-text').textContent;
        expect(uhfIcon).toBe(UHF_ICON);
        expect(uhfValue).toBe('450');

        const contestedEntry = coreEntries[1];
        const contestedIcon = contestedEntry.querySelector('.galaxy-hex__defense-icon').textContent;
        const contestedValue = contestedEntry.querySelector('.galaxy-hex__defense-text').textContent;
        expect(contestedIcon).toBe(ALIEN_ICON);
        const formatDefense = (value) => new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(Math.round(value));
        const expectedContestedValue = formatDefense(coreSector.getValue() + coreAssignment);
        expect(contestedValue).toBe(expectedContestedValue);

        const labelNode = coreHex.querySelector('.galaxy-hex__label');
        expect(labelNode.textContent).toBe('Core');

        const borderHex = document.querySelector('.galaxy-hex[data-q="1"][data-r="0"]');
        expect(borderHex).not.toBeNull();
        const borderDefense = borderHex.querySelector('.galaxy-hex__defense');
        expect(borderDefense).not.toBeNull();
        const borderEntries = borderDefense.querySelectorAll('.galaxy-hex__defense-entry');
        expect(borderEntries.length).toBe(1);
        const alienEntry = borderEntries[0];
        const alienIcon = alienEntry.querySelector('.galaxy-hex__defense-icon').textContent;
        const alienValue = alienEntry.querySelector('.galaxy-hex__defense-text').textContent;
        expect(alienIcon).toBe(ALIEN_ICON);
        const expectedBorderValue = formatDefense(borderSector.getValue() + borderAssignment);
        expect(alienValue).toBe(expectedBorderValue);
    });
});
