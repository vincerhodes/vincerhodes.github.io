"use client";

// Port of js/memo.js — the incident memorandum generator (contact page only). Same
// validation rules, memo composition, clipboard + print behaviour; state-driven instead
// of DOM-manipulated.
import { useRef, useState } from "react";
import TrCrest from "./TrCrest";

const INCIDENT_LABELS: Record<string, string> = {
  "ball-strike": "ball-strike",
  "racquet-strike": "racquet-strike",
  "wall-collision": "wall collision",
  "floor-slip": "floor-slip",
};

const DATE_FORMAT: Intl.DateTimeFormatOptions = { day: "numeric", month: "long", year: "numeric" };

type Errors = Record<string, string>;

interface MemoData {
  re: string;
  para1: string;
  para2: string;
  para3: string;
  sigDate: string;
  text: string;
}

function formatDate(d: Date): string {
  return d.toLocaleDateString("en-GB", DATE_FORMAT);
}

// Parse a date input's YYYY-MM-DD as a local date (not UTC midnight).
function parseISODate(iso: string): Date {
  const parts = iso.split("-");
  return new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
}

function sentence(text: string): string {
  let t = text.trim();
  t = t.charAt(0).toUpperCase() + t.slice(1);
  if (!/[.!?]$/.test(t)) t += ".";
  return t;
}

function witnessParagraph(count: number): string {
  if (count === 0) {
    return "No witnesses were present. The claimant notes this for the record with some disappointment.";
  }
  if (count === 1) {
    return "One witness was present, whose account the claimant fully expects to be accurate, favourable, and detailed.";
  }
  return `${count} witnesses were present, each of whom is expected to recall the events with admirable clarity.`;
}

