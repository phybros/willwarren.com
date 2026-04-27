// assembler.js — WCPU-1 assembler (JS port of wcasm.py)

const ASM_INSTRUCTIONS = {
    // 0x0_ — System / Transfers / LSP
    'nop': { impl: 0x00 },
    'outa': { impl: 0x01 },
    'out': { impl: 0x01 },
    'outb': { impl: 0x02 },
    'outx': { impl: 0x03 },
    'outg': { impl: 0x04 },
    'tax': { impl: 0x05 },
    'txa': { impl: 0x06 },
    'tab': { impl: 0x07 },
    'tba': { impl: 0x08 },
    'tag': { impl: 0x09 },
    'tga': { impl: 0x0A },
    'tsx': { impl: 0x0B },
    'txs': { impl: 0x0C },
    'lsp': { imm: 0x0D, abs: 0x0E },
    // 0x1_ — ALU
    'add': { imm: 0x10, abs: 0x11 },
    'addb': { impl: 0x12 },
    'addx': { impl: 0x13 },
    'addg': { impl: 0x14 },
    'sub': { imm: 0x15, abs: 0x16 },
    'subb': { impl: 0x17 },
    'subx': { impl: 0x18 },
    'subg': { impl: 0x19 },
    'cmp': { imm: 0x1A, abs: 0x1B },
    'cmpb': { impl: 0x1C },
    'cmpx': { impl: 0x1D },
    'cmpg': { impl: 0x1E },
    // 0x2_ — Loads & Stores
    'lda': { imm: 0x20, abs: 0x21, absx: 0x22, ind: 0x23 },
    'ldb': { imm: 0x24, abs: 0x25 },
    'ldx': { imm: 0x26, abs: 0x27 },
    'ldg': { imm: 0x28, abs: 0x29 },
    'sta': { abs: 0x2A, ind: 0x2B },
    'stb': { abs: 0x2C },
    'stx': { abs: 0x2D },
    'stg': { abs: 0x2E },
    // 0x3_ — Flow Control & Stack
    'jmp': { abs: 0x30 },
    'jsr': { abs: 0x31 },
    'rts': { impl: 0x32 },
    'jc': { abs: 0x33 },
    'jnc': { abs: 0x34 },
    'jz': { abs: 0x35 },
    'jnz': { abs: 0x36 },
    'pha': { impl: 0x37 },
    'pla': { impl: 0x38 },
    'phb': { impl: 0x39 },
    'plb': { impl: 0x3A },
    'phx': { impl: 0x3B },
    'plx': { impl: 0x3C },
    'phg': { impl: 0x3D },
    'plg': { impl: 0x3E },
};

function parseIntValue(s) {
    s = s.trim();
    if (s.startsWith('$')) return parseInt(s.slice(1), 16);
    if (s.startsWith('%')) return parseInt(s.slice(1), 2);
    if (s.length > 1 && s.startsWith('0') && /^\d+$/.test(s.slice(1))) return parseInt(s, 8);
    return parseInt(s, 10);
}

function instrSize(mnemonic) {
    const modes = ASM_INSTRUCTIONS[mnemonic];
    if (modes.impl !== undefined && Object.keys(modes).length === 1) return 1;
    return 2;
}

