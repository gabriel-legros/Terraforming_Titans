
"""planet_temp_model_v4.py  — auto‑slab version (2025‑04‑16)

Adds an automatic thermal‑inertia (slab heat‑capacity) calculator that
combines soil, ocean, ice, and the atmospheric column.  Override with
`slab_heat_capacity=` if you want manual control.

Public call:
    day_night_temperatures(...)
Returns (T_day, T_night, T_mean) in Kelvin.
Run as a script to see Mercury, Moon, Earth, Mars, Venus, Titan.
"""

from typing import Dict, Tuple, Optional
import math

SIGMA = 5.670374419e-8
SOLAR_CONSTANT = 1361.0

GAMMA = {'h2o': 90.0, 'co2': 10.0, 'ch4': 150.0}
ALPHA = 1.0
BETA = 0.6

DEFAULT_SURFACE_ALBEDO = {
    'ocean': 0.06,
    'ice': 0.65,
    'snow': 0.85,
    'co2_ice': 0.50,
    'hydrocarbon': 0.10,
}

# ────────────────────────────────────────────────────────────────────
#  Automatic slab heat capacity J m⁻² K⁻¹
# ────────────────────────────────────────────────────────────────────
def auto_slab_heat_capacity(
    rotation_period_h: float,
    surface_pressure_bar: float,
    surface_fractions: Optional[Dict[str, float]],
    g: float = 9.81,
    kappa_soil: float = 7e-7,
    rho_c_soil: float = 1.4e6,
) -> float:
    f = surface_fractions or {}
    f_ocean = f.get('ocean', 0.0)
    f_ice   = f.get('ice', 0.0)
    f_other = 1.0 - f_ocean - f_ice

    # soil term
    h_soil = math.sqrt(kappa_soil * rotation_period_h * 3600 / math.pi)
    C_soil = rho_c_soil * h_soil

    # ocean (50 m MLD)
    C_ocean = 4.2e6 * 50.0
    # ice surface layer (0.05 m)
    C_ice = 1.9e6 * 0.05

    # atmosphere column
    cp_air = 850.0
    C_atm = cp_air * (surface_pressure_bar * 1e5) / g

    return f_other * C_soil + f_ocean * C_ocean + f_ice * C_ice + C_atm

# ────────────────────────────────────────────────────────────────────
def stellar_flux(L_solar: float, d_au: float) -> float:
    return SOLAR_CONSTANT * L_solar / d_au ** 2

def effective_temp(albedo: float, flux: float) -> float:
    return ((1 - albedo) * flux / (4 * SIGMA)) ** 0.25

def optical_depth(comp: Dict[str, float], p_bar: float) -> float:
    return sum(GAMMA.get(g.lower(), 0.0) * x ** ALPHA * p_bar ** BETA
               for g, x in comp.items())

def cloud_fraction(p_bar: float) -> float:
    cf = 1.0 - math.exp(-p_bar / 3.0)
    return min(cf, 0.99)

def surface_albedo_mix(
    rock_alb: float,
    fractions: Optional[Dict[str, float]],
    custom_alb: Optional[Dict[str, float]],
) -> float:
    if not fractions:
        return rock_alb
    albs = DEFAULT_SURFACE_ALBEDO.copy()
    if custom_alb:
        albs.update(custom_alb)
    rock_frac = 1.0 - sum(fractions.values())
    if rock_frac < 0:
        raise ValueError('Surface fractions exceed 1.0')
    a = rock_frac * rock_alb
    for k, frac in fractions.items():
        a += frac * albs.get(k, rock_alb)
    return a

def diurnal_amplitude(albedo: float, flux: float, T: float,
                      heat_cap: float, rot_h: float) -> float:
    omega = 2.0 * math.pi / (abs(rot_h) * 3600.0)
    num = (1 - albedo) * flux / 2.0
    den = math.sqrt(heat_cap * omega * 4.0 * SIGMA * T ** 3)
    return num / den

# ────────────────────────────────────────────────────────────────────
def day_night_temperatures(
    *,
    rock_albedo: float,
    distance_au: float,
    rotation_period_h: float,
    surface_pressure_bar: float,
    composition: Optional[Dict[str, float]] = None,
    slab_heat_capacity: Optional[float] = None,
    star_luminosity_solar: float = 1.0,
    surface_fractions: Optional[Dict[str, float]] = None,
    surface_albedos: Optional[Dict[str, float]] = None,
    g_surface: float = 9.81,
) -> Tuple[float, float, float]:
    composition = composition or {}
    if slab_heat_capacity is None:
        slab_heat_capacity = auto_slab_heat_capacity(
            rotation_period_h, surface_pressure_bar, surface_fractions, g_surface
        )

    flux = stellar_flux(star_luminosity_solar, distance_au)
    a_surf = surface_albedo_mix(rock_albedo, surface_fractions, surface_albedos)
    cf = cloud_fraction(surface_pressure_bar)
    a_cloud = 0.55 + 0.20 * math.tanh(surface_pressure_bar / 5.0)
    A = (1 - cf) * a_surf + cf * a_cloud

    T_eff = effective_temp(A, flux)
    tau = optical_depth(composition, surface_pressure_bar)
    T_surf = T_eff * (1 + 0.75 * tau) ** 0.25

    dT = diurnal_amplitude(A, flux, T_surf, slab_heat_capacity, rotation_period_h)
    return T_surf + 0.5 * dT, T_surf - 0.5 * dT, T_surf

# ────────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    demo = {
        "Mercury": dict(rock_albedo=0.10, distance_au=0.387, rotation_period_h=1407.5,
                        surface_pressure_bar=1e-14, composition={}, surface_fractions={},
                        g_surface=3.70),
        "Moon":    dict(rock_albedo=0.12, distance_au=1.0, rotation_period_h=655.7,
                        surface_pressure_bar=1e-14, composition={}, surface_fractions={},
                        g_surface=1.62),
        "Earth":   dict(rock_albedo=0.15, distance_au=1.0, rotation_period_h=24.0,
                        surface_pressure_bar=1.0, composition={'co2':4.2e-4,'h2o':0.01},
                        surface_fractions={'ocean':0.71,'ice':0.07}, g_surface=9.81),
        "Mars":    dict(rock_albedo=0.25, distance_au=1.524, rotation_period_h=24.6,
                        surface_pressure_bar=0.006, composition={'co2':0.96},
                        surface_fractions={'ice':0.15}, g_surface=3.71),
        "Venus":   dict(rock_albedo=0.15, distance_au=0.723, rotation_period_h=5832.5,
                        surface_pressure_bar=92.0, composition={'co2':0.965},
                        surface_fractions={}, g_surface=8.87),
        "Titan":   dict(rock_albedo=0.24, distance_au=9.5, rotation_period_h=382.7,
                        surface_pressure_bar=1.5, composition={'ch4':0.05},
                        surface_fractions={'hydrocarbon':0.02,'ice':0.60},
                        g_surface=1.35),
    }

    print(f"{'Planet':8s}  Day°C Night°C Mean°C")
    print('-'*34)
    for name,p in demo.items():
        Td,Tn,Tm = day_night_temperatures(**p)
        print(f"{name:8s} {Td-273.15:+7.0f} {Tn-273.15:+8.0f} {Tm-273.15:+7.1f}")
