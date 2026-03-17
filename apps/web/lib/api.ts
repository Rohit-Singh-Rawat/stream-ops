const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3000";

type RequestOptions = {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  headers?: Record<string, string>;
};

async function request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const { method = "GET", body, headers = {} } = options;

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    method,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    throw new Error(`API error: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

export const api = {
  get: <T>(endpoint: string, options?: Omit<RequestOptions, "method" | "body">) =>
    request<T>(endpoint, { ...options, method: "GET" }),

  post: <T>(endpoint: string, body?: unknown, options?: Omit<RequestOptions, "method" | "body">) =>
    request<T>(endpoint, { ...options, method: "POST", body }),

  put: <T>(endpoint: string, body?: unknown, options?: Omit<RequestOptions, "method" | "body">) =>
    request<T>(endpoint, { ...options, method: "PUT", body }),

  patch: <T>(endpoint: string, body?: unknown, options?: Omit<RequestOptions, "method" | "body">) =>
    request<T>(endpoint, { ...options, method: "PATCH", body }),

  delete: <T>(endpoint: string, options?: Omit<RequestOptions, "method" | "body">) =>
    request<T>(endpoint, { ...options, method: "DELETE" }),
};

export default api;
