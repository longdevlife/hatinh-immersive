type ResponseEnvelope<T> = {
  data: T;
  headers: Headers;
  status: number;
};

export async function customFetch<T>(url: string, options: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...options,
    credentials: 'include',
  });
  const body = [204, 205, 304].includes(response.status) ? null : await response.text();
  const data = body ? (JSON.parse(body) as T) : ({} as T);

  return {
    data,
    headers: response.headers,
    status: response.status,
  } as ResponseEnvelope<T> as T;
}
