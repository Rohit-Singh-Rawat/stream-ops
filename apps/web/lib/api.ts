import { ApiError, type JsonRequestOptions, jsonRequest } from "@/lib/http";

type RequestOptions = Omit<JsonRequestOptions, "method">;

function getApiBaseUrl() {
  if (typeof window === "undefined") {
    return (
      process.env.API_BASE_URL ||
      process.env.NEXT_PUBLIC_API_BASE_URL ||
      "http://localhost:4000"
    );
  }

  return process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:4000";
}

function request<T>(
  endpoint: string,
  method: NonNullable<RequestInit["method"]>,
  options: RequestOptions = {},
): Promise<T> {
  return jsonRequest<T>(getApiBaseUrl(), endpoint, {
    ...options,
    method,
  });
}

export const api = {
  get: <T>(endpoint: string, options?: RequestOptions) =>
    request<T>(endpoint, "GET", options),
  post: <T>(endpoint: string, body?: unknown, options?: RequestOptions) =>
    request<T>(endpoint, "POST", { ...options, body }),
  put: <T>(endpoint: string, body?: unknown, options?: RequestOptions) =>
    request<T>(endpoint, "PUT", { ...options, body }),
  patch: <T>(endpoint: string, body?: unknown, options?: RequestOptions) =>
    request<T>(endpoint, "PATCH", { ...options, body }),
  delete: <T>(endpoint: string, options?: RequestOptions) =>
    request<T>(endpoint, "DELETE", options),
};

export { ApiError };

export default api;
