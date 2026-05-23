/*
 * shellworldGravityHelper.js
 *
 * Helper for self-gravitating shellworld radius calculations.
 *
 * Problem solved:
 *   Find R such that surface gravity is targetGravity when the enclosed mass is
 *   the core mass plus the mass of the shell being built at R.
 *
 * It mirrors the shellworld parameters/scaling laws in artificial.js:
 *   - Earth surface area based land hectares.
 *   - SHELL_COST_CALIBRATION.landHa = 50,000,000,000.
 *   - SHELL_COST_CALIBRATION.superalloys = 25,000,000,000,000.
 *   - superalloys scale as radiusEarth^3.
 *   - metal scales as 20x superalloys.
 *   - layered shells use the same cubic law for the first layer, and can use
 *     EXTRA_LAYER_SHELL_MASS_RADIUS_EXPONENT for additional layers.
 *
 * Default assumption: game material units are metric tons, so materialUnitToKg
 * defaults to 1000. If your resource units are already kg, pass
 * { materialUnitToKg: 1 }.
 *
 * Works in browser and CommonJS/Node:
 *   const helper = require('./shellworldGravityHelper.js');
 *   const result = helper.solveShellRadiusForSurfaceGravity({ coreMassSolar: 4.3e6 });
 */
(function attachShellworldGravityHelper(root, factory) {
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = factory();
    } else {
        root.ShellworldGravityHelper = factory();
    }
})(typeof globalThis !== 'undefined' ? globalThis : this, function buildShellworldGravityHelper() {
    'use strict';

    const EXTRA_LAYER_SHELL_MASS_RADIUS_EXPONENT = 2.7;

    const DEFAULTS = Object.freeze({
        earthRadiusKm: 6371,
        earthMassKg: 5.9722e24,
        solarMassKg: 1.98847e30,
        gravitationalConstant: 6.67430e-11,
        standardGravityMps2: 9.80665,
        materialUnitToKg: 1000,
        shellMaterialMassScale: 1,
        metalToSuperalloyRatio: 20,
        includeMetalInShellMass: true,
        includeSuperalloysInShellMass: true,
        shellMassRadiusExponent: 3,
        extraLayerShellMassRadiusExponent: EXTRA_LAYER_SHELL_MASS_RADIUS_EXPONENT,
        solverIterations: 160,
        radiusToleranceEarth: 1e-9,
        gravityToleranceMps2: 1e-9,
        maxSearchRadiusEarth: 1e12
    });

    const SHELL_COST_CALIBRATION = Object.freeze({
        landHa: 50_000_000_000,
        superalloys: 25_000_000_000_000
    });

    function isFiniteNumber(value) {
        return typeof value === 'number' && Number.isFinite(value);
    }

    function readNumber(options, key, fallback) {
        return isFiniteNumber(options && options[key]) ? options[key] : fallback;
    }

    function mergedOptions(input, options) {
        const inputOptions = input && typeof input === 'object' && !Array.isArray(input) ? input : {};
        return Object.assign({}, inputOptions, options || {});
    }

    function getConstants(options) {
        return {
            earthRadiusKm: readNumber(options, 'earthRadiusKm', DEFAULTS.earthRadiusKm),
            earthMassKg: readNumber(options, 'earthMassKg', DEFAULTS.earthMassKg),
            solarMassKg: readNumber(options, 'solarMassKg', DEFAULTS.solarMassKg),
            gravitationalConstant: readNumber(options, 'gravitationalConstant', DEFAULTS.gravitationalConstant),
            standardGravityMps2: readNumber(options, 'standardGravityMps2', DEFAULTS.standardGravityMps2)
        };
    }

    function readPositiveNumber(options, key, fallback) {
        const value = readNumber(options, key, fallback);
        return value > 0 ? value : fallback;
    }

    function getShellMassRadiusExponent(options) {
        return readPositiveNumber(options || {}, 'shellMassRadiusExponent', DEFAULTS.shellMassRadiusExponent);
    }

    function convertMassToKg(value, unit, options) {
        if (!isFiniteNumber(value)) return NaN;
        const constants = getConstants(options || {});
        const normalized = String(unit || 'kg').toLowerCase();
        if (normalized === 'kg' || normalized === 'kilogram' || normalized === 'kilograms') return value;
        if (normalized === 'earth' || normalized === 'earthmass' || normalized === 'earthmasses' || normalized === 'mearth') {
            return value * constants.earthMassKg;
        }
        if (normalized === 'solar' || normalized === 'solarmass' || normalized === 'solarmasses' || normalized === 'msun' || normalized === 'msolar') {
            return value * constants.solarMassKg;
        }
        if (normalized === 'ton' || normalized === 'tons' || normalized === 'tonne' || normalized === 'tonnes' || normalized === 'metricton' || normalized === 'metrictons') {
            return value * 1000;
        }
        throw new Error(`Unknown mass unit: ${unit}`);
    }

    function readMassLikeKg(source, options, keyPrefix) {
        if (!source || typeof source !== 'object') return NaN;
        const prefix = keyPrefix || '';
        const cap = prefix ? prefix.charAt(0).toUpperCase() + prefix.slice(1) : '';
        const candidates = [
            [`${prefix}MassKg`, 'kg'],
            [`${prefix}Kg`, 'kg'],
            [`${prefix}MassEarth`, 'earth'],
            [`${prefix}EarthMass`, 'earth'],
            [`${prefix}MassSolar`, 'solar'],
            [`${prefix}SolarMass`, 'solar'],
            [`${cap}MassKg`, 'kg'],
            [`${cap}Kg`, 'kg'],
            [`${cap}MassEarth`, 'earth'],
            [`${cap}EarthMass`, 'earth'],
            [`${cap}MassSolar`, 'solar'],
            [`${cap}SolarMass`, 'solar']
        ];
        for (const candidate of candidates) {
            const key = candidate[0];
            const unit = candidate[1];
            if (isFiniteNumber(source[key])) return convertMassToKg(source[key], unit, options);
        }
        return NaN;
    }

    function normalizeMassInput(input, options) {
        const opts = options || {};
        if (isFiniteNumber(input)) {
            return convertMassToKg(input, opts.massUnit || 'kg', opts);
        }

        const inputObject = input && typeof input === 'object' && !Array.isArray(input) ? input : null;
        const sources = inputObject ? [inputObject, opts] : [opts];
        for (const source of sources) {
            const enclosedMassKg = readMassLikeKg(source, opts, 'enclosed');
            if (Number.isFinite(enclosedMassKg)) return enclosedMassKg;
            const coreMassKg = readMassLikeKg(source, opts, 'core');
            if (Number.isFinite(coreMassKg)) return coreMassKg;
            const plainMassKg = readMassLikeKg(source, opts, '');
            if (Number.isFinite(plainMassKg)) return plainMassKg;
            if (isFiniteNumber(source.mass)) return convertMassToKg(source.mass, source.massUnit || opts.massUnit || 'kg', opts);
            if (isFiniteNumber(source.coreMass)) return convertMassToKg(source.coreMass, source.coreMassUnit || source.massUnit || opts.massUnit || 'kg', opts);
            if (isFiniteNumber(source.enclosedMass)) return convertMassToKg(source.enclosedMass, source.enclosedMassUnit || source.massUnit || opts.massUnit || 'kg', opts);
        }
        throw new Error('Missing core/enclosed mass. Provide coreMassKg, coreMassEarth, coreMassSolar, enclosedMassKg, enclosedMassEarth, or enclosedMassSolar.');
    }

    function normalizeAdditionalEnclosedMassKg(options) {
        const opts = options || {};
        let total = 0;

        const addValue = (value, unit) => {
            if (isFiniteNumber(value)) total += convertMassToKg(value, unit || 'kg', opts);
        };

        addValue(opts.additionalEnclosedMassKg, 'kg');
        addValue(opts.extraEnclosedMassKg, 'kg');
        addValue(opts.existingLayerMassKg, 'kg');
        addValue(opts.existingLayersMassKg, 'kg');
        addValue(opts.additionalEnclosedMassEarth, 'earth');
        addValue(opts.extraEnclosedMassEarth, 'earth');
        addValue(opts.existingLayerMassEarth, 'earth');
        addValue(opts.existingLayersMassEarth, 'earth');
        addValue(opts.additionalEnclosedMassSolar, 'solar');
        addValue(opts.extraEnclosedMassSolar, 'solar');
        addValue(opts.existingLayerMassSolar, 'solar');
        addValue(opts.existingLayersMassSolar, 'solar');

        const layerLists = [opts.existingLayers, opts.layers, opts.existingLayerMassesKg, opts.existingLayerMasses];
        for (const list of layerLists) {
            if (!Array.isArray(list)) continue;
            for (const entry of list) {
                if (isFiniteNumber(entry)) {
                    total += convertMassToKg(entry, 'kg', opts);
                } else if (entry && typeof entry === 'object') {
                    if (isFiniteNumber(entry.shellMassKg)) {
                        total += entry.shellMassKg;
                    } else if (isFiniteNumber(entry.massKg)) {
                        total += entry.massKg;
                    } else if (isFiniteNumber(entry.massEarth)) {
                        total += convertMassToKg(entry.massEarth, 'earth', opts);
                    } else if (isFiniteNumber(entry.massSolar)) {
                        total += convertMassToKg(entry.massSolar, 'solar', opts);
                    }
                }
            }
        }

        return total;
    }

    function calculateEarthAreaHectares(options) {
        const constants = getConstants(options || {});
        const radiusMeters = constants.earthRadiusKm * 1000;
        return Math.round((4 * Math.PI * radiusMeters * radiusMeters) / 10_000);
    }

    function calculateShellCostBasis(options) {
        const opts = options || {};
        const calibration = opts.shellCostCalibration || SHELL_COST_CALIBRATION;
        const earthAreaHa = calculateEarthAreaHectares(opts);
        const radiusAtCalibrationEarth = Math.sqrt(calibration.landHa / earthAreaHa);
        const superalloysPerEarthRadiusCubed = calibration.superalloys / Math.pow(radiusAtCalibrationEarth, 3);
        const metalToSuperalloyRatio = readNumber(opts, 'metalToSuperalloyRatio', DEFAULTS.metalToSuperalloyRatio);
        const metalPerEarthRadiusCubed = superalloysPerEarthRadiusCubed * metalToSuperalloyRatio;
        const includeSuperalloys = opts.includeSuperalloysInShellMass !== false;
        const includeMetal = opts.includeMetalInShellMass !== false;
        const includedMaterialUnitsPerEarthRadiusCubed =
            (includeSuperalloys ? superalloysPerEarthRadiusCubed : 0) +
            (includeMetal ? metalPerEarthRadiusCubed : 0);
        const materialUnitToKg = readNumber(opts, 'materialUnitToKg', DEFAULTS.materialUnitToKg);
        const shellMaterialMassScale = readNumber(opts, 'shellMaterialMassScale', DEFAULTS.shellMaterialMassScale);

        return {
            earthAreaHa,
            radiusAtCalibrationEarth,
            superalloysPerEarthRadiusCubed,
            metalPerEarthRadiusCubed,
            totalMaterialUnitsPerEarthRadiusCubed: superalloysPerEarthRadiusCubed + metalPerEarthRadiusCubed,
            includedMaterialUnitsPerEarthRadiusCubed,
            materialUnitToKg,
            shellMaterialMassScale,
            shellMassCoefficientKgPerEarthRadiusCubed: includedMaterialUnitsPerEarthRadiusCubed * materialUnitToKg * shellMaterialMassScale
        };
    }

    function calculateShellCost(radiusEarth, options) {
        const radius = Math.max(Number(radiusEarth) || 0, 0);
        const basis = calculateShellCostBasis(options || {});
        const factor = Math.pow(radius, 3);
        const superalloys = basis.superalloysPerEarthRadiusCubed * factor;
        const metal = basis.metalPerEarthRadiusCubed * factor;
        return {
            superalloys,
            metal,
            totalMaterialUnits: superalloys + metal
        };
    }

    function calculateShellLayerMassKg(radiusEarth, options) {
        const radius = Math.max(Number(radiusEarth) || 0, 0);
        const basis = calculateShellCostBasis(options || {});
        return basis.shellMassCoefficientKgPerEarthRadiusCubed * Math.pow(radius, getShellMassRadiusExponent(options || {}));
    }

    function radiusEarthForMassAndGravity(massKg, targetGravityMps2, constants) {
        if (massKg <= 0 || targetGravityMps2 <= 0) return 0;
        const radiusMeters = Math.sqrt((constants.gravitationalConstant * massKg) / targetGravityMps2);
        return radiusMeters / (constants.earthRadiusKm * 1000);
    }

    function calculateCoreOnlyRadiusEarth(coreMass, options) {
        const opts = options || {};
        const constants = getConstants(opts);
        const massKg = normalizeMassInput(coreMass, opts) + normalizeAdditionalEnclosedMassKg(opts);
        const targetGravityMps2 = readNumber(opts, 'targetGravityMps2', constants.standardGravityMps2);
        return radiusEarthForMassAndGravity(massKg, targetGravityMps2, constants);
    }

    function calculateCoreMassForCoreOnlyRadius(radiusEarth, options) {
        const opts = options || {};
        const constants = getConstants(opts);
        const targetGravityMps2 = readNumber(opts, 'targetGravityMps2', constants.standardGravityMps2);
        const radiusMeters = Math.max(Number(radiusEarth) || 0, 0) * constants.earthRadiusKm * 1000;
        return (targetGravityMps2 * radiusMeters * radiusMeters) / constants.gravitationalConstant;
    }

    function calculateSurfaceGravity(radiusEarth, enclosedMass, options) {
        const opts = options || {};
        const constants = getConstants(opts);
        const radius = Math.max(Number(radiusEarth) || 0, 0);
        if (radius <= 0) return Infinity;
        const enclosedMassKg = normalizeMassInput(enclosedMass, opts) + normalizeAdditionalEnclosedMassKg(opts);
        const shellMassKg = opts.includeNewShellMass === false ? 0 : calculateShellLayerMassKg(radius, opts);
        const radiusMeters = radius * constants.earthRadiusKm * 1000;
        return (constants.gravitationalConstant * (enclosedMassKg + shellMassKg)) / (radiusMeters * radiusMeters);
    }

    function bisectRoot(f, low, high, options) {
        const opts = options || {};
        let lo = low;
        let hi = high;
        let fLo = f(lo);
        let fHi = f(hi);
        const iterations = Math.max(8, Math.floor(readNumber(opts, 'solverIterations', DEFAULTS.solverIterations)));
        const radiusToleranceEarth = readNumber(opts, 'radiusToleranceEarth', DEFAULTS.radiusToleranceEarth);
        const gravityToleranceMps2 = readNumber(opts, 'gravityToleranceMps2', DEFAULTS.gravityToleranceMps2);

        if (!Number.isFinite(fLo) || !Number.isFinite(fHi)) return null;
        if (Math.abs(fLo) <= gravityToleranceMps2) return lo;
        if (Math.abs(fHi) <= gravityToleranceMps2) return hi;
        if ((fLo > 0 && fHi > 0) || (fLo < 0 && fHi < 0)) return null;

        for (let i = 0; i < iterations; i += 1) {
            const mid = (lo + hi) / 2;
            const fMid = f(mid);
            if (!Number.isFinite(fMid)) return null;
            if (Math.abs(fMid) <= gravityToleranceMps2 || Math.abs(hi - lo) <= radiusToleranceEarth) {
                return mid;
            }
            if ((fLo > 0 && fMid > 0) || (fLo < 0 && fMid < 0)) {
                lo = mid;
                fLo = fMid;
            } else {
                hi = mid;
                fHi = fMid;
            }
        }
        return (lo + hi) / 2;
    }

    function solveShellRadiusForSurfaceGravity(input, options) {
        const opts = mergedOptions(input, options);
        const constants = getConstants(opts);
        const targetGravityMps2 = readNumber(opts, 'targetGravityMps2', constants.standardGravityMps2);
        const enclosedMassKg = normalizeMassInput(input, opts) + normalizeAdditionalEnclosedMassKg(opts);
        const includeNewShellMass = opts.includeNewShellMass !== false;
        const basis = calculateShellCostBasis(opts);
        const shellMassRadiusExponent = getShellMassRadiusExponent(opts);
        const shellMassCoefficientKgPerEarthRadiusCubed = includeNewShellMass
            ? basis.shellMassCoefficientKgPerEarthRadiusCubed
            : 0;
        const earthRadiusMeters = constants.earthRadiusKm * 1000;
        const minRadiusEarth = Math.max(readNumber(opts, 'minRadiusEarth', 0), 0);
        const maxRadiusEarth = isFiniteNumber(opts.maxRadiusEarth) ? Math.max(opts.maxRadiusEarth, minRadiusEarth) : Infinity;
        const maxSearchRadiusEarth = Math.max(
            readNumber(opts, 'maxSearchRadiusEarth', DEFAULTS.maxSearchRadiusEarth),
            minRadiusEarth,
            Number.isFinite(maxRadiusEarth) ? maxRadiusEarth : 0
        );
        const gravityToleranceMps2 = readNumber(opts, 'gravityToleranceMps2', DEFAULTS.gravityToleranceMps2);
        const preferRoot = String(opts.preferRoot || 'smallest').toLowerCase();
        const warnings = [];

        const gravityAt = (radiusEarth) => {
            const radiusMeters = radiusEarth * earthRadiusMeters;
            const shellMassKg = shellMassCoefficientKgPerEarthRadiusCubed * Math.pow(radiusEarth, shellMassRadiusExponent);
            return (constants.gravitationalConstant * (enclosedMassKg + shellMassKg)) / (radiusMeters * radiusMeters);
        };
        const delta = (radiusEarth) => gravityAt(radiusEarth) - targetGravityMps2;
        const coreOnlyRadiusEarth = radiusEarthForMassAndGravity(enclosedMassKg, targetGravityMps2, constants);
        const roots = [];

        const addRoot = (radiusEarth, branch) => {
            if (!Number.isFinite(radiusEarth)) return;
            if (radiusEarth < minRadiusEarth - 1e-7) return;
            if (radiusEarth > maxRadiusEarth + 1e-7) return;
            const alreadyPresent = roots.some((root) => Math.abs(root.radiusEarth - radiusEarth) <= Math.max(1e-7, radiusEarth * 1e-12));
            if (!alreadyPresent) roots.push({ radiusEarth, branch });
        };

        let minimumGravityRadiusEarth = null;
        let minimumGravityMps2 = null;

        if (targetGravityMps2 <= 0) {
            return {
                ok: false,
                radiusEarth: null,
                error: 'targetGravityMps2 must be greater than 0.',
                warnings,
                diagnostics: { targetGravityMps2, enclosedMassKg }
            };
        }

        if (enclosedMassKg < 0) {
            return {
                ok: false,
                radiusEarth: null,
                error: 'Core/enclosed mass must not be negative.',
                warnings,
                diagnostics: { targetGravityMps2, enclosedMassKg }
            };
        }

        if (shellMassCoefficientKgPerEarthRadiusCubed <= 0) {
            const root = coreOnlyRadiusEarth;
            if (root >= minRadiusEarth && root <= maxRadiusEarth) {
                addRoot(root, 'core-only');
            }
        } else if (shellMassRadiusExponent <= 2) {
            const startRadiusEarth = Math.max(minRadiusEarth, 1e-12);
            const fStart = delta(startRadiusEarth);
            if (Math.abs(fStart) <= gravityToleranceMps2) {
                addRoot(startRadiusEarth, 'inner');
            } else if (fStart > 0 && startRadiusEarth <= maxRadiusEarth) {
                let high = Math.max(startRadiusEarth * 2, coreOnlyRadiusEarth, 1);
                let cappedByMax = false;
                if (high > maxRadiusEarth) {
                    high = maxRadiusEarth;
                    cappedByMax = true;
                }
                if (high > maxSearchRadiusEarth) {
                    high = maxSearchRadiusEarth;
                    cappedByMax = true;
                }

                let fHigh = delta(high);
                while (Number.isFinite(fHigh) && fHigh > 0 && !cappedByMax) {
                    const nextHigh = high * 2;
                    if (nextHigh >= maxRadiusEarth || nextHigh >= maxSearchRadiusEarth) {
                        high = Math.min(nextHigh, maxRadiusEarth, maxSearchRadiusEarth);
                        cappedByMax = true;
                    } else {
                        high = nextHigh;
                    }
                    fHigh = delta(high);
                }

                if (Number.isFinite(fHigh) && fHigh <= 0) {
                    addRoot(bisectRoot(delta, startRadiusEarth, high, opts), 'inner');
                }
            }
        } else {
            // g(R) = G * (M + K * x^p) / (Re^2 * x^2), where x is radius in Earth radii.
            // With K > 0 and p > 2, g has a minimum at x = (2M / (K(p - 2)))^(1/p).
            // There can be two 1g roots: inner/root-of-interest and outer/shell-mass-dominated.
            minimumGravityRadiusEarth = enclosedMassKg > 0
                ? Math.pow((2 * enclosedMassKg) / (shellMassCoefficientKgPerEarthRadiusCubed * (shellMassRadiusExponent - 2)), 1 / shellMassRadiusExponent)
                : 0;
            minimumGravityMps2 = minimumGravityRadiusEarth > 0 ? gravityAt(minimumGravityRadiusEarth) : 0;

            const epsilonRadiusEarth = 1e-12;
            const startRadiusEarth = Math.max(minRadiusEarth, epsilonRadiusEarth);
            const innerEndEarth = Math.min(minimumGravityRadiusEarth || 0, maxRadiusEarth);

            if (minimumGravityRadiusEarth > startRadiusEarth && innerEndEarth >= startRadiusEarth) {
                const fStart = delta(startRadiusEarth);
                const fEnd = delta(innerEndEarth);
                if (Math.abs(fStart) <= gravityToleranceMps2) {
                    addRoot(startRadiusEarth, 'inner');
                } else if (Math.abs(fEnd) <= gravityToleranceMps2) {
                    addRoot(innerEndEarth, 'tangent');
                } else if (fStart > 0 && fEnd < 0) {
                    const root = bisectRoot(delta, startRadiusEarth, innerEndEarth, opts);
                    addRoot(root, 'inner');
                }
            }

            const outerStartEarth = Math.max(startRadiusEarth, minimumGravityRadiusEarth || startRadiusEarth);
            if (outerStartEarth <= maxRadiusEarth) {
                const fStart = delta(outerStartEarth);
                if (Math.abs(fStart) <= gravityToleranceMps2) {
                    addRoot(outerStartEarth, minimumGravityRadiusEarth === outerStartEarth ? 'tangent' : 'outer');
                } else if (fStart < 0) {
                    let high = Math.max(outerStartEarth * 2, 1);
                    let cappedByMax = false;
                    if (high > maxRadiusEarth) {
                        high = maxRadiusEarth;
                        cappedByMax = true;
                    }
                    if (high > maxSearchRadiusEarth) {
                        high = maxSearchRadiusEarth;
                        cappedByMax = true;
                    }

                    let fHigh = delta(high);
                    while (Number.isFinite(fHigh) && fHigh < 0 && !cappedByMax) {
                        const nextHigh = high * 2;
                        if (nextHigh >= maxRadiusEarth || nextHigh >= maxSearchRadiusEarth) {
                            high = Math.min(nextHigh, maxRadiusEarth, maxSearchRadiusEarth);
                            cappedByMax = true;
                        } else {
                            high = nextHigh;
                        }
                        fHigh = delta(high);
                    }

                    if (Number.isFinite(fHigh) && fHigh >= 0) {
                        const root = bisectRoot(delta, outerStartEarth, high, opts);
                        addRoot(root, 'outer');
                    }
                }
            }
        }

        roots.sort((left, right) => left.radiusEarth - right.radiusEarth);

        let selected = null;
        if (preferRoot === 'inner') {
            selected = roots.find((root) => root.branch === 'inner' || root.branch === 'core-only' || root.branch === 'tangent') || null;
        } else if (preferRoot === 'outer' || preferRoot === 'largest') {
            selected = roots.length ? roots[roots.length - 1] : null;
        } else {
            selected = roots.length ? roots[0] : null;
        }

        const diagnostics = {
            targetGravityMps2,
            enclosedMassKg,
            coreOnlyRadiusEarth,
            earthAreaHa: basis.earthAreaHa,
            radiusAtCalibrationEarth: basis.radiusAtCalibrationEarth,
            superalloysPerEarthRadiusCubed: basis.superalloysPerEarthRadiusCubed,
            metalPerEarthRadiusCubed: basis.metalPerEarthRadiusCubed,
            totalMaterialUnitsPerEarthRadiusCubed: basis.totalMaterialUnitsPerEarthRadiusCubed,
            shellMassCoefficientKgPerEarthRadiusCubed,
            shellMassRadiusExponent,
            minimumGravityRadiusEarth,
            minimumGravityMps2,
            positiveRootsEarth: roots.map((root) => ({ radiusEarth: root.radiusEarth, branch: root.branch }))
        };

        if (!selected) {
            let error = 'No radius satisfying the target gravity was found with the supplied bounds.';
            if (Number.isFinite(minimumGravityMps2) && minimumGravityMps2 > targetGravityMps2) {
                error = 'No physical radius found: the minimum possible gravity is above the target gravity for this enclosed mass and shell mass law.';
            }
            return {
                ok: false,
                radiusEarth: null,
                error,
                warnings,
                diagnostics
            };
        }

        const radiusEarth = selected.radiusEarth;
        const radiusKm = radiusEarth * constants.earthRadiusKm;
        const radiusMeters = radiusKm * 1000;
        const cost = calculateShellCost(radiusEarth, opts);
        const shellMassKg = includeNewShellMass ? calculateShellLayerMassKg(radiusEarth, opts) : 0;
        const totalMassKg = enclosedMassKg + shellMassKg;
        const surfaceGravityMps2 = gravityAt(radiusEarth);
        const gravityFromEnclosedMassMps2 = (constants.gravitationalConstant * enclosedMassKg) / (radiusMeters * radiusMeters);
        const gravityFromShellMassMps2 = (constants.gravitationalConstant * shellMassKg) / (radiusMeters * radiusMeters);
        const shellMassFractionOfEnclosed = enclosedMassKg > 0 ? shellMassKg / enclosedMassKg : Infinity;
        const shellMassFractionOfTotal = totalMassKg > 0 ? shellMassKg / totalMassKg : 0;
        const radiusIncreaseOverCoreOnly = coreOnlyRadiusEarth > 0 ? (radiusEarth / coreOnlyRadiusEarth) - 1 : Infinity;

        if (shellMassFractionOfEnclosed > 0.01) {
            warnings.push('Shell mass is more than 1% of the enclosed mass; self-gravity correction is significant.');
        }
        if (selected.branch === 'outer') {
            warnings.push('Selected the outer shell-mass-dominated root. For normal shellworld construction, the inner/smallest root is usually the intended solution.');
        }
        if (radiusEarth < minRadiusEarth || radiusEarth > maxRadiusEarth) {
            warnings.push('Selected radius is outside the requested bounds.');
        }

        return {
            ok: true,
            radiusEarth,
            radiusKm,
            radiusMeters,
            targetGravityMps2,
            surfaceGravityMps2,
            gravityFromEnclosedMassMps2,
            gravityFromShellMassMps2,
            enclosedMassKg,
            shellMassKg,
            totalMassKg,
            enclosedMassEarth: enclosedMassKg / constants.earthMassKg,
            shellMassEarth: shellMassKg / constants.earthMassKg,
            totalMassEarth: totalMassKg / constants.earthMassKg,
            enclosedMassSolar: enclosedMassKg / constants.solarMassKg,
            shellMassSolar: shellMassKg / constants.solarMassKg,
            totalMassSolar: totalMassKg / constants.solarMassKg,
            shellMassFractionOfEnclosed,
            shellMassFractionOfTotal,
            radiusIncreaseOverCoreOnly,
            cost,
            root: selected,
            warnings,
            diagnostics
        };
    }

    function solveFromCoreOnlyRadius(coreOnlyRadiusEarth, options) {
        const opts = options || {};
        const coreMassKg = calculateCoreMassForCoreOnlyRadius(coreOnlyRadiusEarth, opts);
        return solveShellRadiusForSurfaceGravity({ enclosedMassKg: coreMassKg }, opts);
    }

    function stripMassAccumulationOptions(options) {
        const copy = Object.assign({}, options || {});
        const keys = [
            'mass', 'massKg', 'massEarth', 'massSolar', 'massUnit',
            'coreMass', 'coreMassKg', 'coreMassEarth', 'coreMassSolar', 'coreMassUnit',
            'enclosedMass', 'enclosedMassKg', 'enclosedMassEarth', 'enclosedMassSolar', 'enclosedMassUnit',
            'additionalEnclosedMassKg', 'extraEnclosedMassKg', 'existingLayerMassKg', 'existingLayersMassKg',
            'additionalEnclosedMassEarth', 'extraEnclosedMassEarth', 'existingLayerMassEarth', 'existingLayersMassEarth',
            'additionalEnclosedMassSolar', 'extraEnclosedMassSolar', 'existingLayerMassSolar', 'existingLayersMassSolar',
            'existingLayers', 'existingLayerMassesKg', 'existingLayerMasses'
        ];
        for (const key of keys) delete copy[key];
        if (Array.isArray(copy.layers)) delete copy.layers;
        return copy;
    }

    function buildShellLayers(input, options) {
        const opts = mergedOptions(input, options);
        const layerCount = Math.max(0, Math.floor(readNumber(opts, 'layerCount', readNumber(opts, 'layersToBuild', 1))));
        const layerGapEarth = Math.max(readNumber(opts, 'layerGapEarth', 0), 0);
        const startingRadiusEarth = Math.max(readNumber(opts, 'startingRadiusEarth', 0), 0);
        const baseMinRadiusEarth = Math.max(readNumber(opts, 'minRadiusEarth', 0), 0);
        const coreMassKg = normalizeMassInput(input, opts) + normalizeAdditionalEnclosedMassKg(opts);

        let enclosedMassKg = coreMassKg;
        let previousRadiusEarth = startingRadiusEarth;
        const layers = [];

        for (let i = 0; i < layerCount; i += 1) {
            const layerMinRadiusEarth = Math.max(baseMinRadiusEarth, previousRadiusEarth + layerGapEarth);
            const layerOptions = Object.assign(stripMassAccumulationOptions(opts), { minRadiusEarth: layerMinRadiusEarth });
            if (i > 0) {
                layerOptions.shellMassRadiusExponent = readPositiveNumber(
                    opts,
                    'extraLayerShellMassRadiusExponent',
                    DEFAULTS.extraLayerShellMassRadiusExponent
                );
            }
            const layerResult = solveShellRadiusForSurfaceGravity({ enclosedMassKg }, layerOptions);

            if (!layerResult.ok) {
                return {
                    ok: false,
                    error: `Unable to solve layer ${i + 1}: ${layerResult.error}`,
                    failedLayer: i + 1,
                    layers,
                    enclosedMassKg,
                    diagnostics: layerResult.diagnostics,
                    warnings: layerResult.warnings || []
                };
            }

            const layer = Object.assign({}, layerResult, {
                layerIndex: i + 1,
                enclosedMassBeforeLayerKg: enclosedMassKg,
                enclosedMassAfterLayerKg: enclosedMassKg + layerResult.shellMassKg
            });
            layers.push(layer);
            enclosedMassKg += layerResult.shellMassKg;
            previousRadiusEarth = layerResult.radiusEarth;
        }

        const constants = getConstants(opts);
        return {
            ok: true,
            coreMassKg,
            coreMassEarth: coreMassKg / constants.earthMassKg,
            coreMassSolar: coreMassKg / constants.solarMassKg,
            finalEnclosedMassKg: enclosedMassKg,
            finalEnclosedMassEarth: enclosedMassKg / constants.earthMassKg,
            finalEnclosedMassSolar: enclosedMassKg / constants.solarMassKg,
            layerCount,
            layers
        };
    }

    return Object.freeze({
        DEFAULTS,
        SHELL_COST_CALIBRATION,
        EXTRA_LAYER_SHELL_MASS_RADIUS_EXPONENT,
        convertMassToKg,
        normalizeMassInput,
        calculateEarthAreaHectares,
        calculateShellCostBasis,
        calculateShellCost,
        calculateShellLayerMassKg,
        calculateCoreOnlyRadiusEarth,
        calculateCoreMassForCoreOnlyRadius,
        calculateSurfaceGravity,
        solveShellRadiusForSurfaceGravity,
        solveFromCoreOnlyRadius,
        buildShellLayers
    });
});
