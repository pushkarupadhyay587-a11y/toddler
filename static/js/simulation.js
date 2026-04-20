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

    openSimulationModal() {
        const circuitJson = this.canvas.toJSON();
        if (circuitJson.components.length === 0) {
            this._setStatus('No components to simulate', 'var(--accent-orange)');
            return;
        }

        const modal = document.getElementById('sim-modal-overlay');
        const compSelect = document.getElementById('sweep-comp-select');
        const paramSelect = document.getElementById('sweep-param-select');
        const outSourceSelect = document.getElementById('out-source-select');
        
        compSelect.innerHTML = '';
        outSourceSelect.innerHTML = '';

        // Populate components for sweeping (ideally sources and passives)
        // and output measurements
        circuitJson.components.forEach(c => {
            const opt1 = document.createElement('option');
            opt1.value = c.id;
            opt1.textContent = `${c.id} (${c.type})`;
            compSelect.appendChild(opt1);
            
            const opt2 = document.createElement('option');
            opt2.value = c.id;
            opt2.textContent = `${c.id} (${c.type})`;
            outSourceSelect.appendChild(opt2);
        });

        const updateParams = () => {
            paramSelect.innerHTML = '';
            const selectedId = compSelect.value;
            const comp = circuitJson.components.find(c => c.id === selectedId);
            if (comp && comp.params) {
                Object.keys(comp.params).forEach(p => {
                    const opt = document.createElement('option');
                    opt.value = p;
                    opt.textContent = p;
                    paramSelect.appendChild(opt);
                });
            }
        };

        compSelect.onchange = updateParams;
        updateParams();

        modal.style.display = 'flex';

        if (!this._modalBound) {
            document.getElementById('sim-modal-close').addEventListener('click', () => {
                modal.style.display = 'none';
            });

            document.getElementById('run-sweep-btn').addEventListener('click', () => {
                this.runSweepAnalysis();
            });
            this._modalBound = true;
        }
        
        if (this.chart) {
            this.chart.destroy();
            this.chart = null;
        }
    }

    async runSweepAnalysis() {
        const btn = document.getElementById('run-sweep-btn');
        btn.textContent = 'Running...';
        btn.disabled = true;

        try {
            const circuitJson = this.canvas.toJSON();
            const compId = document.getElementById('sweep-comp-select').value;
            const param = document.getElementById('sweep-param-select').value;
            const startVal = parseFloat(document.getElementById('sweep-start').value);
            const endVal = parseFloat(document.getElementById('sweep-end').value);
            const steps = parseInt(document.getElementById('sweep-steps').value);
            
            const outSourceId = document.getElementById('out-source-select').value;
            const outMetric = document.getElementById('out-metric-select').value;

            const response = await fetch('/api/sweep', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    circuit: circuitJson,
                    sweep_comp_id: compId,
                    sweep_param: param,
                    start_val: startVal,
                    end_val: endVal,
                    steps: steps
                })
            });

            const data = await response.json();

            if (!response.ok || data.error) {
                alert("Sweep failed: " + (data.error || "Server error"));
                return;
            }

            this._plotSweepResults(data, compId, param, outSourceId, outMetric);

        } catch (err) {
            console.error(err);
            alert("Error running sweep");
        } finally {
            btn.textContent = 'Run Sweep';
            btn.disabled = false;
        }
    }

    _plotSweepResults(data, sweepComp, sweepParam, outSourceId, metric) {
        const xValues = [];
        const yValues = [];

        data.results.forEach(pt => {
            if (pt.converged) {
                xValues.push(pt.x);
                let yVal = 0;
                const cr = pt.component_results[outSourceId];
                if (cr) {
                    if (metric === 'voltage') yVal = cr.voltage_drop || cr.voltage || 0;
                    else if (metric === 'current') yVal = cr.current || 0;
                    else if (metric === 'power') yVal = pt.power_dissipation[outSourceId] || cr.power || cr.power_delivered || 0;
                }
                yValues.push(yVal);
            }
        });

        const ctx = document.getElementById('sim-chart').getContext('2d');
        
        if (this.chart) {
            this.chart.destroy();
        }

        this.chart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: xValues,
                datasets: [{
                    label: `${outSourceId} ${metric}`,
                    data: yValues,
                    borderColor: '#4a6cf7',
                    backgroundColor: 'rgba(74, 108, 247, 0.1)',
                    borderWidth: 2,
                    pointRadius: 2,
                    fill: true,
                    tension: 0.1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: {
                        title: { display: true, text: `${sweepComp} ${sweepParam}` },
                        ticks: { color: '#9498b0' },
                        grid: { color: '#353850' }
                    },
                    y: {
                        title: { display: true, text: metric },
                        ticks: { color: '#9498b0' },
                        grid: { color: '#353850' }
                    }
                },
                plugins: {
                    legend: { labels: { color: '#e8eaf0' } }
                }
            }
        });
    }
}
