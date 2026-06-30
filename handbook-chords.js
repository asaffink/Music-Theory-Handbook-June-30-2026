/**
 * Chords module — Music Theory Handbook
 */
(function () {
  const SVG_NS = "http://www.w3.org/2000/svg";

  const ROOT_ROWS = [
    [{ label: "C", pc: 0, preferFlats: false }],
    [
      { label: "C#", pc: 1, preferFlats: false },
      { label: "Db", pc: 1, preferFlats: true }
    ],
    [{ label: "D", pc: 2, preferFlats: false }],
    [
      { label: "D#", pc: 3, preferFlats: false },
      { label: "Eb", pc: 3, preferFlats: true }
    ],
    [{ label: "E", pc: 4, preferFlats: false }],
    [{ label: "F", pc: 5, preferFlats: true }],
    [
      { label: "F#", pc: 6, preferFlats: false },
      { label: "Gb", pc: 6, preferFlats: true }
    ],
    [{ label: "G", pc: 7, preferFlats: false }],
    [
      { label: "G#", pc: 8, preferFlats: false },
      { label: "Ab", pc: 8, preferFlats: true }
    ],
    [{ label: "A", pc: 9, preferFlats: false }],
    [
      { label: "A#", pc: 10, preferFlats: false },
      { label: "Bb", pc: 10, preferFlats: true }
    ],
    [{ label: "B", pc: 11, preferFlats: false }]
  ];

  const QUALITY_OPTIONS = [
    { id: "major", label: "Major" },
    { id: "minor", label: "Minor" },
    { id: "diminished", label: "Dim", title: "Diminished" },
    { id: "augmented", label: "Aug", title: "Augmented" },
    { id: "sus4", label: "Sus4" }
  ];

  const EXT_OPTIONS = [
    { id: "7", label: "7" },
    { id: "Maj7", label: "Maj7" },
    { id: "Min7b5", label: "Min7♭5" },
    { id: "dim7", label: "dim7" }
  ];

  /** Which extensions are meaningful for each triad quality. */
  const EXT_ALLOWED = {
    major: { "7": true, Maj7: true, Min7b5: false, dim7: false },
    minor: { "7": true, Maj7: true, Min7b5: false, dim7: false },
    diminished: { "7": false, Maj7: false, Min7b5: true, dim7: true },
    augmented: { "7": true, Maj7: true, Min7b5: false, dim7: false },
    sus4: { "7": true, Maj7: true, Min7b5: false, dim7: false }
  };

  const LETTER_BASE = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
  const LETTERS = "CDEFGAB";
  const DIATONIC = { C: 0, D: 1, E: 2, F: 3, G: 4, A: 5, B: 6 };

  const CHORD_STAFF = {
    lineLeft: 48,
    lineRight: 392,
    lines: [168, 154, 140, 126, 112],
    clefX: 52,
    clefLine: 1,
    clefSize: 72,
    chordX: 210,
    bottomLineY: 168,
    stepPx: 7,
    lineGapPx: 14,
    middleLineY: 140,
    headRx: 10,
    headRy: 7,
    stemLen: 40,
    viewW: 440,
    viewH: 210,
    /** Fixed white card — centered in viewBox; extra margin below for ledger tones. */
    paper: { x: 28, y: 12, w: 384, h: 186 },
    /** Slightly under note width (2×rx); close to note height (2×ry) but not larger. */
    accFontSize: 40,
    /** Vertical tweak: one staff step up from raw note Y (between 0 and −2 steps). */
    accYShift: -7,
    /** Flats on a line sit slightly lower so the ♭ wraps the line. */
    accFlatOnLineDy: 2.5,
    /** Clear gap between notehead edge and nearest accidental. */
    accClearance: 7,
    /** Half-width estimate for accidental glyph at accFontSize. */
    accGlyphHalf: 11,
    /** Spacing between separate accidentals on one note (e.g. double sharp). */
    accSpacing: 17,
    accDoubleSpacing: 11,
    /** Extra left shift when accidentals would collide vertically. */
    accVerticalStagger: 12,
    /** Sus4 / seconds: note below sits under the accidental column. */
    accSusUnderShift: 18,
    /** Min vertical gap before we stagger accidentals (px). */
    accVerticalMinGap: 22
  };

  const STAFF_THEME_DEFAULT = {
    id: "blackWhite",
    paper: "#ffffff",
    ink: "#0f172a",
    line: "#334155",
    ledger: "#334155"
  };

  const STAFF_THEME_PRESETS = {
    blackWhite: STAFF_THEME_DEFAULT,
    softPaper: {
      id: "softPaper",
      paper: "#fffef8",
      ink: "#1a1a1a",
      line: "#4a4a4a",
      ledger: "#4a4a4a"
    },
    highContrast: {
      id: "highContrast",
      paper: "#ffffff",
      ink: "#000000",
      line: "#000000",
      ledger: "#000000"
    },
    warmFrame: {
      id: "warmFrame",
      paper: "#faf6ee",
      ink: "#2d2418",
      line: "#5c4d3a",
      ledger: "#5c4d3a"
    }
  };

  let rootKey = "C|0|0";
  let qualityId = "major";
  let extensionId = null;

  let chordSymbolEl;
  let chordStaffMount;
  let rootGroupEl;
  let qualityGroupEl;
  let extGroupEl;
  let extButtons = {};

  function normalizePc(pc) {
    return ((pc % 12) + 12) % 12;
  }

  function parseRootKey(key) {
    const [label, pc, flats] = key.split("|");
    return { label, pc: Number(pc), preferFlats: flats === "1" };
  }

  function pcFromName(name) {
    const table = {
      C: 0, "C#": 1, Db: 1, D: 2, "D#": 3, Eb: 3, E: 4, F: 5, "F#": 6, Gb: 6,
      G: 7, "G#": 8, Ab: 8, A: 9, "A#": 10, Bb: 10, B: 11
    };
    return table[name];
  }

  function parseNoteName(name) {
    const letter = name.charAt(0);
    let rest = name.slice(1);
    let alter = 0;
    if (rest.startsWith("##")) {
      alter = 2;
    } else if (rest.startsWith("bb")) {
      alter = -2;
    } else if (rest.startsWith("#")) {
      alter = 1;
    } else if (rest.startsWith("b")) {
      alter = -1;
    }
    return { letter, alter };
  }

  function formatNoteName(letter, alter) {
    if (alter === -2) return letter + "bb";
    if (alter === -1) return letter + "b";
    if (alter === 0) return letter;
    if (alter === 1) return letter + "#";
    if (alter === 2) return letter + "##";
    return letter;
  }

  function staffLineY(i) {
    return CHORD_STAFF.lines[i];
  }

  function midiToOctave(midi) {
    return Math.floor(midi / 12) - 1;
  }

  function noteNameToStaffY(name, notationOctave) {
    const { letter } = parseNoteName(name);
    const stepsFromE4 = (notationOctave - 4) * 7 + (DIATONIC[letter] - DIATONIC.E);
    return CHORD_STAFF.bottomLineY - stepsFromE4 * CHORD_STAFF.stepPx;
  }

  function midiFromSpelling(name, notationOctave) {
    const { letter, alter } = parseNoteName(name);
    return (notationOctave + 1) * 12 + LETTER_BASE[letter] + alter;
  }

  /** Root-position closed voicing: correct MIDI pitch + notation octave per spelled note. */
  function closedVoicing(names, rootPc) {
    const rootMidi = 60 + normalizePc(rootPc);
    const notationOctaves = [midiToOctave(rootMidi)];
    const midis = [rootMidi];

    for (let i = 1; i < names.length; i++) {
      const prevLetter = parseNoteName(names[i - 1]).letter;
      const letter = parseNoteName(names[i]).letter;
      let oct = notationOctaves[i - 1];
      if (DIATONIC[letter] <= DIATONIC[prevLetter]) oct += 1;

      let midi = midiFromSpelling(names[i], oct);
      while (midi <= midis[i - 1]) {
        oct += 1;
        midi = midiFromSpelling(names[i], oct);
      }
      notationOctaves.push(oct);
      midis.push(midi);
    }

    return { midis, notationOctaves };
  }

  /** Semitone offset of sounding pitch from the natural of this letter (same octave class). */
  function midiAlterForLetter(midi, letter) {
    const notePc = midi % 12;
    const natPc = LETTER_BASE[letter];
    let diff = notePc - natPc;
    if (diff > 6) diff -= 12;
    if (diff < -6) diff += 12;
    return diff;
  }

  const ACCIDENTAL = {
    sharp: "\u266F",
    flat: "\u266D",
    doubleSharp: "\u{1D12A}",
    doubleFlat: "\u{1D12B}"
  };

  function alterGlyphCount(alter) {
    if (alter === 0) return 0;
    if (alter === 2 || alter === -2) return 2;
    return 1;
  }

  function alterToGlyphs(alter) {
    if (alter === 1) return [ACCIDENTAL.sharp];
    if (alter === -1) return [ACCIDENTAL.flat];
    if (alter === 2) return [ACCIDENTAL.sharp, ACCIDENTAL.sharp];
    if (alter === -2) return [ACCIDENTAL.flat, ACCIDENTAL.flat];
    return [];
  }

  const ACC_FONT =
    "Noto Music, Segoe UI Symbol, Arial Unicode MS, DejaVu Sans, serif";

  function snapStaffY(y) {
    const step = CHORD_STAFF.stepPx;
    const steps = Math.round((CHORD_STAFF.bottomLineY - y) / step);
    return CHORD_STAFF.bottomLineY - steps * step;
  }

  function isOnStaffLine(y) {
    const steps = Math.round(
      (CHORD_STAFF.bottomLineY - y) / CHORD_STAFF.stepPx
    );
    return steps % 2 === 0;
  }

  function formatPitchClass(label) {
    return label
      .replace(/([A-G])##/g, `$1${ACCIDENTAL.doubleSharp}`)
      .replace(/([A-G])bb/g, `$1${ACCIDENTAL.doubleFlat}`)
      .replace(/([A-G])#/g, "$1\u266F")
      .replace(/([A-G])b/g, "$1\u266D");
  }

  function chordToneDefs(quality, extension) {
    if (extension === "Min7b5") {
      return [
        { steps: 0, semi: 0 },
        { steps: 2, semi: 3 },
        { steps: 4, semi: 6 },
        { steps: 6, semi: 10 }
      ];
    }
    if (extension === "dim7") {
      return [
        { steps: 0, semi: 0 },
        { steps: 2, semi: 3 },
        { steps: 4, semi: 6 },
        { steps: 6, semi: 9 }
      ];
    }

    const triads = {
      major: [
        { steps: 0, semi: 0 },
        { steps: 2, semi: 4 },
        { steps: 4, semi: 7 }
      ],
      minor: [
        { steps: 0, semi: 0 },
        { steps: 2, semi: 3 },
        { steps: 4, semi: 7 }
      ],
      diminished: [
        { steps: 0, semi: 0 },
        { steps: 2, semi: 3 },
        { steps: 4, semi: 6 }
      ],
      augmented: [
        { steps: 0, semi: 0 },
        { steps: 2, semi: 4 },
        { steps: 4, semi: 8 }
      ],
      sus4: [
        { steps: 0, semi: 0 },
        { steps: 3, semi: 5 },
        { steps: 4, semi: 7 }
      ]
    };
    const tones = [...triads[quality]];

    if (extension === "7") tones.push({ steps: 6, semi: 10 });
    else if (extension === "Maj7") tones.push({ steps: 6, semi: 11 });

    return tones;
  }

  function spellChordTone(rootName, diatonicSteps, semitoneOffset, preferFlats) {
    const rootPc = pcFromName(rootName);
    const targetPc = normalizePc(rootPc + semitoneOffset);
    const rootIdx = LETTERS.indexOf(rootName.charAt(0));
    const letter = LETTERS[(rootIdx + diatonicSteps) % 7];
    const base = LETTER_BASE[letter];
    const altOrder = preferFlats ? [0, -1, -2, 1, 2] : [0, 1, 2, -1, -2];

    for (const alt of altOrder) {
      if (normalizePc(base + alt) === targetPc) {
        return formatNoteName(letter, alt);
      }
    }
    return rootName;
  }

  function chordSymbol(rootLabel, quality, extension) {
    const root = formatPitchClass(rootLabel);

    if (extension === "Min7b5") return `${root}m7\u266D5`;
    if (extension === "dim7") return `${root}\u00B07`;

    let s = root;
    if (quality === "minor") s += "m";
    else if (quality === "diminished") s += "\u00B0";
    else if (quality === "augmented") s += "+";
    else if (quality === "sus4") s += "sus4";

    if (extension === "7") s += "7";
    else if (extension === "Maj7") s += quality === "minor" ? "Maj7" : "maj7";

    return s;
  }


  function applyExtensionAvailability() {
    const allowed = EXT_ALLOWED[qualityId] || {};
    EXT_OPTIONS.forEach((opt) => {
      const btn = extButtons[opt.id];
      if (!btn) return;
      const ok = allowed[opt.id] === true;
      btn.classList.toggle("unavailable", !ok);
      if (!ok && extensionId === opt.id) {
        extensionId = null;
        btn.classList.remove("active");
      }
    });
  }

  function ledgerLineYsForNote(y) {
    const snapped = snapStaffY(y);
    const staffTop = staffLineY(4);
    const staffBottom = staffLineY(0);
    const gap = CHORD_STAFF.lineGapPx;
    const ys = [];

    if (snapped > staffBottom + 0.5) {
      for (let ly = staffBottom + gap; ly <= snapped + 0.01; ly += gap) {
        if (Math.abs(ly - snapped) < 0.5) ys.push(ly);
      }
    }
    if (snapped < staffTop - 0.5) {
      for (let ly = staffTop - gap; ly >= snapped - 0.01; ly -= gap) {
        if (Math.abs(ly - snapped) < 0.5) ys.push(ly);
      }
    }
    return ys;
  }

  function isOnLedgerLine(y) {
    return ledgerLineYsForNote(y).length > 0;
  }

  /** Ledger lines pass through the center of each notehead that sits on them. */
  function drawLedgerLinesForNotes(svg, notePositions, stroke) {
    const ledgerHalf = CHORD_STAFF.headRx + 8;
    const drawn = new Set();

    notePositions.forEach((note) => {
      const nx = CHORD_STAFF.chordX + note.dx;
      ledgerLineYsForNote(note.y).forEach((ly) => {
        const key = `${ly}|${Math.round(nx)}`;
        if (drawn.has(key)) return;
        drawn.add(key);
        const ln = document.createElementNS(SVG_NS, "line");
        ln.setAttribute("x1", nx - ledgerHalf);
        ln.setAttribute("x2", nx + ledgerHalf);
        ln.setAttribute("y1", ly);
        ln.setAttribute("y2", ly);
        ln.setAttribute("stroke", stroke);
        ln.setAttribute("stroke-width", "1.3");
        svg.appendChild(ln);
      });
    });
  }

  function hasSecondCluster(notes) {
    const sorted = [...notes].sort((a, b) => a.y - b.y);
    for (let i = 0; i < sorted.length - 1; i++) {
      if (sorted[i + 1].y - sorted[i].y <= CHORD_STAFF.stepPx + 0.01) return true;
    }
    return false;
  }

  function dxForNoteSide(stemX, side) {
    const cx = CHORD_STAFF.chordX;
    const rx = CHORD_STAFF.headRx;
    const pad = 1;
    if (side === "left") return stemX - rx - pad - cx;
    if (side === "right") return stemX + rx + pad - cx;
    return 0;
  }

  /**
   * Shared stem: seconds straddle stemX; other tones stack on the stem side.
   * Stem up → lower-left / upper-right of the 2nd; stack on the left.
   */
  function layoutNoteheadOffsets(notes, stemUp) {
    const stemX = CHORD_STAFF.chordX;
    const byTop = [...notes].sort((a, b) => a.y - b.y);
    const inSecond = new Set();

    notes.forEach((n) => {
      n.dx = 0;
    });

    let i = 0;
    while (i < byTop.length) {
      let j = i;
      while (
        j + 1 < byTop.length &&
        byTop[j + 1].y - byTop[j].y <= CHORD_STAFF.stepPx + 0.01
      ) {
        j += 1;
      }
      if (j > i) {
        for (let k = i; k <= j; k++) {
          const note = byTop[k];
          inSecond.add(note);
          const idx = k - i;
          if (stemUp) {
            note.dx =
              idx % 2 === 0
                ? dxForNoteSide(stemX, "right")
                : dxForNoteSide(stemX, "left");
          } else {
            note.dx =
              idx % 2 === 0
                ? dxForNoteSide(stemX, "left")
                : dxForNoteSide(stemX, "right");
          }
        }
      }
      i = j + 1;
    }

    const stackSide = stemUp ? "left" : "right";
    notes.forEach((n) => {
      if (inSecond.has(n)) return;
      if (!hasSecondCluster(notes)) {
        n.dx = 0;
        return;
      }
      n.dx = dxForNoteSide(stemX, stackSide);
    });
  }

  function computeStemX(notePositions, stemUp) {
    const base = CHORD_STAFF.chordX;
    const rx = CHORD_STAFF.headRx;
    const pad = 1;

    if (hasSecondCluster(notePositions)) {
      return base;
    }

    if (stemUp) {
      return base + rx + pad;
    }
    return base - rx - pad;
  }

  /** True when another notehead sits under this note's accidental column. */
  function noteheadUnderAccidentalColumn(noteNx, otherNx) {
    const rx = CHORD_STAFF.headRx;
    const accRight = noteNx - rx - CHORD_STAFF.accClearance;
    const accLeft = accRight - CHORD_STAFF.accGlyphHalf * 2.2;
    return (
      otherNx + rx > accLeft - 1 && otherNx - rx < accRight + rx * 0.4
    );
  }

  /** X centers for accidentals: always left of notehead with safe clearance. */
  function accidentalCentersX(nx, alter) {
    const count = alterGlyphCount(alter);
    if (!count) return [];
    const rx = CHORD_STAFF.headRx;
    const gap = rx + CHORD_STAFF.accClearance + CHORD_STAFF.accGlyphHalf;
    const nearest = nx - gap;
    const spacing =
      alter === 2 || alter === -2
        ? CHORD_STAFF.accDoubleSpacing
        : CHORD_STAFF.accSpacing;
    const positions = [];
    for (let i = count - 1; i >= 0; i--) {
      positions.push(nearest - i * spacing);
    }
    return positions;
  }

  /**
   * When chord tones are close vertically, shift accidentals left so they
   * do not stack in one column (middle tone of 3 shifts left, etc.).
   */
  function layoutAccidentalShifts(notePositions) {
    const shifts = new Map();
    const vGap = CHORD_STAFF.accVerticalMinGap;
    const stagger = CHORD_STAFF.accVerticalStagger;

    const entries = notePositions
      .filter((n) => alterGlyphCount(n.alter) > 0)
      .map((n) => ({ note: n, y: snapStaffY(n.y) }))
      .sort((a, b) => a.y - b.y);

    entries.forEach((e) => shifts.set(e.note, 0));

    let i = 0;
    while (i < entries.length) {
      let j = i;
      while (j + 1 < entries.length && entries[j + 1].y - entries[j].y < vGap) {
        j += 1;
      }
      const len = j - i + 1;
      if (len === 2) {
        shifts.set(entries[j].note, stagger);
      } else if (len >= 3) {
        for (let k = i; k <= j; k++) {
          const idx = k - i;
          if (idx > 0 && idx < len - 1) {
            shifts.set(entries[k].note, stagger);
          }
        }
      }
      i = j + 1;
    }

    if (hasSecondCluster(notePositions)) {
      const step = CHORD_STAFF.stepPx;
      const chordX = CHORD_STAFF.chordX;
      entries.forEach((entry) => {
        const y = entry.y;
        const noteNx = chordX + entry.note.dx;
        const blockedBelow = notePositions.some((other) => {
          if (other === entry.note) return false;
          if (Math.abs(snapStaffY(other.y) - y - step) >= 0.6) return false;
          return noteheadUnderAccidentalColumn(
            noteNx,
            chordX + other.dx
          );
        });
        if (blockedBelow) {
          shifts.set(
            entry.note,
            (shifts.get(entry.note) || 0) + CHORD_STAFF.accSusUnderShift
          );
        }
      });
    }

    return shifts;
  }

  function accidentalDrawY(noteStaffY, glyph) {
    let y = noteStaffY + CHORD_STAFF.accYShift;
    const isFlat =
      glyph === ACCIDENTAL.flat || glyph === ACCIDENTAL.doubleFlat;
    if (isFlat && isOnStaffLine(noteStaffY)) {
      y += CHORD_STAFF.accFlatOnLineDy;
    }
    return y;
  }

  function appendAccidentalText(svg, x, noteStaffY, glyph, ink) {
    const y = accidentalDrawY(noteStaffY, glyph);
    const acc = document.createElementNS(SVG_NS, "text");
    acc.setAttribute("x", x);
    acc.setAttribute("y", y);
    acc.setAttribute("fill", ink);
    acc.setAttribute("font-family", ACC_FONT);
    acc.setAttribute("text-anchor", "middle");
    acc.setAttribute("dominant-baseline", "middle");
    acc.setAttribute("font-size", String(CHORD_STAFF.accFontSize));
    acc.textContent = glyph;
    svg.appendChild(acc);
  }

  function appendAccidentalsForNote(svg, nx, noteStaffY, alter, ink, shiftX) {
    if (!alter) return;

    const xs = accidentalCentersX(nx, alter).map((x) => x - shiftX);

    if (alter === 2) {
      const cx =
        xs.length >= 2 ? (xs[0] + xs[1]) / 2 : xs[0];
      appendAccidentalText(svg, cx, noteStaffY, ACCIDENTAL.doubleSharp, ink);
      return;
    }

    if (alter === -2) {
      const cx =
        xs.length >= 2 ? (xs[0] + xs[1]) / 2 : xs[0];
      appendAccidentalText(svg, cx, noteStaffY, ACCIDENTAL.doubleFlat, ink);
      return;
    }

    const glyphs = alterToGlyphs(alter);
    glyphs.forEach((glyph, i) => {
      appendAccidentalText(svg, xs[i], noteStaffY, glyph, ink);
    });
  }

  function buildChordStaffSvg(noteNames, midis, notationOctaves, themeId) {
    const theme =
      STAFF_THEME_PRESETS[themeId] || STAFF_THEME_DEFAULT;
    const svg = document.createElementNS(SVG_NS, "svg");
    svg.setAttribute(
      "viewBox",
      `0 0 ${CHORD_STAFF.viewW} ${CHORD_STAFF.viewH}`
    );
    svg.setAttribute("class", "chord-staff-svg");

    const x = CHORD_STAFF.chordX;
    const notePositions = noteNames.map((name, i) => {
      const midi = midis[i];
      const { letter } = parseNoteName(name);
      const rawY = noteNameToStaffY(name, notationOctaves[i]);
      return {
        name,
        letter,
        midi,
        y: snapStaffY(rawY),
        alter: midiAlterForLetter(midi, letter),
        dx: 0
      };
    });

    notePositions.sort((a, b) => b.y - a.y);

    const bottomY = notePositions[0].y;
    const topY = notePositions[notePositions.length - 1].y;
    const stemUp = bottomY >= CHORD_STAFF.middleLineY;
    layoutNoteheadOffsets(notePositions, stemUp);
    const stemX = computeStemX(notePositions, stemUp);
    const paper = CHORD_STAFF.paper;

    const frame = document.createElementNS(SVG_NS, "rect");
    frame.setAttribute("x", "0");
    frame.setAttribute("y", "0");
    frame.setAttribute("width", CHORD_STAFF.viewW);
    frame.setAttribute("height", CHORD_STAFF.viewH);
    frame.setAttribute("fill", "#000000");
    svg.appendChild(frame);

    const staffBg = document.createElementNS(SVG_NS, "rect");
    staffBg.setAttribute("x", paper.x);
    staffBg.setAttribute("y", paper.y);
    staffBg.setAttribute("width", paper.w);
    staffBg.setAttribute("height", paper.h);
    staffBg.setAttribute("rx", "10");
    staffBg.setAttribute("fill", theme.paper);
    staffBg.setAttribute("stroke", "#e2e8f0");
    staffBg.setAttribute("stroke-width", "1");
    svg.appendChild(staffBg);

    CHORD_STAFF.lines.forEach((y) => {
      const ln = document.createElementNS(SVG_NS, "line");
      ln.setAttribute("x1", CHORD_STAFF.lineLeft);
      ln.setAttribute("x2", CHORD_STAFF.lineRight);
      ln.setAttribute("y1", y);
      ln.setAttribute("y2", y);
      ln.setAttribute("stroke", theme.line);
      ln.setAttribute("stroke-width", "1.6");
      svg.appendChild(ln);
    });

    drawLedgerLinesForNotes(svg, notePositions, theme.ledger);

    const clef = document.createElementNS(SVG_NS, "text");
    clef.setAttribute("x", CHORD_STAFF.clefX);
    clef.setAttribute("y", staffLineY(CHORD_STAFF.clefLine));
    clef.setAttribute("fill", theme.ink);
    clef.setAttribute("font-size", String(CHORD_STAFF.clefSize));
    clef.setAttribute("font-family", "serif");
    clef.setAttribute("text-anchor", "middle");
    clef.setAttribute("dominant-baseline", "middle");
    clef.textContent = "\uD834\uDD1E";
    svg.appendChild(clef);

    const stemLen = CHORD_STAFF.stemLen;
    const stem = document.createElementNS(SVG_NS, "line");
    stem.setAttribute("x1", stemX);
    stem.setAttribute("x2", stemX);
    if (stemUp) {
      stem.setAttribute("y1", bottomY);
      stem.setAttribute("y2", topY - stemLen);
    } else {
      stem.setAttribute("y1", topY);
      stem.setAttribute("y2", bottomY + stemLen);
    }
    stem.setAttribute("stroke", theme.ink);
    stem.setAttribute("stroke-width", "2.2");
    stem.setAttribute("stroke-linecap", "butt");
    svg.appendChild(stem);

    const accShifts = layoutAccidentalShifts(notePositions);

    notePositions.forEach((note) => {
      const nx = x + note.dx;
      appendAccidentalsForNote(
        svg,
        nx,
        note.y,
        note.alter,
        theme.ink,
        accShifts.get(note) || 0
      );
      const head = document.createElementNS(SVG_NS, "ellipse");
      head.setAttribute("cx", nx);
      head.setAttribute("cy", note.y);
      head.setAttribute("rx", CHORD_STAFF.headRx);
      head.setAttribute("ry", CHORD_STAFF.headRy);
      head.setAttribute("fill", theme.ink);
      head.setAttribute("stroke", theme.ink);
      head.setAttribute("stroke-width", "1.4");
      svg.appendChild(head);
    });

    return svg;
  }

  function updateChordDisplay() {
    const root = parseRootKey(rootKey);
    const toneDefs = chordToneDefs(qualityId, extensionId);
    const names = toneDefs.map((t) =>
      spellChordTone(root.label, t.steps, t.semi, root.preferFlats)
    );
    const { midis, notationOctaves } = closedVoicing(names, root.pc);
    const symbol = chordSymbol(root.label, qualityId, extensionId);

    chordSymbolEl.textContent = symbol;
    const staffSvg = buildChordStaffSvg(names, midis, notationOctaves);
    staffSvg.setAttribute("role", "img");
    staffSvg.setAttribute("aria-label", symbol);
    chordStaffMount.replaceChildren(staffSvg);
  }

  function setRadioActive(container, selector, activeBtn) {
    container.querySelectorAll(selector).forEach((btn) => {
      btn.classList.toggle("active", btn === activeBtn);
    });
  }

  function bindRadioGroup(container, selector, onSelect, afterSelect) {
    container.querySelectorAll(selector).forEach((btn) => {
      btn.addEventListener("click", () => {
        if (btn.classList.contains("unavailable")) return;
        onSelect(btn);
        setRadioActive(container, selector, btn);
        if (afterSelect) afterSelect();
        updateChordDisplay();
      });
    });
  }

  function bindExtensionGroup(container) {
    container.querySelectorAll("[data-ext]").forEach((btn) => {
      btn.addEventListener("click", () => {
        if (btn.classList.contains("unavailable")) return;
        const id = btn.dataset.ext;
        if (extensionId === id) {
          extensionId = null;
          btn.classList.remove("active");
        } else {
          extensionId = id || null;
          container.querySelectorAll("[data-ext]").forEach((b) => {
            b.classList.toggle("active", b === btn);
          });
        }
        updateChordDisplay();
      });
    });
  }

  function buildRootButtons() {
    rootGroupEl.innerHTML = "";
    const wrap = document.createElement("div");
    wrap.className = "chord-root-grid";

    let first = true;
    ROOT_ROWS.forEach((row) => {
      const cell = document.createElement("div");
      cell.className = "chord-root-cell";
      row.forEach((opt) => {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "chord-opt chord-opt-root" + (first ? " active" : "");
        btn.dataset.rootKey = `${opt.label}|${opt.pc}|${opt.preferFlats ? 1 : 0}`;
        btn.textContent = opt.label;
        cell.appendChild(btn);
        if (first) first = false;
      });
      wrap.appendChild(cell);
    });

    rootGroupEl.appendChild(wrap);
    bindRadioGroup(rootGroupEl, ".chord-opt", (btn) => {
      rootKey = btn.dataset.rootKey;
    });
  }

  function buildQualityButtons() {
    qualityGroupEl.innerHTML = "";
    qualityGroupEl.className = "chord-option-grid";
    QUALITY_OPTIONS.forEach((opt, i) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "chord-opt chord-opt-lg" + (i === 0 ? " active" : "");
      btn.dataset.quality = opt.id;
      btn.textContent = opt.label;
      if (opt.title) btn.title = opt.title;
      qualityGroupEl.appendChild(btn);
    });
    bindRadioGroup(
      qualityGroupEl,
      ".chord-opt",
      (btn) => {
        qualityId = btn.dataset.quality;
      },
      () => {
        applyExtensionAvailability();
      }
    );
  }

  function buildExtensionButtons() {
    extGroupEl.innerHTML = "";
    extGroupEl.className = "chord-option-grid chord-option-grid-ext";
    extButtons = {};
    EXT_OPTIONS.forEach((opt) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "chord-opt chord-opt-lg chord-opt-ext";
      btn.dataset.ext = opt.id;
      btn.textContent = opt.label;
      extGroupEl.appendChild(btn);
      extButtons[opt.id] = btn;
    });
    bindExtensionGroup(extGroupEl);
    applyExtensionAvailability();
  }

  window.initChordsModule = function initChordsModule(refs) {
    chordSymbolEl = refs.chordSymbolEl;
    chordStaffMount = refs.chordStaffMount;
    rootGroupEl = refs.rootGroupEl;
    qualityGroupEl = refs.qualityGroupEl;
    extGroupEl = refs.extGroupEl;

    buildRootButtons();
    buildQualityButtons();
    buildExtensionButtons();
    updateChordDisplay();
  };

  function buildDemoChord(rootLabel, rootPc, preferFlats, quality, extension) {
    const toneDefs = chordToneDefs(quality, extension);
    const names = toneDefs.map((t) =>
      spellChordTone(rootLabel, t.steps, t.semi, preferFlats)
    );
    const voicing = closedVoicing(names, rootPc);
    return { names, midis: voicing.midis, notationOctaves: voicing.notationOctaves };
  }

  window.ChordsStaffPreview = {
    themes: STAFF_THEME_PRESETS,
    buildChordStaffSvg,
    buildDemoChord
  };
})();
