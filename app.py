"""
TODDLER - Electronic Circuit Builder
Flask application entry point.
"""

import json
import os
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from engine.components import get_component_catalog, get_default_params
from engine.simulator import simulate_dc

app = Flask(__name__, static_folder="static", static_url_path="")
CORS(app)

CIRCUITS_DIR = os.path.join(os.path.dirname(__file__), "circuits")
os.makedirs(CIRCUITS_DIR, exist_ok=True)


@app.route("/")
def index():
    return send_from_directory("static", "index.html")


@app.route("/api/components", methods=["GET"])
def get_components():
    """Return the full component catalog."""
    catalog = get_component_catalog()
    return jsonify(catalog)


@app.route("/api/simulate", methods=["POST"])
def run_simulation():
    """
    Run DC simulation on the submitted circuit.
    Expects JSON body with circuit netlist.
    """
    try:
        circuit_json = request.get_json()
        if not circuit_json:
            return jsonify({"error": "No circuit data provided"}), 400

        results = simulate_dc(circuit_json)
        return jsonify(results)

    except Exception as e:
        return jsonify({
            "error": str(e),
            "converged": False
        }), 500


@app.route("/api/save", methods=["POST"])
def save_circuit():
    """Save circuit to a JSON file."""
    try:
        data = request.get_json()
        name = data.get("name", "untitled")
        circuit = data.get("circuit", {})

        # Sanitize filename
        safe_name = "".join(c for c in name if c.isalnum() or c in ("-", "_", " ")).strip()
        if not safe_name:
            safe_name = "untitled"

        filepath = os.path.join(CIRCUITS_DIR, f"{safe_name}.json")
        with open(filepath, "w") as f:
            json.dump(circuit, f, indent=2)

        return jsonify({"success": True, "filename": f"{safe_name}.json"})

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/load", methods=["POST"])
def load_circuit():
    """Load circuit from a JSON file."""
    try:
        data = request.get_json()
        name = data.get("name", "")

        filepath = os.path.join(CIRCUITS_DIR, name)
        if not os.path.exists(filepath):
            return jsonify({"error": "File not found"}), 404

        with open(filepath, "r") as f:
            circuit = json.load(f)

        return jsonify({"success": True, "circuit": circuit})

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/circuits", methods=["GET"])
def list_circuits():
    """List saved circuit files."""
    files = [f for f in os.listdir(CIRCUITS_DIR) if f.endswith(".json")]
    return jsonify({"circuits": files})


@app.route("/api/defaults/<category>/<component>", methods=["GET"])
def get_defaults(category, component):
    """Get default parameters for a component type."""
    defaults = get_default_params(category, component)
    if defaults:
        return jsonify(defaults)
    return jsonify({"error": "Component not found"}), 404


if __name__ == "__main__":
    print("=" * 60)
    print("  TODDLER — Electronic Circuit Builder")
    print("  http://localhost:5000")
    print("=" * 60)
    app.run(debug=True, port=5000)
