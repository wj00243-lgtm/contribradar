import { NextResponse } from "next/server";

type JsonErrorBody = {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
};

export function jsonOk(data: unknown, status = 200): NextResponse {
  return NextResponse.json(data, { status });
}

export function jsonError(
  status: number,
  code: string,
  message: string,
  details?: unknown
): NextResponse<JsonErrorBody> {
  return NextResponse.json(
    {
      error: {
        code,
        message,
        ...(details === undefined ? {} : { details })
      }
    },
    { status }
  );
}

export function readStringList(value: string | null): string[] | undefined {
  if (value === null) {
    return undefined;
  }

  const values = value
    .split(",")
    .map((item) => item.trim())
    .filter((item) => item.length > 0);

  return values.length > 0 ? values : undefined;
}

export function readNumber(value: string | null): number | undefined {
  if (!value) {
    return undefined;
  }

  const parsed = Number(value);

  return Number.isFinite(parsed) ? parsed : undefined;
}

export function readBoolean(value: string | null): boolean | undefined {
  if (value === "true") {
    return true;
  }

  if (value === "false") {
    return false;
  }

  return undefined;
}

export type QueryFieldErrors = Record<string, string[]>;

function addQueryFieldError(errors: QueryFieldErrors, field: string, message: string) {
  errors[field] = [...(errors[field] ?? []), message];
}

export function hasQueryFieldErrors(errors: QueryFieldErrors): boolean {
  return Object.keys(errors).length > 0;
}

export function queryValidationDetails(errors: QueryFieldErrors): {
  fieldErrors: QueryFieldErrors;
} {
  return { fieldErrors: errors };
}

export function readQueryNumber(
  params: URLSearchParams,
  field: string,
  errors: QueryFieldErrors,
  options: {
    min?: number;
    max?: number;
  } = {}
): number | undefined {
  if (!params.has(field)) {
    return undefined;
  }

  const rawValue = params.get(field);
  const parsedValue = rawValue === null || rawValue.trim() === "" ? Number.NaN : Number(rawValue);

  if (!Number.isFinite(parsedValue)) {
    addQueryFieldError(errors, field, `${field} must be a number.`);
    return undefined;
  }

  if (options.min !== undefined && parsedValue < options.min) {
    addQueryFieldError(errors, field, `${field} must be greater than or equal to ${options.min}.`);
  }

  if (options.max !== undefined && parsedValue > options.max) {
    addQueryFieldError(errors, field, `${field} must be less than or equal to ${options.max}.`);
  }

  return parsedValue;
}

export function readQueryBoolean(
  params: URLSearchParams,
  field: string,
  errors: QueryFieldErrors
): boolean | undefined {
  if (!params.has(field)) {
    return undefined;
  }

  const value = params.get(field);

  if (value === "true") {
    return true;
  }

  if (value === "false") {
    return false;
  }

  addQueryFieldError(errors, field, `${field} must be true or false.`);
  return undefined;
}

export function readQueryEnum<T extends string>(
  params: URLSearchParams,
  field: string,
  allowedValues: ReadonlySet<T>,
  errors: QueryFieldErrors
): T | undefined {
  if (!params.has(field)) {
    return undefined;
  }

  const value = params.get(field);

  if (value !== null && allowedValues.has(value as T)) {
    return value as T;
  }

  addQueryFieldError(
    errors,
    field,
    `${field} must be one of ${[...allowedValues].join(", ")}.`
  );
  return undefined;
}
