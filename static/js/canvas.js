/* ═══════════════════════════════════════════════════════════════
   TODDLER — Canvas Rendering Engine
   HTML5 Canvas with pan, zoom, grid, component & wire rendering
   ═══════════════════════════════════════════════════════════════ */

class CircuitCanvas {
    constructor(canvasElement) {
        this.canvas = canvasElement;
        this.ctx = canvasElement.getContext('2d');

        // ─── View transform ───
        this.panX = 0;
        this.panY = 0;
        this.zoom = 1;
        this.minZoom = 0.1;
        this.maxZoom = 5;

        // ─── Grid ───
        this.gridSize = 20;
        this.gridSnap = true;

        // ─── State ───
        this.components = [];     // Placed component instances
        this.wires = [];          // Wire objects { id, points[], connections[] }
        this.nodes = [];          // Electrical nodes
        this.selectedItems = [];  // Currently selected items
        this.hoveredPin = null;   // Pin currently under cursor
        this.isPanning = false;
        this.panStartX = 0;
        this.panStartY = 0;

        // ─── Component counters for auto-naming ───
        this.counters = {};

        // ─── Undo/Redo ───
        this.undoStack = [];
        this.redoStack = [];
        this.maxUndo = 50;

        this._setupResize();
        this._resize();
    }

    // ─── Resize ───
    _setupResize() {
        const ro = new ResizeObserver(() => this._resize());
        ro.observe(this.canvas.parentElement);
    }

    _resize() {
        const parent = this.canvas.parentElement;
        const dpr = window.devicePixelRatio || 1;
        this.canvas.width = parent.clientWidth * dpr;
        this.canvas.height = parent.clientHeight * dpr;
        this.canvas.style.width = parent.clientWidth + 'px';
        this.canvas.style.height = parent.clientHeight + 'px';
        this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        this.render();
    }

    // ─── Coordinate transforms ───
    screenToWorld(sx, sy) {
        return {
            x: (sx - this.panX) / this.zoom,
            y: (sy - this.panY) / this.zoom
        };
    }

    worldToScreen(wx, wy) {
        return {
            x: wx * this.zoom + this.panX,
            y: wy * this.zoom + this.panY
        };
    }

    snapToGrid(val) {
        if (!this.gridSnap) return val;
        return Math.round(val / this.gridSize) * this.gridSize;
    }

    snapPoint(wx, wy) {
        return {
            x: this.snapToGrid(wx),
            y: this.snapToGrid(wy)
        };
    }

    // ─── Zoom ───
    zoomAt(screenX, screenY, factor) {
        const worldBefore = this.screenToWorld(screenX, screenY);
        this.zoom = Math.max(this.minZoom, Math.min(this.maxZoom, this.zoom * factor));
        const worldAfter = this.screenToWorld(screenX, screenY);
        this.panX += (worldAfter.x - worldBefore.x) * this.zoom;
        this.panY += (worldAfter.y - worldBefore.y) * this.zoom;
        this._updateZoomDisplay();
        this.render();
    }

    setZoom(level) {
        const cx = this.canvas.clientWidth / 2;
        const cy = this.canvas.clientHeight / 2;
        const worldBefore = this.screenToWorld(cx, cy);
        this.zoom = Math.max(this.minZoom, Math.min(this.maxZoom, level));
        const worldAfter = this.screenToWorld(cx, cy);
        this.panX += (worldAfter.x - worldBefore.x) * this.zoom;
        this.panY += (worldAfter.y - worldBefore.y) * this.zoom;
        this._updateZoomDisplay();
        this.render();
    }

