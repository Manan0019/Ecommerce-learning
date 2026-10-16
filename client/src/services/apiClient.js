import { API_BASE_URL } from "../config/api";

export class ApiError extends Error {
  constructor(message, status, data) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.data = data;
  }
}

export async function apiRequest(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, options);
  const responseText = await response.text();
  let data = {};

  if (responseText) {
    try {
      data = JSON.parse(responseText);
    } catch {
      throw new ApiError(
        `Server returned HTTP ${response.status}: ${responseText.slice(0, 150)}`,
        response.status
      );
    }
  }

  if (!response.ok) {
    throw new ApiError(data.message || `Request failed with HTTP ${response.status}.`, response.status, data);
  }

  return data;
}

export function apiAssetUrl(path) {
  return path ? `${API_BASE_URL}${path}` : "";
}

export function isAuthenticationError(error) {
  return error?.status === 401 || error?.status === 403;
}
