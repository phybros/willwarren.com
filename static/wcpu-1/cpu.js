// cpu.js — WCPU-1 CPU Emulator Core
// Faithful microcode-driven emulation of the WCPU-1 architecture.

// ── Control signal bit definitions (24-bit control word) ────────────────────
const SIG = {
    GI:  1 << 23,   // G register in
    MI:  1 << 22,   // Memory Address Register in
    RI:  1 << 21,   // RAM in (write)
    RO:  1 << 20,   // RAM out (read)
    BO:  1 << 19,   // B register out
    II:  1 << 18,   // Instruction Register in
    AI:  1 << 17,   // A register in
    AO:  1 << 16,   // A register out
    BI:  1 << 15,   // B register in
    OI:  1 << 14,   // Output register in
    CI:  1 << 13,   // Program Counter in (jump)
    CE:  1 << 12,   // Program Counter enable (increment)
    CO:  1 << 11,   // Program Counter out
    XI:  1 << 10,   // X register in
    XO:  1 <<  9,   // X register out
    EO:  1 <<  8,   // ALU out
    FI:  1 <<  7,   // Flags in
    N:   1 <<  6,   // Next (T-state reset)
    SUB: 1 <<  5,   // ALU subtract mode
    SU:  1 <<  4,   // Stack pointer increment
    SD:  1 <<  3,   // Stack pointer decrement
    SI:  1 <<  2,   // Stack pointer in (load from bus)
    SO:  1 <<  1,   // Stack pointer out
    GO:  1 <<  0,   // G register out
};

// Signal names for display
const SIG_NAMES = [
    'GI','MI','RI','RO','BO','II','AI','AO',
    'BI','OI','CI','CE','CO','XI','XO','EO',
    'FI','N','SUB','SU','SD','SI','SO','GO'
];

const SIG_BITS = SIG_NAMES.map((name) => SIG[name]);

// Flag bits
const FLAG_C = 0b10;
const FLAG_Z = 0b01;

// Opcode -> mnemonic mapping
const OPCODE_NAMES = {
    0x00:'NOP',  0x01:'OUTA', 0x02:'OUTB', 0x03:'OUTX', 0x04:'OUTG',
    0x05:'TAX',  0x06:'TXA',  0x07:'TAB',  0x08:'TBA',  0x09:'TAG',
    0x0A:'TGA',  0x0B:'TSX',  0x0C:'TXS',  0x0D:'LSP#', 0x0E:'LSP',
    0x10:'ADD#', 0x11:'ADD',  0x12:'ADDB', 0x13:'ADDX', 0x14:'ADDG',
    0x15:'SUB#', 0x16:'SUB',  0x17:'SUBB', 0x18:'SUBX', 0x19:'SUBG',
    0x1A:'CMP#', 0x1B:'CMP',  0x1C:'CMPB', 0x1D:'CMPX', 0x1E:'CMPG',
    0x20:'LDA#', 0x21:'LDA',  0x22:'LDAx', 0x23:'LDA()',
    0x24:'LDB#', 0x25:'LDB',  0x26:'LDX#', 0x27:'LDX',
    0x28:'LDG#', 0x29:'LDG',  0x2A:'STA',  0x2B:'STA()',
    0x2C:'STB',  0x2D:'STX',  0x2E:'STG',
    0x30:'JMP',  0x31:'JSR',  0x32:'RTS',  0x33:'JC',   0x34:'JNC',
    0x35:'JZ',   0x36:'JNZ',  0x37:'PHA',  0x38:'PLA',  0x39:'PHB',
    0x3A:'PLB',  0x3B:'PHX',  0x3C:'PLX',  0x3D:'PHG',  0x3E:'PLG',
};


// ── Microcode ROM generation ────────────────────────────────────────────────

