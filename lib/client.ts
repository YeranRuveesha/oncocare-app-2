// Small browser helper for calling our API routes.
export interface ApiResult<T = Record<string, unknown>> {
  ok: boolean;
  error?: string;
  errors?: Record<string, string>;
  data: T;
}

export async function api<T = Record<string, unknown>>(
  url: string,
  body?: unknown,
  method: "POST" | "PATCH" | "DELETE" | "GET" = "POST",
): Promise<ApiResult<T>> {
  try {
    const isForm = typeof FormData !== "undefined" && body instanceof FormData;
    const res = await fetch(url, {
      method,
      headers: body && !isForm ? { "Content-Type": "application/json" } : undefined,
      body: body === undefined ? undefined : isForm ? (body as FormData) : JSON.stringify(body),
    });
    const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    return {
      ok: res.ok && json.ok !== false,
      error: (json.error as string) || (!res.ok ? "Something went wrong. Please try again." : undefined),
      errors: json.errors as Record<string, string> | undefined,
      data: json as T,
    };
  } catch {
    return { ok: false, error: "Could not reach the server. Is the app running?", data: {} as T };
  }
}
