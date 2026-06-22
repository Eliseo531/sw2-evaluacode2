const API_URL = import.meta.env.VITE_API_URL || "/api";

export async function apiRequest(endpoint: string, options: RequestInit = {}) {
  const token = localStorage.getItem("token");

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
  });

  const text = await response.text();

  let data: any = null;

  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    throw new Error(text || "La respuesta del servidor no es JSON válido");
  }

  if (!response.ok) {
    throw new Error(data?.message || "Error en la petición");
  }

  return data;
}
