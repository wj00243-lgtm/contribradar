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
  if (value === null) {
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
