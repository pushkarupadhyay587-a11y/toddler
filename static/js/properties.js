/* ═══════════════════════════════════════════════════════════════
   TODDLER — Properties Panel
   Handles the property editor and simulation results display
   ═══════════════════════════════════════════════════════════════ */

class PropertiesPanel {
    constructor(canvas) {
        this.canvas = canvas;
        this.container = document.getElementById('props-content');
        this.simContainer = document.getElementById('sim-results');
        this.simContent = document.getElementById('sim-results-content');
        this.componentCatalog = null;
        this.selectedComponent = null;

        this._fetchCatalog();
    }

    async _fetchCatalog() {
        try {
            const resp = await fetch('/api/components');
            if (resp.ok) {
                this.componentCatalog = await resp.json();
                // Fire an event that catalog is loaded
                document.dispatchEvent(new CustomEvent('catalog-loaded', { detail: this.componentCatalog }));
            }
        } catch (err) {
            console.error("Failed to load component catalog:", err);
        }
    }

    getComponentDef(category, type) {
        if (!this.componentCatalog || !this.componentCatalog[category]) return null;
        return this.componentCatalog[category].components[type];
    }

    updateSelection(selectedItems) {
        if (!selectedItems || selectedItems.length === 0) {
            this.selectedComponent = null;
            this._renderEmpty();
            this.hideSimulationResults();
            return;
        }

        const item = selectedItems[0];
        
        if (item.type) {
            // It's a component
            this.selectedComponent = item;
            this._renderComponentProps(item);
        } else if (item.points) {
            // It's a wire
            this.selectedComponent = null;
            this._renderWireProps(item);
            this.hideSimulationResults();
        }
    }

    _renderEmpty() {
        this.container.innerHTML = `
            <div class="props-empty">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" opacity="0.3">
                    <circle cx="12" cy="12" r="3"/>
                    <path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83"/>
                </svg>
                <p>Select a component to view its properties</p>
            </div>
        `;
    }

    _renderWireProps(wire) {
        this.container.innerHTML = `
            <div class="props-comp-header">
                <div class="props-comp-id">${wire.id}</div>
                <div class="props-comp-type">Wire</div>
                <div class="props-comp-selected">Selected</div>
            </div>
            <div class="props-section">
                <div class="props-row">
                    <span class="props-label">Segments</span>
                    <span class="props-input-group">
                        <span class="props-unit" style="text-align: right; width: 100%;">${wire.points.length - 1}</span>
                    </span>
                </div>
                <div class="props-row">
                    <span class="props-label">Nodes</span>
                    <span class="props-input-group">
                        <span class="props-unit" style="text-align: right; width: 100%;">${wire.points.length}</span>
                    </span>
                </div>
            </div>
        `;
    }

    _renderComponentProps(comp) {
        const def = this.getComponentDef(comp.category, comp.type);
        if (!def) {
            this._renderEmpty();
            return;
        }

        let html = `
            <div class="props-comp-header">
                <div class="props-comp-id">${comp.id}</div>
                <div class="props-comp-type">${def.name}</div>
                <div class="props-comp-selected">Selected</div>
            </div>
        `;

        if (def.params && Object.keys(def.params).length > 0) {
            html += `<div class="props-section">
                <div class="props-section-title">Parameters</div>`;

            for (const [key, param] of Object.entries(def.params)) {
                let val = comp.params[key] !== undefined ? comp.params[key] : param.default;
                
                html += `<div class="props-row">
                    <span class="props-label" title="${param.label}">${param.label}</span>
                    <div class="props-input-group">`;

                if (param.type === 'select') {
                    html += `<select class="props-select" data-param="${key}">`;
                    param.options.forEach(opt => {
                        const selected = val === opt ? 'selected' : '';
                        html += `<option value="${opt}" ${selected}>${opt}</option>`;
                    });
                    html += `</select>`;
                } else {
                    // format float for display
                    const displayVal = (typeof val === 'number') ? val.toString() : val;
                    html += `<input type="number" class="props-input" data-param="${key}" value="${displayVal}" step="any">`;
                }

                html += `<span class="props-unit">${param.unit || ''}</span>
                    </div>
                </div>`;
            }
            html += `</div>`;
        }

        this.container.innerHTML = html;

        // Attach event listeners
        this.container.querySelectorAll('.props-input, .props-select').forEach(el => {
            el.addEventListener('change', (e) => {
                const key = e.target.dataset.param;
                let value = e.target.value;
                const pdef = def.params[key];
                
                if (pdef.type === 'float') {
                    value = parseFloat(value);
                    if (isNaN(value)) value = pdef.default;
                    // Clamp
                    if (value < pdef.min) value = pdef.min;
                    if (value > pdef.max) value = pdef.max;
                    e.target.value = value;
                }
                
                this.canvas.saveUndoState();
                comp.params[key] = value;
                this.canvas.render(); // Redraw in case value string changed
            });
        });
    }

