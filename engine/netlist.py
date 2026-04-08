"""
TODDLER - Netlist Parser
Converts frontend JSON circuit representation to simulation-ready netlist.
"""


class NetlistNode:
    """Represents an electrical node in the circuit."""
    def __init__(self, node_id):
        self.id = node_id
        self.connections = []  # List of (component_instance_id, pin_id)
        self.voltage = None  # Set after simulation

    def __repr__(self):
        return f"Node({self.id}, connections={len(self.connections)})"


class NetlistComponent:
    """Represents a component instance in the netlist."""
    def __init__(self, instance_id, comp_type, category, params, pin_nodes):
        self.instance_id = instance_id
        self.comp_type = comp_type
        self.category = category
        self.params = params
        self.pin_nodes = pin_nodes  # {pin_id: node_id}
        self.results = {}  # Populated after simulation

    def __repr__(self):
        return f"NetlistComponent({self.instance_id}, type={self.comp_type})"


class Netlist:
    """Circuit netlist ready for simulation."""
    def __init__(self):
        self.nodes = {}        # node_id -> NetlistNode
        self.components = {}   # instance_id -> NetlistComponent
        self.ground_node = None

    def add_node(self, node_id):
        if node_id not in self.nodes:
            self.nodes[node_id] = NetlistNode(node_id)
        return self.nodes[node_id]

    def add_component(self, instance_id, comp_type, category, params, pin_nodes):
        comp = NetlistComponent(instance_id, comp_type, category, params, pin_nodes)
        self.components[instance_id] = comp
        for pin_id, node_id in pin_nodes.items():
            node = self.add_node(node_id)
            node.connections.append((instance_id, pin_id))
        return comp

    def set_ground(self, node_id):
        self.ground_node = node_id

    def get_node_count(self):
        return len(self.nodes)

    def get_non_ground_nodes(self):
        return [nid for nid in self.nodes if nid != self.ground_node]

    def __repr__(self):
        return f"Netlist(nodes={len(self.nodes)}, components={len(self.components)}, gnd={self.ground_node})"


def parse_circuit_json(circuit_json):
    """
    Parse frontend circuit JSON into a Netlist object.
    
    Expected JSON format:
    {
        "components": [
            {
                "id": "R1",
                "type": "resistor",
                "category": "passive",
                "params": {"resistance": 1000, ...},
                "x": 300, "y": 200, "rotation": 0
            },
            ...
        ],
        "wires": [
            {
                "id": "W1",
                "points": [{"x": 100, "y": 200}, {"x": 200, "y": 200}],
                "connections": [
                    {"component": "R1", "pin": "1"},
                    {"component": "R2", "pin": "1"}
                ]
            },
            ...
        ],
        "nodes": [
            {
                "id": "N1",
                "connections": [
                    {"type": "component_pin", "component": "R1", "pin": "1"},
                    {"type": "component_pin", "component": "V1", "pin": "+"},
                    {"type": "wire", "wire": "W1"}
                ]
            },
            ...
        ]
    }
    """
    netlist = Netlist()
    
    components = circuit_json.get("components", [])
    nodes = circuit_json.get("nodes", [])
    
    # Build node mapping from connections
    # Each node represents an electrically connected point
    node_map = {}  # (component_id, pin_id) -> node_id
    
    for node_data in nodes:
        node_id = node_data["id"]
        netlist.add_node(node_id)
        
        for conn in node_data.get("connections", []):
            if conn["type"] == "component_pin":
                comp_id = conn["component"]
                pin_id = conn["pin"]
                node_map[(comp_id, pin_id)] = node_id

    # Add components to netlist
    for comp_data in components:
        instance_id = comp_data["id"]
        comp_type = comp_data["type"]
        category = comp_data["category"]
        params = comp_data.get("params", {})
        
        # Build pin->node mapping for this component
        pin_nodes = {}
        # Get pins from the component catalog or from node_map
        for key, node_id in node_map.items():
            if key[0] == instance_id:
                pin_nodes[key[1]] = node_id
        
        if pin_nodes:
            netlist.add_component(instance_id, comp_type, category, params, pin_nodes)

    # Detect ground node
    for comp in netlist.components.values():
        if comp.comp_type == "ground":
            # The ground component's pin connects to the ground node
            for pin_id, node_id in comp.pin_nodes.items():
                netlist.set_ground(node_id)
                break
    
    # If no explicit ground, use node 0 convention
    if netlist.ground_node is None and netlist.nodes:
        # Try to find a node connected to a voltage source negative terminal
        for comp in netlist.components.values():
            if comp.comp_type in ("voltage_source", "battery"):
                neg_node = comp.pin_nodes.get("-")
                if neg_node:
                    netlist.set_ground(neg_node)
                    break
    
    # Last resort: first node
    if netlist.ground_node is None and netlist.nodes:
        netlist.set_ground(list(netlist.nodes.keys())[0])

    return netlist


def netlist_to_spice(netlist):
    """
    Convert netlist to SPICE format string (for export).
    """
    lines = ["* TODDLER Circuit Export", f"* Nodes: {netlist.get_node_count()}", ""]
    
    for comp in netlist.components.values():
        if comp.comp_type == "resistor":
            nodes_str = " ".join(str(comp.pin_nodes.get(p, "0")) for p in ["1", "2"])
            lines.append(f"R{comp.instance_id} {nodes_str} {comp.params.get('resistance', 1000)}")
        elif comp.comp_type == "capacitor":
            nodes_str = " ".join(str(comp.pin_nodes.get(p, "0")) for p in ["1", "2"])
            lines.append(f"C{comp.instance_id} {nodes_str} {comp.params.get('capacitance', 1e-6)}")
        elif comp.comp_type == "inductor":
            nodes_str = " ".join(str(comp.pin_nodes.get(p, "0")) for p in ["1", "2"])
            lines.append(f"L{comp.instance_id} {nodes_str} {comp.params.get('inductance', 1e-3)}")
        elif comp.comp_type in ("voltage_source", "battery"):
            nodes_str = " ".join(str(comp.pin_nodes.get(p, "0")) for p in ["+", "-"])
            lines.append(f"V{comp.instance_id} {nodes_str} DC {comp.params.get('voltage', 5)}")
        elif comp.comp_type == "current_source":
            nodes_str = " ".join(str(comp.pin_nodes.get(p, "0")) for p in ["+", "-"])
            lines.append(f"I{comp.instance_id} {nodes_str} DC {comp.params.get('current', 0.01)}")
        elif comp.comp_type == "diode" or comp.comp_type == "led":
            nodes_str = " ".join(str(comp.pin_nodes.get(p, "0")) for p in ["A", "K"])
            lines.append(f"D{comp.instance_id} {nodes_str} DMODEL")

    lines.append("")
    lines.append(".OP")
    lines.append(".END")
    
    return "\n".join(lines)