export default function TrMemoForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const outputRef = useRef<HTMLDivElement>(null);
  const copyTimer = useRef<number | null>(null);
  const [errors, setErrors] = useState<Errors>({});
  const [incidentType, setIncidentType] = useState("ball-strike");
  const [memo, setMemo] = useState<MemoData | null>(null);
  const [copyLabel, setCopyLabel] = useState("Copy to clipboard");
  const [copyNote, setCopyNote] = useState(false);

  function validate(input: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement): string {
    const value = input.value.trim();
    if (input.hasAttribute("required") && !value) return "This field is required.";
    if (input.type === "number" && value) {
      const n = Number(value);
      if (!Number.isFinite(n) || n < 0 || n > 20) {
        return "Enter a number of witnesses between 0 and 20.";
      }
    }
    return "";
  }

  function fieldError(name: string): string {
    const form = formRef.current;
    if (!form) return "";
    const input = form.elements.namedItem(name) as HTMLInputElement | null;
    if (!input) return "";
    return validate(input);
  }

  function handleBlur(e: React.FocusEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) {
    const { name } = e.target;
    setErrors((prev) => ({ ...prev, [name]: fieldError(name) }));
  }

  function handleInput(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) {
    const { name } = e.target;
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: fieldError(name) }));
    }
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = formRef.current;
    if (!form) return;

    const fields = Array.from(
      form.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>(
        "input, select, textarea"
      )
    );
    const next: Errors = {};
    let allValid = true;
    fields.forEach((input) => {
      // The "Other" free-text field is only required when visible — mirror memo.js's
      // syncOtherField by checking the live type rather than the attribute.
      if (input.name === "memo-other" && incidentType !== "other") {
        next[input.name] = "";
        return;
      }
      const message = validate(input);
      next[input.name] = message;
      if (message) allValid = false;
    });
    setErrors(next);

    if (!allValid) {
      const named = fields.find((input) => next[input.name]);
      named?.focus();
      return;
    }

    const get = (id: string) =>
      (form.elements.namedItem(id) as HTMLInputElement | HTMLTextAreaElement).value;

    const name = get("memo-name").trim();
    const date = get("memo-date");
    const venue = get("memo-venue").trim();
    const type = incidentType;
    const otherText = get("memo-other");
    const description = get("memo-description");
    const witnesses = Number(get("memo-witnesses"));

    const dateStr = formatDate(parseISODate(date));
    const label = type === "other" ? otherText.trim() : INCIDENT_LABELS[type] || type;

    const re = `Re: Incident on ${venue} — ${dateStr}`;
    const para1 = `On ${dateStr}, the claimant, ${name}, attended ${venue} for the purposes of the ancient and honourable sport of squash.`;
    const para2 = `The incident, formally recorded as a ${label}, occurred in the following manner: ${sentence(description)}`;
    const para3 = witnessParagraph(witnesses);
    const closing = "This memorandum is prepared without prejudice and with complete seriousness.";
    const sigDate = `Dated ${formatDate(new Date())}.`;

    const text = [
      "TURNER & RHODES, Solicitors at Law",
      "14 Wrenfield Court, London WC9 9ZZ",
      "",
      "MEMORANDUM",
      "",
      re,
      "",
      "1. " + para1,
      "",
      "2. " + para2,
      "",
      "3. " + para3,
      "",
      closing,
      "",
      sigDate,
      "",
      "Turner & Rhodes",
      "Solicitors at Law",
    ].join("\n");

    setMemo({ re, para1, para2, para3, sigDate, text });
    setCopyNote(false);

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    // Wait for the output to un-hide before scrolling to it.
    window.requestAnimationFrame(() => {
      outputRef.current?.scrollIntoView({
        behavior: reduceMotion ? "auto" : "smooth",
        block: "start",
      });
    });
  }

  function handleCopy() {
    if (!memo) return;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(memo.text).then(
        () => {
          setCopyLabel("Copied");
          if (copyTimer.current) window.clearTimeout(copyTimer.current);
          copyTimer.current = window.setTimeout(() => setCopyLabel("Copy to clipboard"), 2000);
        },
        () => setCopyNote(true)
      );
    } else {
      setCopyNote(true);
    }
  }

  function fieldClass(name: string): string {
    return errors[name] ? "field has-error" : "field";
  }

  function errorProps(name: string) {
    return {
      "aria-invalid": errors[name] ? ("true" as const) : ("false" as const),
      "aria-describedby": `${name}-error`,
    };
  }

  return (
    <>
      <form
        className="memo-form reveal"
        id="memo-form"
        ref={formRef}
        noValidate
        onSubmit={handleSubmit}
      >
        <div className="form-row">
          <div className={fieldClass("memo-name")}>
            <label htmlFor="memo-name">Claimant Name</label>
            <input
              type="text"
              id="memo-name"
              name="memo-name"
              required
              autoComplete="name"
              onBlur={handleBlur}
              onChange={handleInput}
              {...errorProps("memo-name")}
            />
            <span className="form-error" role="alert" id="memo-name-error">
              {errors["memo-name"] || ""}
            </span>
          </div>
          <div className={fieldClass("memo-date")}>
            <label htmlFor="memo-date">Date of Incident</label>
            <input
              type="date"
              id="memo-date"
              name="memo-date"
              required
              onBlur={handleBlur}
              onChange={handleInput}
              {...errorProps("memo-date")}
            />
            <span className="form-error" role="alert" id="memo-date-error">
              {errors["memo-date"] || ""}
            </span>
          </div>
        </div>

        <div className="form-row">
          <div className={fieldClass("memo-venue")}>
            <label htmlFor="memo-venue">Venue / Court</label>
            <input
              type="text"
              id="memo-venue"
              name="memo-venue"
              required
              placeholder="Court 3, Barbican Squash Club"
              onBlur={handleBlur}
              onChange={handleInput}
              {...errorProps("memo-venue")}
            />
            <span className="form-error" role="alert" id="memo-venue-error">
              {errors["memo-venue"] || ""}
            </span>
          </div>
          <div className={fieldClass("memo-type")}>
            <label htmlFor="memo-type">Nature of Incident</label>
            <select
              id="memo-type"
              name="memo-type"
              required
              value={incidentType}
              onChange={(e) => {
                setIncidentType(e.target.value);
                if (e.target.value !== "other") {
                  setErrors((prev) => ({ ...prev, "memo-other": "" }));
                }
              }}
              onBlur={handleBlur}
              {...errorProps("memo-type")}
            >
              <option value="ball-strike">Ball-strike</option>
              <option value="racquet-strike">Racquet-strike</option>
              <option value="wall-collision">Wall collision</option>
              <option value="floor-slip">Floor-slip</option>
              <option value="other">Other</option>
            </select>
            <span className="form-error" role="alert" id="memo-type-error">
              {errors["memo-type"] || ""}
            </span>
          </div>
        </div>

        <div className={fieldClass("memo-other")} id="memo-other-field" hidden={incidentType !== "other"}>
          <label htmlFor="memo-other">Nature of Incident (specify)</label>
          <input
            type="text"
            id="memo-other"
            name="memo-other"
            placeholder="e.g. Injury sustained while disputing a let"
            required={incidentType === "other"}
            onBlur={handleBlur}
            onChange={handleInput}
            {...errorProps("memo-other")}
          />
          <span className="form-error" role="alert" id="memo-other-error">
            {errors["memo-other"] || ""}
          </span>
        </div>

        <div className={fieldClass("memo-description")}>
          <label htmlFor="memo-description">Brief Description</label>
          <textarea
            id="memo-description"
            name="memo-description"
            rows={4}
            required
            placeholder="State the facts plainly. We shall supply the gravity."
            onBlur={handleBlur}
            onChange={handleInput}
            {...errorProps("memo-description")}
          ></textarea>
          <span className="form-error" role="alert" id="memo-description-error">
            {errors["memo-description"] || ""}
          </span>
        </div>

        <div className={fieldClass("memo-witnesses")}>
          <label htmlFor="memo-witnesses">Witnesses Present (0&ndash;20)</label>
          <input
            type="number"
            id="memo-witnesses"
            name="memo-witnesses"
            min="0"
            max="20"
            required
            onBlur={handleBlur}
            onChange={handleInput}
            {...errorProps("memo-witnesses")}
          />
          <span className="form-error" role="alert" id="memo-witnesses-error">
            {errors["memo-witnesses"] || ""}
          </span>
        </div>

        <button className="btn btn--primary btn--block" type="submit">
          Generate Memorandum
        </button>
      </form>

      <div
        className="memo__output"
        id="memo-output"
        aria-live="polite"
        hidden={!memo}
        ref={outputRef}
      >
        <div className="memo-document" id="memo-document">
          <div className="memo-document__letterhead">
            <TrCrest className="memo-document__crest" />
            <div className="memo-document__firm-block">
              <p className="memo-document__firm">Turner &amp; Rhodes</p>
              <p className="memo-document__firm-sub">Solicitors at Law</p>
            </div>
            <p className="memo-document__address">
              14 Wrenfield Court
              <br />
              London WC9 9ZZ
            </p>
          </div>

          <h3 className="memo-document__title">MEMORANDUM</h3>

          <p className="memo-document__re" id="memo-re">
            {memo?.re}
          </p>

          <ol className="memo-document__paras">
            <li id="memo-para-1">{memo?.para1}</li>
            <li id="memo-para-2">{memo?.para2}</li>
            <li id="memo-para-3">{memo?.para3}</li>
          </ol>

          <p className="memo-document__closing">
            This memorandum is prepared without prejudice and with complete seriousness.
          </p>

          <div className="memo-document__signature">
            <p className="memo-document__sig-date" id="memo-sig-date">
              {memo?.sigDate}
            </p>
            <p className="memo-document__sig-rule" aria-hidden="true"></p>
            <p className="memo-document__sig-name">Turner &amp; Rhodes</p>
            <p className="memo-document__sig-role">Solicitors at Law</p>
          </div>
        </div>

        <div className="memo-actions">
          <button className="btn btn--primary" type="button" id="memo-copy" onClick={handleCopy}>
            {copyLabel}
          </button>
          <button
            className="btn btn--ghost"
            type="button"
            id="memo-print"
            onClick={() => window.print()}
          >
            Print memorandum
          </button>
        </div>
        <p className="memo__copy-note" id="memo-copy-note" hidden={!copyNote}>
          Clipboard access is unavailable in this browser — the memorandum above may be
          selected and copied by hand, in the traditional manner.
        </p>
      </div>
    </>
  );
}