    zoomToFit() {
        if (this.components.length === 0 && this.wires.length === 0) {
            this.panX = this.canvas.clientWidth / 2;
            this.panY = this.canvas.clientHeight / 2;
            this.zoom = 1;
            this._updateZoomDisplay();
            this.render();
            return;
        }

        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

        this.components.forEach(c => {
            minX = Math.min(minX, c.x - 50);
            minY = Math.min(minY, c.y - 50);
            maxX = Math.max(maxX, c.x + 50);
            maxY = Math.max(maxY, c.y + 50);
        });

        this.wires.forEach(w => {
            w.points.forEach(p => {
                minX = Math.min(minX, p.x);
                minY = Math.min(minY, p.y);
                maxX = Math.max(maxX, p.x);
                maxY = Math.max(maxY, p.y);
            });
        });

        const padding = 80;
        const w = maxX - minX + padding * 2;
        const h = maxY - minY + padding * 2;
        const scaleX = this.canvas.clientWidth / w;
        const scaleY = this.canvas.clientHeight / h;
        this.zoom = Math.min(scaleX, scaleY, 2);

        const centerX = (minX + maxX) / 2;
        const centerY = (minY + maxY) / 2;
        this.panX = this.canvas.clientWidth / 2 - centerX * this.zoom;
        this.panY = this.canvas.clientHeight / 2 - centerY * this.zoom;

        this._updateZoomDisplay();
        this.render();
    }

    _updateZoomDisplay() {
        const el = document.getElementById('zoom-display');
        if (el) el.textContent = Math.round(this.zoom * 100) + '%';
    }

    // ─── Pan ───
    startPan(sx, sy) {
        this.isPanning = true;
        this.panStartX = sx - this.panX;
        this.panStartY = sy - this.panY;
    }

    updatePan(sx, sy) {
        if (!this.isPanning) return;
        this.panX = sx - this.panStartX;
        this.panY = sy - this.panStartY;
        this.render();
    }

    endPan() {
        this.isPanning = false;
    }

    // ─── Component Management ───
    generateId(type) {
        // Generate unique ID like R1, R2, C1, etc.
        const prefixMap = {
            resistor: 'R', capacitor: 'C', inductor: 'L',
            voltage_source: 'V', current_source: 'I', battery: 'BAT',
            diode: 'D', zener_diode: 'DZ', led: 'LED',
            bjt_npn: 'Q', bjt_pnp: 'Q', mosfet_n: 'M', mosfet_p: 'M',
            opamp: 'U', spst_switch: 'SW', spdt_switch: 'SW',
            push_button: 'SW', fuse: 'F', relay: 'K',
            tvs_diode: 'TVS', transformer: 'T', dc_motor: 'MOT',
            solenoid: 'SOL', ground: 'GND', voltmeter: 'VM',
            ammeter: 'AM', potentiometer: 'POT', thermistor: 'TH',
            crystal: 'Y', signal_generator: 'SG', pwm_source: 'PWM'
        };
        const prefix = prefixMap[type] || 'X';
        if (!this.counters[prefix]) this.counters[prefix] = 0;
        this.counters[prefix]++;
        return prefix + this.counters[prefix];
    }

    addComponent(type, category, wx, wy, params = {}) {
        this.saveUndoState();
        const snapped = this.snapPoint(wx, wy);
        const comp = {
            id: this.generateId(type),
            type: type,
            category: category,
            x: snapped.x,
            y: snapped.y,
            rotation: 0,
            params: { ...params },
            selected: false
        };
        this.components.push(comp);
        this.render();
        return comp;
    }

    removeComponent(id) {
        this.saveUndoState();
        this.components = this.components.filter(c => c.id !== id);
        // Also remove connected wires
        this.wires = this.wires.filter(w => {
            const hasConn = w.connections && w.connections.some(c => c.component === id);
            return !hasConn;
        });
        this.render();
    }

    rotateComponent(id) {
        this.saveUndoState();
        const comp = this.components.find(c => c.id === id);
        if (comp) {
            comp.rotation = (comp.rotation + 90) % 360;
            this.render();
        }
    }

    // ─── Selection ───
    selectAt(wx, wy) {
        // Clear previous selection
        this.components.forEach(c => c.selected = false);
        this.selectedItems = [];

        // Check components
        const comp = this.hitTestComponent(wx, wy);
        if (comp) {
            comp.selected = true;
            this.selectedItems = [comp];
            this.render();
            return comp;
        }

        // Check wires
        const wireHit = this.hitTestWire(wx, wy);
        if (wireHit) {
            wireHit.wire.selected = true;
            this.selectedItems = [wireHit.wire];
            this.render();
            return wireHit.wire;
        }

        this.render();
        return null;
    }

    hitTestComponent(wx, wy) {
        // Reverse order to hit top-most first
        for (let i = this.components.length - 1; i >= 0; i--) {
            const c = this.components[i];
            const dx = wx - c.x;
            const dy = wy - c.y;
            // Simple bounding box (50px radius)
            if (Math.abs(dx) < 45 && Math.abs(dy) < 40) {
                return c;
            }
        }
        return null;
    }