function generateMicrocode() {
    const EEPROM_SIZE = 8192;
    const data = new Uint32Array(EEPROM_SIZE); // 24-bit control words stored in 32-bit ints

    const {GI,MI,RI,RO,BO,II,AI,AO,BI,OI,CI,CE,CO,XI,XO,EO,FI,N,SUB,SU,SD,SI,SO,GO} = SIG;

    // Pre-fill fetch cycle for ALL addresses
    for (let addr = 0; addr < EEPROM_SIZE; addr++) {
        const t = addr & 0x0F;
        if (t === 0) data[addr] = CO | MI;
        else if (t === 1) data[addr] = RO | II | CE;
    }

    // Helper to populate microcode
    function set(instr, steps, flagMask, flagVal) {
        flagMask = flagMask || 0;
        flagVal = flagVal || 0;
        for (let v = 0; v < 2; v++) {
            for (let z = 0; z < 2; z++) {
                for (let c = 0; c < 2; c++) {
                    const flags = (c << 1) | z;
                    if ((flags & flagMask) === flagVal) {
                        for (let t = 0; t < steps.length; t++) {
                            const addr = (v << 12) | (z << 11) | (c << 10) | (instr << 4) | t;
                            data[addr] = steps[t];
                        }
                    }
                }
            }
        }
    }

    // ── 0x0_ System / Transfers / LSP ──
    set(0x00, [CO|MI, RO|II|CE, N]);                                          // NOP
    set(0x01, [CO|MI, RO|II|CE, AO|OI|N]);                                    // OUTA
    set(0x02, [CO|MI, RO|II|CE, BO|OI|N]);                                    // OUTB
    set(0x03, [CO|MI, RO|II|CE, XO|OI|N]);                                    // OUTX
    set(0x04, [CO|MI, RO|II|CE, GO|OI|N]);                                    // OUTG
    set(0x05, [CO|MI, RO|II|CE, AO|XI|N]);                                    // TAX
    set(0x06, [CO|MI, RO|II|CE, XO|AI|N]);                                    // TXA
    set(0x07, [CO|MI, RO|II|CE, AO|BI|N]);                                    // TAB
    set(0x08, [CO|MI, RO|II|CE, BO|AI|N]);                                    // TBA
    set(0x09, [CO|MI, RO|II|CE, AO|GI|N]);                                    // TAG
    set(0x0A, [CO|MI, RO|II|CE, GO|AI|N]);                                    // TGA
    set(0x0B, [CO|MI, RO|II|CE, SO|XI|N]);                                    // TSX
    set(0x0C, [CO|MI, RO|II|CE, XO|SI|N]);                                    // TXS
    set(0x0D, [CO|MI, RO|II|CE, CO|MI, RO|SI|CE|N]);                          // LSP imm
    set(0x0E, [CO|MI, RO|II|CE, CO|MI, RO|MI|CE, RO|SI|N]);                   // LSP abs

    // ── 0x1_ ALU (3x5 grid) ──
    set(0x10, [CO|MI, RO|II|CE, CO|MI, RO|BI|CE, AI|EO|FI|N]);               // ADD imm
    set(0x11, [CO|MI, RO|II|CE, CO|MI, RO|MI|CE, RO|BI, AI|EO|FI|N]);        // ADD abs
    set(0x12, [CO|MI, RO|II|CE, AI|EO|FI|N]);                                 // ADDB
    set(0x13, [CO|MI, RO|II|CE, XO|BI, AI|EO|FI|N]);                          // ADDX
    set(0x14, [CO|MI, RO|II|CE, GO|BI, AI|EO|FI|N]);                          // ADDG
    set(0x15, [CO|MI, RO|II|CE, CO|MI, RO|BI|CE|SUB, AI|EO|SUB|FI|N]);       // SUB imm
    set(0x16, [CO|MI, RO|II|CE, CO|MI, RO|MI|CE, RO|BI|SUB, AI|EO|SUB|FI|N]);// SUB abs
    set(0x17, [CO|MI, RO|II|CE, AI|EO|SUB|FI|N]);                             // SUBB
    set(0x18, [CO|MI, RO|II|CE, XO|BI|SUB, AI|EO|SUB|FI|N]);                 // SUBX
    set(0x19, [CO|MI, RO|II|CE, GO|BI|SUB, AI|EO|SUB|FI|N]);                 // SUBG
    set(0x1A, [CO|MI, RO|II|CE, CO|MI, RO|BI|CE|SUB, EO|SUB|FI|N]);          // CMP imm
    set(0x1B, [CO|MI, RO|II|CE, CO|MI, RO|MI|CE, RO|BI|SUB, EO|SUB|FI|N]);   // CMP abs
    set(0x1C, [CO|MI, RO|II|CE, EO|SUB|FI|N]);                                // CMPB
    set(0x1D, [CO|MI, RO|II|CE, XO|BI|SUB, EO|SUB|FI|N]);                    // CMPX
    set(0x1E, [CO|MI, RO|II|CE, GO|BI|SUB, EO|SUB|FI|N]);                    // CMPG

    // ── 0x2_ Loads & Stores ──
    set(0x20, [CO|MI, RO|II|CE, CO|MI, RO|AI|CE|N]);                          // LDA imm
    set(0x21, [CO|MI, RO|II|CE, CO|MI, RO|MI|CE, RO|AI|N]);                   // LDA abs
    set(0x22, [CO|MI, RO|II|CE, CO|MI, RO|AI|CE, XO|BI, EO|MI, RO|AI|N]);    // LDA abs,X
    set(0x23, [CO|MI, RO|II|CE, CO|MI, RO|MI|CE, RO|MI, RO|AI|N]);           // LDA (abs)
    set(0x24, [CO|MI, RO|II|CE, CO|MI, RO|BI|CE|N]);                          // LDB imm
    set(0x25, [CO|MI, RO|II|CE, CO|MI, RO|MI|CE, RO|BI|N]);                   // LDB abs
    set(0x26, [CO|MI, RO|II|CE, CO|MI, RO|XI|CE|N]);                          // LDX imm
    set(0x27, [CO|MI, RO|II|CE, CO|MI, RO|MI|CE, RO|XI|N]);                   // LDX abs
    set(0x28, [CO|MI, RO|II|CE, CO|MI, RO|GI|CE|N]);                          // LDG imm
    set(0x29, [CO|MI, RO|II|CE, CO|MI, RO|MI|CE, RO|GI|N]);                   // LDG abs
    set(0x2A, [CO|MI, RO|II|CE, CO|MI, RO|MI|CE, RI|AO|N]);                   // STA abs
    set(0x2B, [CO|MI, RO|II|CE, CO|MI, RO|MI|CE, RO|MI, AO|RI|N]);           // STA (abs)
    set(0x2C, [CO|MI, RO|II|CE, CO|MI, RO|MI|CE, RI|BO|N]);                   // STB abs
    set(0x2D, [CO|MI, RO|II|CE, CO|MI, RO|MI|CE, RI|XO|N]);                   // STX abs
    set(0x2E, [CO|MI, RO|II|CE, CO|MI, RO|MI|CE, RI|GO|N]);                   // STG abs

    // ── 0x3_ Flow Control & Stack ──
    set(0x30, [CO|MI, RO|II|CE, CO|MI, RO|CI|N]);                             // JMP
    set(0x31, [CO|MI, RO|II|CE, CO|MI, RO|XI|CE, SD, SO|MI, CO|RI, XO|CI|N]);// JSR
    set(0x32, [CO|MI, RO|II|CE, SO|MI, RO|CI|SU|N]);                          // RTS

    // JC (jump if C=1)
    set(0x33, [CO|MI, RO|II|CE, CO|MI, RO|CI|N], FLAG_C, FLAG_C);   // taken
    set(0x33, [CO|MI, RO|II|CE, CO|MI, CE|N],    FLAG_C, 0b00);     // not taken

    // JNC (jump if C=0)
    set(0x34, [CO|MI, RO|II|CE, CO|MI, RO|CI|N], FLAG_C, 0b00);    // taken
    set(0x34, [CO|MI, RO|II|CE, CO|MI, CE|N],    FLAG_C, FLAG_C);   // not taken

    // JZ (jump if Z=1)
    set(0x35, [CO|MI, RO|II|CE, CO|MI, RO|CI|N], FLAG_Z, FLAG_Z);  // taken
    set(0x35, [CO|MI, RO|II|CE, CO|MI, CE|N],    FLAG_Z, 0b00);    // not taken

    // JNZ (jump if Z=0)
    set(0x36, [CO|MI, RO|II|CE, CO|MI, RO|CI|N], FLAG_Z, 0b00);    // taken
    set(0x36, [CO|MI, RO|II|CE, CO|MI, CE|N],    FLAG_Z, FLAG_Z);  // not taken

    // Stack push/pop
    set(0x37, [CO|MI, RO|II|CE, SD, SO|MI, AO|RI|N]);              // PHA
    set(0x38, [CO|MI, RO|II|CE, SO|MI, RO|AI|SU|N]);               // PLA
    set(0x39, [CO|MI, RO|II|CE, SD, SO|MI, BO|RI|N]);              // PHB
    set(0x3A, [CO|MI, RO|II|CE, SO|MI, RO|BI|SU|N]);               // PLB
    set(0x3B, [CO|MI, RO|II|CE, SD, SO|MI, XO|RI|N]);              // PHX
    set(0x3C, [CO|MI, RO|II|CE, SO|MI, RO|XI|SU|N]);               // PLX
    set(0x3D, [CO|MI, RO|II|CE, SD, SO|MI, GO|RI|N]);              // PHG
    set(0x3E, [CO|MI, RO|II|CE, SO|MI, RO|GI|SU|N]);               // PLG

    return data;
}


