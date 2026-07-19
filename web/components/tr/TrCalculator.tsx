"use client";

// Port of js/calculator.js — the illustrative claim estimator (Practice Areas
// centerpiece). Arithmetic, ranges, notes, and the 120ms fade-and-swap result update are
// all verbatim from the source; the form is driven by React state instead of DOM reads.
import { useEffect, useRef, useState } from "react";

const BASE_RANGES: Record<string, { low: number; high: number; note: string }> = {
  squash: {
    low: 1500,
    high: 4000,
    note: "Court-collision claims typically turn on liability for court surface, lighting, and partner conduct.",
  },
  ocular: {
    low: 3000,
    high: 8000,
    note: "Eye injuries often carry higher settlement values owing to the risk of lasting visual impairment.",
  },
  slip: {
    low: 1000,
    high: 3000,
    note: "Premises-liability claims hinge on whether the occupier failed a reasonable duty of care.",
  },
  "general-sports": {
    low: 1200,
    high: 3500,
    note: "General sporting-injury claims vary widely with the rules and risks inherent to the activity.",
  },
  other: {
    low: 800,
    high: 2500,
    note: "Every public-liability matter is assessed on its own facts.",
  },
};

const SEVERITY_MULTIPLIER: Record<string, number> = {
  minor: 1,
  moderate: 2.2,
  severe: 4.5,
};

// Duty-of-care uplift applied to general damages, by maintenance standard.
const MAINTENANCE: Record<string, { uplift: number; note: string }> = {
  exemplary: { uplift: 0, note: "No uplift — maintenance records even the Court of Appeal would admire." },
  customary: { uplift: 0.06, note: "A modest uplift for housekeeping of the customary standard." },
  regrettable: { uplift: 0.22, note: "Uplift applied: the inspection log is, charitably, aspirational." },
  wrenfield: { uplift: 0.48, note: "Substantial uplift — the court is itself a material witness." },
};

const EQUIPMENT_UPLIFT = 0.12; // eyewear, racquet, or tin failing its one job
const WITNESS_UPLIFT = 0.015; // per witness, capped
const WITNESS_UPLIFT_CAP = 0.09;

// Illustrative weekly earnings for the loss-of-earnings line.
const WEEKLY_LOW = 430;
const WEEKLY_HIGH = 610;

interface CalcInputs {
  incident: string;
  severity: string;
  weeks: number;
  maintenance: string;
  witnesses: number;
  equipment: boolean;
}

interface CalcLine {
  name: string;
  low: number;
  high: number;
  note: string;
}

interface CalcResult {
  lines: CalcLine[];
  low: number;
  high: number;
}

const DEFAULT_INPUTS: CalcInputs = {
  incident: "squash",
  severity: "minor",
  weeks: 4,
  maintenance: "customary",
  witnesses: 2,
  equipment: false,
};

function roundTo(value: number, nearest: number): number {
  return Math.round(value / nearest) * nearest;
}

function formatGBP(value: number): string {
  return "£" + Math.round(value).toLocaleString("en-GB");
}

function formatRange(low: number, high: number): string {
  return formatGBP(low) + " – " + formatGBP(high);
}

function compute(inputs: CalcInputs): CalcResult {
  const weeks = inputs.weeks || 0;
  const maintenance = MAINTENANCE[inputs.maintenance] || MAINTENANCE.customary;
  const witnesses = Math.min(Math.max(inputs.witnesses || 0, 0), 12);

  const base = BASE_RANGES[inputs.incident] || BASE_RANGES.other;
  const mult = SEVERITY_MULTIPLIER[inputs.severity] || 1;

  // Line 1: general damages — pain, suffering and loss of amenity.
  const gdLow = base.low * mult;
  const gdHigh = base.high * mult;

  // Line 2: loss of earnings.
  const earnLow = weeks * WEEKLY_LOW;
  const earnHigh = weeks * WEEKLY_HIGH;

  // Line 3: special damages (out-of-pocket expenses), scaled by severity.
  const specialLow = 220 * mult;
  const specialHigh = 520 * mult;

  // Line 4: duty-of-care, equipment and witness-corroboration uplift on general damages.
  const upliftPct =
    maintenance.uplift +
    (inputs.equipment ? EQUIPMENT_UPLIFT : 0) +
    Math.min(witnesses * WITNESS_UPLIFT, WITNESS_UPLIFT_CAP);
  const upliftLow = gdLow * upliftPct;
  const upliftHigh = gdHigh * upliftPct;

  let upliftNote = maintenance.note;
  if (inputs.equipment)
    upliftNote += " Includes an allowance for equipment that failed its one job.";
  if (witnesses > 0) {
    upliftNote +=
      " " +
      witnesses +
      (witnesses === 1 ? " witness" : " witnesses") +
      " prepared to recall the sound it made.";
  }

  const lines: CalcLine[] = [
    {
      name: "General damages",
      low: roundTo(gdLow, 50),
      high: roundTo(gdHigh, 50),
      note: base.note,
    },
    {
      name: "Loss of earnings",
      low: roundTo(earnLow, 50),
      high: roundTo(earnHigh, 50),
      note: "See Schedule of Loss, para. 4 — net of any sums your employer pretends not to owe.",
    },
    {
      name: "Special damages",
      low: roundTo(specialLow, 50),
      high: roundTo(specialHigh, 50),
      note: "Travel to appointments, re-booked court fees, and one racquet re-strung out of sympathy.",
    },
    {
      name: "Duty-of-care uplift",
      low: roundTo(upliftLow, 50),
      high: roundTo(upliftHigh, 50),
      note: upliftNote,
    },
  ];

  let low = 0;
  let high = 0;
  lines.forEach((line) => {
    low += line.low;
    high += line.high;
  });

  return { lines, low, high };
}