    hitTestWire(wx, wy) {
        const threshold = 6 / this.zoom;
        for (let i = this.wires.length - 1; i >= 0; i--) {
            const w = this.wires[i];
            for (let j = 0; j < w.points.length - 1; j++) {
                const p1 = w.points[j];
                const p2 = w.points[j + 1];
                const dist = this._pointToSegmentDist(wx, wy, p1.x, p1.y, p2.x, p2.y);
                if (dist < threshold) {
                    return { wire: w, segmentIndex: j, point: { x: wx, y: wy } };
                }
            }
        }
        return null;
    }

    hitTestNode(wx, wy) {
        const threshold = 8 / this.zoom;
        for (const w of this.wires) {
            for (let i = 0; i < w.points.length; i++) {
                const p = w.points[i];
                const dist = Math.hypot(wx - p.x, wy - p.y);
                if (dist < threshold) {
                    return { wire: w, pointIndex: i, point: p };
                }
            }
        }
        return null;
    }

    findPinAt(wx, wy) {
        const threshold = 10 / this.zoom;
        for (const comp of this.components) {
            const pins = getAbsolutePinPositions(comp);
            for (const pin of pins) {
                const dist = Math.hypot(wx - pin.x, wy - pin.y);
                if (dist < threshold) {
                    return { component: comp, pin: pin };
                }
            }
        }
        return null;
    }

    _pointToSegmentDist(px, py, x1, y1, x2, y2) {
        const dx = x2 - x1;
        const dy = y2 - y1;
        const lenSq = dx * dx + dy * dy;
        if (lenSq === 0) return Math.hypot(px - x1, py - y1);
        let t = ((px - x1) * dx + (py - y1) * dy) / lenSq;
        t = Math.max(0, Math.min(1, t));
        const projX = x1 + t * dx;
        const projY = y1 + t * dy;
        return Math.hypot(px - projX, py - projY);
    }

    // ─── Undo / Redo ───
    saveUndoState() {
        const state = {
            components: JSON.parse(JSON.stringify(this.components)),
            wires: JSON.parse(JSON.stringify(this.wires))
        };
        this.undoStack.push(state);
        if (this.undoStack.length > this.maxUndo) this.undoStack.shift();
        this.redoStack = [];
    }

    undo() {
        if (this.undoStack.length === 0) return;
        const currentState = {
            components: JSON.parse(JSON.stringify(this.components)),
            wires: JSON.parse(JSON.stringify(this.wires))
        };
        this.redoStack.push(currentState);
        const prev = this.undoStack.pop();
        this.components = prev.components;
        this.wires = prev.wires;
        this.selectedItems = [];
        this.render();
    }

    redo() {
        if (this.redoStack.length === 0) return;
        const currentState = {
            components: JSON.parse(JSON.stringify(this.components)),
            wires: JSON.parse(JSON.stringify(this.wires))
        };
        this.undoStack.push(currentState);
        const next = this.redoStack.pop();
        this.components = next.components;
        this.wires = next.wires;
        this.selectedItems = [];
        this.render();
    }

    // ─── Clear ───
    clear() {
        this.saveUndoState();
        this.components = [];
        this.wires = [];
        this.nodes = [];
        this.selectedItems = [];
        this.counters = {};
        this.render();
    }

    // ─── Export circuit as JSON ───
    toJSON() {
        return {
            components: this.components.map(c => ({
                id: c.id,
                type: c.type,
                category: c.category,
                params: c.params,
                x: c.x,
                y: c.y,
                rotation: c.rotation
            })),
            wires: this.wires.map(w => ({
                id: w.id,
                points: w.points,
                connections: w.connections || []
            })),
            nodes: this._buildNodes()
        };
    }

    loadJSON(data) {
        this.components = (data.components || []).map(c => ({ ...c, selected: false }));
        this.wires = (data.wires || []).map(w => ({ ...w, selected: false }));
        // Rebuild counters
        this.counters = {};
        this.components.forEach(c => {
            const match = c.id.match(/^([A-Z]+)(\d+)$/);
            if (match) {
                const prefix = match[1];
                const num = parseInt(match[2]);
                this.counters[prefix] = Math.max(this.counters[prefix] || 0, num);
            }
        });
        this.selectedItems = [];
        this.undoStack = [];
        this.redoStack = [];
        this.render();
    }

