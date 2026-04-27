// main.js — WCPU-1 Emulator UI

(function () {
    'use strict';

    let cpu = new CPU();
    let running = false;
    let lastFrameTime = 0;
    let accumulator = 0;
    let frequency = 10; // Hz (T-states per second)
    let animFrameId = null;

    // Speed slider: logarithmic scale
    const SPEED_STEPS = [1, 2, 5, 10, 20, 50, 100, 200, 500, 1000, 5000, 10000, 0]; // 0 = MAX
    const MAX_CYCLES_PER_FRAME = 20000;

    // ── DOM references ──────────────────────────────────────────────────────
    const $ = (sel) => document.querySelector(sel);
    const $$ = (sel) => document.querySelectorAll(sel);

    // ── Build UI ────────────────────────────────────────────────────────────

    function createLEDs(count, cls) {
        let html = '<span class="led-group">';
        for (let i = count - 1; i >= 0; i--) {
            html += `<span class="led ${cls || ''}" data-bit="${i}"></span>`;
        }
        html += '</span>';
        return html;
    }

    function buildRegisterRow(name, id, bits, extraClass) {
        return `<div class="reg-row ${extraClass || ''}" id="reg-${id}">
            <span class="reg-name">${name}</span>
            ${createLEDs(bits)}
            <span class="reg-hex" id="${id}-hex">0x00</span>
            <span class="reg-dec" id="${id}-dec">0</span>
            <span class="reg-label" id="${id}-label"></span>
        </div>`;
    }

    function buildUI() {
        const app = $('#app');
        app.innerHTML = `
            <!-- Header -->
            <div id="header">
                <div>
                    <h1>WCPU-1<span class="subtitle">by Will Warren</span></h1>
                </div>
                <div style="display:flex;align-items:center;gap:8px;">
                    <span class="hint">SPACE=step</span>
                    <span class="hint">SHIFT+SPACE=step instr</span>
                </div>
            </div>

            <!-- Controls -->
            <div id="controls">
                <button id="btn-run">RUN</button>
                <button id="btn-step">STEP</button>
                <button id="btn-step-instr">INSTR</button>
                <span class="sep"></span>
                <button id="btn-reset">RESET</button>
                <span class="sep"></span>
                <label>Speed:</label>
                <input type="range" id="speed-slider" min="0" max="${SPEED_STEPS.length - 1}" value="3">
                <span id="speed-display">10 Hz</span>
                <span id="counters"></span>
            </div>

            <!-- Main area: two columns -->
            <div id="main">
                <!-- Left: Registers, ALU, Output -->
                <div id="left-col">
                    <div class="panel" id="registers-panel">
                        <h2>Registers & Bus</h2>
                        ${buildRegisterRow('BUS', 'bus', 8, 'bus-row')}
                        ${buildRegisterRow('PC', 'pc', 8)}
                        ${buildRegisterRow('IR', 'ir', 8)}
                        ${buildRegisterRow('MAR', 'mar', 8)}
                        <div style="height:4px"></div>
                        ${buildRegisterRow('A', 'a', 8)}
                        ${buildRegisterRow('B', 'b', 8)}
                        ${buildRegisterRow('X', 'x', 8)}
                        ${buildRegisterRow('G', 'g', 8)}
                        <div style="height:4px"></div>
                        ${buildRegisterRow('OUT', 'out', 8)}
                        ${buildRegisterRow('SP', 'sp', 8)}
                    </div>

                    <div class="panel" id="alu-section">
                        <h2>ALU</h2>
                        ${buildRegisterRow('ALU', 'alu', 8)}
                        <div id="alu-mode">ADD  A + B</div>
                    </div>

                    <div class="panel" id="output-panel">
                        <h2>Output Display</h2>
                        <div id="output-value">0</div>
                        <div id="output-hex">0x00</div>
                        <div id="output-history-label">History</div>
                        <div id="output-history"></div>
                    </div>
                </div>

                <!-- Right: Signals, Program, Memory -->
                <div id="right-col">
                    <div class="panel" id="signals-panel">
                        <h2>Control Signals</h2>
                        <div id="signals-grid"></div>
                        <div id="status-row">
                            <div class="flag-display">
                                <span class="flag-label">C:</span>
                                <span class="led red" id="flag-c-led"></span>
                            </div>
                            <div class="flag-display">
                                <span class="flag-label">Z:</span>
                                <span class="led red" id="flag-z-led"></span>
                            </div>
                            <span id="tstate-display">T=0</span>
                        </div>
                    </div>

                    <div class="panel" id="editor-panel">
                        <h2>Program</h2>
                        <textarea id="code-editor" spellcheck="false" autocomplete="off"></textarea>
                        <div id="editor-controls">
                            <button id="btn-assemble">ASSEMBLE & LOAD</button>
                            <select id="example-select">
                                <option value="">-- examples --</option>
                            </select>
                        </div>
                        <div id="asm-status"></div>
                    </div>

                    <div class="panel" id="memory-panel">
                        <h2>Memory</h2>
                        <div id="memory-grid"></div>
                        <div id="memory-legend">
                            <span class="legend-item"><span class="legend-swatch is-pc"></span>PC</span>
                            <span class="legend-item"><span class="legend-swatch is-mar"></span>MAR</span>
                            <span class="legend-item"><span class="legend-swatch is-sp"></span>SP</span>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Build signal grid
        const sigGrid = $('#signals-grid');
        SIG_NAMES.forEach(name => {
            const el = document.createElement('span');
            el.className = 'sig';
            el.id = `sig-${name}`;
            el.textContent = name;
            sigGrid.appendChild(el);
        });

        // Populate example select
        const sel = $('#example-select');
        Object.keys(EXAMPLES).forEach(name => {
            const opt = document.createElement('option');
            opt.value = name;
            opt.textContent = name;
            sel.appendChild(opt);
        });
    }

    // ── Rendering ───────────────────────────────────────────────────────────

    function hex(val, digits) {
        digits = digits || 2;
        return '0x' + val.toString(16).toUpperCase().padStart(digits, '0');
    }

    function updateLEDs(rowId, value, bits) {
        bits = bits || 8;
        const row = $(`#reg-${rowId}`);
        if (!row) return;
        const leds = row.querySelectorAll('.led');
        for (const led of leds) {
            const bit = parseInt(led.dataset.bit);
            led.classList.toggle('on', !!(value & (1 << bit)));
        }
    }

    function updateRegDisplay(id, value, label) {
        updateLEDs(id, value);
        const hexEl = $(`#${id}-hex`);
        const decEl = $(`#${id}-dec`);
        const labelEl = $(`#${id}-label`);
        if (hexEl) hexEl.textContent = hex(value);
        if (decEl) decEl.textContent = value;
        if (labelEl) labelEl.textContent = label || '';
    }

    function render() {
        // Registers
        updateRegDisplay('bus', cpu.bus);
        updateRegDisplay('pc', cpu.pc);
        updateRegDisplay('ir', cpu.ir, cpu.getInstructionName());
        updateRegDisplay('mar', cpu.mar);
        updateRegDisplay('a', cpu.a);
        updateRegDisplay('b', cpu.b);
        updateRegDisplay('x', cpu.x);
        updateRegDisplay('g', cpu.g);
        updateRegDisplay('out', cpu.out);
        updateRegDisplay('sp', cpu.sp);

        // ALU (continuously shows what the ALU would compute)
        const subActive = !!(cpu.controlWord & SIG.SUB);
        let aluVal;
        if (subActive) {
            aluVal = (cpu.a + (0xFF ^ cpu.b) + 1) & 0xFF;
        } else {
            aluVal = (cpu.a + cpu.b) & 0xFF;
        }
        updateRegDisplay('alu', aluVal);
        const mode = subActive ? 'SUB' : 'ADD';
        $('#alu-mode').textContent = `${mode}  A ${subActive ? '-' : '+'} B = ${aluVal} (${hex(aluVal)})`;

        // Flags
        $('#flag-c-led').classList.toggle('on', !!(cpu.flags & 0b10));
        $('#flag-z-led').classList.toggle('on', !!(cpu.flags & 0b01));

        // T-state
        $('#tstate-display').textContent = `T=${cpu.tState}`;

        // Control signals
        SIG_NAMES.forEach(name => {
            const el = $(`#sig-${name}`);
            el.classList.toggle('active', !!(cpu.controlWord & SIG[name]));
        });

        // Counters
        $('#counters').textContent = `Cycles: ${cpu.cycleCount}  Instr: ${cpu.instrCount}`;

        // Output display
        $('#output-value').textContent = cpu.out;
        $('#output-hex').textContent = hex(cpu.out) + '  (' + cpu.out.toString(2).padStart(8, '0') + ')';

        // Output history
        renderOutputHistory();

        // Memory
        renderMemory();

        // Run button state
        $('#btn-run').textContent = running ? 'STOP' : 'RUN';
        $('#btn-run').classList.toggle('active', running);
    }

    function renderOutputHistory() {
        const container = $('#output-history');
        const hist = cpu.outputHistory;
        // Only re-render if changed
        const len = hist.length;
        if (container.dataset.len == len) return;
        container.dataset.len = len;

        // Show last 50 entries, newest first
        const start = Math.max(0, len - 50);
        let html = '';
        for (let i = len - 1; i >= start; i--) {
            const cls = i === len - 1 ? 'entry newest' : 'entry';
            html += `<div class="${cls}">${hist[i]} (${hex(hist[i])})</div>`;
        }
        container.innerHTML = html;
    }

    function renderMemory() {
        const grid = $('#memory-grid');
        let html = '';

        for (let row = 0; row < 16; row++) {
            const addr = row * 16;
            const isRom = addr < 128;
            const regionClass = isRom ? 'mem-rom' : 'mem-ram';

            if (addr === 0) {
                html += '<div class="mem-region-label">ROM (0x00-0x7F)</div>';
            } else if (addr === 128) {
                html += '<div class="mem-region-label">RAM (0x80-0xFF)</div>';
            }

            html += `<div class="mem-row ${regionClass}"><span class="mem-addr">${hex(addr)}: </span>`;
            for (let col = 0; col < 16; col++) {
                const a = addr + col;
                const val = cpu.memory[a];
                let cls = 'mem-byte';
                if (a === cpu.pc) cls += ' is-pc';
                else if (a === cpu.mar) cls += ' is-mar';
                else if (a === cpu.sp) cls += ' is-sp';
                else if (val === 0) cls += ' is-zero';
                html += `<span class="${cls}">${val.toString(16).toUpperCase().padStart(2, '0')}</span>`;
            }
            html += '</div>';
        }
        grid.innerHTML = html;
    }

    // ── Clock loop ──────────────────────────────────────────────────────────

    function tick(timestamp) {
        if (!running) return;

        if (lastFrameTime === 0) lastFrameTime = timestamp;
        const dt = timestamp - lastFrameTime;
        lastFrameTime = timestamp;

        const speedIdx = parseInt($('#speed-slider').value);
        const hz = SPEED_STEPS[speedIdx];

        if (hz === 0) {
            // MAX speed: run as many cycles as we can per frame
            for (let i = 0; i < MAX_CYCLES_PER_FRAME; i++) {
                cpu.clock();
            }
        } else {
            accumulator += dt;
            const period = 1000 / hz;
            let cycles = 0;
            while (accumulator >= period && cycles < MAX_CYCLES_PER_FRAME) {
                cpu.clock();
                accumulator -= period;
                cycles++;
            }
            // Prevent spiral of death
            if (accumulator > 1000) accumulator = 0;
        }

        render();
        animFrameId = requestAnimationFrame(tick);
    }

    function updateSpeedDisplay() {
        const idx = parseInt($('#speed-slider').value);
        const hz = SPEED_STEPS[idx];
        if (hz === 0) {
            $('#speed-display').textContent = 'MAX';
        } else {
            $('#speed-display').textContent = hz >= 1000 ? `${hz / 1000}k Hz` : `${hz} Hz`;
        }
    }

    // ── Assembler integration ───────────────────────────────────────────────

    function doAssemble() {
        const source = $('#code-editor').value;
        const result = assemble(source);
        const status = $('#asm-status');

        if (result.error) {
            status.className = 'error';
            status.textContent = result.error;
            return;
        }

        if (result.bytes.length > 128) {
            status.className = 'error';
            status.textContent = `Program too large: ${result.bytes.length} bytes (max 128)`;
            return;
        }

        // Stop and reset
        running = false;
        cpu.reset();
        cpu.loadProgram(result.bytes);

        status.className = 'ok';
        status.textContent = `Assembled ${result.bytes.length} bytes: ${Array.from(result.bytes).map(b => hex(b)).join(' ')}`;
        render();
    }

    function loadExample(name) {
        if (name && EXAMPLES[name]) {
            $('#code-editor').value = EXAMPLES[name];
            doAssemble();
        }
    }

    // ── Event handlers ──────────────────────────────────────────────────────

    function init() {
        buildUI();

        // Load default example
        $('#code-editor').value = EXAMPLES['Count Up'];
        doAssemble();

        // Controls
        $('#btn-run').addEventListener('click', () => {
            running = !running;
            if (running) {
                lastFrameTime = 0;
                accumulator = 0;
                animFrameId = requestAnimationFrame(tick);
            }
            render();
        });

        $('#btn-step').addEventListener('click', () => {
            if (!running) {
                cpu.clock();
                render();
            }
        });

        $('#btn-step-instr').addEventListener('click', () => {
            if (!running) {
                cpu.stepInstruction();
                render();
            }
        });

        $('#btn-reset').addEventListener('click', () => {
            running = false;
            const mem = new Uint8Array(cpu.memory); // preserve memory
            cpu.reset();
            cpu.memory = mem;
            render();
        });

        $('#speed-slider').addEventListener('input', updateSpeedDisplay);
        updateSpeedDisplay();

        $('#btn-assemble').addEventListener('click', doAssemble);

        $('#example-select').addEventListener('change', (e) => {
            loadExample(e.target.value);
            e.target.value = ''; // reset dropdown
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            // Don't capture when typing in the editor
            if (e.target.tagName === 'TEXTAREA' || e.target.tagName === 'INPUT') return;

            if (e.code === 'Space') {
                e.preventDefault();
                if (e.shiftKey) {
                    // Step full instruction
                    if (!running) {
                        cpu.stepInstruction();
                        render();
                    }
                } else {
                    // Step one T-state
                    if (!running) {
                        cpu.clock();
                        render();
                    }
                }
            } else if (e.code === 'KeyR' && !e.ctrlKey && !e.metaKey) {
                // Toggle run
                running = !running;
                if (running) {
                    lastFrameTime = 0;
                    accumulator = 0;
                    animFrameId = requestAnimationFrame(tick);
                }
                render();
            } else if (e.code === 'Escape') {
                running = false;
                render();
            }
        });

        // Handle tab in editor (insert spaces instead of changing focus)
        $('#code-editor').addEventListener('keydown', (e) => {
            if (e.key === 'Tab') {
                e.preventDefault();
                const ta = e.target;
                const start = ta.selectionStart;
                const end = ta.selectionEnd;
                ta.value = ta.value.substring(0, start) + '  ' + ta.value.substring(end);
                ta.selectionStart = ta.selectionEnd = start + 2;
            }
        });

        render();
    }

    // Boot
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