export default function TrCalculator() {
  const [inputs, setInputs] = useState<CalcInputs>(DEFAULT_INPUTS);
  // The source rendered a static placeholder and swapped in the computed breakdown after
  // a 120ms fade on every input; we compute the initial breakdown during SSR (same
  // visible result once JS ran) and keep the fade-and-swap on changes.
  const [shown, setShown] = useState<CalcResult>(() => compute(DEFAULT_INPUTS));
  const [panelOpacity, setPanelOpacity] = useState(1);
  const pending = useRef<number | null>(null);

  // The source debounced result updates by 120ms with a fade on the result panel; that
  // scheduling happens in the input handler rather than an effect.
  useEffect(() => {
    return () => {
      if (pending.current) window.clearTimeout(pending.current);
    };
  }, []);

  function update<K extends keyof CalcInputs>(key: K, value: CalcInputs[K]) {
    const next = { ...inputs, [key]: value };
    setInputs(next);
    setPanelOpacity(0);
    if (pending.current) window.clearTimeout(pending.current);
    pending.current = window.setTimeout(() => {
      setShown(compute(next));
      setPanelOpacity(1);
    }, 120);
  }

  return (
    <div className="calculator reveal">
      <form
        className="calculator__form"
        id="claim-calculator"
        onSubmit={(e) => e.preventDefault()}
      >
        <h3 style={{ marginBottom: "4px" }}>Tell Us What Happened</h3>
        <div className="field">
          <label htmlFor="incident">Type of Incident</label>
          <select
            id="incident"
            name="incident"
            value={inputs.incident}
            onChange={(e) => update("incident", e.target.value)}
          >
            <option value="squash">Squash / racquetball court collision</option>
            <option value="ocular">Ball or racquet strike to the eye</option>
            <option value="slip">Slip or trip on court/premises</option>
            <option value="general-sports">General sporting injury</option>
            <option value="other">Other public liability incident</option>
          </select>
        </div>
        <div className="field">
          <label htmlFor="severity">Severity</label>
          <select
            id="severity"
            name="severity"
            value={inputs.severity}
            onChange={(e) => update("severity", e.target.value)}
          >
            <option value="minor">Minor — fully recovered within weeks</option>
            <option value="moderate">Moderate — ongoing treatment/rehab</option>
            <option value="severe">Severe — long-term or permanent impact</option>
          </select>
        </div>
        <div className="field field--range">
          <label htmlFor="weeks">
            Time Off Work —{" "}
            <output id="weeks-output" htmlFor="weeks">
              {inputs.weeks === 1 ? "1 week" : `${inputs.weeks} weeks`}
            </output>
          </label>
          <input
            type="range"
            id="weeks"
            name="weeks"
            min="0"
            max="52"
            value={inputs.weeks}
            onChange={(e) => update("weeks", parseInt(e.target.value, 10) || 0)}
          />
        </div>
        <div className="field">
          <label htmlFor="maintenance">Court Maintenance Standards</label>
          <select
            id="maintenance"
            name="maintenance"
            value={inputs.maintenance}
            onChange={(e) => update("maintenance", e.target.value)}
          >
            <option value="exemplary">
              Exemplary — sprung floor, inspected weekly, logbook signed
            </option>
            <option value="customary">Customary — swept most days, tin largely intact</option>
            <option value="regrettable">
              Regrettable — last inspected during the previous tenancy
            </option>
            <option value="wrenfield">
              Wrenfield-tier — the court is itself a material witness
            </option>
          </select>
        </div>
        <div className="field">
          <label htmlFor="witnesses">Witnesses Present</label>
          <input
            type="number"
            id="witnesses"
            name="witnesses"
            min="0"
            max="12"
            value={inputs.witnesses}
            onChange={(e) => update("witnesses", parseInt(e.target.value, 10) || 0)}
          />
        </div>
        <div className="field field--check">
          <label className="check" htmlFor="equipment">
            <input
              type="checkbox"
              id="equipment"
              name="equipment"
              checked={inputs.equipment}
              onChange={(e) => update("equipment", e.target.checked)}
            />
            <span>Equipment failure involved (eyewear, racquet, or tin)</span>
          </label>
        </div>
      </form>
      <div className="calculator__result" style={{ opacity: panelOpacity }}>
        <span className="calculator__result-label">Itemised Estimate</span>
        <ul className="calc-breakdown" id="calc-breakdown" aria-live="polite">
          {shown.lines.map((line) => (
            <li className="calc-line" key={line.name}>
              <div className="calc-line__head">
                <span className="calc-line__name">{line.name}</span>
                <span className="calc-line__range">{formatRange(line.low, line.high)}</span>
              </div>
              <p className="calc-line__note">{line.note}</p>
            </li>
          ))}
        </ul>
        <span className="calculator__result-value" id="calc-result-value" aria-live="polite">
          {formatRange(shown.low, shown.high)}
        </span>
        <p className="calculator__result-note" id="calc-result-note" aria-live="polite">
          Itemisation is illustrative; our clerks round to the nearest £50 out of habit.
        </p>
        <p className="calculator__disclaimer">
          Illustrative only — generated by a simple JavaScript function against invented
          figures for demonstration purposes. This is not a valuation of any real claim, not
          a Schedule of Loss, and does not constitute legal advice. Turner &amp; Rhodes is a
          fictional firm created for this portfolio site; consult a real, qualified and
          regulated solicitor for an actual assessment.
        </p>
      </div>
    </div>
  );
}