    _buildNodes() {
        // Build electrical nodes from wire connections
        const nodes = [];
        const nodeMap = new Map(); // key -> node_id
        let nodeCounter = 0;

        // Find connections: wire endpoint touching component pin
        this.wires.forEach(w => {
            if (!w.connections) w.connections = [];
            w.connections = [];

            const startPt = w.points[0];
            const endPt = w.points[w.points.length - 1];

            [startPt, endPt].forEach(pt => {
                const pinHit = this.findPinAt(pt.x, pt.y);
                if (pinHit) {
                    w.connections.push({
                        component: pinHit.component.id,
                        pin: pinHit.pin.id
                    });
                }
            });
        });

        // Group connected pins into nodes
        const unionFind = {};
        const find = (x) => {
            if (unionFind[x] === undefined) unionFind[x] = x;
            if (unionFind[x] !== x) unionFind[x] = find(unionFind[x]);
            return unionFind[x];
        };
        const union = (a, b) => {
            const ra = find(a);
            const rb = find(b);
            if (ra !== rb) unionFind[ra] = rb;
        };

        // Each wire connects its endpoints
        this.wires.forEach(w => {
            const conns = w.connections;
            for (let i = 0; i < conns.length - 1; i++) {
                const keyA = `${conns[i].component}:${conns[i].pin}`;
                const keyB = `${conns[i + 1].component}:${conns[i + 1].pin}`;
                union(keyA, keyB);
            }

            // Also check for wire-to-wire junctions
            this.wires.forEach(w2 => {
                if (w === w2) return;
                const w1Start = w.points[0];
                const w1End = w.points[w.points.length - 1];
                const w2Start = w2.points[0];
                const w2End = w2.points[w2.points.length - 1];

                const threshold = 5;
                const pts = [[w1Start, w2Start], [w1Start, w2End], [w1End, w2Start], [w1End, w2End]];
                pts.forEach(([p1, p2]) => {
                    if (Math.hypot(p1.x - p2.x, p1.y - p2.y) < threshold) {
                        // These wire endpoints are at the same point — merge their connections
                        if (w.connections.length > 0 && w2.connections.length > 0) {
                            const keyA = `${w.connections[0].component}:${w.connections[0].pin}`;
                            const keyB = `${w2.connections[0].component}:${w2.connections[0].pin}`;
                            union(keyA, keyB);
                        }
                    }
                });
            });
        });

        // Build node list
        const rootToNode = {};
        const allKeys = new Set(Object.keys(unionFind));
        allKeys.forEach(key => {
            const root = find(key);
            if (!rootToNode[root]) {
                const nodeId = `N${nodeCounter++}`;
                rootToNode[root] = { id: nodeId, connections: [] };
            }
            const [comp, pin] = key.split(':');
            rootToNode[root].connections.push({
                type: 'component_pin',
                component: comp,
                pin: pin
            });
        });

        return Object.values(rootToNode);
    }

    // ─── Rendering ───
    render() {
        const ctx = this.ctx;
        const w = this.canvas.clientWidth;
        const h = this.canvas.clientHeight;

        // Clear
        ctx.fillStyle = '#0d0f15';
        ctx.fillRect(0, 0, w, h);

        ctx.save();
        ctx.translate(this.panX, this.panY);
        ctx.scale(this.zoom, this.zoom);

        this._drawGrid(ctx, w, h);
        this._drawWires(ctx);
        this._drawComponents(ctx);
        this._drawPins(ctx);
        this._drawNodes(ctx);

        ctx.restore();
    }