// ── CPU class ───────────────────────────────────────────────────────────────

class CPU {
    constructor() {
        this.microcode = generateMicrocode();
        this.memory = new Uint8Array(256);
        this.reset();
    }

    reset() {
        this.a = 0;
        this.b = 0;
        this.x = 0;
        this.g = 0;
        this.ir = 0;
        this.out = 0;
        this.pc = 0;
        this.sp = 0;
        this.mar = 0;
        this.flags = 0;  // bit1=C, bit0=Z
        this.tState = 0;
        this.bus = 0;
        this.controlWord = 0;
        this.aluResult = 0;
        this.aluCarry = 0;
        this.aluZero = 0;
        this.cycleCount = 0;
        this.instrCount = 0;
        this.outputHistory = [];
        this.lastOutput = null;
    }

    // Look up the 24-bit control word from the microcode ROM
    lookupControl() {
        const instr = this.ir & 0x3F; // lower 6 bits
        const c = (this.flags & FLAG_C) ? 1 : 0;
        const z = (this.flags & FLAG_Z) ? 1 : 0;
        const addr = (z << 11) | (c << 10) | (instr << 4) | this.tState;
        return this.microcode[addr];
    }

    // Execute one T-state (one clock cycle)
    clock() {
        const cw = this.lookupControl();
        this.controlWord = cw;
        let bus = 0;

        // Phase 1: Drive the bus (OUT signals)
        if (cw & SIG.CO) bus = this.pc;
        if (cw & SIG.AO) bus = this.a;
        if (cw & SIG.BO) bus = this.b;
        if (cw & SIG.XO) bus = this.x;
        if (cw & SIG.GO) bus = this.g;
        if (cw & SIG.SO) bus = this.sp;
        if (cw & SIG.RO) bus = this.memory[this.mar];

        if (cw & SIG.EO) {
            // ALU computation: A + B or A + ~B + 1 (subtract)
            let result;
            if (cw & SIG.SUB) {
                result = this.a + (0xFF ^ this.b) + 1;
            } else {
                result = this.a + this.b;
            }
            this.aluResult = result & 0xFF;
            this.aluCarry = (result > 0xFF) ? 1 : 0;
            this.aluZero = (this.aluResult === 0) ? 1 : 0;
            bus = this.aluResult;
        }

        this.bus = bus & 0xFF;

        // Phase 2: Read from bus (IN signals)
        if (cw & SIG.MI) this.mar = this.bus;
        if (cw & SIG.AI) this.a = this.bus;
        if (cw & SIG.BI) this.b = this.bus;
        if (cw & SIG.XI) this.x = this.bus;
        if (cw & SIG.GI) this.g = this.bus;
        if (cw & SIG.SI) this.sp = this.bus;
        if (cw & SIG.II) this.ir = this.bus;
        if (cw & SIG.OI) {
            this.out = this.bus;
            if (this.lastOutput !== this.out) {
                this.outputHistory.push(this.out);
                this.lastOutput = this.out;
                // Keep history manageable
                if (this.outputHistory.length > 200) {
                    this.outputHistory = this.outputHistory.slice(-100);
                }
            }
        }
        if (cw & SIG.RI) {
            // Only write to RAM area (0x80-0xFF). ROM is 0x00-0x7F.
            if (this.mar >= 0x80) {
                this.memory[this.mar] = this.bus;
            }
        }
        if (cw & SIG.CI) this.pc = this.bus;
        if (cw & SIG.FI) {
            this.flags = 0;
            if (this.aluCarry) this.flags |= FLAG_C;
            if (this.aluZero) this.flags |= FLAG_Z;
        }

        // Phase 3: Counter operations
        if (cw & SIG.CE) this.pc = (this.pc + 1) & 0xFF;
        if (cw & SIG.SU) this.sp = (this.sp + 1) & 0xFF;
        if (cw & SIG.SD) this.sp = (this.sp - 1) & 0xFF;

        this.cycleCount++;

        // Phase 4: T-state control
        if (cw & SIG.N) {
            this.tState = 0;
            this.instrCount++;
        } else {
            this.tState = (this.tState + 1) & 0x0F;
        }
    }

