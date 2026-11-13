import type { ValidationText } from "@/content/dentvideo-validation";

/**
 * What one field of a funnel form says when it is sent: the browser's own
 * constraint checks (required, type=email / url, minLength, pattern) mapped
 * to the page's language instead of the browser's (content/dentvideo-validation).
 * Pure, so the mapping is tested without a browser.
 */
export type FieldState = {
  value: string;
  required?: boolean;
  type?: string;
  minLength?: number;
  pattern?: string;
  /** From the element's ValidityState. */
  typeMismatch?: boolean;
  patternMismatch?: boolean;
  /** The browser's overall verdict (any other rule). */
  valid?: boolean;
};

export function fieldError(f: FieldState, t: ValidationText): string | null {
  const value = f.value ?? "";
  // A name of only spaces is as empty as no name.
  if (f.required && value.trim() === "") return t.required;
  if (value === "") return null;
  if (f.type === "email" && f.typeMismatch) return t.email;
  if (f.type === "url" && f.typeMismatch) return t.url;
  // Counted here, not from ValidityState.tooShort: browsers set that only after the person typed.
  if (f.minLength && f.minLength > 0 && [...value].length < f.minLength) return t.tooShort.replace("{n}", String(f.minLength));
  if (f.patternMismatch) return /^\[0-9\][*+]?$/.test(f.pattern ?? "") ? t.digits : t.invalid;
  if (f.typeMismatch || f.valid === false) return t.invalid;
  return null;
}

/** The FieldState of a form control, read from the DOM. */
export function fieldState(el: HTMLInputElement | HTMLTextAreaElement): FieldState {
  return {
    value: el.value,
    required: el.required,
    type: el instanceof HTMLInputElement ? el.type : "textarea",
    minLength: el.minLength > 0 ? el.minLength : undefined,
    pattern: el instanceof HTMLInputElement ? el.pattern || undefined : undefined,
    typeMismatch: el.validity.typeMismatch,
    patternMismatch: el.validity.patternMismatch,
    valid: el.validity.valid,
  };
}
