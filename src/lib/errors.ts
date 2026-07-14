export type ErrorCode =
  | "invalid_input"
  | "image_too_large"
  | "unsupported_image"
  | "content_rejected"
  | "generation_failed"
  | "generation_timeout"
  | "payment_required"
  | "payment_invalid"
  | "payment_settlement_failed"
  | "rate_limited"
  | "internal_error";

/** Every failure the ASP returns is one of these. Shape is stable and documented. */
export class AspError extends Error {
  constructor(
    readonly code: ErrorCode,
    message: string,
    readonly status: number,
    readonly hint?: string,
  ) {
    super(message);
    this.name = "AspError";
  }

  toJSON() {
    return {
      error: {
        code: this.code,
        message: this.message,
        ...(this.hint ? { hint: this.hint } : {}),
      },
    };
  }
}

export const invalidInput = (msg: string, hint?: string) =>
  new AspError("invalid_input", msg, 400, hint);

export const imageTooLarge = (msg: string) =>
  new AspError("image_too_large", msg, 413, "Resize to under 4 MB and retry.");

export const contentRejected = (msg: string) =>
  new AspError("content_rejected", msg, 422, "Describe something about yourself, your space, or your day.");

export const generationFailed = (msg: string) =>
  new AspError("generation_failed", msg, 502, "This is retryable. You were not charged.");

export const generationTimeout = () =>
  new AspError("generation_timeout", "Generation exceeded the time budget.", 504, "This is retryable. You were not charged.");

/** Runs `fn` with a hard deadline; rejects with generation_timeout on overrun. */
export async function withTimeout<T>(fn: () => Promise<T>, ms: number): Promise<T> {
  let timer: NodeJS.Timeout;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(generationTimeout()), ms);
  });
  try {
    return await Promise.race([fn(), timeout]);
  } finally {
    clearTimeout(timer!);
  }
}

/** Retries transient failures with exponential backoff. Does not retry AspErrors that are the caller's fault. */
export async function withRetry<T>(fn: () => Promise<T>, attempts = 2): Promise<T> {
  let lastErr: unknown;
  for (let i = 0; i <= attempts; i++) {
    try {
      return await fn();
    } catch (err) {
      if (err instanceof AspError && err.status < 500) throw err; // caller's fault, don't retry
      lastErr = err;
      if (i < attempts) await new Promise((r) => setTimeout(r, 400 * 2 ** i));
    }
  }
  throw lastErr;
}
