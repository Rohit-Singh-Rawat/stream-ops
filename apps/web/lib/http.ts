export class ApiError extends Error {
  readonly status: number;
  readonly data: unknown;

  constructor(params: { message: string; status: number; data: unknown }) {
    super(params.message);
    this.name = "ApiError";
    this.status = params.status;
    this.data = params.data;
  }
}

type NextFetchOptions = {
  revalidate?: number;
  tags?: string[];
};

export type JsonRequestOptions = Omit<RequestInit, "body"> & {
  body?: unknown;
  next?: NextFetchOptions;
};

function isBodyInitLike(value: unknown): value is BodyInit {
  if (typeof value === "string") {
    return true;
  }

  if (typeof Blob !== "undefined" && value instanceof Blob) {
    return true;
  }

  if (typeof FormData !== "undefined" && value instanceof FormData) {
    return true;
  }

  if (
    typeof URLSearchParams !== "undefined" &&
    value instanceof URLSearchParams
  ) {
    return true;
  }

  if (typeof ArrayBuffer !== "undefined" && value instanceof ArrayBuffer) {
    return true;
  }

  return ArrayBuffer.isView(value);
}

function toRequestBody(body: unknown): BodyInit | undefined {
  if (body === undefined || body === null) {
    return undefined;
  }

  if (isBodyInitLike(body)) {
    return body;
  }

  return JSON.stringify(body);
}

function buildHeaders(body: unknown, headers?: HeadersInit): Headers {
  const requestHeaders = new Headers(headers);

  if (
    body !== undefined &&
    body !== null &&
    !isBodyInitLike(body) &&
    !requestHeaders.has("Content-Type")
  ) {
    requestHeaders.set("Content-Type", "application/json");
  }

  return requestHeaders;
}

async function parseResponse(response: Response): Promise<unknown> {
  if (response.status === 204) {
    return null;
  }

  const contentType = response.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    return response.json();
  }

  return response.text();
}

function getErrorMessage(data: unknown, fallback: string): string {
  if (data && typeof data === "object") {
    if ("error" in data && typeof data.error === "string") {
      return data.error;
    }

    if ("message" in data && typeof data.message === "string") {
      return data.message;
    }
  }

  return fallback;
}

export async function jsonRequest<T>(
  baseUrl: string,
  endpoint: string,
  options: JsonRequestOptions = {},
): Promise<T> {
  const { body, headers, credentials = "include", ...requestInit } = options;
  const response = await fetch(new URL(endpoint, baseUrl), {
    ...requestInit,
    body: toRequestBody(body),
    credentials,
    headers: buildHeaders(body, headers),
  });
  const data = await parseResponse(response);

  if (!response.ok) {
    throw new ApiError({
      message: getErrorMessage(data, response.statusText || "Request failed"),
      status: response.status,
      data,
    });
  }

  return data as T;
}
