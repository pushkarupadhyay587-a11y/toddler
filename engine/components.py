"""
TODDLER - Component Models
Scientifically accurate electronic component definitions with real-world parameters.
"""

COMPONENT_CATALOG = {
    # ═══════════════════════════════════════════════════════════════
    # PASSIVE COMPONENTS
    # ═══════════════════════════════════════════════════════════════
    "passive": {
        "label": "Passive",
        "components": {
            "resistor": {
                "name": "Resistor",
                "symbol": "resistor",
                "pins": [
                    {"id": "1", "label": "1", "x": -40, "y": 0},
                    {"id": "2", "label": "2", "x": 40, "y": 0}
                ],
                "params": {
                    "resistance": {"label": "Resistance", "unit": "Ω", "default": 1000, "min": 0.001, "max": 1e12, "type": "float"},
                    "tolerance": {"label": "Tolerance", "unit": "%", "default": 5, "options": [0.1, 0.25, 0.5, 1, 2, 5, 10, 20], "type": "select"},
                    "power_rating": {"label": "Power Rating", "unit": "W", "default": 0.25, "min": 0.01, "max": 1000, "type": "float"},
                    "temp_coefficient": {"label": "Temp Coefficient", "unit": "ppm/°C", "default": 100, "min": 1, "max": 5000, "type": "float"},
                    "operating_temp": {"label": "Operating Temp", "unit": "°C", "default": 25, "min": -55, "max": 200, "type": "float"}
                },
                "simulation_model": "linear",
                "equations": "V = I * R"
            },
            "capacitor": {
                "name": "Capacitor",
                "symbol": "capacitor",
                "pins": [
                    {"id": "1", "label": "+", "x": -40, "y": 0},
                    {"id": "2", "label": "-", "x": 40, "y": 0}
                ],
                "params": {
                    "capacitance": {"label": "Capacitance", "unit": "F", "default": 1e-6, "min": 1e-15, "max": 1, "type": "float"},
                    "voltage_rating": {"label": "Voltage Rating", "unit": "V", "default": 50, "min": 1, "max": 10000, "type": "float"},
                    "esr": {"label": "ESR", "unit": "Ω", "default": 0.01, "min": 0, "max": 100, "type": "float"},
                    "leakage_current": {"label": "Leakage Current", "unit": "A", "default": 1e-9, "min": 0, "max": 1, "type": "float"},
                    "dielectric_type": {"label": "Dielectric Type", "unit": "", "default": "Ceramic", "options": ["Ceramic", "Film", "Electrolytic", "Tantalum", "Mica", "MLCC"], "type": "select"}
                },
                "simulation_model": "linear",
                "equations": "I = C * dV/dt; Z = 1/(jωC)"
            },
            "inductor": {
                "name": "Inductor",
                "symbol": "inductor",
                "pins": [
                    {"id": "1", "label": "1", "x": -40, "y": 0},
                    {"id": "2", "label": "2", "x": 40, "y": 0}
                ],
                "params": {
                    "inductance": {"label": "Inductance", "unit": "H", "default": 1e-3, "min": 1e-12, "max": 100, "type": "float"},
                    "dcr": {"label": "DCR", "unit": "Ω", "default": 0.1, "min": 0, "max": 1000, "type": "float"},
                    "saturation_current": {"label": "Saturation Current", "unit": "A", "default": 1, "min": 0.001, "max": 1000, "type": "float"},
                    "q_factor": {"label": "Q Factor", "unit": "", "default": 50, "min": 1, "max": 10000, "type": "float"},
                    "srf": {"label": "Self-Resonant Freq", "unit": "Hz", "default": 10e6, "min": 100, "max": 100e9, "type": "float"}
                },
                "simulation_model": "linear",
                "equations": "V = L * dI/dt; Z = jωL"
            },
            "potentiometer": {
                "name": "Potentiometer",
                "symbol": "potentiometer",
                "pins": [
                    {"id": "1", "label": "1", "x": -40, "y": 0},
                    {"id": "2", "label": "2", "x": 40, "y": 0},
                    {"id": "W", "label": "Wiper", "x": 0, "y": -25}
                ],
                "params": {
                    "resistance": {"label": "Total Resistance", "unit": "Ω", "default": 10000, "min": 1, "max": 10e6, "type": "float"},
                    "wiper_position": {"label": "Wiper Position", "unit": "%", "default": 50, "min": 0, "max": 100, "type": "float"},
                    "taper": {"label": "Taper", "unit": "", "default": "Linear", "options": ["Linear", "Logarithmic", "Reverse Log"], "type": "select"},
                    "min_resistance": {"label": "Min Resistance", "unit": "Ω", "default": 0, "min": 0, "max": 1000, "type": "float"}
                },
                "simulation_model": "variable_resistor",
                "equations": "R_top = R * position; R_bottom = R * (1-position)"
            },
            "thermistor": {
                "name": "Thermistor NTC/PTC",
                "symbol": "thermistor",
                "pins": [
                    {"id": "1", "label": "1", "x": -40, "y": 0},
                    {"id": "2", "label": "2", "x": 40, "y": 0}
                ],
                "params": {
                    "resistance_25c": {"label": "R @ 25°C", "unit": "Ω", "default": 10000, "min": 1, "max": 10e6, "type": "float"},
                    "beta": {"label": "β Coefficient", "unit": "K", "default": 3950, "min": 1000, "max": 10000, "type": "float"},
                    "type": {"label": "Type", "unit": "", "default": "NTC", "options": ["NTC", "PTC"], "type": "select"},
                    "operating_temp": {"label": "Operating Temp", "unit": "°C", "default": 25, "min": -55, "max": 200, "type": "float"}
                },
                "simulation_model": "nonlinear_resistor",
                "equations": "R(T) = R25 * exp(β * (1/T - 1/298.15))"
            },
            "crystal": {
                "name": "Crystal / Resonator",
                "symbol": "crystal",
                "pins": [
                    {"id": "1", "label": "1", "x": -40, "y": 0},
                    {"id": "2", "label": "2", "x": 40, "y": 0}
                ],
                "params": {
                    "frequency": {"label": "Frequency", "unit": "Hz", "default": 16e6, "min": 1e3, "max": 200e6, "type": "float"},
                    "load_capacitance": {"label": "Load Capacitance", "unit": "F", "default": 18e-12, "min": 1e-12, "max": 100e-12, "type": "float"},
                    "esr": {"label": "ESR", "unit": "Ω", "default": 40, "min": 1, "max": 500, "type": "float"},
                    "stability": {"label": "Frequency Stability", "unit": "ppm", "default": 20, "min": 0.1, "max": 200, "type": "float"}
                },
                "simulation_model": "crystal",
                "equations": "Series RLC + parallel C"
            }
        }
    },

    # ═══════════════════════════════════════════════════════════════
    # SOURCES & SUPPLIES
    # ═══════════════════════════════════════════════════════════════
    "sources": {
        "label": "Sources",
        "components": {
            "voltage_source": {
                "name": "Voltage Source",
                "symbol": "voltage_source",
                "pins": [
                    {"id": "+", "label": "+", "x": 0, "y": -40},
                    {"id": "-", "label": "-", "x": 0, "y": 40}
                ],
                "params": {
                    "voltage": {"label": "Voltage", "unit": "V", "default": 9, "min": -1e6, "max": 1e6, "type": "float"},
                    "type": {"label": "Type", "unit": "", "default": "DC", "options": ["DC", "AC"], "type": "select"},
                    "frequency": {"label": "Frequency (AC)", "unit": "Hz", "default": 60, "min": 0, "max": 100e9, "type": "float"},
                    "phase": {"label": "Phase (AC)", "unit": "°", "default": 0, "min": -360, "max": 360, "type": "float"},
                    "internal_resistance": {"label": "Internal Resistance", "unit": "Ω", "default": 0.01, "min": 0, "max": 1000, "type": "float"}
                },
                "simulation_model": "voltage_source",
                "equations": "V = V_dc or V = V_peak * sin(2πft + φ)"
            },
            "current_source": {
                "name": "Current Source",
                "symbol": "current_source",
                "pins": [
                    {"id": "+", "label": "+", "x": 0, "y": -40},
                    {"id": "-", "label": "-", "x": 0, "y": 40}
                ],
                "params": {
                    "current": {"label": "Current", "unit": "A", "default": 0.01, "min": -1e6, "max": 1e6, "type": "float"},
                    "type": {"label": "Type", "unit": "", "default": "DC", "options": ["DC", "AC"], "type": "select"},
                    "frequency": {"label": "Frequency (AC)", "unit": "Hz", "default": 60, "min": 0, "max": 100e9, "type": "float"},
                    "internal_resistance": {"label": "Internal Resistance", "unit": "Ω", "default": 1e9, "min": 1, "max": 1e15, "type": "float"}
                },
                "simulation_model": "current_source",
                "equations": "I = I_dc constant"
            },
            "battery": {
                "name": "Battery",
                "symbol": "battery",
                "pins": [
                    {"id": "+", "label": "+", "x": 0, "y": -40},
                    {"id": "-", "label": "-", "x": 0, "y": 40}
                ],
                "params": {
                    "voltage": {"label": "Nominal Voltage", "unit": "V", "default": 9, "min": 0.1, "max": 1000, "type": "float"},
                    "capacity": {"label": "Capacity", "unit": "Ah", "default": 0.5, "min": 0.001, "max": 10000, "type": "float"},
                    "internal_resistance": {"label": "Internal Resistance", "unit": "Ω", "default": 0.5, "min": 0, "max": 100, "type": "float"},
                    "c_rate": {"label": "C-Rate", "unit": "C", "default": 1, "min": 0.01, "max": 100, "type": "float"}
                },
                "simulation_model": "voltage_source",
                "equations": "V = Vnom - I * Rint"
            },
            "signal_generator": {
                "name": "Signal Generator",
                "symbol": "signal_generator",
                "pins": [
                    {"id": "+", "label": "+", "x": 0, "y": -40},
                    {"id": "-", "label": "-", "x": 0, "y": 40}
                ],
                "params": {
                    "waveform": {"label": "Waveform", "unit": "", "default": "Sine", "options": ["Sine", "Square", "Triangle", "Sawtooth"], "type": "select"},
                    "frequency": {"label": "Frequency", "unit": "Hz", "default": 1000, "min": 0.001, "max": 100e9, "type": "float"},
                    "amplitude": {"label": "Amplitude", "unit": "V", "default": 5, "min": 0, "max": 1e6, "type": "float"},
                    "duty_cycle": {"label": "Duty Cycle", "unit": "%", "default": 50, "min": 0, "max": 100, "type": "float"},
                    "offset": {"label": "DC Offset", "unit": "V", "default": 0, "min": -1e6, "max": 1e6, "type": "float"}
                },
                "simulation_model": "voltage_source",
                "equations": "Various waveform equations"
            },
            "pwm_source": {
                "name": "PWM Source",
                "symbol": "pwm_source",
                "pins": [
                    {"id": "+", "label": "+", "x": 0, "y": -40},
                    {"id": "-", "label": "-", "x": 0, "y": 40}
                ],
                "params": {
                    "frequency": {"label": "Frequency", "unit": "Hz", "default": 1000, "min": 0.001, "max": 100e6, "type": "float"},
                    "duty_cycle": {"label": "Duty Cycle", "unit": "%", "default": 50, "min": 0, "max": 100, "type": "float"},
                    "rise_time": {"label": "Rise Time", "unit": "s", "default": 1e-9, "min": 0, "max": 1, "type": "float"},
                    "fall_time": {"label": "Fall Time", "unit": "s", "default": 1e-9, "min": 0, "max": 1, "type": "float"},
                    "v_high": {"label": "V High", "unit": "V", "default": 5, "min": 0, "max": 1e6, "type": "float"},
                    "v_low": {"label": "V Low", "unit": "V", "default": 0, "min": -1e6, "max": 1e6, "type": "float"}
                },
                "simulation_model": "voltage_source",
                "equations": "PWM waveform"
            }
        }
    },

    # ═══════════════════════════════════════════════════════════════
    # SEMICONDUCTOR DEVICES
    # ═══════════════════════════════════════════════════════════════
    "semiconductors": {
        "label": "Semiconductors",
        "components": {
            "diode": {
                "name": "Diode",
                "symbol": "diode",
                "pins": [
                    {"id": "A", "label": "Anode", "x": -40, "y": 0},
                    {"id": "K", "label": "Cathode", "x": 40, "y": 0}
                ],
                "params": {
                    "vf": {"label": "Forward Voltage", "unit": "V", "default": 0.7, "min": 0.1, "max": 5, "type": "float"},
                    "vbr": {"label": "Reverse Breakdown", "unit": "V", "default": 100, "min": 1, "max": 10000, "type": "float"},
                    "imax": {"label": "Max Forward Current", "unit": "A", "default": 1, "min": 0.001, "max": 1000, "type": "float"},
                    "cj": {"label": "Junction Capacitance", "unit": "F", "default": 4e-12, "min": 0, "max": 1e-6, "type": "float"},
                    "trr": {"label": "Reverse Recovery Time", "unit": "s", "default": 50e-9, "min": 0, "max": 1e-3, "type": "float"},
                    "is_": {"label": "Saturation Current", "unit": "A", "default": 1e-14, "min": 1e-18, "max": 1e-6, "type": "float"},
                    "n": {"label": "Ideality Factor", "unit": "", "default": 1, "min": 0.5, "max": 3, "type": "float"}
                },
                "simulation_model": "diode",
                "equations": "I = Is * (exp(V/(n*Vt)) - 1)"
            },
            "zener_diode": {
                "name": "Zener Diode",
                "symbol": "zener_diode",
                "pins": [
                    {"id": "A", "label": "Anode", "x": -40, "y": 0},
                    {"id": "K", "label": "Cathode", "x": 40, "y": 0}
                ],
                "params": {
                    "vz": {"label": "Zener Voltage", "unit": "V", "default": 5.1, "min": 1.8, "max": 200, "type": "float"},
                    "iz_test": {"label": "Test Current", "unit": "A", "default": 0.02, "min": 0.001, "max": 10, "type": "float"},
                    "zz": {"label": "Dynamic Impedance", "unit": "Ω", "default": 7, "min": 0.1, "max": 1000, "type": "float"},
                    "power_rating": {"label": "Power Rating", "unit": "W", "default": 0.5, "min": 0.05, "max": 50, "type": "float"}
                },
                "simulation_model": "zener",
                "equations": "Zener breakdown model"
            },
            "bjt_npn": {
                "name": "BJT (NPN)",
                "symbol": "bjt_npn",
                "pins": [
                    {"id": "B", "label": "Base", "x": -40, "y": 0},
                    {"id": "C", "label": "Collector", "x": 20, "y": -30},
                    {"id": "E", "label": "Emitter", "x": 20, "y": 30}
                ],
                "params": {
                    "hfe": {"label": "hFE (β)", "unit": "", "default": 100, "min": 5, "max": 10000, "type": "float"},
                    "vce_sat": {"label": "Vce(sat)", "unit": "V", "default": 0.2, "min": 0.01, "max": 2, "type": "float"},
                    "vbe": {"label": "Vbe", "unit": "V", "default": 0.7, "min": 0.3, "max": 1.2, "type": "float"},
                    "ft": {"label": "fT", "unit": "Hz", "default": 300e6, "min": 1e6, "max": 100e9, "type": "float"},
                    "ic_max": {"label": "Ic(max)", "unit": "A", "default": 0.8, "min": 0.001, "max": 1000, "type": "float"},
                    "pd_max": {"label": "Pd(max)", "unit": "W", "default": 0.625, "min": 0.01, "max": 500, "type": "float"},
                    "early_voltage": {"label": "Early Voltage", "unit": "V", "default": 100, "min": 10, "max": 1000, "type": "float"}
                },
                "simulation_model": "bjt",
                "equations": "Ic = β * Ib; Ebers-Moll model"
            },
            "bjt_pnp": {
                "name": "BJT (PNP)",
                "symbol": "bjt_pnp",
                "pins": [
                    {"id": "B", "label": "Base", "x": -40, "y": 0},
                    {"id": "C", "label": "Collector", "x": 20, "y": 30},
                    {"id": "E", "label": "Emitter", "x": 20, "y": -30}
                ],
                "params": {
                    "hfe": {"label": "hFE (β)", "unit": "", "default": 100, "min": 5, "max": 10000, "type": "float"},
                    "vce_sat": {"label": "Vce(sat)", "unit": "V", "default": 0.2, "min": 0.01, "max": 2, "type": "float"},
                    "vbe": {"label": "Vbe", "unit": "V", "default": 0.7, "min": 0.3, "max": 1.2, "type": "float"},
                    "ft": {"label": "fT", "unit": "Hz", "default": 300e6, "min": 1e6, "max": 100e9, "type": "float"},
                    "ic_max": {"label": "Ic(max)", "unit": "A", "default": 0.6, "min": 0.001, "max": 1000, "type": "float"},
                    "pd_max": {"label": "Pd(max)", "unit": "W", "default": 0.625, "min": 0.01, "max": 500, "type": "float"},
                    "early_voltage": {"label": "Early Voltage", "unit": "V", "default": 100, "min": 10, "max": 1000, "type": "float"}
                },
                "simulation_model": "bjt",
                "equations": "Ic = β * Ib (PNP polarity)"
            },
            "mosfet_n": {
                "name": "MOSFET (N-Ch)",
                "symbol": "mosfet_n",
                "pins": [
                    {"id": "G", "label": "Gate", "x": -40, "y": 0},
                    {"id": "D", "label": "Drain", "x": 20, "y": -30},
                    {"id": "S", "label": "Source", "x": 20, "y": 30}
                ],
                "params": {
                    "vth": {"label": "Threshold Voltage", "unit": "V", "default": 2, "min": 0.1, "max": 20, "type": "float"},
                    "rds_on": {"label": "Rds(on)", "unit": "Ω", "default": 0.05, "min": 0.001, "max": 100, "type": "float"},
                    "cgs": {"label": "Cgs", "unit": "F", "default": 500e-12, "min": 1e-15, "max": 1e-6, "type": "float"},
                    "cgd": {"label": "Cgd", "unit": "F", "default": 100e-12, "min": 1e-15, "max": 1e-6, "type": "float"},
                    "qg": {"label": "Total Gate Charge", "unit": "C", "default": 20e-9, "min": 1e-12, "max": 1e-3, "type": "float"},
                    "id_max": {"label": "Id(max)", "unit": "A", "default": 30, "min": 0.001, "max": 1000, "type": "float"},
                    "vds_max": {"label": "Vds(max)", "unit": "V", "default": 60, "min": 1, "max": 10000, "type": "float"},
                    "kp": {"label": "Transconductance (Kp)", "unit": "A/V²", "default": 0.5, "min": 0.001, "max": 100, "type": "float"}
                },
                "simulation_model": "mosfet",
                "equations": "Id = Kp*(Vgs-Vth)² (saturation); Id = Kp*(2*(Vgs-Vth)*Vds - Vds²) (linear)"
            },
            "mosfet_p": {
                "name": "MOSFET (P-Ch)",
                "symbol": "mosfet_p",
                "pins": [
                    {"id": "G", "label": "Gate", "x": -40, "y": 0},
                    {"id": "D", "label": "Drain", "x": 20, "y": 30},
                    {"id": "S", "label": "Source", "x": 20, "y": -30}
                ],
                "params": {
                    "vth": {"label": "Threshold Voltage", "unit": "V", "default": -2, "min": -20, "max": -0.1, "type": "float"},
                    "rds_on": {"label": "Rds(on)", "unit": "Ω", "default": 0.1, "min": 0.001, "max": 100, "type": "float"},
                    "id_max": {"label": "Id(max)", "unit": "A", "default": 20, "min": 0.001, "max": 1000, "type": "float"},
                    "vds_max": {"label": "Vds(max)", "unit": "V", "default": -60, "min": -10000, "max": -1, "type": "float"},
                    "kp": {"label": "Transconductance (Kp)", "unit": "A/V²", "default": 0.3, "min": 0.001, "max": 100, "type": "float"}
                },
                "simulation_model": "mosfet",
                "equations": "P-channel MOSFET model"
            },
            "opamp": {
                "name": "Op-Amp",
                "symbol": "opamp",
                "pins": [
                    {"id": "+", "label": "V+", "x": -40, "y": -15},
                    {"id": "-", "label": "V-", "x": -40, "y": 15},
                    {"id": "OUT", "label": "Out", "x": 40, "y": 0},
                    {"id": "VCC", "label": "Vcc", "x": 0, "y": -30},
                    {"id": "VEE", "label": "Vee", "x": 0, "y": 30}
                ],
                "params": {
                    "gain": {"label": "Open-Loop Gain", "unit": "dB", "default": 100, "min": 20, "max": 160, "type": "float"},
                    "gbw": {"label": "GBW", "unit": "Hz", "default": 1e6, "min": 1e3, "max": 10e9, "type": "float"},
                    "slew_rate": {"label": "Slew Rate", "unit": "V/µs", "default": 0.5, "min": 0.01, "max": 10000, "type": "float"},
                    "vos": {"label": "Input Offset Voltage", "unit": "V", "default": 1e-3, "min": 0, "max": 0.1, "type": "float"},
                    "cmrr": {"label": "CMRR", "unit": "dB", "default": 90, "min": 40, "max": 160, "type": "float"},
                    "ibias": {"label": "Input Bias Current", "unit": "A", "default": 80e-9, "min": 1e-15, "max": 1e-3, "type": "float"},
                    "supply_voltage": {"label": "Supply Voltage", "unit": "V", "default": 15, "min": 1, "max": 50, "type": "float"},
                    "rail_to_rail": {"label": "Rail-to-Rail", "unit": "", "default": "No", "options": ["No", "Input", "Output", "Both"], "type": "select"}
                },
                "simulation_model": "opamp",
                "equations": "Vout = A * (V+ - V-), clamped to supply rails"
            },
            "led": {
                "name": "LED",
                "symbol": "led",
                "pins": [
                    {"id": "A", "label": "Anode", "x": -40, "y": 0},
                    {"id": "K", "label": "Cathode", "x": 40, "y": 0}
                ],
                "params": {
                    "vf": {"label": "Forward Voltage", "unit": "V", "default": 2.0, "min": 1.0, "max": 5.0, "type": "float"},
                    "if_max": {"label": "Max Current", "unit": "A", "default": 0.02, "min": 0.001, "max": 10, "type": "float"},
                    "wavelength": {"label": "Wavelength", "unit": "nm", "default": 630, "min": 380, "max": 780, "type": "float"},
                    "color": {"label": "Color", "unit": "", "default": "Red", "options": ["Red", "Orange", "Yellow", "Green", "Blue", "White", "IR", "UV"], "type": "select"},
                    "luminous_intensity": {"label": "Luminous Intensity", "unit": "mcd", "default": 200, "min": 1, "max": 100000, "type": "float"},
                    "viewing_angle": {"label": "Viewing Angle", "unit": "°", "default": 30, "min": 5, "max": 180, "type": "float"}
                },
                "simulation_model": "diode",
                "equations": "Same as diode with color-specific Vf"
            }
        }
    },

    # ═══════════════════════════════════════════════════════════════
    # SWITCHES & PROTECTION
    # ═══════════════════════════════════════════════════════════════
    "switches": {
        "label": "Switches & Protection",
        "components": {
            "spst_switch": {
                "name": "SPST Switch",
                "symbol": "spst_switch",
                "pins": [
                    {"id": "1", "label": "1", "x": -40, "y": 0},
                    {"id": "2", "label": "2", "x": 40, "y": 0}
                ],
                "params": {
                    "state": {"label": "State", "unit": "", "default": "Open", "options": ["Open", "Closed"], "type": "select"},
                    "contact_resistance": {"label": "Contact Resistance", "unit": "Ω", "default": 0.01, "min": 0, "max": 10, "type": "float"},
                    "bounce_time": {"label": "Bounce Time", "unit": "s", "default": 5e-3, "min": 0, "max": 0.1, "type": "float"},
                    "voltage_rating": {"label": "Voltage Rating", "unit": "V", "default": 250, "min": 1, "max": 10000, "type": "float"},
                    "current_rating": {"label": "Current Rating", "unit": "A", "default": 10, "min": 0.1, "max": 1000, "type": "float"}
                },
                "simulation_model": "switch",
                "equations": "R = Rcontact (closed) or R = ∞ (open)"
            },
            "spdt_switch": {
                "name": "SPDT Switch",
                "symbol": "spdt_switch",
                "pins": [
                    {"id": "COM", "label": "COM", "x": -40, "y": 0},
                    {"id": "NO", "label": "NO", "x": 40, "y": -15},
                    {"id": "NC", "label": "NC", "x": 40, "y": 15}
                ],
                "params": {
                    "position": {"label": "Position", "unit": "", "default": "NC", "options": ["NC", "NO"], "type": "select"},
                    "contact_resistance": {"label": "Contact Resistance", "unit": "Ω", "default": 0.01, "min": 0, "max": 10, "type": "float"},
                    "bounce_time": {"label": "Bounce Time", "unit": "s", "default": 5e-3, "min": 0, "max": 0.1, "type": "float"}
                },
                "simulation_model": "switch",
                "equations": "SPDT routing model"
            },
            "push_button": {
                "name": "Push Button",
                "symbol": "push_button",
                "pins": [
                    {"id": "1", "label": "1", "x": -40, "y": 0},
                    {"id": "2", "label": "2", "x": 40, "y": 0}
                ],
                "params": {
                    "type": {"label": "Type", "unit": "", "default": "Normally Open", "options": ["Normally Open", "Normally Closed"], "type": "select"},
                    "state": {"label": "State", "unit": "", "default": "Released", "options": ["Released", "Pressed"], "type": "select"},
                    "contact_resistance": {"label": "Contact Resistance", "unit": "Ω", "default": 0.01, "min": 0, "max": 10, "type": "float"},
                    "debounce_time": {"label": "Debounce Time", "unit": "s", "default": 10e-3, "min": 0, "max": 0.1, "type": "float"}
                },
                "simulation_model": "switch",
                "equations": "Momentary switch model"
            },
            "fuse": {
                "name": "Fuse",
                "symbol": "fuse",
                "pins": [
                    {"id": "1", "label": "1", "x": -40, "y": 0},
                    {"id": "2", "label": "2", "x": 40, "y": 0}
                ],
                "params": {
                    "rated_current": {"label": "Rated Current", "unit": "A", "default": 1, "min": 0.001, "max": 1000, "type": "float"},
                    "blow_type": {"label": "Blow Type", "unit": "", "default": "Fast", "options": ["Fast", "Slow"], "type": "select"},
                    "voltage_rating": {"label": "Voltage Rating", "unit": "V", "default": 250, "min": 1, "max": 10000, "type": "float"},
                    "i2t": {"label": "I²t", "unit": "A²s", "default": 0.5, "min": 0.001, "max": 10000, "type": "float"},
                    "resistance": {"label": "Cold Resistance", "unit": "Ω", "default": 0.1, "min": 0.001, "max": 10, "type": "float"}
                },
                "simulation_model": "fuse",
                "equations": "R = Rcold (intact); R = ∞ (blown, I > Irated)"
            },
            "relay": {
                "name": "Relay / Contactor",
                "symbol": "relay",
                "pins": [
                    {"id": "COIL+", "label": "Coil+", "x": -40, "y": -15},
                    {"id": "COIL-", "label": "Coil-", "x": -40, "y": 15},
                    {"id": "COM", "label": "COM", "x": 40, "y": 0},
                    {"id": "NO", "label": "NO", "x": 40, "y": -20},
                    {"id": "NC", "label": "NC", "x": 40, "y": 20}
                ],
                "params": {
                    "coil_voltage": {"label": "Coil Voltage", "unit": "V", "default": 12, "min": 1, "max": 240, "type": "float"},
                    "coil_resistance": {"label": "Coil Resistance", "unit": "Ω", "default": 400, "min": 10, "max": 50000, "type": "float"},
                    "pull_in_current": {"label": "Pull-in Current", "unit": "A", "default": 0.03, "min": 0.001, "max": 10, "type": "float"},
                    "contact_rating": {"label": "Contact Rating", "unit": "A", "default": 10, "min": 0.1, "max": 1000, "type": "float"},
                    "switching_time": {"label": "Switching Time", "unit": "s", "default": 10e-3, "min": 1e-3, "max": 0.1, "type": "float"}
                },
                "simulation_model": "relay",
                "equations": "Coil = inductor; Contact = SPDT switch"
            },
            "tvs_diode": {
                "name": "TVS / Varistor (MOV)",
                "symbol": "tvs_diode",
                "pins": [
                    {"id": "1", "label": "1", "x": -40, "y": 0},
                    {"id": "2", "label": "2", "x": 40, "y": 0}
                ],
                "params": {
                    "clamping_voltage": {"label": "Clamping Voltage", "unit": "V", "default": 24, "min": 1, "max": 10000, "type": "float"},
                    "peak_pulse_current": {"label": "Peak Pulse Current", "unit": "A", "default": 50, "min": 0.1, "max": 100000, "type": "float"},
                    "standoff_voltage": {"label": "Standoff Voltage", "unit": "V", "default": 15, "min": 1, "max": 5000, "type": "float"},
                    "capacitance": {"label": "Capacitance", "unit": "F", "default": 100e-12, "min": 1e-12, "max": 1e-6, "type": "float"}
                },
                "simulation_model": "tvs",
                "equations": "Bidirectional clamping model"
            }
        }
    },

    # ═══════════════════════════════════════════════════════════════
    # MAGNETICS & ELECTROMECHANICAL
    # ═══════════════════════════════════════════════════════════════
    "magnetics": {
        "label": "Magnetics & Electromechanical",
        "components": {
            "transformer": {
                "name": "Transformer",
                "symbol": "transformer",
                "pins": [
                    {"id": "P1", "label": "Pri+", "x": -40, "y": -20},
                    {"id": "P2", "label": "Pri-", "x": -40, "y": 20},
                    {"id": "S1", "label": "Sec+", "x": 40, "y": -20},
                    {"id": "S2", "label": "Sec-", "x": 40, "y": 20}
                ],
                "params": {
                    "turns_ratio": {"label": "Turns Ratio (N1:N2)", "unit": "", "default": 1, "min": 0.001, "max": 10000, "type": "float"},
                    "primary_inductance": {"label": "Primary Inductance", "unit": "H", "default": 0.01, "min": 1e-6, "max": 1000, "type": "float"},
                    "coupling_coefficient": {"label": "Coupling Coefficient", "unit": "", "default": 0.99, "min": 0, "max": 1, "type": "float"},
                    "core_loss": {"label": "Core Loss", "unit": "W", "default": 0.1, "min": 0, "max": 1000, "type": "float"},
                    "leakage_inductance": {"label": "Leakage Inductance", "unit": "H", "default": 1e-6, "min": 0, "max": 1, "type": "float"}
                },
                "simulation_model": "transformer",
                "equations": "V2/V1 = N2/N1; coupled inductor model"
            },
            "dc_motor": {
                "name": "DC Motor",
                "symbol": "dc_motor",
                "pins": [
                    {"id": "+", "label": "+", "x": -40, "y": 0},
                    {"id": "-", "label": "-", "x": 40, "y": 0}
                ],
                "params": {
                    "kv": {"label": "Kv", "unit": "RPM/V", "default": 1000, "min": 1, "max": 100000, "type": "float"},
                    "winding_resistance": {"label": "Winding Resistance", "unit": "Ω", "default": 1, "min": 0.01, "max": 1000, "type": "float"},
                    "back_emf": {"label": "Back-EMF Constant", "unit": "V/RPM", "default": 0.001, "min": 0, "max": 10, "type": "float"},
                    "stall_torque": {"label": "Stall Torque", "unit": "Nm", "default": 0.1, "min": 0, "max": 10000, "type": "float"},
                    "no_load_current": {"label": "No-Load Current", "unit": "A", "default": 0.1, "min": 0, "max": 100, "type": "float"}
                },
                "simulation_model": "dc_motor",
                "equations": "V = I*R + Ke*ω"
            },
            "solenoid": {
                "name": "Solenoid / Electromagnet",
                "symbol": "solenoid",
                "pins": [
                    {"id": "1", "label": "+", "x": -40, "y": 0},
                    {"id": "2", "label": "-", "x": 40, "y": 0}
                ],
                "params": {
                    "coil_resistance": {"label": "Coil Resistance", "unit": "Ω", "default": 50, "min": 0.1, "max": 10000, "type": "float"},
                    "inductance": {"label": "Inductance", "unit": "H", "default": 0.01, "min": 1e-6, "max": 100, "type": "float"},
                    "holding_force": {"label": "Holding Force", "unit": "N", "default": 5, "min": 0.01, "max": 10000, "type": "float"},
                    "pull_in_voltage": {"label": "Pull-in Voltage", "unit": "V", "default": 12, "min": 1, "max": 240, "type": "float"},
                    "response_time": {"label": "Response Time", "unit": "s", "default": 20e-3, "min": 1e-3, "max": 1, "type": "float"}
                },
                "simulation_model": "inductor",
                "equations": "RL circuit model"
            }
        }
    },

    # ═══════════════════════════════════════════════════════════════
    # GROUND & PROBES
    # ═══════════════════════════════════════════════════════════════
    "probes": {
        "label": "Ground & Probes",
        "components": {
            "ground": {
                "name": "GND",
                "symbol": "ground",
                "pins": [
                    {"id": "1", "label": "GND", "x": 0, "y": -20}
                ],
                "params": {},
                "simulation_model": "ground",
                "equations": "V = 0 (reference node)"
            },
            "voltmeter": {
                "name": "Voltmeter",
                "symbol": "voltmeter",
                "pins": [
                    {"id": "+", "label": "V+", "x": 0, "y": -30},
                    {"id": "-", "label": "V-", "x": 0, "y": 30}
                ],
                "params": {
                    "input_impedance": {"label": "Input Impedance", "unit": "Ω", "default": 10e6, "min": 1e3, "max": 1e15, "type": "float"},
                    "bandwidth": {"label": "Bandwidth", "unit": "Hz", "default": 1e6, "min": 1, "max": 10e9, "type": "float"},
                    "mode": {"label": "Mode", "unit": "", "default": "Single-Ended", "options": ["Single-Ended", "Differential"], "type": "select"}
                },
                "simulation_model": "voltmeter",
                "equations": "Measures V+ - V-"
            },
            "ammeter": {
                "name": "Ammeter",
                "symbol": "ammeter",
                "pins": [
                    {"id": "1", "label": "+", "x": -40, "y": 0},
                    {"id": "2", "label": "-", "x": 40, "y": 0}
                ],
                "params": {
                    "shunt_resistance": {"label": "Shunt Resistance", "unit": "Ω", "default": 0.001, "min": 0, "max": 10, "type": "float"},
                    "current_range": {"label": "Current Range", "unit": "A", "default": 10, "min": 0.001, "max": 10000, "type": "float"},
                    "burden_voltage": {"label": "Burden Voltage", "unit": "V", "default": 0.001, "min": 0, "max": 1, "type": "float"}
                },
                "simulation_model": "ammeter",
                "equations": "Series shunt resistor measurement"
            }
        }
    }
}


def get_component_catalog():
    """Return the full component catalog."""
    return COMPONENT_CATALOG


def get_component_def(category_id, component_id):
    """Get a specific component definition."""
    cat = COMPONENT_CATALOG.get(category_id)
    if cat:
        return cat["components"].get(component_id)
    return None


def get_default_params(category_id, component_id):
    """Get default parameter values for a component."""
    comp = get_component_def(category_id, component_id)
    if not comp:
        return {}
    defaults = {}
    for key, param in comp["params"].items():
        defaults[key] = param["default"]
    return defaults
