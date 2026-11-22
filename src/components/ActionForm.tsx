"use client";

import { startTransition, useActionState, useEffect, useRef } from "react";
import { idle, type FormState } from "@/lib/form-state";

/**
 * Form wrapper for server actions. Shows validation errors and, when the
 * conduct check raises concerns, the "Pause before posting" prompt with the
 * option to revise or post as written. Field values are kept until success.
 */
export function ActionForm({
  action,
  submitLabel,
  children,
  className,
}: {
  action: (state: FormState, data: FormData) => Promise<FormState>;
  submitLabel: string;
  children: React.ReactNode;
  className?: string;
}) {
  const [state, dispatch, pending] = useActionState(action, idle);
  const ref = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.status === "ok") ref.current?.reset();
  }, [state]);

  return (
    <form
      ref={ref}
      className={className ?? "stack"}
      onSubmit={(e) => {
        e.preventDefault();
        const submitter = (e.nativeEvent as SubmitEvent).submitter;
        const data = new FormData(e.currentTarget, submitter);
        startTransition(() => dispatch(data));
      }}
    >
      {children}

      {state.status === "error" && (
        <p className="form-error" role="alert">
          {state.message}
        </p>
      )}

      {state.status === "concerns" && (
        <div className="pause" role="alert">
          <strong>Pause before posting</strong>
          <ul>
            {state.concerns.map((c) => (
              <li key={c.code}>{c.message}</li>
            ))}
          </ul>
          <p>Would you like to revise? You can also post it as written.</p>
        </div>
      )}

      <div className="form-actions">
        <button type="submit" disabled={pending}>
          {pending ? "Working…" : state.status === "concerns" ? "Check again" : submitLabel}
        </button>
        {state.status === "concerns" && (
          <button type="submit" name="confirm" value="1" className="button-secondary" disabled={pending}>
            Post as written
          </button>
        )}
      </div>
    </form>
  );
}