    _drawGrid(ctx, screenW, screenH) {
        const gs = this.gridSize;
        const topLeft = this.screenToWorld(0, 0);
        const bottomRight = this.screenToWorld(screenW, screenH);

        const startX = Math.floor(topLeft.x / gs) * gs;
        const startY = Math.floor(topLeft.y / gs) * gs;
        const endX = Math.ceil(bottomRight.x / gs) * gs;
        const endY = Math.ceil(bottomRight.y / gs) * gs;

        // Minor grid
        ctx.strokeStyle = '#1a1d2a';
        ctx.lineWidth = 0.5 / this.zoom;
        ctx.beginPath();
        for (let x = startX; x <= endX; x += gs) {
            if (x % (gs * 5) === 0) continue; // Skip majors
            ctx.moveTo(x, startY);
            ctx.lineTo(x, endY);
        }
        for (let y = startY; y <= endY; y += gs) {
            if (y % (gs * 5) === 0) continue;
            ctx.moveTo(startX, y);
            ctx.lineTo(endX, y);
        }
        ctx.stroke();

        // Major grid
        ctx.strokeStyle = '#232640';
        ctx.lineWidth = 0.8 / this.zoom;
        ctx.beginPath();
        for (let x = startX; x <= endX; x += gs) {
            if (x % (gs * 5) !== 0) continue;
            ctx.moveTo(x, startY);
            ctx.lineTo(x, endY);
        }
        for (let y = startY; y <= endY; y += gs) {
            if (y % (gs * 5) !== 0) continue;
            ctx.moveTo(startX, y);
            ctx.lineTo(endX, y);
        }
        ctx.stroke();
    }

    _drawComponents(ctx) {
        this.components.forEach(comp => {
            renderComponentSymbol(ctx, comp.type, comp.x, comp.y, comp.rotation, comp.selected);

            // Draw label
            ctx.save();
            ctx.font = `${11 / Math.max(this.zoom, 0.5)}px Inter`;
            ctx.fillStyle = comp.selected ? '#36d6e7' : '#9498b0';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'top';

            const labelY = comp.y + 28;
            ctx.fillText(comp.id, comp.x, labelY);

            // Value label
            const valueStr = this._getValueString(comp);
            if (valueStr) {
                ctx.font = `${10 / Math.max(this.zoom, 0.5)}px JetBrains Mono`;
                ctx.fillStyle = comp.selected ? '#7b93fd' : '#636780';
                ctx.fillText(valueStr, comp.x, labelY + 14);
            }
            ctx.restore();
        });
    }

    _getValueString(comp) {
        const p = comp.params;
        switch (comp.type) {
            case 'resistor': return this._formatValue(p.resistance, 'Ω');
            case 'capacitor': return this._formatValue(p.capacitance, 'F');
            case 'inductor': return this._formatValue(p.inductance, 'H');
            case 'voltage_source':
            case 'battery': return this._formatValue(p.voltage, 'V');
            case 'current_source': return this._formatValue(p.current, 'A');
            case 'diode':
            case 'led': return p.vf ? p.vf + 'V' : '';
            case 'zener_diode': return p.vz ? p.vz + 'V' : '';
            case 'bjt_npn':
            case 'bjt_pnp': return p.hfe ? 'β=' + p.hfe : '';
            default: return '';
        }
    }

    _formatValue(val, unit) {
        if (val === undefined || val === null) return '';
        const abs = Math.abs(val);
        if (abs >= 1e9) return (val / 1e9).toFixed(1) + 'G' + unit;
        if (abs >= 1e6) return (val / 1e6).toFixed(1) + 'M' + unit;
        if (abs >= 1e3) return (val / 1e3).toFixed(1) + 'k' + unit;
        if (abs >= 1) return val.toFixed(1) + unit;
        if (abs >= 1e-3) return (val * 1e3).toFixed(1) + 'm' + unit;
        if (abs >= 1e-6) return (val * 1e6).toFixed(1) + 'µ' + unit;
        if (abs >= 1e-9) return (val * 1e9).toFixed(1) + 'n' + unit;
        if (abs >= 1e-12) return (val * 1e12).toFixed(1) + 'p' + unit;
        return val.toExponential(1) + unit;
    }

    _drawWires(ctx) {
        this.wires.forEach(w => {
            if (w.points.length < 2) return;

            ctx.strokeStyle = w.selected ? '#7b93fd' : '#4a6cf7';
            ctx.lineWidth = w.selected ? 2.5 / this.zoom : 2 / this.zoom;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';

            ctx.beginPath();
            ctx.moveTo(w.points[0].x, w.points[0].y);
            for (let i = 1; i < w.points.length; i++) {
                ctx.lineTo(w.points[i].x, w.points[i].y);
            }
            ctx.stroke();
        });
    }

