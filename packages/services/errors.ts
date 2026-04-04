export const serviceErrorCodes = [
  "NOT_FOUND",
  "CONFLICT",
  "INVALID_INPUT",
  "INVALID_STATE",
  "FORBIDDEN",
  "INSUFFICIENT_EVIDENCE",
] as const;

export type ServiceErrorCode = (typeof serviceErrorCodes)[number];

export class ServiceError extends Error {
  readonly code: ServiceErrorCode;

  constructor(code: ServiceErrorCode, message: string) {
    super(message);
    this.name = "ServiceError";
    this.code = code;
  }
}

export function isServiceError(value: unknown): value is ServiceError {
  return value instanceof ServiceError;
}
