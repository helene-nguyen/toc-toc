//~ Result type — use cases return this instead of throwing or using status strings.
// The HTTP adapter maps the error names to status codes; the core never knows about HTTP.
export type Result<T, E extends string = string> =
  | { ok: true; value: T }
  | { ok: false; error: E };

export const ok = <T>(value: T): { ok: true; value: T } => ({ ok: true, value });

export const err = <E extends string>(error: E): { ok: false; error: E } => ({ ok: false, error });
