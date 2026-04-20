/* ═══════════════════════════════════════════════════════════════
   TODDLER — Application Controller
   Coordinates all modules and handles user interaction (mouse/keyboard)
   ═══════════════════════════════════════════════════════════════ */

document.addEventListener('DOMContentLoaded', () => {
    // ─── Initialize Modules ───
    const canvasEl = document.getElementById('circuit-canvas');
    const canvasEngine = new CircuitCanvas(canvasEl);
    const wireDrawer = new WireDrawer(canvasEngine);
    const propsPanel = new PropertiesPanel(canvasEngine);
    const simEngine = new SimulationEngine(canvasEngine, propsPanel);

    // ─── State ───
    let currentTool = 'select'; // 'select' or 'wire'
    let isDraggingComp = false;
    let dragStartX = 0, dragStartY = 0;
    
    // ─── Canvas Mouse Events ───
    
    canvasEl.addEventListener('mousedown', (e) => {
        const rect = canvasEl.getBoundingClientRect();
        const sx = e.clientX - rect.left;
        const sy = e.clientY - rect.top;
        const world = canvasEngine.screenToWorld(sx, sy);

        // Middle click = Pan
        if (e.button === 1 || (e.button === 0 && e.altKey)) {
            canvasEngine.startPan(sx, sy);
            return;
        }

        if (e.button !== 0) return; // Left click only below

        if (currentTool === 'select') {
            // Check if clicking a selected Node to drag it (from wires)
            if (wireDrawer.startNodeDrag(world.x, world.y)) {
                return;
            }

            // Check if clicking existing wire to add a waypoint
            if (e.shiftKey) { // Or double click? Let's use shift+click for explicit waypoint
                if (wireDrawer.addWaypointToWire(world.x, world.y)) return;
            }

            // Select
            const clickedItem = canvasEngine.selectAt(world.x, world.y);
            propsPanel.updateSelection(canvasEngine.selectedItems);
            
            if (simEngine.lastResults) {
                propsPanel.displaySimulationResults(simEngine.lastResults);
            }

            // Start drag component
            if (clickedItem && clickedItem.type) {
                isDraggingComp = true;
                dragStartX = sx;
                dragStartY = sy;
                // Store initial positions
                canvasEngine.selectedItems.forEach(c => {
                    c.dragOrigX = c.x;
                    c.OrigY = c.y;
                });
            }

        } else if (currentTool === 'wire') {
            if (!wireDrawer.isDrawing) {
                wireDrawer.startWire(world.x, world.y);
            } else {
                wireDrawer.addBendPoint(world.x, world.y);
            }
        }
    });

    canvasEl.addEventListener('mousemove', (e) => {
        const rect = canvasEl.getBoundingClientRect();
        const sx = e.clientX - rect.left;
        const sy = e.clientY - rect.top;
        const world = canvasEngine.screenToWorld(sx, sy);

        document.getElementById('status-coords').textContent = `x: ${Math.round(world.x)}, y: ${Math.round(world.y)}`;

        if (canvasEngine.isPanning) {
            canvasEngine.updatePan(sx, sy);
            canvasEl.style.cursor = 'grabbing';
            return;
        }

        if (wireDrawer.isDraggingNode) {
            wireDrawer.updateNodeDrag(world.x, world.y);
            canvasEl.style.cursor = 'crosshair';
            return;
        }

        if (isDraggingComp && canvasEngine.selectedItems.some(i => i.type)) {
            const dx = (sx - dragStartX) / canvasEngine.zoom;
            const dy = (sy - dragStartY) / canvasEngine.zoom;
            
            canvasEngine.selectedItems.forEach(c => {
                if (c.type) {
                    const snapped = canvasEngine.snapPoint(c.dragOrigX + dx, c.OrigY + dy);
                    c.x = snapped.x;
                    c.y = snapped.y;
                }
            });
            canvasEngine.render();
            canvasEl.style.cursor = 'move';
            return;
        }

        // Hover detection
        let cursor = currentTool === 'wire' ? 'crosshair' : 'default';
        let foundPin = false;

        const pinHit = canvasEngine.findPinAt(world.x, world.y);
        if (pinHit) {
            canvasEngine.hoveredPin = pinHit;
            foundPin = true;
            cursor = 'cell';
        } else {
            canvasEngine.hoveredPin = null;
        }

        if (currentTool === 'select' && !foundPin) {
            const compHit = canvasEngine.hitTestComponent(world.x, world.y);
            if (compHit) cursor = 'grab';
            else {
                const wireHit = canvasEngine.hitTestWire(world.x, world.y);
                if (wireHit) cursor = 'pointer';
            }
        }

        canvasEl.style.cursor = cursor;

        // Preview wire
        if (wireDrawer.isDrawing) {
            const snapped = canvasEngine.snapPoint(world.x, world.y);
            // Snap to pin if found
            if (pinHit) {
                snapped.x = pinHit.pin.x;
                snapped.y = pinHit.pin.y;
            }
            wireDrawer.drawPreviewWire(wireDrawer.getPreviewPoints(), snapped);
            canvasEngine.hoveredPin = pinHit;
        } else {
            canvasEngine.render(); // Update hover state
        }
    });

    canvasEl.addEventListener('mouseup', (e) => {
        if (e.button === 1 || (e.button === 0 && canvasEngine.isPanning)) {
            canvasEngine.endPan();
            return;
        }

        if (wireDrawer.isDraggingNode) {
            canvasEngine.saveUndoState(); // Save before end
            wireDrawer.endNodeDrag();
            // Invalidate simulation
            simEngine.clearResults();
            return;
        }

        if (isDraggingComp) {
            isDraggingComp = false;
            // Add an undo state if actually moved
            // (In a real app, would check if coords changed)
            if (canvasEngine.selectedItems.length > 0) {
                 simEngine.clearResults();
            }
        }
    });

    canvasEl.addEventListener('dblclick', (e) => {
        if (currentTool === 'wire' && wireDrawer.isDrawing) {
            const rect = canvasEl.getBoundingClientRect();
            const sx = e.clientX - rect.left;
            const sy = e.clientY - rect.top;
            const world = canvasEngine.screenToWorld(sx, sy);
            
            wireDrawer.endWire(world.x, world.y);
            simEngine.clearResults();
        } else if (currentTool === 'select') {
            const rect = canvasEl.getBoundingClientRect();
            const sx = e.clientX - rect.left;
            const sy = e.clientY - rect.top;
            const world = canvasEngine.screenToWorld(sx, sy);
            
            const pinHit = canvasEngine.findPinAt(world.x, world.y);
            if (pinHit) {
                // Quick start a wire from pin even in select mode
                setTool('wire');
                wireDrawer.startWire(world.x, world.y);
            }
        }
    });

    // Zoom on wheel
    canvasEl.addEventListener('wheel', (e) => {
        e.preventDefault();
        const rect = canvasEl.getBoundingClientRect();
        const sx = e.clientX - rect.left;
        const sy = e.clientY - rect.top;

        const factor = e.deltaY > 0 ? 0.9 : 1.1;
        canvasEngine.zoomAt(sx, sy, factor);
    }, { passive: false });

    // ─── Keyboard Shortcuts ───
    
    document.addEventListener('keydown', (e) => {
        // Ignore if inside an input
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;

        switch(e.key.toLowerCase()) {
            case 'delete':
            case 'backspace':
                if (canvasEngine.selectedItems.length > 0) {
                    canvasEngine.selectedItems.forEach(item => {
                        if (item.type) canvasEngine.removeComponent(item.id);
                        else if (item.points) wireDrawer.deleteWire(item.id);
                    });
                    canvasEngine.selectedItems = [];
                    propsPanel.updateSelection([]);
                    simEngine.clearResults();
                }
                break;
            case 'v':
            case 'escape':
                if (wireDrawer.isDrawing) {
                    wireDrawer.cancelWire();
                } else {
                    setTool('select');
                }
                break;
            case 'w':
                setTool('wire');
                break;
            case 'r':
                if (canvasEngine.selectedItems.length > 0) {
                    canvasEngine.selectedItems.forEach(item => {
                        if (item.type) canvasEngine.rotateComponent(item.id);
                    });
                    simEngine.clearResults();
                }
                break;
            case 'z':
                if (e.ctrlKey || e.metaKey) {
                    if (e.shiftKey) canvasEngine.redo();
                    else canvasEngine.undo();
                    simEngine.clearResults();
                }
                break;
            case 'y':
                if (e.ctrlKey || e.metaKey) {
                    canvasEngine.redo();
                    simEngine.clearResults();
                }
                break;
            case '=':
            case '+':
                canvasEngine.setZoom(canvasEngine.zoom * 1.2);
                break;
            case '-':
                canvasEngine.setZoom(canvasEngine.zoom * 0.8);
                break;
            case 'f':
                canvasEngine.zoomToFit();
                break;
        }
    });

    // ─── Component Library (Drag & Drop) ───

    document.addEventListener('catalog-loaded', (e) => {
        const catalog = e.detail;
        const listEl = document.getElementById('component-list');
        listEl.innerHTML = '';

        for (const [catId, category] of Object.entries(catalog)) {
            const catDiv = document.createElement('div');
            catDiv.className = 'comp-category';

            const header = document.createElement('div');
            header.className = 'comp-category-header';
            header.innerHTML = `<span class="arrow">▼</span> ${category.label}`;
            
            const itemsDiv = document.createElement('div');
            itemsDiv.className = 'comp-category-items';

            header.addEventListener('click', () => {
                header.classList.toggle('collapsed');
                itemsDiv.classList.toggle('collapsed');
            });

            for (const [compId, compDef] of Object.entries(category.components)) {
                const itemDiv = document.createElement('div');
                itemDiv.className = 'comp-item';
                // Add preview icon if available, else generic square
                const svgIcon = ComponentIcons[compId] || `<svg viewBox="0 0 28 16" width="28" height="16"><rect x="4" y="2" width="20" height="12" fill="none" stroke="currentColor" stroke-width="1.2"/></svg>`;
                
                itemDiv.innerHTML = `
                    <div class="comp-icon">${svgIcon}</div>
                    <div class="comp-name">${compDef.name}</div>
                `;

                // Setup Drag
                itemDiv.addEventListener('mousedown', (e) => {
                    if (e.button !== 0) return;
                    startComponentDrag(e, compId, catId, compDef.name);
                });

                itemsDiv.appendChild(itemDiv);
            }

            catDiv.appendChild(header);
            catDiv.appendChild(itemsDiv);
            listEl.appendChild(catDiv);
        }
    });

    // ─── Custom Drag Implementation ───
    let dragData = null;
    let dragGhost = null;

    function startComponentDrag(e, compId, categoryId, name) {
        dragData = { compId, categoryId };
        
        dragGhost = document.createElement('div');
        dragGhost.className = 'drag-ghost';
        dragGhost.textContent = name;
        document.body.appendChild(dragGhost);
        
        updateGhostPos(e);
        
        document.addEventListener('mousemove', handleDragMove);
        document.addEventListener('mouseup', handleDragEnd);
    }

    function updateGhostPos(e) {
        if (dragGhost) {
            dragGhost.style.left = e.clientX + 'px';
            dragGhost.style.top = e.clientY + 'px';
        }
    }

    function handleDragMove(e) {
        updateGhostPos(e);
        // If over canvas, show preview
        const rect = canvasEl.getBoundingClientRect();
        if (e.clientX >= rect.left && e.clientX <= rect.right && 
            e.clientY >= rect.top && e.clientY <= rect.bottom) {
            const sx = e.clientX - rect.left;
            const sy = e.clientY - rect.top;
            const world = canvasEngine.screenToWorld(sx, sy);
            const snapped = canvasEngine.snapPoint(world.x, world.y);
            canvasEngine.drawPlacementPreview(dragData.compId, snapped.x, snapped.y);
        } else {
            canvasEngine.render();
        }
    }

    async function handleDragEnd(e) {
        document.removeEventListener('mousemove', handleDragMove);
        document.removeEventListener('mouseup', handleDragEnd);
        
        if (dragGhost) {
            dragGhost.remove();
            dragGhost = null;
        }

        const rect = canvasEl.getBoundingClientRect();
        // Check if dropped on canvas
        if (e.clientX >= rect.left && e.clientX <= rect.right && 
            e.clientY >= rect.top && e.clientY <= rect.bottom) {
            
            const sx = e.clientX - rect.left;
            const sy = e.clientY - rect.top;
            const world = canvasEngine.screenToWorld(sx, sy);
            
            // Get default params
            try {
                const resp = await fetch(`/api/defaults/${dragData.categoryId}/${dragData.compId}`);
                let params = {};
                if (resp.ok) {
                    params = await resp.json();
                }
                
                const newComp = canvasEngine.addComponent(dragData.compId, dragData.categoryId, world.x, world.y, params);
                setTool('select');
                canvasEngine.selectAt(newComp.x, newComp.y);
                propsPanel.updateSelection([newComp]);
                simEngine.clearResults();
                
            } catch (err) {
                console.error("Failed to fetch defaults", err);
            }
        } else {
            canvasEngine.render();
        }
        
        dragData = null;
    }

    // ─── Search ───
    document.getElementById('component-search').addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase();
        const categories = document.querySelectorAll('.comp-category');
        
        categories.forEach(catEl => {
            const items = catEl.querySelectorAll('.comp-item');
            let anyVisible = false;
            
            items.forEach(el => {
                const name = el.querySelector('.comp-name').textContent.toLowerCase();
                if (name.includes(query)) {
                    el.style.display = 'flex';
                    anyVisible = true;
                } else {
                    el.style.display = 'none';
                }
            });

            const header = catEl.querySelector('.comp-category-header');
            const contents = catEl.querySelector('.comp-category-items');
            
            if (query.trim().length > 0) {
                if (anyVisible) {
                    catEl.style.display = 'block';
                    header.classList.remove('collapsed');
                    contents.classList.remove('collapsed');
                } else {
                    catEl.style.display = 'none';
                }
            } else {
                catEl.style.display = 'block';
            }
        });
    });

    // ─── Toolbar Logic ───
    
    function setTool(toolId) {
        if (wireDrawer.isDrawing) wireDrawer.cancelWire();
        
        currentTool = toolId;
        document.querySelectorAll('.tool-group .tool-btn').forEach(btn => {
            if (btn.dataset.tool) {
                if (btn.dataset.tool === toolId) btn.classList.add('active');
                else btn.classList.remove('active');
            }
        });

        document.getElementById('status-mode').textContent = toolId === 'select' ? 'Select Mode' : 'Wire Mode';
        canvasEl.style.cursor = toolId === 'wire' ? 'crosshair' : 'default';
        canvasEngine.render();
    }

    document.getElementById('tool-select').addEventListener('click', () => setTool('select'));
    document.getElementById('tool-wire').addEventListener('click', () => setTool('wire'));
    
    document.getElementById('tool-zoom-in').addEventListener('click', () => canvasEngine.setZoom(canvasEngine.zoom * 1.2));
    document.getElementById('tool-zoom-out').addEventListener('click', () => canvasEngine.setZoom(canvasEngine.zoom * 0.8));
    document.getElementById('tool-zoom-fit').addEventListener('click', () => canvasEngine.zoomToFit());
    
    document.getElementById('tool-rotate').addEventListener('click', () => {
        canvasEngine.selectedItems.forEach(item => {
            if (item.type) canvasEngine.rotateComponent(item.id);
        });
        simEngine.clearResults();
    });

    document.getElementById('tool-delete').addEventListener('click', () => {
        canvasEngine.selectedItems.forEach(item => {
            if (item.type) canvasEngine.removeComponent(item.id);
            else if (item.points) wireDrawer.deleteWire(item.id);
        });
        canvasEngine.selectedItems = [];
        propsPanel.updateSelection([]);
        simEngine.clearResults();
    });

    document.getElementById('tool-undo').addEventListener('click', () => { canvasEngine.undo(); simEngine.clearResults(); });
    document.getElementById('tool-redo').addEventListener('click', () => { canvasEngine.redo(); simEngine.clearResults(); });

    // ─── Menu Logic ───

    document.getElementById('btn-new').addEventListener('click', () => {
        if (confirm("Clear current circuit?")) {
            canvasEngine.clear();
            simEngine.clearResults();
            propsPanel.updateSelection([]);
        }
    });

    document.getElementById('btn-simulate').addEventListener('click', () => {
        if (typeof simEngine.openSimulationModal === 'function') {
            simEngine.openSimulationModal();
        } else {
            simEngine.runDCAnalysis();
        }
    });

    // Modals
    const saveModal = document.getElementById('save-modal-overlay');
    const openModal = document.getElementById('modal-overlay');

    document.getElementById('btn-save').addEventListener('click', () => {
        saveModal.style.display = 'flex';
        document.getElementById('save-name-input').focus();
    });

    document.getElementById('save-modal-close').addEventListener('click', () => {
        saveModal.style.display = 'none';
    });

    document.getElementById('save-confirm-btn').addEventListener('click', async () => {
        const name = document.getElementById('save-name-input').value;
        if (!name) return;

        try {
            const resp = await fetch('/api/save', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: name,
                    circuit: canvasEngine.toJSON()
                })
            });
            if (resp.ok) {
                saveModal.style.display = 'none';
                simEngine._setStatus(`Saved correctly`, 'var(--accent-green)');
            }
        } catch (err) {
            console.error("Save failed", err);
        }
    });

    document.getElementById('btn-open').addEventListener('click', async () => {
        openModal.style.display = 'flex';
        const listEl = document.getElementById('circuit-file-list');
        listEl.innerHTML = '<div class="props-empty" style="height: 100px;">Loading...</div>';

        try {
            const resp = await fetch('/api/circuits');
            if (resp.ok) {
                const data = await resp.json();
                listEl.innerHTML = '';
                
                if (data.circuits.length === 0) {
                    listEl.innerHTML = '<div class="props-empty" style="height: 100px;">No saved circuits</div>';
                    return;
                }

                data.circuits.forEach(filename => {
                    const item = document.createElement('div');
                    item.className = 'circuit-list-item';
                    item.textContent = filename;
                    item.addEventListener('click', async () => {
                        // Load circuit
                        try {
                            const loadResp = await fetch('/api/load', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ name: filename })
                            });
                            
                            if (loadResp.ok) {
                                const loadData = await loadResp.json();
                                canvasEngine.loadJSON(loadData.circuit);
                                simEngine.clearResults();
                                propsPanel.updateSelection([]);
                                openModal.style.display = 'none';
                                canvasEngine.zoomToFit();
                                simEngine._setStatus(`Loaded ${filename}`, 'var(--accent-green)');
                            }
                        } catch (loadErr) {
                            console.error("Failed to load", loadErr);
                        }
                    });
                    listEl.appendChild(item);
                });
            }
        } catch (err) {
            listEl.innerHTML = '<div class="props-empty" style="height: 100px;">Error loading circuit list</div>';
        }
    });

    document.getElementById('modal-close').addEventListener('click', () => {
        openModal.style.display = 'none';
    });
});
