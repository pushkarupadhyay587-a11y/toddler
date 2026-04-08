/* ═══════════════════════════════════════════════════════════════
   TODDLER — Simulation Interface
   Extracts circuit topology, sends to Flask, and processes results
   ═══════════════════════════════════════════════════════════════ */

class SimulationEngine {
    constructor(canvas, propsPanel) {
        this.canvas = canvas;
        this.propsPanel = propsPanel;
        this.statusEl = document.getElementById('status-sim');
        this.lastResults = null;
    }

    async runDCAnalysis() {
        this.statusEl.textContent = 'Simulating...';
        this.statusEl.style.color = 'var(--text-muted)';
        
        try {
            // Get circuit JSON representation
            const circuitJson = this.canvas.toJSON();
            
            // Check basic viability
            if (circuitJson.components.length === 0) {
                this._setStatus('No components in circuit', 'var(--accent-orange)');
                return;
            }
            
            let hasGND = circuitJson.components.some(c => c.type === 'ground');
            let hasSource = circuitJson.components.some(c => 
                ['voltage_source', 'current_source', 'battery', 'signal_generator', 'pwm_source'].includes(c.type)
            );
            
            if (!hasGND) {
                this._setStatus('Warning: No ground (GND) node', 'var(--accent-orange)');
                // Will try to simulate anyway, netlist parser attempts fallback
            } else if (!hasSource) {
                this._setStatus('Warning: No power source', 'var(--accent-orange)');
            }

            // Send to backend
            const response = await fetch('/api/simulate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(circuitJson)
            });

            const results = await response.json();

            if (!response.ok || results.error) {
                const errorMsg = results.error || 'Server error';
                console.error("Simulation failed:", errorMsg);
                this._setStatus(`Error: ${errorMsg}`, 'var(--accent-red)');
                return;
            }

            if (!results.converged) {
                this._setStatus(`Did not converge (${results.iterations} iter)`, 'var(--accent-red)');
                return;
            }

            // Success
            this.lastResults = results;
            this._setStatus(`Converged (${results.iterations} iter)`, 'var(--accent-green)');
            
            // Update properties panel if something is selected
            if (this.propsPanel.selectedComponent) {
                this.propsPanel.displaySimulationResults(results);
            }

        } catch (err) {
            console.error("Simulation request failed:", err);
            this._setStatus('Connection error. Is Flask running?', 'var(--accent-red)');
        }
    }

    clearResults() {
        this.lastResults = null;
        this.statusEl.textContent = '';
        this.propsPanel.hideSimulationResults();
    }

    _setStatus(text, color) {
        this.statusEl.textContent = text;
        this.statusEl.style.color = color;
    }
}
