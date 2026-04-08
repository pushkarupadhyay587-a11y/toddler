/* ═══════════════════════════════════════════════════════════════
   TODDLER — Wire Drawing Engine (MS Paint Style)
   
   Wire drawing mechanism:
   - Click on a pin or empty canvas to START a wire
   - Click again to add a BEND POINT (node at each bend)
   - Double-click or click on a pin to END the wire
   - Wires use Manhattan routing (horizontal/vertical segments)
   - Nodes (dots) appear at: endpoints, junctions, bends
   - Click on existing wire to add a new waypoint
   - Drag nodes to reshape wires
   ═══════════════════════════════════════════════════════════════ */

class WireDrawer {
    constructor(circuitCanvas) {
        this.canvas = circuitCanvas;
        this.isDrawing = false;
        this.currentPoints = [];   // Points placed so far
        this.startPin = null;      // Pin we started from (if any)
        this.wireIdCounter = 0;

        // Node dragging
        this.isDraggingNode = false;
        this.dragTarget = null;    // { wire, pointIndex }
    }

    /**
     * Start drawing a wire at the given world coordinates.
     * If snapping to a pin, records the connection.
     */
    startWire(wx, wy) {
        const snapped = this.canvas.snapPoint(wx, wy);

        // Check if starting on a component pin
        const pinHit = this.canvas.findPinAt(wx, wy);
        if (pinHit) {
            snapped.x = pinHit.pin.x;
            snapped.y = pinHit.pin.y;
            this.startPin = pinHit;
        } else {
            this.startPin = null;
        }

        this.isDrawing = true;
        this.currentPoints = [{ x: snapped.x, y: snapped.y }];
    }

    /**
     * Add a bend point to the current wire.
     * Uses Manhattan routing: creates a horizontal then vertical segment.
     */
    addBendPoint(wx, wy) {
        if (!this.isDrawing || this.currentPoints.length === 0) return;

        const snapped = this.canvas.snapPoint(wx, wy);
        const last = this.currentPoints[this.currentPoints.length - 1];

        // Manhattan routing: add intermediate point
        if (last.x !== snapped.x && last.y !== snapped.y) {
            // Add the corner point (horizontal first, then vertical)
            this.currentPoints.push({ x: snapped.x, y: last.y });
        }

        this.currentPoints.push({ x: snapped.x, y: snapped.y });
    }

    /**
     * End the wire at the given position.
     * Creates the wire object and adds it to the canvas.
     */
    endWire(wx, wy) {
        if (!this.isDrawing) return null;

        const snapped = this.canvas.snapPoint(wx, wy);

        // Check if ending on a pin
        const pinHit = this.canvas.findPinAt(wx, wy);
        if (pinHit) {
            snapped.x = pinHit.pin.x;
            snapped.y = pinHit.pin.y;
        }

        const last = this.currentPoints[this.currentPoints.length - 1];

        // Add final Manhattan routing
        if (last.x !== snapped.x && last.y !== snapped.y) {
            this.currentPoints.push({ x: snapped.x, y: last.y });
        }
        if (last.x !== snapped.x || last.y !== snapped.y) {
            this.currentPoints.push({ x: snapped.x, y: snapped.y });
        }

        // Don't create zero-length wires
        if (this.currentPoints.length < 2) {
            this.cancelWire();
            return null;
        }

        // Check if wire has actual length
        const totalLen = this._calcTotalLength(this.currentPoints);
        if (totalLen < 5) {
            this.cancelWire();
            return null;
        }

        this.canvas.saveUndoState();

        // Create wire object
        const wire = {
            id: 'W' + (++this.wireIdCounter),
            points: [...this.currentPoints],
            connections: [],
            selected: false
        };

        // Record connections
        if (this.startPin) {
            wire.connections.push({
                component: this.startPin.component.id,
                pin: this.startPin.pin.id
            });
        }
        if (pinHit) {
            wire.connections.push({
                component: pinHit.component.id,
                pin: pinHit.pin.id
            });
        }

        this.canvas.wires.push(wire);
        this.isDrawing = false;
        this.currentPoints = [];
        this.startPin = null;
        this.canvas.render();

        return wire;
    }

