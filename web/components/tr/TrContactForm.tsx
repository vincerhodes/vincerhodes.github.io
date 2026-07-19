"use client";

// Port of the initContactForm half of js/main.js — client-side validation only, no
// backend (the source form deliberately sends nothing). Same messages, same blur/input
// validation order, same aria wiring; state-driven instead of DOM-manipulated.
import { useRef, useState } from "react";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type Errors = Record<string, string>;

function validate(input: { value: string; required: boolean; type: string }): string {
  const value = input.value.trim();
  if (input.required && !value) return "This field is required.";
  if (input.type === "email" && value && !EMAIL_PATTERN.test(value)) {
    return "Enter a valid email address.";
  }
  return "";
}

export default function TrContactForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const [errors, setErrors] = useState<Errors>({});
  const [success, setSuccess] = useState(false);

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
    // Same as main.js: live re-validation only once a field is already flagged.
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
      const message = validate(input);
      next[input.name] = message;
      if (message) allValid = false;
    });
    setErrors(next);

    if (!allValid) {
      const firstInvalid = form.querySelector<HTMLElement>(
        ".has-error input, .has-error select, .has-error textarea"
      );
      // setErrors hasn't flushed yet; find the first invalid by our own result instead.
      if (firstInvalid) {
        firstInvalid.focus();
      } else {
        const named = fields.find((input) => next[input.name]);
        named?.focus();
      }
      setSuccess(false);
      return;
    }

    form.reset();
    setErrors({});
    setSuccess(true);
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
    <form
      className="contact-form reveal"
      id="enquiry-form"
      ref={formRef}
      noValidate
      onSubmit={handleSubmit}
    >
      <h2 style={{ marginBottom: "4px" }}>Request a Consultation</h2>

      <div className="form-row">
        <div className={fieldClass("name")}>
          <label htmlFor="name">Full Name</label>
          <input
            type="text"
            id="name"
            name="name"
            required
            autoComplete="name"
            onBlur={handleBlur}
            onChange={handleInput}
            {...errorProps("name")}
          />
          <span className="form-error" role="alert" id="name-error">
            {errors.name || ""}
          </span>
        </div>
        <div className={fieldClass("email")}>
          <label htmlFor="email">Email</label>
          <input
            type="email"
            id="email"
            name="email"
            required
            autoComplete="email"
            onBlur={handleBlur}
            onChange={handleInput}
            {...errorProps("email")}
          />
          <span className="form-error" role="alert" id="email-error">
            {errors.email || ""}
          </span>
        </div>
      </div>

      <div className="form-row">
        <div className={fieldClass("phone")}>
          <label htmlFor="phone">Telephone (optional)</label>
          <input
            type="text"
            id="phone"
            name="phone"
            autoComplete="tel"
            onBlur={handleBlur}
            onChange={handleInput}
            {...errorProps("phone")}
          />
          <span className="form-error" role="alert" id="phone-error">
            {errors.phone || ""}
          </span>
        </div>
        <div className={fieldClass("practice-area")}>
          <label htmlFor="practice-area">Practice Area</label>
          <select
            id="practice-area"
            name="practice-area"
            onBlur={handleBlur}
            onChange={handleInput}
            {...errorProps("practice-area")}
          >
            <option value="sports-injury">Sports Injury Claims</option>
            <option value="squash">Squash &amp; Racquetball Court Claims</option>
            <option value="ocular">Ocular &amp; Eye Trauma</option>
            <option value="slip-trip">Slip, Trip &amp; Public Liability</option>
            <option value="other">Not Sure / Other</option>
          </select>
          <span className="form-error" role="alert" id="practice-area-error">
            {errors["practice-area"] || ""}
          </span>
        </div>
      </div>

      <div className={fieldClass("message")}>
        <label htmlFor="message">What Happened?</label>
        <textarea
          id="message"
          name="message"
          rows={5}
          required
          onBlur={handleBlur}
          onChange={handleInput}
          {...errorProps("message")}
        ></textarea>
        <span className="form-error" role="alert" id="message-error">
          {errors.message || ""}
        </span>
      </div>

      <button className="btn btn--primary btn--block" type="submit">
        Send Enquiry
      </button>

      <div
        className={success ? "form-success is-visible" : "form-success"}
        id="form-success"
        role="status"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M20 6 9 17l-5-5" />
        </svg>
        <span>
          Thank you — in a live version of this site, your enquiry would now be on its way
          to our clerks. Nothing was actually sent.
        </span>
      </div>
    </form>
  );
}