    // Execute one full instruction (clock until N is asserted)
    stepInstruction() {
        // If we're at T=0, we're at the start of a new instruction
        // Execute cycles until N resets us back to T=0
        let safety = 20;
        do {
            this.clock();
            safety--;
        } while (this.tState !== 0 && safety > 0);
    }

    // Load program binary into ROM area (0x00-0x7F)
    loadProgram(bytes) {
        // Clear ROM area
        for (let i = 0; i < 128; i++) this.memory[i] = 0;
        // Load program
        const len = Math.min(bytes.length, 128);
        for (let i = 0; i < len; i++) {
            this.memory[i] = bytes[i];
        }
    }

    // Get active signal names for display
    getActiveSignals() {
        const active = [];
        for (let i = 0; i < SIG_NAMES.length; i++) {
            if (this.controlWord & SIG_BITS[i]) {
                active.push(SIG_NAMES[i]);
            }
        }
        return active;
    }

    // Get current instruction mnemonic
    getInstructionName() {
        const opcode = this.ir & 0x3F;
        return OPCODE_NAMES[opcode] || '???';
    }
}

// Export for use by other scripts
window.CPU = CPU;
window.SIG = SIG;
window.SIG_NAMES = SIG_NAMES;
window.SIG_BITS = SIG_BITS;
window.OPCODE_NAMES = OPCODE_NAMES;