    /**
     * Cancel the current wire drawing operation.
     */
    cancelWire() {
        this.isDrawing = false;
        this.currentPoints = [];
        this.startPin = null;
        this.canvas.render();
    }

    /**
     * Get the current preview (for rendering dashed line).
     */
    getPreviewPoints() {
        return this.currentPoints;
    }

    /**
     * Add a new waypoint to an existing wire by clicking on it.
     * Splits the segment at the click point.
     */
    addWaypointToWire(wx, wy) {
        const hitResult = this.canvas.hitTestWire(wx, wy);
        if (!hitResult) return false;

        this.canvas.saveUndoState();

        const wire = hitResult.wire;
        const segIdx = hitResult.segmentIndex;
        const snapped = this.canvas.snapPoint(wx, wy);

        // Project click point onto the segment (snap to orthogonal)
        const p1 = wire.points[segIdx];
        const p2 = wire.points[segIdx + 1];

        let newPoint;
        if (Math.abs(p2.x - p1.x) > Math.abs(p2.y - p1.y)) {
            // Horizontal segment — insert point along X
            newPoint = { x: snapped.x, y: p1.y };
        } else {
            // Vertical segment — insert point along Y
            newPoint = { x: p1.x, y: snapped.y };
        }

        // Insert new point
        wire.points.splice(segIdx + 1, 0, newPoint);
        this.canvas.render();
        return true;
    }

    /**
     * Start dragging a wire node.
     */
    startNodeDrag(wx, wy) {
        const nodeHit = this.canvas.hitTestNode(wx, wy);
        if (!nodeHit) return false;

        this.isDraggingNode = true;
        this.dragTarget = nodeHit;
        return true;
    }

    /**
     * Update node position during drag.
     */
    updateNodeDrag(wx, wy) {
        if (!this.isDraggingNode || !this.dragTarget) return;

        const snapped = this.canvas.snapPoint(wx, wy);
        const wire = this.dragTarget.wire;
        const idx = this.dragTarget.pointIndex;

        wire.points[idx].x = snapped.x;
        wire.points[idx].y = snapped.y;

        this.canvas.render();
    }

    /**
     * End node drag.
     */
    endNodeDrag() {
        if (!this.isDraggingNode) return;

        // Update wire connections after drag
        if (this.dragTarget) {
            const wire = this.dragTarget.wire;
            const idx = this.dragTarget.pointIndex;
            const pt = wire.points[idx];

            // Check if dragged onto a pin
            const pinHit = this.canvas.findPinAt(pt.x, pt.y);
            if (pinHit) {
                // Snap to pin
                wire.points[idx].x = pinHit.pin.x;
                wire.points[idx].y = pinHit.pin.y;

                // Update connections
                if (idx === 0 || idx === wire.points.length - 1) {
                    const connIdx = idx === 0 ? 0 : wire.connections.length;
                    const existing = wire.connections.findIndex(c =>
                        c.component === pinHit.component.id && c.pin === pinHit.pin.id
                    );
                    if (existing === -1) {
                        wire.connections.push({
                            component: pinHit.component.id,
                            pin: pinHit.pin.id
                        });
                    }
                }
            }
        }

        this.isDraggingNode = false;
        this.dragTarget = null;
        this.canvas.render();
    }

    /**
     * Delete a wire.
     */
    deleteWire(wireId) {
        this.canvas.saveUndoState();
        this.canvas.wires = this.canvas.wires.filter(w => w.id !== wireId);
        this.canvas.render();
    }

    // ─── Helpers ───

    _calcTotalLength(points) {
        let len = 0;
        for (let i = 1; i < points.length; i++) {
            len += Math.hypot(
                points[i].x - points[i - 1].x,
                points[i].y - points[i - 1].y
            );
        }
        return len;
    }
}