    _drawPins(ctx) {
        // Draw pin dots for all components
        this.components.forEach(comp => {
            const pins = getAbsolutePinPositions(comp);
            pins.forEach(pin => {
                const isConnected = this._isPinConnected(comp.id, pin.id);

                ctx.beginPath();
                ctx.arc(pin.x, pin.y, 3 / this.zoom, 0, Math.PI * 2);

                if (this.hoveredPin &&
                    this.hoveredPin.component.id === comp.id &&
                    this.hoveredPin.pin.id === pin.id) {
                    ctx.fillStyle = '#36d6e7';
                    ctx.fill();
                } else if (isConnected) {
                    ctx.fillStyle = '#4a6cf7';
                    ctx.fill();
                } else {
                    ctx.strokeStyle = comp.selected ? '#36d6e7' : '#636780';
                    ctx.lineWidth = 1 / this.zoom;
                    ctx.stroke();
                }
            });
        });
    }

    _drawNodes(ctx) {
        // Draw filled dots at wire endpoints, bends, and junctions
        this.wires.forEach(w => {
            w.points.forEach((p, i) => {
                const isEndpoint = (i === 0 || i === w.points.length - 1);
                const isBend = !isEndpoint;
                const isJunction = this._isJunctionPoint(p.x, p.y, w);

                ctx.beginPath();
                if (isJunction) {
                    ctx.arc(p.x, p.y, 4.5 / this.zoom, 0, Math.PI * 2);
                    ctx.fillStyle = '#4a6cf7';
                } else if (isEndpoint) {
                    ctx.arc(p.x, p.y, 3.5 / this.zoom, 0, Math.PI * 2);
                    ctx.fillStyle = '#4a6cf7';
                } else {
                    ctx.arc(p.x, p.y, 3 / this.zoom, 0, Math.PI * 2);
                    ctx.fillStyle = w.selected ? '#7b93fd' : '#4a6cf7';
                }
                ctx.fill();
            });
        });
    }

    _isPinConnected(compId, pinId) {
        return this.wires.some(w =>
            w.connections && w.connections.some(c => c.component === compId && c.pin === pinId)
        );
    }

    _isJunctionPoint(x, y, excludeWire) {
        let count = 0;
        const threshold = 3;
        this.wires.forEach(w => {
            w.points.forEach(p => {
                if (Math.hypot(x - p.x, y - p.y) < threshold) {
                    count++;
                }
            });
        });
        // A junction needs at least 3 connections (2 from same wire endpoints count as 2)
        return count >= 3;
    }

    // Draw preview wire (while drawing)
    drawPreviewWire(points, currentMouse) {
        if (points.length === 0) return;

        this.render(); // Redraw base

        const ctx = this.ctx;
        ctx.save();
        ctx.translate(this.panX, this.panY);
        ctx.scale(this.zoom, this.zoom);

        ctx.strokeStyle = '#7b93fd';
        ctx.lineWidth = 2 / this.zoom;
        ctx.setLineDash([5 / this.zoom, 3 / this.zoom]);
        ctx.lineCap = 'round';

        ctx.beginPath();
        ctx.moveTo(points[0].x, points[0].y);
        for (let i = 1; i < points.length; i++) {
            ctx.lineTo(points[i].x, points[i].y);
        }

        // Draw from last point to current mouse with Manhattan routing
        if (currentMouse) {
            const last = points[points.length - 1];
            const midX = currentMouse.x;
            ctx.lineTo(midX, last.y);
            ctx.lineTo(midX, currentMouse.y);
        }

        ctx.stroke();
        ctx.setLineDash([]);

        // Draw node dots on preview points
        points.forEach(p => {
            ctx.beginPath();
            ctx.arc(p.x, p.y, 3.5 / this.zoom, 0, Math.PI * 2);
            ctx.fillStyle = '#36d6e7';
            ctx.fill();
        });

        ctx.restore();
    }

    // Draw placement preview (component being placed)
    drawPlacementPreview(type, wx, wy) {
        this.render();

        const ctx = this.ctx;
        ctx.save();
        ctx.translate(this.panX, this.panY);
        ctx.scale(this.zoom, this.zoom);

        ctx.globalAlpha = 0.6;
        renderComponentSymbol(ctx, type, wx, wy, 0, false);
        ctx.globalAlpha = 1;

        ctx.restore();
    }
}
