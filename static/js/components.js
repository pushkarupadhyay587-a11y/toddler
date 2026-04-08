/* ═══════════════════════════════════════════════════════════════
   TODDLER — Component Definitions & Schematic Symbol Renderer
   IEEE/IEC standard schematic symbols drawn on HTML5 Canvas
   ═══════════════════════════════════════════════════════════════ */

const ComponentSymbols = {
    // ─── Drawing helper: all symbols are drawn centered at (0,0) ───
    // Pin positions are relative to component center

    resistor(ctx, w = 40, h = 12) {
        // US zigzag style
        const segs = 6;
        const segW = w / segs;
        ctx.beginPath();
        ctx.moveTo(-w / 2, 0);
        for (let i = 0; i < segs; i++) {
            const x1 = -w / 2 + i * segW + segW * 0.25;
            const x2 = -w / 2 + i * segW + segW * 0.75;
            ctx.lineTo(x1, i % 2 === 0 ? -h / 2 : h / 2);
            ctx.lineTo(x2, i % 2 === 0 ? h / 2 : -h / 2);
        }
        ctx.lineTo(w / 2, 0);
        ctx.stroke();
    },

    capacitor(ctx, w = 12, h = 20) {
        // Two parallel lines
        ctx.beginPath();
        ctx.moveTo(-w / 4, -h / 2);
        ctx.lineTo(-w / 4, h / 2);
        ctx.moveTo(w / 4, -h / 2);
        ctx.lineTo(w / 4, h / 2);
        ctx.stroke();
        // Lead lines
        ctx.beginPath();
        ctx.moveTo(-w / 4 - 20, 0);
        ctx.lineTo(-w / 4, 0);
        ctx.moveTo(w / 4, 0);
        ctx.lineTo(w / 4 + 20, 0);
        ctx.stroke();
    },

    inductor(ctx, w = 40, h = 10) {
        // Half-circle bumps
        const bumps = 4;
        const bumpW = w / bumps;
        ctx.beginPath();
        ctx.moveTo(-w / 2, 0);
        for (let i = 0; i < bumps; i++) {
            const cx = -w / 2 + i * bumpW + bumpW / 2;
            ctx.arc(cx, 0, bumpW / 2, Math.PI, 0, false);
        }
        ctx.stroke();
    },

    potentiometer(ctx) {
        // Resistor body + arrow for wiper
        ComponentSymbols.resistor(ctx, 40, 12);
        // Wiper arrow
        ctx.beginPath();
        ctx.moveTo(0, -20);
        ctx.lineTo(0, -8);
        ctx.lineTo(-4, -12);
        ctx.moveTo(0, -8);
        ctx.lineTo(4, -12);
        ctx.stroke();
    },

    thermistor(ctx) {
        // Resistor body + T line through
        ComponentSymbols.resistor(ctx, 40, 12);
        ctx.beginPath();
        ctx.moveTo(-14, 14);
        ctx.lineTo(14, -14);
        ctx.stroke();
        // T mark
        ctx.font = '8px Inter';
        ctx.fillStyle = ctx.strokeStyle;
        ctx.textAlign = 'left';
        ctx.fillText('t°', 16, -10);
    },

    crystal(ctx) {
        // Capacitor-like plates with rectangle between
        ctx.beginPath();
        ctx.moveTo(-25, 0);
        ctx.lineTo(-8, 0);
        ctx.moveTo(-8, -10);
        ctx.lineTo(-8, 10);
        ctx.moveTo(8, -10);
        ctx.lineTo(8, 10);
        ctx.moveTo(8, 0);
        ctx.lineTo(25, 0);
        ctx.stroke();
        ctx.strokeRect(-5, -7, 10, 14);
    },

    voltage_source(ctx, r = 20) {
        // Circle with + and -
        ctx.beginPath();
        ctx.arc(0, 0, r, 0, Math.PI * 2);
        ctx.stroke();
        // + sign
        ctx.beginPath();
        ctx.moveTo(0, -12);
        ctx.lineTo(0, -4);
        ctx.moveTo(-4, -8);
        ctx.lineTo(4, -8);
        ctx.stroke();
        // - sign
        ctx.beginPath();
        ctx.moveTo(-4, 8);
        ctx.lineTo(4, 8);
        ctx.stroke();
        // Lead lines
        ctx.beginPath();
        ctx.moveTo(0, -r);
        ctx.lineTo(0, -r - 15);
        ctx.moveTo(0, r);
        ctx.lineTo(0, r + 15);
        ctx.stroke();
    },

    current_source(ctx, r = 20) {
        // Circle with arrow
        ctx.beginPath();
        ctx.arc(0, 0, r, 0, Math.PI * 2);
        ctx.stroke();
        // Arrow pointing up
        ctx.beginPath();
        ctx.moveTo(0, 10);
        ctx.lineTo(0, -10);
        ctx.lineTo(-4, -5);
        ctx.moveTo(0, -10);
        ctx.lineTo(4, -5);
        ctx.stroke();
        // Leads
        ctx.beginPath();
        ctx.moveTo(0, -r);
        ctx.lineTo(0, -r - 15);
        ctx.moveTo(0, r);
        ctx.lineTo(0, r + 15);
        ctx.stroke();
    },

    battery(ctx) {
        // Multiple parallel lines (long/short alternating)
        const pairs = 3;
        const gap = 5;
        const startX = -(pairs * gap);
        ctx.beginPath();
        for (let i = 0; i < pairs; i++) {
            const x = startX + i * gap * 2;
            // Long line (positive side)
            ctx.moveTo(x, -12);
            ctx.lineTo(x, 12);
            // Short line (negative side)
            ctx.moveTo(x + gap, -7);
            ctx.lineTo(x + gap, 7);
        }
        ctx.stroke();
        // Leads
        ctx.beginPath();
        ctx.moveTo(0, -12);
        ctx.lineTo(0, -35);
        ctx.moveTo(0, 12);
        ctx.lineTo(0, 35);
        ctx.stroke();
    },

    signal_generator(ctx) {
        ComponentSymbols.voltage_source(ctx, 20);
        // Small sine wave inside
        ctx.beginPath();
        ctx.moveTo(-8, 0);
        ctx.bezierCurveTo(-4, -8, 4, 8, 8, 0);
        ctx.stroke();
    },

    pwm_source(ctx) {
        ComponentSymbols.voltage_source(ctx, 20);
        // PWM wave inside
        ctx.beginPath();
        ctx.moveTo(-8, 4);
        ctx.lineTo(-8, -4);
        ctx.lineTo(-2, -4);
        ctx.lineTo(-2, 4);
        ctx.lineTo(2, 4);
        ctx.lineTo(2, -4);
        ctx.lineTo(8, -4);
        ctx.stroke();
    },

    diode(ctx) {
        // Triangle with bar
        ctx.beginPath();
        ctx.moveTo(-10, -10);
        ctx.lineTo(-10, 10);
        ctx.lineTo(10, 0);
        ctx.closePath();
        ctx.stroke();
        // Bar (cathode)
        ctx.beginPath();
        ctx.moveTo(10, -10);
        ctx.lineTo(10, 10);
        ctx.stroke();
        // Leads
        ctx.beginPath();
        ctx.moveTo(-30, 0);
        ctx.lineTo(-10, 0);
        ctx.moveTo(10, 0);
        ctx.lineTo(30, 0);
        ctx.stroke();
    },

    zener_diode(ctx) {
        ComponentSymbols.diode(ctx);
        // Zener bends on cathode bar
        ctx.beginPath();
        ctx.moveTo(10, -10);
        ctx.lineTo(6, -14);
        ctx.moveTo(10, 10);
        ctx.lineTo(14, 14);
        ctx.stroke();
    },

    led(ctx) {
        ComponentSymbols.diode(ctx);
        // Arrows (light emission)
        ctx.beginPath();
        ctx.moveTo(2, -14);
        ctx.lineTo(8, -20);
        ctx.lineTo(5, -17);
        ctx.moveTo(8, -20);
        ctx.lineTo(8, -16);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(-2, -16);
        ctx.lineTo(4, -22);
        ctx.lineTo(1, -19);
        ctx.moveTo(4, -22);
        ctx.lineTo(4, -18);
        ctx.stroke();
    },

    bjt_npn(ctx) {
        // Circle (optional), base line, collector and emitter
        ctx.beginPath();
        ctx.arc(5, 0, 22, 0, Math.PI * 2);
        ctx.stroke();
        // Base line
        ctx.beginPath();
        ctx.moveTo(-30, 0);
        ctx.lineTo(-8, 0);
        // Vertical bar
        ctx.moveTo(-8, -12);
        ctx.lineTo(-8, 12);
        ctx.stroke();
        // Collector
        ctx.beginPath();
        ctx.moveTo(-8, -7);
        ctx.lineTo(15, -22);
        ctx.lineTo(15, -30);
        ctx.stroke();
        // Emitter with arrow
        ctx.beginPath();
        ctx.moveTo(-8, 7);
        ctx.lineTo(15, 22);
        ctx.lineTo(15, 30);
        ctx.stroke();
        // Arrow on emitter (pointing outward for NPN)
        const ax = 8, ay = 16;
        ctx.beginPath();
        ctx.moveTo(ax, ay);
        ctx.lineTo(ax - 5, ay - 1);
        ctx.moveTo(ax, ay);
        ctx.lineTo(ax - 1, ay - 5);
        ctx.stroke();
    },

    bjt_pnp(ctx) {
        ctx.beginPath();
        ctx.arc(5, 0, 22, 0, Math.PI * 2);
        ctx.stroke();
        // Base line
        ctx.beginPath();
        ctx.moveTo(-30, 0);
        ctx.lineTo(-8, 0);
        ctx.moveTo(-8, -12);
        ctx.lineTo(-8, 12);
        ctx.stroke();
        // Collector (down)
        ctx.beginPath();
        ctx.moveTo(-8, 7);
        ctx.lineTo(15, 22);
        ctx.lineTo(15, 30);
        ctx.stroke();
        // Emitter (up) with arrow pointing IN
        ctx.beginPath();
        ctx.moveTo(-8, -7);
        ctx.lineTo(15, -22);
        ctx.lineTo(15, -30);
        ctx.stroke();
        // Arrow on emitter pointing inward (PNP)
        const ax = -4, ay = -4;
        ctx.beginPath();
        ctx.moveTo(ax, ay);
        ctx.lineTo(ax + 6, ay - 2);
        ctx.moveTo(ax, ay);
        ctx.lineTo(ax + 2, ay + 5);
        ctx.stroke();
    },

    mosfet_n(ctx) {
        // N-Channel MOSFET
        ctx.beginPath();
        ctx.arc(5, 0, 22, 0, Math.PI * 2);
        ctx.stroke();
        // Gate line
        ctx.beginPath();
        ctx.moveTo(-30, 0);
        ctx.lineTo(-10, 0);
        ctx.moveTo(-10, -12);
        ctx.lineTo(-10, 12);
        ctx.stroke();
        // Channel bar (broken for enhancement)
        ctx.beginPath();
        ctx.moveTo(-6, -12);
        ctx.lineTo(-6, -4);
        ctx.moveTo(-6, -2);
        ctx.lineTo(-6, 4);
        ctx.moveTo(-6, 6);
        ctx.lineTo(-6, 12);
        ctx.stroke();
        // Drain
        ctx.beginPath();
        ctx.moveTo(-6, -8);
        ctx.lineTo(15, -8);
        ctx.lineTo(15, -30);
        ctx.stroke();
        // Source
        ctx.beginPath();
        ctx.moveTo(-6, 8);
        ctx.lineTo(15, 8);
        ctx.lineTo(15, 30);
        ctx.stroke();
        // Arrow (N-ch: pointing in)
        ctx.beginPath();
        ctx.moveTo(-6, 0);
        ctx.lineTo(6, 0);
        ctx.lineTo(2, -3);
        ctx.moveTo(6, 0);
        ctx.lineTo(2, 3);
        ctx.stroke();
    },

    mosfet_p(ctx) {
        ctx.beginPath();
        ctx.arc(5, 0, 22, 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(-30, 0);
        ctx.lineTo(-10, 0);
        ctx.moveTo(-10, -12);
        ctx.lineTo(-10, 12);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(-6, -12);
        ctx.lineTo(-6, -4);
        ctx.moveTo(-6, -2);
        ctx.lineTo(-6, 4);
        ctx.moveTo(-6, 6);
        ctx.lineTo(-6, 12);
        ctx.stroke();
        // Drain (bottom for P)
        ctx.beginPath();
        ctx.moveTo(-6, 8);
        ctx.lineTo(15, 8);
        ctx.lineTo(15, 30);
        ctx.stroke();
        // Source (top for P)
        ctx.beginPath();
        ctx.moveTo(-6, -8);
        ctx.lineTo(15, -8);
        ctx.lineTo(15, -30);
        ctx.stroke();
        // Arrow pointing OUT (P-ch)
        ctx.beginPath();
        ctx.moveTo(6, 0);
        ctx.lineTo(-6, 0);
        ctx.lineTo(-2, -3);
        ctx.moveTo(-6, 0);
        ctx.lineTo(-2, 3);
        ctx.stroke();
    },

    opamp(ctx) {
        // Triangle
        ctx.beginPath();
        ctx.moveTo(-20, -25);
        ctx.lineTo(-20, 25);
        ctx.lineTo(25, 0);
        ctx.closePath();
        ctx.stroke();
        // + input
        ctx.beginPath();
        ctx.moveTo(-35, -12);
        ctx.lineTo(-20, -12);
        ctx.stroke();
        ctx.font = '10px Inter';
        ctx.fillStyle = ctx.strokeStyle;
        ctx.textAlign = 'right';
        ctx.fillText('+', -22, -9);
        // - input
        ctx.beginPath();
        ctx.moveTo(-35, 12);
        ctx.lineTo(-20, 12);
        ctx.stroke();
        ctx.fillText('−', -22, 15);
        // Output
        ctx.beginPath();
        ctx.moveTo(25, 0);
        ctx.lineTo(40, 0);
        ctx.stroke();
        // Supply pins
        ctx.beginPath();
        ctx.moveTo(0, -18);
        ctx.lineTo(0, -30);
        ctx.moveTo(0, 18);
        ctx.lineTo(0, 30);
        ctx.stroke();
    },

    spst_switch(ctx) {
        // Open switch
        ctx.beginPath();
        ctx.moveTo(-30, 0);
        ctx.lineTo(-10, 0);
        ctx.stroke();
        // Pivot
        ctx.beginPath();
        ctx.arc(-10, 0, 3, 0, Math.PI * 2);
        ctx.stroke();
        // Arm
        ctx.beginPath();
        ctx.moveTo(-7, 0);
        ctx.lineTo(10, -12);
        ctx.stroke();
        // Contact
        ctx.beginPath();
        ctx.arc(10, 0, 3, 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(13, 0);
        ctx.lineTo(30, 0);
        ctx.stroke();
    },

    spdt_switch(ctx) {
        ctx.beginPath();
        ctx.moveTo(-30, 0);
        ctx.lineTo(-10, 0);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(-10, 0, 3, 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(-7, 0);
        ctx.lineTo(10, -14);
        ctx.stroke();
        // NO contact
        ctx.beginPath();
        ctx.arc(13, -14, 3, 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(16, -14);
        ctx.lineTo(30, -14);
        ctx.stroke();
        // NC contact
        ctx.beginPath();
        ctx.arc(13, 14, 3, 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(16, 14);
        ctx.lineTo(30, 14);
        ctx.stroke();
    },

    push_button(ctx) {
        ctx.beginPath();
        ctx.moveTo(-30, 0);
        ctx.lineTo(-10, 0);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(-10, 0, 3, 0, Math.PI * 2);
        ctx.arc(10, 0, 3, 0, Math.PI * 2);
        ctx.stroke();
        // Spring line
        ctx.beginPath();
        ctx.moveTo(0, -15);
        ctx.lineTo(0, -5);
        ctx.moveTo(-8, -15);
        ctx.lineTo(8, -15);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(13, 0);
        ctx.lineTo(30, 0);
        ctx.stroke();
    },

    fuse(ctx) {
        // Rectangle with S-curve inside
        ctx.strokeRect(-15, -6, 30, 12);
        ctx.beginPath();
        ctx.moveTo(-30, 0);
        ctx.lineTo(-15, 0);
        ctx.moveTo(15, 0);
        ctx.lineTo(30, 0);
        ctx.stroke();
        // S curve inside
        ctx.beginPath();
        ctx.moveTo(-10, 0);
        ctx.bezierCurveTo(-5, -6, 5, 6, 10, 0);
        ctx.stroke();
    },

    relay(ctx) {
        // Coil (left side)
        ComponentSymbols.inductor(ctx, 30, 8);
        // Dashed line separator
        ctx.setLineDash([3, 3]);
        ctx.beginPath();
        ctx.moveTo(0, -10);
        ctx.lineTo(0, -30);
        ctx.stroke();
        ctx.setLineDash([]);
    },

    tvs_diode(ctx) {
        ComponentSymbols.zener_diode(ctx);
    },

    transformer(ctx) {
        // Two inductors with core lines
        ctx.save();
        ctx.translate(-12, 0);
        ComponentSymbols.inductor(ctx, 20, 8);
        ctx.restore();
        ctx.save();
        ctx.translate(12, 0);
        ComponentSymbols.inductor(ctx, 20, 8);
        ctx.restore();
        // Core lines
        ctx.beginPath();
        ctx.moveTo(-2, -14);
        ctx.lineTo(-2, 14);
        ctx.moveTo(2, -14);
        ctx.lineTo(2, 14);
        ctx.stroke();
    },

    dc_motor(ctx) {
        ctx.beginPath();
        ctx.arc(0, 0, 16, 0, Math.PI * 2);
        ctx.stroke();
        ctx.font = '11px Inter';
        ctx.fillStyle = ctx.strokeStyle;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('M', 0, 0);
        // Leads
        ctx.beginPath();
        ctx.moveTo(-30, 0);
        ctx.lineTo(-16, 0);
        ctx.moveTo(16, 0);
        ctx.lineTo(30, 0);
        ctx.stroke();
    },

    solenoid(ctx) {
        ComponentSymbols.inductor(ctx, 40, 10);
    },

    ground(ctx) {
        ctx.beginPath();
        ctx.moveTo(0, -15);
        ctx.lineTo(0, 0);
        ctx.stroke();
        // Three horizontal lines
        ctx.beginPath();
        ctx.moveTo(-12, 0);
        ctx.lineTo(12, 0);
        ctx.moveTo(-8, 5);
        ctx.lineTo(8, 5);
        ctx.moveTo(-4, 10);
        ctx.lineTo(4, 10);
        ctx.stroke();
    },

    voltmeter(ctx) {
        ctx.beginPath();
        ctx.arc(0, 0, 16, 0, Math.PI * 2);
        ctx.stroke();
        ctx.font = '12px Inter';
        ctx.fillStyle = ctx.strokeStyle;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('V', 0, 0);
        ctx.beginPath();
        ctx.moveTo(0, -16);
        ctx.lineTo(0, -30);
        ctx.moveTo(0, 16);
        ctx.lineTo(0, 30);
        ctx.stroke();
    },

    ammeter(ctx) {
        ctx.beginPath();
        ctx.arc(0, 0, 16, 0, Math.PI * 2);
        ctx.stroke();
        ctx.font = '12px Inter';
        ctx.fillStyle = ctx.strokeStyle;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('A', 0, 0);
        ctx.beginPath();
        ctx.moveTo(-30, 0);
        ctx.lineTo(-16, 0);
        ctx.moveTo(16, 0);
        ctx.lineTo(30, 0);
        ctx.stroke();
    }
};

// ─── Sidebar Icon SVGs (small representations for the component list) ───
const ComponentIcons = {
    resistor: `<svg viewBox="0 0 28 16" width="28" height="16"><path d="M2,8 L6,8 L8,2 L10,14 L12,2 L14,14 L16,2 L18,14 L20,2 L22,8 L26,8" fill="none" stroke="currentColor" stroke-width="1.2"/></svg>`,
    capacitor: `<svg viewBox="0 0 28 16" width="28" height="16"><path d="M2,8 L10,8 M10,2 L10,14 M14,2 L14,14 M14,8 L26,8" fill="none" stroke="currentColor" stroke-width="1.2"/></svg>`,
    inductor: `<svg viewBox="0 0 28 16" width="28" height="16"><path d="M2,10 Q6,2 8,10 Q10,2 12,10 Q14,2 16,10 Q18,2 20,10 L26,10" fill="none" stroke="currentColor" stroke-width="1.2"/></svg>`,
    potentiometer: `<svg viewBox="0 0 28 16" width="28" height="16"><path d="M2,10 L6,10 L8,4 L10,16 L12,4 L14,16 L16,4 L18,10 L26,10 M14,0 L14,6" fill="none" stroke="currentColor" stroke-width="1.2"/></svg>`,
    thermistor: `<svg viewBox="0 0 28 16" width="28" height="16"><path d="M2,8 L6,8 L8,2 L10,14 L12,2 L14,14 L16,2 L18,8 L26,8 M6,14 L20,2" fill="none" stroke="currentColor" stroke-width="1.2"/></svg>`,
    crystal: `<svg viewBox="0 0 28 16" width="28" height="16"><path d="M2,8 L8,8 M8,3 L8,13 M20,3 L20,13 M20,8 L26,8" fill="none" stroke="currentColor" stroke-width="1.2"/><rect x="10" y="4" width="8" height="8" fill="none" stroke="currentColor" stroke-width="1.2"/></svg>`,
    voltage_source: `<svg viewBox="0 0 28 20" width="28" height="20"><circle cx="14" cy="10" r="8" fill="none" stroke="currentColor" stroke-width="1.2"/><path d="M14,5 L14,9 M12,7 L16,7 M12,13 L16,13" fill="none" stroke="currentColor" stroke-width="1"/></svg>`,
    current_source: `<svg viewBox="0 0 28 20" width="28" height="20"><circle cx="14" cy="10" r="8" fill="none" stroke="currentColor" stroke-width="1.2"/><path d="M14,14 L14,6 L12,9 M14,6 L16,9" fill="none" stroke="currentColor" stroke-width="1"/></svg>`,
    battery: `<svg viewBox="0 0 28 20" width="28" height="20"><path d="M2,10 L9,10 M9,4 L9,16 M12,6 L12,14 M15,4 L15,16 M18,6 L18,14 M18,10 L26,10" fill="none" stroke="currentColor" stroke-width="1.2"/></svg>`,
    signal_generator: `<svg viewBox="0 0 28 20" width="28" height="20"><circle cx="14" cy="10" r="8" fill="none" stroke="currentColor" stroke-width="1.2"/><path d="M9,10 Q11,4 14,10 Q17,16 19,10" fill="none" stroke="currentColor" stroke-width="1"/></svg>`,
    pwm_source: `<svg viewBox="0 0 28 20" width="28" height="20"><circle cx="14" cy="10" r="8" fill="none" stroke="currentColor" stroke-width="1.2"/><path d="M9,13 L9,7 L12,7 L12,13 L15,13 L15,7 L18,7" fill="none" stroke="currentColor" stroke-width="1"/></svg>`,
    diode: `<svg viewBox="0 0 28 16" width="28" height="16"><path d="M2,8 L9,8 M9,3 L9,13 L19,8 L9,3 M19,3 L19,13 M19,8 L26,8" fill="none" stroke="currentColor" stroke-width="1.2"/></svg>`,
    zener_diode: `<svg viewBox="0 0 28 16" width="28" height="16"><path d="M2,8 L9,8 M9,3 L9,13 L19,8 L9,3 M19,3 L19,13 M17,3 L19,3 M19,13 L21,13 M19,8 L26,8" fill="none" stroke="currentColor" stroke-width="1.2"/></svg>`,
    led: `<svg viewBox="0 0 28 16" width="28" height="16"><path d="M2,8 L9,8 M9,3 L9,13 L19,8 L9,3 M19,3 L19,13 M19,8 L26,8 M16,2 L20,0 M18,4 L22,2" fill="none" stroke="currentColor" stroke-width="1.2"/></svg>`,
    bjt_npn: `<svg viewBox="0 0 28 20" width="28" height="20"><path d="M2,10 L8,10 M8,4 L8,16 M8,7 L18,2 M8,13 L18,18 M14,16 L18,18 L16,14" fill="none" stroke="currentColor" stroke-width="1.2"/></svg>`,
    bjt_pnp: `<svg viewBox="0 0 28 20" width="28" height="20"><path d="M2,10 L8,10 M8,4 L8,16 M8,7 L18,2 M8,13 L18,18 M10,8 L8,7 L10,5" fill="none" stroke="currentColor" stroke-width="1.2" transform="rotate(0)"/></svg>`,
    mosfet_n: `<svg viewBox="0 0 28 20" width="28" height="20"><path d="M2,10 L7,10 M7,4 L7,16 M10,4 L10,7 M10,9 L10,11 M10,13 L10,16 M10,5 L18,5 L18,2 M10,15 L18,15 L18,18 M10,10 L14,10 L12,8 M14,10 L12,12" fill="none" stroke="currentColor" stroke-width="1.2"/></svg>`,
    mosfet_p: `<svg viewBox="0 0 28 20" width="28" height="20"><path d="M2,10 L7,10 M7,4 L7,16 M10,4 L10,7 M10,9 L10,11 M10,13 L10,16 M10,5 L18,5 L18,2 M10,15 L18,15 L18,18 M14,10 L10,10 L12,8 M10,10 L12,12" fill="none" stroke="currentColor" stroke-width="1.2"/></svg>`,
    opamp: `<svg viewBox="0 0 28 20" width="28" height="20"><path d="M4,2 L4,18 L24,10 Z M1,6 L4,6 M1,14 L4,14 M24,10 L27,10" fill="none" stroke="currentColor" stroke-width="1.2"/></svg>`,
    spst_switch: `<svg viewBox="0 0 28 16" width="28" height="16"><path d="M2,10 L8,10 M20,10 L26,10" fill="none" stroke="currentColor" stroke-width="1.2"/><circle cx="8" cy="10" r="2" fill="none" stroke="currentColor" stroke-width="1.2"/><circle cx="20" cy="10" r="2" fill="none" stroke="currentColor" stroke-width="1.2"/><path d="M10,10 L19,4" fill="none" stroke="currentColor" stroke-width="1.2"/></svg>`,
    spdt_switch: `<svg viewBox="0 0 28 20" width="28" height="20"><path d="M2,10 L8,10" fill="none" stroke="currentColor" stroke-width="1.2"/><circle cx="8" cy="10" r="2" fill="none" stroke="currentColor" stroke-width="1.2"/><path d="M10,10 L20,5" fill="none" stroke="currentColor" stroke-width="1.2"/><circle cx="20" cy="5" r="2" fill="none" stroke="currentColor" stroke-width="1.2"/><path d="M22,5 L26,5" fill="none" stroke="currentColor" stroke-width="1.2"/><circle cx="20" cy="15" r="2" fill="none" stroke="currentColor" stroke-width="1.2"/><path d="M22,15 L26,15" fill="none" stroke="currentColor" stroke-width="1.2"/></svg>`,
    push_button: `<svg viewBox="0 0 28 16" width="28" height="16"><path d="M2,10 L8,10 M20,10 L26,10" fill="none" stroke="currentColor" stroke-width="1.2"/><circle cx="8" cy="10" r="2" fill="none" stroke="currentColor" stroke-width="1.2"/><circle cx="20" cy="10" r="2" fill="none" stroke="currentColor" stroke-width="1.2"/><path d="M14,2 L14,6 M8,2 L20,2" fill="none" stroke="currentColor" stroke-width="1.2"/></svg>`,
    fuse: `<svg viewBox="0 0 28 16" width="28" height="16"><path d="M2,8 L7,8 M21,8 L26,8" fill="none" stroke="currentColor" stroke-width="1.2"/><rect x="7" y="4" width="14" height="8" fill="none" stroke="currentColor" stroke-width="1.2"/></svg>`,
    relay: `<svg viewBox="0 0 28 16" width="28" height="16"><path d="M2,8 Q6,2 8,8 Q10,2 12,8 Q14,2 16,8 L20,8" fill="none" stroke="currentColor" stroke-width="1.2"/><path d="M20,2 L20,14" fill="none" stroke="currentColor" stroke-width="1" stroke-dasharray="2,2"/></svg>`,
    tvs_diode: `<svg viewBox="0 0 28 16" width="28" height="16"><path d="M2,8 L9,8 M9,3 L9,13 L19,8 L9,3 M19,3 L19,13 M17,3 L19,3 M19,13 L21,13 M19,8 L26,8" fill="none" stroke="currentColor" stroke-width="1.2"/></svg>`,
    transformer: `<svg viewBox="0 0 28 16" width="28" height="16"><path d="M2,8 Q4,2 6,8 Q8,2 10,8" fill="none" stroke="currentColor" stroke-width="1.2"/><path d="M12,2 L12,14 M14,2 L14,14" fill="none" stroke="currentColor" stroke-width="1"/><path d="M16,8 Q18,2 20,8 Q22,2 24,8" fill="none" stroke="currentColor" stroke-width="1.2"/></svg>`,
    dc_motor: `<svg viewBox="0 0 28 20" width="28" height="20"><circle cx="14" cy="10" r="8" fill="none" stroke="currentColor" stroke-width="1.2"/><text x="14" y="13" text-anchor="middle" font-size="9" fill="currentColor" font-family="Inter">M</text></svg>`,
    solenoid: `<svg viewBox="0 0 28 16" width="28" height="16"><path d="M2,10 Q6,2 8,10 Q10,2 12,10 Q14,2 16,10 Q18,2 20,10 L26,10" fill="none" stroke="currentColor" stroke-width="1.2"/></svg>`,
    ground: `<svg viewBox="0 0 28 20" width="28" height="20"><path d="M14,2 L14,8 M8,8 L20,8 M10,12 L18,12 M12,16 L16,16" fill="none" stroke="currentColor" stroke-width="1.2"/></svg>`,
    voltmeter: `<svg viewBox="0 0 28 20" width="28" height="20"><circle cx="14" cy="10" r="8" fill="none" stroke="currentColor" stroke-width="1.2"/><text x="14" y="13" text-anchor="middle" font-size="9" fill="currentColor" font-family="Inter">V</text></svg>`,
    ammeter: `<svg viewBox="0 0 28 20" width="28" height="20"><circle cx="14" cy="10" r="8" fill="none" stroke="currentColor" stroke-width="1.2"/><text x="14" y="13" text-anchor="middle" font-size="9" fill="currentColor" font-family="Inter">A</text></svg>`
};

// ─── Pin positions for placed components (relative to center, before rotation) ───
const ComponentPins = {
    resistor: [{ id: '1', x: -40, y: 0 }, { id: '2', x: 40, y: 0 }],
    capacitor: [{ id: '1', x: -24, y: 0 }, { id: '2', x: 24, y: 0 }],
    inductor: [{ id: '1', x: -20, y: 0 }, { id: '2', x: 20, y: 0 }],
    potentiometer: [{ id: '1', x: -40, y: 0 }, { id: '2', x: 40, y: 0 }, { id: 'W', x: 0, y: -20 }],
    thermistor: [{ id: '1', x: -40, y: 0 }, { id: '2', x: 40, y: 0 }],
    crystal: [{ id: '1', x: -25, y: 0 }, { id: '2', x: 25, y: 0 }],

    voltage_source: [{ id: '+', x: 0, y: -35 }, { id: '-', x: 0, y: 35 }],
    current_source: [{ id: '+', x: 0, y: -35 }, { id: '-', x: 0, y: 35 }],
    battery: [{ id: '+', x: 0, y: -35 }, { id: '-', x: 0, y: 35 }],
    signal_generator: [{ id: '+', x: 0, y: -35 }, { id: '-', x: 0, y: 35 }],
    pwm_source: [{ id: '+', x: 0, y: -35 }, { id: '-', x: 0, y: 35 }],

    diode: [{ id: 'A', x: -30, y: 0 }, { id: 'K', x: 30, y: 0 }],
    zener_diode: [{ id: 'A', x: -30, y: 0 }, { id: 'K', x: 30, y: 0 }],
    led: [{ id: 'A', x: -30, y: 0 }, { id: 'K', x: 30, y: 0 }],
    bjt_npn: [{ id: 'B', x: -30, y: 0 }, { id: 'C', x: 15, y: -30 }, { id: 'E', x: 15, y: 30 }],
    bjt_pnp: [{ id: 'B', x: -30, y: 0 }, { id: 'C', x: 15, y: 30 }, { id: 'E', x: 15, y: -30 }],
    mosfet_n: [{ id: 'G', x: -30, y: 0 }, { id: 'D', x: 15, y: -30 }, { id: 'S', x: 15, y: 30 }],
    mosfet_p: [{ id: 'G', x: -30, y: 0 }, { id: 'D', x: 15, y: 30 }, { id: 'S', x: 15, y: -30 }],
    opamp: [{ id: '+', x: -35, y: -12 }, { id: '-', x: -35, y: 12 }, { id: 'OUT', x: 40, y: 0 }, { id: 'VCC', x: 0, y: -30 }, { id: 'VEE', x: 0, y: 30 }],

    spst_switch: [{ id: '1', x: -30, y: 0 }, { id: '2', x: 30, y: 0 }],
    spdt_switch: [{ id: 'COM', x: -30, y: 0 }, { id: 'NO', x: 30, y: -14 }, { id: 'NC', x: 30, y: 14 }],
    push_button: [{ id: '1', x: -30, y: 0 }, { id: '2', x: 30, y: 0 }],
    fuse: [{ id: '1', x: -30, y: 0 }, { id: '2', x: 30, y: 0 }],
    relay: [{ id: 'COIL+', x: -20, y: 0 }, { id: 'COIL-', x: 20, y: 0 }],
    tvs_diode: [{ id: '1', x: -30, y: 0 }, { id: '2', x: 30, y: 0 }],

    transformer: [{ id: 'P1', x: -22, y: 0 }, { id: 'P2', x: -22, y: 0 }, { id: 'S1', x: 22, y: 0 }, { id: 'S2', x: 22, y: 0 }],
    dc_motor: [{ id: '+', x: -30, y: 0 }, { id: '-', x: 30, y: 0 }],
    solenoid: [{ id: '1', x: -20, y: 0 }, { id: '2', x: 20, y: 0 }],

    ground: [{ id: '1', x: 0, y: -15 }],
    voltmeter: [{ id: '+', x: 0, y: -30 }, { id: '-', x: 0, y: 30 }],
    ammeter: [{ id: '1', x: -30, y: 0 }, { id: '2', x: 30, y: 0 }]
};


/**
 * Get the absolute pin positions for a placed component, accounting for rotation.
 */
function getAbsolutePinPositions(component) {
    const pins = ComponentPins[component.type] || [];
    const rad = (component.rotation || 0) * Math.PI / 180;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);

    return pins.map(pin => {
        const rx = pin.x * cos - pin.y * sin;
        const ry = pin.x * sin + pin.y * cos;
        return {
            id: pin.id,
            x: component.x + rx,
            y: component.y + ry
        };
    });
}

/**
 * Render a component symbol on the canvas.
 */
function renderComponentSymbol(ctx, type, x, y, rotation, selected, scale = 1) {
    const drawFn = ComponentSymbols[type];
    if (!drawFn) return;

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate((rotation || 0) * Math.PI / 180);
    ctx.scale(scale, scale);

    ctx.strokeStyle = selected ? '#36d6e7' : '#c8cce0';
    ctx.lineWidth = selected ? 2 : 1.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    drawFn(ctx);

    ctx.restore();
}