    displaySimulationResults(results) {
        if (!this.selectedComponent) return;

        const compRes = results.component_results[this.selectedComponent.id];
        if (!compRes) return;

        this.simContainer.style.display = 'block';
        
        let html = '<div class="props-section">';
        
        if (compRes.note) {
            html += `
                <div class="sim-warning">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                    <span>${compRes.note}</span>
                </div>
            `;
        }

        // Format and display key metrics
        const metrics = [
            { key: 'voltage_drop', label: 'Voltage Drop', unit: 'V' },
            { key: 'voltage', label: 'Voltage', unit: 'V' },
            { key: 'current', label: 'Current', unit: 'A' },
            { key: 'power', label: 'Power Dissipated', unit: 'W' },
            { key: 'power_delivered', label: 'Power Delivered', unit: 'W' }
        ];

        let hasResults = false;
        metrics.forEach(m => {
            if (compRes[m.key] !== undefined) {
                hasResults = true;
                const val = this._formatEngineeringValue(compRes[m.key]);
                let valueClass = 'sim-result-value';
                
                // Add power warning
                if (m.key === 'power' && compRes.power_percent !== undefined) {
                    if (compRes.power_percent > 100) valueClass += ' danger';
                    else if (compRes.power_percent > 80) valueClass += ' warning';
                }

                html += `
                    <div class="sim-result-row">
                        <span class="sim-result-label">${m.label}</span>
                        <span class="${valueClass}">${val}${m.unit}</span>
                    </div>
                `;
            }
        });

        if (compRes.power_percent !== undefined) {
             html += `
                <div class="sim-result-row">
                    <span class="sim-result-label">% of Rating</span>
                    <span class="sim-result-value ${compRes.power_percent > 100 ? 'danger' : (compRes.power_percent > 80 ? 'warning' : '')}">
                        ${compRes.power_percent}%
                    </span>
                </div>
            `;
        }

        if (!hasResults) {
             html += `<div class="props-empty" style="height: 60px;">No DC results</div>`;
        }
        
        html += '</div>';
        this.simContent.innerHTML = html;
    }

    hideSimulationResults() {
        this.simContainer.style.display = 'none';
        this.simContent.innerHTML = '';
    }

    _formatEngineeringValue(num) {
        if (num === 0) return "0.00 ";
        const abs = Math.abs(num);
        if (abs >= 1e9) return (num / 1e9).toFixed(2) + ' G';
        if (abs >= 1e6) return (num / 1e6).toFixed(2) + ' M';
        if (abs >= 1e3) return (num / 1e3).toFixed(2) + ' k';
        if (abs >= 1) return num.toFixed(2) + ' ';
        if (abs >= 1e-3) return (num * 1e3).toFixed(2) + ' m';
        if (abs >= 1e-6) return (num * 1e6).toFixed(2) + ' µ';
        if (abs >= 1e-9) return (num * 1e9).toFixed(2) + ' n';
        if (abs >= 1e-12) return (num * 1e12).toFixed(2) + ' p';
        return num.toExponential(2) + ' ';
    }
}
