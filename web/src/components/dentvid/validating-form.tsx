"use client";

import { createContext, useContext, useId, useState } from "react";
import type { Locale } from "@/content/dentvideo-locales";
import { validationText } from "@/content/dentvideo-validation";
import { fieldError, fieldState } from "@/lib/dentvid/form-validation";

/**
 * A funnel form that checks its own fields and says what is wrong under each
 * one, in the page's language — never the browser's validation bubble, which
 * speaks the browser's language ("Please fill out this field." on a Turkish
 * page). The fields keep their `required` / `type` / `minLength` attributes
 * (autofill, keyboards and screen readers use them); the form is
 * `noValidate` and runs the same checks itself on submit.
 *
 * A field takes part with a `data-field="<key>"` attribute on its control
 * and a `<FieldError name="<key>" />` under it. The form marks a field it
 * refuses aria-invalid and points aria-describedby at the message, then
 * focuses the first one. Outside a ValidatingForm a FieldError renders
 * nothing, and the browser validates as before.
 */

type Errors = Record<string, string>;
const Ctx = createContext<{ errors: Errors; base: string } | null>(null);

const errorId = (base: string, key: string) => `${base}-${key}-error`;

type FormProps = Omit<React.FormHTMLAttributes<HTMLFormElement>, "onSubmit" | "noValidate"> & {
  locale: Locale;
  /** Called only when every field is valid. */
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
};

export function ValidatingForm({ locale, onSubmit, onInput, children, ...rest }: FormProps) {
  const [errors, setErrors] = useState<Errors>({});
  const base = useId();
  return (
    <Ctx.Provider value={{ errors, base }}>
      <form
        {...rest}
        noValidate
        onInput={(e) => {
          onInput?.(e);
          // Typing in a field clears its message; the others stay until the next try.
          const el = e.target as HTMLElement;
          const key = el.dataset?.field;
          if (!key || !errors[key]) return;
          unmark(el);
          setErrors(({ [key]: _gone, ...others }) => others);
        }}
        onSubmit={(e) => {
          const found = checkForm(e.currentTarget, locale, base);
          setErrors(found.errors);
          if (found.first) {
            e.preventDefault();
            // A field folded away (the wizard's "more details") opens before it is focused.
            const fold = found.first.closest("details");
            if (fold && !fold.open) fold.open = true;
            found.first.focus();
            return;
          }
          onSubmit(e);
        }}
      >
        {children}
      </form>
    </Ctx.Provider>
  );
}

function unmark(el: Element) {
  el.removeAttribute("aria-invalid");
  el.removeAttribute("aria-describedby");
}

/** Every participating field's message (by `data-field`), and the first field that has one. */
function checkForm(form: HTMLFormElement, locale: Locale, base: string): { errors: Errors; first: HTMLInputElement | HTMLTextAreaElement | null } {
  const t = validationText(locale);
  const errors: Errors = {};
  let first: HTMLInputElement | HTMLTextAreaElement | null = null;
  for (const el of Array.from(form.elements)) {
    if (!(el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement)) continue;
    const key = el.dataset.field;
    if (!key) continue;
    const message = el.disabled || !el.willValidate ? null : fieldError(fieldState(el), t);
    if (!message) {
      unmark(el);
      continue;
    }
    errors[key] = message;
    el.setAttribute("aria-invalid", "true");
    el.setAttribute("aria-describedby", errorId(base, key));
    first ??= el;
  }
  return { errors, first };
}

/** The message for one field, under it (nothing while the field is fine, or outside a ValidatingForm). */
export function FieldError({ name }: { name: string }) {
  const ctx = useContext(Ctx);
  const text = ctx?.errors[name];
  if (!ctx || !text) return null;
  return (
    <span id={errorId(ctx.base, name)} data-field-error className="mt-1.5 block text-sm font-medium text-[#a12a2a]">
      {text}
    </span>
  );
}