function assemble(source) {
    const lines = source.split('\n');
    const errors = [];
    const labels = {};
    const codeLines = [];

    // Strip comments and blanks
    for (let i = 0; i < lines.length; i++) {
        let line = lines[i].split(';')[0].trim();
        if (!line) continue;
        codeLines.push({ num: i + 1, text: line });
    }

    // Pass 1: collect labels, constants, compute addresses
    let pc = 0;
    const instrLines = [];

    for (const { num, text } of codeLines) {
        if (text.includes('=')) {
            const eqIdx = text.indexOf('=');
            const name = text.slice(0, eqIdx).trim();
            const valStr = text.slice(eqIdx + 1).trim();
            if (name in labels) {
                errors.push(`Line ${num}: duplicate symbol '${name}'`);
                continue;
            }
            const val = parseIntValue(valStr);
            if (isNaN(val)) {
                errors.push(`Line ${num}: invalid constant value '${valStr}'`);
                continue;
            }
            labels[name] = val;
        } else if (text.endsWith(':')) {
            const label = text.slice(0, -1).trim();
            if (label in labels) {
                errors.push(`Line ${num}: duplicate label '${label}'`);
                continue;
            }
            labels[label] = pc;
        } else {
            const parts = text.split(/\s+/);
            const mnemonic = parts[0].toLowerCase();
            if (!(mnemonic in ASM_INSTRUCTIONS)) {
                errors.push(`Line ${num}: unknown instruction '${mnemonic}'`);
                continue;
            }
            instrLines.push({ num, text, pc });
            pc += instrSize(mnemonic);
        }
    }

    if (errors.length > 0) {
        return { error: errors.join('\n'), bytes: null };
    }

    // Pass 2: generate code
    const output = [];

    for (const { num, text } of instrLines) {
        const parts = text.split(/\s+(.*)/);
        const mnemonic = parts[0].toLowerCase();
        const operandStr = parts[1] ? parts[1].trim() : null;
        const modes = ASM_INSTRUCTIONS[mnemonic];

        if (operandStr === null || operandStr === '') {
            // Implied
            if (modes.impl === undefined) {
                errors.push(`Line ${num}: '${mnemonic}' requires an operand`);
                continue;
            }
            output.push(modes.impl);

        } else if (operandStr.startsWith('#')) {
            // Immediate
            if (modes.imm === undefined) {
                errors.push(`Line ${num}: '${mnemonic}' does not support immediate mode`);
                continue;
            }
            const tok = operandStr.slice(1).trim();
            let val = (tok in labels) ? labels[tok] : parseIntValue(tok);
            if (isNaN(val)) {
                errors.push(`Line ${num}: invalid immediate value '${operandStr}'`);
                continue;
            }
            if (val < 0 || val > 255) {
                errors.push(`Line ${num}: value ${val} out of range (0-255)`);
                continue;
            }
            output.push(modes.imm);
            output.push(val);

        } else if (operandStr.startsWith('(') && operandStr.endsWith(')')) {
            // Indirect
            if (modes.ind === undefined) {
                errors.push(`Line ${num}: '${mnemonic}' does not support indirect mode`);
                continue;
            }
            const inner = operandStr.slice(1, -1).trim();
            let val = (inner in labels) ? labels[inner] : parseIntValue(inner);
            if (isNaN(val)) {
                errors.push(`Line ${num}: undefined label '${inner}'`);
                continue;
            }
            if (val < 0 || val > 255) {
                errors.push(`Line ${num}: address ${val} out of range (0-255)`);
                continue;
            }
            output.push(modes.ind);
            output.push(val);

        } else if (operandStr.includes(',')) {
            // Indexed
            const [addrPart, idxPart] = operandStr.split(',').map(s => s.trim());
            if (idxPart.toLowerCase() !== 'x') {
                errors.push(`Line ${num}: only X indexing supported, got ',${idxPart}'`);
                continue;
            }
            if (modes.absx === undefined) {
                errors.push(`Line ${num}: '${mnemonic}' does not support indexed mode`);
                continue;
            }
            let val = (addrPart in labels) ? labels[addrPart] : parseIntValue(addrPart);
            if (isNaN(val)) {
                errors.push(`Line ${num}: undefined label '${addrPart}'`);
                continue;
            }
            if (val < 0 || val > 255) {
                errors.push(`Line ${num}: address ${val} out of range (0-255)`);
                continue;
            }
            output.push(modes.absx);
            output.push(val);

        } else {
            // Absolute (address or label)
            let val;
            if (operandStr in labels) {
                val = labels[operandStr];
            } else {
                val = parseIntValue(operandStr);
            }
            if (isNaN(val)) {
                errors.push(`Line ${num}: undefined label '${operandStr}'`);
                continue;
            }
            if (modes.abs === undefined) {
                errors.push(`Line ${num}: '${mnemonic}' does not support absolute mode`);
                continue;
            }
            if (val < 0 || val > 255) {
                errors.push(`Line ${num}: address ${val} out of range (0-255)`);
                continue;
            }
            output.push(modes.abs);
            output.push(val);
        }
    }

    if (errors.length > 0) {
        return { error: errors.join('\n'), bytes: null };
    }

    return { error: null, bytes: new Uint8Array(output) };
}

// Example programs
const EXAMPLES = {
    'Count Up': `; count up forever
main:
  lda #0
loop:
  outa
  add #1
  jmp loop`,

    'Fibonacci': `; fibonacci numbers up to 255
; registers: A = current, X = prev

start:
  lsp #$ff        ; reset stack pointer
  ldx #0          ; prev = 0
  lda #1          ; current = 1

loop:
  outa            ; output current
  pha             ; save current on stack
  addx            ; A = current + prev = next
  jc start        ; start over on carry (lsp resets stack)
  plx             ; prev = old current (from stack)
  jmp loop`,

    'Count Up/Down': `; count up to 255 and then back to 0, and loop forever
main:
  lda #0
loop:
  outa
  add #1
  sta $ee
  jc down
  ldx $ee
  jmp loop
down:
  outa
  sub #1
  jz loop
  jmp down`,

    'Count to 100': `main:
  lda #0
loop:
  outa
  add #1
  cmp #100
  jz down
  jmp loop
down:
  outa
  sub #1
  jz loop
  jmp down`,

    'Multiply': `; multiply by 2 repeatedly
; registers: B = result (persists across JSR), A = return status

begin = 1
multiplier = 2

start:
  lsp #$ff
  ldb #begin       ; result = 1
  ldx #multiplier  ; X = the number we want to multiply by

loop:
  phx
  jsr mult
  cmp #1          ; check carried flag (returned in A)
  jz start        ; overflow -> restart
  outb
  plx
  jmp loop

; multiply B by X via repeated addition
; on success: B = new result, A = 0
; on carry:   A = 1
mult:
  lda #0          ; A = accumulator

mult_loop:
  addb            ; A += B (B = original value, unchanged)
  jc mult_carried
  pha             ; save accumulator
  txa             ; A = counter
  phb             ; sub clobbers b
  sub #1
  plb
  tax             ; X = counter - 1
  jz mult_done
  pla             ; restore accumulator
  jmp mult_loop

mult_done:
  pla             ; A = final result
  tab             ; B = new result (for next call)
  lda #0          ; return: no carry
  rts

mult_carried:
  lda #1          ; return: carried
  rts`,
};

window.assemble = assemble;
window.EXAMPLES = EXAMPLES;
