"""
TODDLER - Circuit Simulation Engine
Modified Nodal Analysis (MNA) solver for DC circuit analysis.
Uses NumPy for linear algebra operations.
"""

import numpy as np
from .netlist import Netlist


class SimulationResult:
    """Container for simulation results."""
    def __init__(self):
        self.node_voltages = {}       # node_id -> voltage
        self.branch_currents = {}     # component_id -> current (A)
        self.power_dissipation = {}   # component_id -> power (W)
        self.component_results = {}   # component_id -> {voltage_drop, current, power, ...}
        self.converged = False
        self.iterations = 0
        self.error_message = None

    def to_dict(self):
        return {
            "node_voltages": self.node_voltages,
            "branch_currents": self.branch_currents,
            "power_dissipation": self.power_dissipation,
            "component_results": self.component_results,
            "converged": self.converged,
            "iterations": self.iterations,
            "error_message": self.error_message
        }


class MNASolver:
    """
    Modified Nodal Analysis circuit solver.
    
    MNA creates a system of equations: [A] * [x] = [z]
    where:
      - A is the MNA matrix (conductance + voltage source stamp)
      - x is the unknown vector (node voltages + voltage source currents)
      - z is the RHS vector (current sources + voltage source values)
    """

    MAX_ITERATIONS = 100
    CONVERGENCE_THRESHOLD = 1e-9

    def __init__(self, netlist: Netlist):
        self.netlist = netlist
        self.node_indices = {}  # node_id -> matrix index
        self.vs_indices = {}    # voltage_source_id -> matrix index for its current
        self.matrix_size = 0

    def _build_node_indices(self):
        """Assign matrix indices to non-ground nodes."""
        idx = 0
        for node_id in self.netlist.nodes:
            if node_id != self.netlist.ground_node:
                self.node_indices[node_id] = idx
                idx += 1
        return idx

    def _count_voltage_sources(self):
        """Count independent voltage sources (they add extra rows/cols)."""
        count = 0
        for comp in self.netlist.components.values():
            if comp.comp_type in ("voltage_source", "battery"):
                self.vs_indices[comp.instance_id] = count
                count += 1
            elif comp.comp_type == "opamp":
                self.vs_indices[comp.instance_id] = count
                count += 1
        return count

    def _get_node_idx(self, node_id):
        """Get matrix index for a node. Returns -1 for ground."""
        if node_id == self.netlist.ground_node:
            return -1
        return self.node_indices.get(node_id, -1)

    def _stamp_conductance(self, A, node1_id, node2_id, conductance):
        """Stamp a conductance element into the MNA matrix."""
        n1 = self._get_node_idx(node1_id)
        n2 = self._get_node_idx(node2_id)

        if n1 >= 0:
            A[n1, n1] += conductance
        if n2 >= 0:
            A[n2, n2] += conductance
        if n1 >= 0 and n2 >= 0:
            A[n1, n2] -= conductance
            A[n2, n1] -= conductance

    def _stamp_voltage_source(self, A, z, pos_node_id, neg_node_id, voltage, vs_idx):
        """Stamp a voltage source into the MNA matrix."""
        n_nodes = len(self.node_indices)
        vs_row = n_nodes + vs_idx

        n_pos = self._get_node_idx(pos_node_id)
        n_neg = self._get_node_idx(neg_node_id)

        if n_pos >= 0:
            A[vs_row, n_pos] = 1
            A[n_pos, vs_row] = 1
        if n_neg >= 0:
            A[vs_row, n_neg] = -1
            A[n_neg, vs_row] = -1

        z[vs_row] = voltage

    def _stamp_current_source(self, z, pos_node_id, neg_node_id, current):
        """Stamp a current source into the RHS vector."""
        n_pos = self._get_node_idx(pos_node_id)
        n_neg = self._get_node_idx(neg_node_id)

        # Current flows from + to - through the source (conventional)
        if n_pos >= 0:
            z[n_pos] -= current
        if n_neg >= 0:
            z[n_neg] += current

    def solve_dc(self):
        """
        Perform DC operating point analysis.
        Returns SimulationResult.
        """
        result = SimulationResult()

        # Validate
        if not self.netlist.components:
            result.error_message = "No components in circuit"
            return result

        if self.netlist.ground_node is None:
            result.error_message = "No ground node defined. Add a GND component."
            return result

        # Build indices
        n_nodes = self._build_node_indices()
        n_vs = self._count_voltage_sources()
        self.matrix_size = n_nodes + n_vs

        if self.matrix_size == 0:
            result.error_message = "Circuit has no nodes to solve"
            return result

        # For nonlinear circuits, use Newton-Raphson iteration
        # Start with initial guess of 0V everywhere
        x = np.zeros(self.matrix_size)

        converged = False
        for iteration in range(self.MAX_ITERATIONS):
            A = np.zeros((self.matrix_size, self.matrix_size))
            z = np.zeros(self.matrix_size)

            try:
                self._stamp_all_components(A, z, x, n_nodes)
            except Exception as e:
                result.error_message = f"Error building circuit matrix: {str(e)}"
                return result

            # Solve Ax = z
            try:
                x_new = np.linalg.solve(A, z)
            except np.linalg.LinAlgError:
                result.error_message = "Singular matrix — check for floating nodes, short circuits, or missing ground connection."
                return result

            # Check convergence
            if np.allclose(x_new, x, atol=self.CONVERGENCE_THRESHOLD):
                converged = True
                x = x_new
                result.iterations = iteration + 1
                break

            x = x_new

        if not converged:
            result.error_message = f"Simulation did not converge after {self.MAX_ITERATIONS} iterations"
            result.iterations = self.MAX_ITERATIONS

        result.converged = converged

        # Extract node voltages
        for node_id, idx in self.node_indices.items():
            result.node_voltages[node_id] = float(x[idx])
        result.node_voltages[self.netlist.ground_node] = 0.0

        # Extract voltage source currents
        for vs_id, vs_idx in self.vs_indices.items():
            result.branch_currents[vs_id] = float(x[n_nodes + vs_idx])

        # Calculate component results
        self._calculate_component_results(result)

        return result

    def _stamp_all_components(self, A, z, x, n_nodes):
        """Stamp all components into the MNA matrix."""
        for comp in self.netlist.components.values():
            if comp.comp_type == "resistor":
                self._stamp_resistor(A, comp)
            elif comp.comp_type == "capacitor":
                # DC: capacitor = open circuit (very high impedance)
                self._stamp_capacitor_dc(A, comp)
            elif comp.comp_type == "inductor":
                # DC: inductor = short circuit (very low impedance)
                self._stamp_inductor_dc(A, comp)
            elif comp.comp_type in ("voltage_source", "battery"):
                self._stamp_vs(A, z, comp)
            elif comp.comp_type == "current_source":
                self._stamp_cs(z, comp)
            elif comp.comp_type == "diode" or comp.comp_type == "led":
                self._stamp_diode(A, z, x, comp)
            elif comp.comp_type == "zener_diode":
                self._stamp_zener(A, z, x, comp)
            elif comp.comp_type in ("bjt_npn", "bjt_pnp"):
                self._stamp_bjt(A, z, x, comp)
            elif comp.comp_type in ("mosfet_n", "mosfet_p"):
                self._stamp_mosfet(A, z, x, comp)
            elif comp.comp_type == "opamp":
                self._stamp_opamp(A, z, comp)
            elif comp.comp_type in ("spst_switch", "push_button"):
                self._stamp_switch(A, comp)
            elif comp.comp_type == "spdt_switch":
                self._stamp_spdt(A, comp)
            elif comp.comp_type == "fuse":
                self._stamp_fuse(A, comp)
            elif comp.comp_type == "potentiometer":
                self._stamp_potentiometer(A, comp)
            elif comp.comp_type == "thermistor":
                self._stamp_thermistor(A, comp)
            elif comp.comp_type == "ammeter":
                self._stamp_ammeter(A, comp)
            elif comp.comp_type == "voltmeter":
                self._stamp_voltmeter(A, comp)
            elif comp.comp_type == "ground":
                pass  # Ground is handled by node assignment
            elif comp.comp_type == "dc_motor":
                self._stamp_dc_motor(A, comp)
            elif comp.comp_type == "solenoid":
                self._stamp_solenoid_dc(A, comp)
            elif comp.comp_type == "transformer":
                self._stamp_transformer_dc(A, comp)
            elif comp.comp_type == "relay":
                self._stamp_relay(A, comp)
            # Additional component types can be handled similarly

    # ─── Component Stamp Methods ──────────────────────────────────

    def _stamp_resistor(self, A, comp):
        n1 = comp.pin_nodes.get("1")
        n2 = comp.pin_nodes.get("2")
        R = comp.params.get("resistance", 1000)
        if R <= 0:
            R = 1e-9  # Prevent division by zero
        self._stamp_conductance(A, n1, n2, 1.0 / R)

    def _stamp_capacitor_dc(self, A, comp):
        """DC analysis: capacitor is open circuit (very large R)."""
        n1 = comp.pin_nodes.get("1") or comp.pin_nodes.get("+")
        n2 = comp.pin_nodes.get("2") or comp.pin_nodes.get("-")
        # Use ESR if available, otherwise treat as open
        esr = comp.params.get("esr", 0.01)
        # Add very small conductance to prevent singular matrix
        self._stamp_conductance(A, n1, n2, 1e-12)

    def _stamp_inductor_dc(self, A, comp):
        """DC analysis: inductor is short circuit (very small R = DCR)."""
        n1 = comp.pin_nodes.get("1")
        n2 = comp.pin_nodes.get("2")
        dcr = comp.params.get("dcr", 0.1)
        if dcr <= 0:
            dcr = 1e-6
        self._stamp_conductance(A, n1, n2, 1.0 / dcr)

    def _stamp_vs(self, A, z, comp):
        pos = comp.pin_nodes.get("+")
        neg = comp.pin_nodes.get("-")
        voltage = comp.params.get("voltage", 5)
        vs_idx = self.vs_indices[comp.instance_id]
        self._stamp_voltage_source(A, z, pos, neg, voltage, vs_idx)

    def _stamp_cs(self, z, comp):
        pos = comp.pin_nodes.get("+")
        neg = comp.pin_nodes.get("-")
        current = comp.params.get("current", 0.01)
        self._stamp_current_source(z, pos, neg, current)

    def _stamp_diode(self, A, z, x, comp):
        """
        Diode stamp using companion model (Newton-Raphson linearization).
        I = Is * (exp(V/(n*Vt)) - 1)
        Linearized: I ≈ Gd * V + Ieq
        """
        anode = comp.pin_nodes.get("A")
        cathode = comp.pin_nodes.get("K")
        Is = comp.params.get("is_", 1e-14)
        n = comp.params.get("n", 1)
        Vt = 0.02585  # Thermal voltage at 25°C (kT/q)

        # Get current voltage across diode
        va = self._get_voltage_from_x(x, anode)
        vk = self._get_voltage_from_x(x, cathode)
        Vd = va - vk

        # Limit voltage step for convergence
        Vd = max(min(Vd, 1.5), -10)

        # Diode current and conductance at operating point
        exp_term = np.exp(Vd / (n * Vt))
        Id = Is * (exp_term - 1)
        Gd = (Is / (n * Vt)) * exp_term

        # Ensure minimum conductance
        Gd = max(Gd, 1e-12)

        # Stamp companion model: Gd and equivalent current source
        self._stamp_conductance(A, anode, cathode, Gd)
        Ieq = Id - Gd * Vd
        self._stamp_current_source(z, anode, cathode, -Ieq)

    def _stamp_zener(self, A, z, x, comp):
        """Zener diode: forward diode + reverse breakdown at Vz."""
        anode = comp.pin_nodes.get("A")
        cathode = comp.pin_nodes.get("K")
        Vz = comp.params.get("vz", 5.1)
        Zz = comp.params.get("zz", 7)
        Vt = 0.02585

        va = self._get_voltage_from_x(x, anode)
        vk = self._get_voltage_from_x(x, cathode)
        Vd = va - vk

        # Forward region (same as regular diode)
        if Vd >= -Vz:
            Is = 1e-14
            n = 1
            Vd_limited = max(min(Vd, 1.5), -Vz)
            exp_term = np.exp(Vd_limited / (n * Vt))
            Gd = max((Is / (n * Vt)) * exp_term, 1e-12)
            Id = Is * (exp_term - 1)
        else:
            # Reverse breakdown region
            Gd = 1.0 / Zz
            Id = -(Vd + Vz) / Zz

        self._stamp_conductance(A, anode, cathode, Gd)
        Ieq = Id - Gd * Vd
        self._stamp_current_source(z, anode, cathode, -Ieq)

    def _stamp_bjt(self, A, z, x, comp):
        """
        BJT stamp using simplified Ebers-Moll model.
        For NPN: Ic = β * Ib, Vbe ≈ 0.7V
        """
        is_npn = comp.comp_type == "bjt_npn"
        base = comp.pin_nodes.get("B")
        collector = comp.pin_nodes.get("C")
        emitter = comp.pin_nodes.get("E")
        
        beta = comp.params.get("hfe", 100)
        Vbe_on = comp.params.get("vbe", 0.7)
        Vt = 0.02585
        Is = 1e-14

        vb = self._get_voltage_from_x(x, base)
        vc = self._get_voltage_from_x(x, collector)
        ve = self._get_voltage_from_x(x, emitter)

        if is_npn:
            Vbe = vb - ve
        else:
            Vbe = ve - vb

        # Base-emitter junction (diode model)
        Vbe_limited = max(min(Vbe, 1.5), -5)
        exp_be = np.exp(Vbe_limited / Vt)
        Ibe = Is * (exp_be - 1)
        Gbe = max((Is / Vt) * exp_be, 1e-12)

        # Collector current = β * Ib
        Ic = beta * Ibe
        Gc = beta * Gbe

        if is_npn:
            # B-E junction stamp
            self._stamp_conductance(A, base, emitter, Gbe)
            Ieq_be = Ibe - Gbe * Vbe
            self._stamp_current_source(z, base, emitter, -Ieq_be)
            
            # Collector current (VCCS: Ic depends on Vbe)
            self._stamp_conductance(A, collector, emitter, Gc)
            Ieq_c = Ic - Gc * Vbe
            self._stamp_current_source(z, collector, emitter, -Ieq_c)
        else:
            # PNP: reverse polarities
            self._stamp_conductance(A, emitter, base, Gbe)
            Ieq_be = Ibe - Gbe * Vbe
            self._stamp_current_source(z, emitter, base, -Ieq_be)
            
            self._stamp_conductance(A, emitter, collector, Gc)
            Ieq_c = Ic - Gc * Vbe
            self._stamp_current_source(z, emitter, collector, -Ieq_c)

    def _stamp_mosfet(self, A, z, x, comp):
        """
        MOSFET stamp using simplified square-law model.
        Saturation: Id = Kp * (Vgs - Vth)²
        Linear: Id = Kp * (2*(Vgs-Vth)*Vds - Vds²)
        """
        is_nmos = comp.comp_type == "mosfet_n"
        gate = comp.pin_nodes.get("G")
        drain = comp.pin_nodes.get("D")
        source = comp.pin_nodes.get("S")

        Vth = comp.params.get("vth", 2)
        Kp = comp.params.get("kp", 0.5)

        vg = self._get_voltage_from_x(x, gate)
        vd = self._get_voltage_from_x(x, drain)
        vs = self._get_voltage_from_x(x, source)

        if is_nmos:
            Vgs = vg - vs
            Vds = vd - vs
        else:
            Vgs = vs - vg
            Vds = vs - vd
            Vth = abs(Vth)

        if Vgs <= Vth:
            # Cutoff region
            Gds = 1e-12
            Id = 0
        elif Vds >= (Vgs - Vth):
            # Saturation
            Id = Kp * (Vgs - Vth) ** 2
            Gm = 2 * Kp * (Vgs - Vth)
            Gds = 1e-9  # Small output conductance
        else:
            # Linear region
            Id = Kp * (2 * (Vgs - Vth) * Vds - Vds ** 2)
            Gds = 2 * Kp * (Vgs - Vth - Vds)
            Gm = 2 * Kp * Vds

        if is_nmos:
            self._stamp_conductance(A, drain, source, max(Gds, 1e-12))
            Ieq = Id - Gds * Vds
            self._stamp_current_source(z, drain, source, -Ieq)
        else:
            self._stamp_conductance(A, source, drain, max(Gds, 1e-12))
            Ieq = Id - Gds * Vds
            self._stamp_current_source(z, source, drain, -Ieq)

        # Gate: very high impedance (add tiny conductance)
        self._stamp_conductance(A, gate, source, 1e-12)

    def _stamp_opamp(self, A, z, comp):
        """
        Ideal Op-Amp stamp: Vout = A*(V+ - V-), clamped to rails.
        Modeled as VCVS with very high gain.
        """
        v_pos = comp.pin_nodes.get("+")
        v_neg = comp.pin_nodes.get("-")
        v_out = comp.pin_nodes.get("OUT")

        # Ideal op-amp: V+ = V-, Vout determined by external feedback
        # Stamp as voltage source: Vout = A*(V+ - V-)
        vs_idx = self.vs_indices[comp.instance_id]
        n_nodes = len(self.node_indices)
        vs_row = n_nodes + vs_idx

        gain = 10 ** (comp.params.get("gain", 100) / 20)  # Convert dB to linear

        n_out = self._get_node_idx(v_out)
        n_pos = self._get_node_idx(v_pos)
        n_neg = self._get_node_idx(v_neg)

        # Voltage equation: Vout - A*(V+ - V-) = 0
        if n_out >= 0:
            A[vs_row, n_out] = 1
            A[n_out, vs_row] = 1
        if n_pos >= 0:
            A[vs_row, n_pos] = -gain
        if n_neg >= 0:
            A[vs_row, n_neg] = gain

        z[vs_row] = 0

        # Input impedance (very high)
        if v_pos and v_neg:
            self._stamp_conductance(A, v_pos, v_neg, 1e-12)

    def _stamp_switch(self, A, comp):
        """Switch stamp: closed = low resistance, open = very high resistance."""
        n1 = comp.pin_nodes.get("1")
        n2 = comp.pin_nodes.get("2")
        
        state = comp.params.get("state", "Open")
        sw_type = comp.params.get("type", "Normally Open")
        
        # Determine actual state
        if comp.comp_type == "push_button":
            if sw_type == "Normally Open":
                is_closed = (state == "Pressed")
            else:
                is_closed = (state == "Released")
        else:
            is_closed = (state == "Closed")
        
        if is_closed:
            R = comp.params.get("contact_resistance", 0.01)
            if R <= 0:
                R = 1e-6
        else:
            R = 1e12  # Open circuit

        self._stamp_conductance(A, n1, n2, 1.0 / R)

    def _stamp_spdt(self, A, comp):
        """SPDT switch stamp."""
        com = comp.pin_nodes.get("COM")
        no = comp.pin_nodes.get("NO")
        nc = comp.pin_nodes.get("NC")
        
        position = comp.params.get("position", "NC")
        R_closed = comp.params.get("contact_resistance", 0.01) or 1e-6
        R_open = 1e12
        
        if position == "NC":
            self._stamp_conductance(A, com, nc, 1.0 / R_closed)
            self._stamp_conductance(A, com, no, 1.0 / R_open)
        else:
            self._stamp_conductance(A, com, no, 1.0 / R_closed)
            self._stamp_conductance(A, com, nc, 1.0 / R_open)

    def _stamp_fuse(self, A, comp):
        """Fuse stamp: intact = small R, blown = open circuit."""
        n1 = comp.pin_nodes.get("1")
        n2 = comp.pin_nodes.get("2")
        R = comp.params.get("resistance", 0.1)
        if R <= 0:
            R = 1e-6
        self._stamp_conductance(A, n1, n2, 1.0 / R)

    def _stamp_potentiometer(self, A, comp):
        """Potentiometer: two resistors in series with wiper tap."""
        n1 = comp.pin_nodes.get("1")
        n2 = comp.pin_nodes.get("2")
        nw = comp.pin_nodes.get("W")
        
        R_total = comp.params.get("resistance", 10000)
        pos = comp.params.get("wiper_position", 50) / 100.0
        
        R_top = R_total * pos
        R_bottom = R_total * (1 - pos)
        
        if R_top <= 0: R_top = 1e-6
        if R_bottom <= 0: R_bottom = 1e-6
        
        if nw:
            self._stamp_conductance(A, n1, nw, 1.0 / R_top)
            self._stamp_conductance(A, nw, n2, 1.0 / R_bottom)
        else:
            self._stamp_conductance(A, n1, n2, 1.0 / R_total)

    def _stamp_thermistor(self, A, comp):
        """Thermistor stamp with temperature-dependent resistance."""
        n1 = comp.pin_nodes.get("1")
        n2 = comp.pin_nodes.get("2")
        
        R25 = comp.params.get("resistance_25c", 10000)
        beta = comp.params.get("beta", 3950)
        temp = comp.params.get("operating_temp", 25)
        therm_type = comp.params.get("type", "NTC")
        
        T = temp + 273.15
        T0 = 298.15
        
        if therm_type == "NTC":
            R = R25 * np.exp(beta * (1.0/T - 1.0/T0))
        else:
            # PTC simplified model
            if temp > 25:
                R = R25 * np.exp(beta * (1.0/T0 - 1.0/T))
            else:
                R = R25
        
        if R <= 0: R = 1e-6
        self._stamp_conductance(A, n1, n2, 1.0 / R)

    def _stamp_ammeter(self, A, comp):
        """Ammeter: very small series resistance."""
        n1 = comp.pin_nodes.get("1")
        n2 = comp.pin_nodes.get("2")
        R = comp.params.get("shunt_resistance", 0.001)
        if R <= 0: R = 1e-6
        self._stamp_conductance(A, n1, n2, 1.0 / R)

    def _stamp_voltmeter(self, A, comp):
        """Voltmeter: very high impedance across nodes."""
        pos = comp.pin_nodes.get("+")
        neg = comp.pin_nodes.get("-")
        R = comp.params.get("input_impedance", 10e6)
        self._stamp_conductance(A, pos, neg, 1.0 / R)

    def _stamp_dc_motor(self, A, comp):
        """DC Motor: modeled as R + back-EMF voltage (DC: just R)."""
        pos = comp.pin_nodes.get("+")
        neg = comp.pin_nodes.get("-")
        R = comp.params.get("winding_resistance", 1)
        if R <= 0: R = 1e-6
        self._stamp_conductance(A, pos, neg, 1.0 / R)

    def _stamp_solenoid_dc(self, A, comp):
        """Solenoid DC: just coil resistance."""
        n1 = comp.pin_nodes.get("1")
        n2 = comp.pin_nodes.get("2")
        R = comp.params.get("coil_resistance", 50)
        if R <= 0: R = 1e-6
        self._stamp_conductance(A, n1, n2, 1.0 / R)

    def _stamp_transformer_dc(self, A, comp):
        """Transformer DC: primary and secondary winding resistances."""
        p1 = comp.pin_nodes.get("P1")
        p2 = comp.pin_nodes.get("P2")
        s1 = comp.pin_nodes.get("S1")
        s2 = comp.pin_nodes.get("S2")
        # DC: very low impedance (short circuit for ideal)
        self._stamp_conductance(A, p1, p2, 1.0 / 0.01)
        self._stamp_conductance(A, s1, s2, 1.0 / 0.01)

    def _stamp_relay(self, A, comp):
        """Relay: coil as resistor, contacts as switch."""
        coil_pos = comp.pin_nodes.get("COIL+")
        coil_neg = comp.pin_nodes.get("COIL-")
        com = comp.pin_nodes.get("COM")
        no = comp.pin_nodes.get("NO")
        nc = comp.pin_nodes.get("NC")
        
        R_coil = comp.params.get("coil_resistance", 400)
        if R_coil <= 0: R_coil = 1e-6
        self._stamp_conductance(A, coil_pos, coil_neg, 1.0 / R_coil)
        
        # Contact: default NC position (no coil energization analysis in DC simple mode)
        self._stamp_conductance(A, com, nc, 1.0 / 0.01)
        self._stamp_conductance(A, com, no, 1e-12)

    # ─── Helper Methods ──────────────────────────────────────────

    def _get_voltage_from_x(self, x, node_id):
        """Get voltage of a node from solution vector x."""
        if node_id == self.netlist.ground_node:
            return 0.0
        idx = self.node_indices.get(node_id, -1)
        if idx >= 0 and idx < len(x):
            return x[idx]
        return 0.0

    def _calculate_component_results(self, result):
        """Calculate per-component results from node voltages."""
        for comp in self.netlist.components.values():
            comp_result = {}
            
            if comp.comp_type == "resistor":
                n1 = comp.pin_nodes.get("1")
                n2 = comp.pin_nodes.get("2")
                v1 = result.node_voltages.get(n1, 0)
                v2 = result.node_voltages.get(n2, 0)
                vdrop = v1 - v2
                R = comp.params.get("resistance", 1000)
                current = vdrop / R if R > 0 else 0
                power = abs(vdrop * current)
                power_rating = comp.params.get("power_rating", 0.25)
                
                comp_result = {
                    "voltage_drop": round(vdrop, 6),
                    "current": round(current, 6),
                    "power": round(power, 6),
                    "power_rating": power_rating,
                    "power_percent": round(power / power_rating * 100, 1) if power_rating > 0 else 0
                }
                result.branch_currents[comp.instance_id] = current
                result.power_dissipation[comp.instance_id] = power

            elif comp.comp_type in ("voltage_source", "battery"):
                vs_current = result.branch_currents.get(comp.instance_id, 0)
                voltage = comp.params.get("voltage", 5)
                power = abs(voltage * vs_current)
                comp_result = {
                    "voltage": voltage,
                    "current": round(vs_current, 6),
                    "power_delivered": round(power, 6)
                }
                result.power_dissipation[comp.instance_id] = power

            elif comp.comp_type in ("diode", "led"):
                anode = comp.pin_nodes.get("A")
                cathode = comp.pin_nodes.get("K")
                va = result.node_voltages.get(anode, 0)
                vk = result.node_voltages.get(cathode, 0)
                vdrop = va - vk
                Is = comp.params.get("is_", 1e-14)
                n = comp.params.get("n", 1)
                Vt = 0.02585
                current = Is * (np.exp(min(vdrop / (n * Vt), 500)) - 1)
                power = abs(vdrop * current)
                
                comp_result = {
                    "voltage_drop": round(vdrop, 6),
                    "current": round(current, 6),
                    "power": round(power, 6)
                }
                result.branch_currents[comp.instance_id] = current
                result.power_dissipation[comp.instance_id] = power

            elif comp.comp_type == "capacitor":
                n1 = comp.pin_nodes.get("1") or comp.pin_nodes.get("+")
                n2 = comp.pin_nodes.get("2") or comp.pin_nodes.get("-")
                v1 = result.node_voltages.get(n1, 0)
                v2 = result.node_voltages.get(n2, 0)
                comp_result = {
                    "voltage_drop": round(v1 - v2, 6),
                    "current": 0,
                    "note": "DC steady-state: no current through ideal capacitor"
                }

            elif comp.comp_type == "inductor":
                n1 = comp.pin_nodes.get("1")
                n2 = comp.pin_nodes.get("2")
                v1 = result.node_voltages.get(n1, 0)
                v2 = result.node_voltages.get(n2, 0)
                dcr = comp.params.get("dcr", 0.1)
                vdrop = v1 - v2
                current = vdrop / dcr if dcr > 0 else 0
                comp_result = {
                    "voltage_drop": round(vdrop, 6),
                    "current": round(current, 6),
                    "note": "DC steady-state: inductor is short circuit (DCR only)"
                }
                result.branch_currents[comp.instance_id] = current

            else:
                # Generic two-terminal result
                pins = list(comp.pin_nodes.keys())
                if len(pins) >= 2:
                    n1 = comp.pin_nodes.get(pins[0])
                    n2 = comp.pin_nodes.get(pins[1])
                    v1 = result.node_voltages.get(n1, 0)
                    v2 = result.node_voltages.get(n2, 0)
                    comp_result = {
                        "voltage_drop": round(v1 - v2, 6)
                    }

            result.component_results[comp.instance_id] = comp_result


def simulate_dc(circuit_json):
    """
    Main entry point: takes circuit JSON, returns simulation results.
    """
    from .netlist import parse_circuit_json
    
    netlist = parse_circuit_json(circuit_json)
    solver = MNASolver(netlist)
    result = solver.solve_dc()
    return result.to_dict()
