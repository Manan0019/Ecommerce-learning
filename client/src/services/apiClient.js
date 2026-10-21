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
      const isHtml = /^\s*<!doctype html|^\s*<html/i.test(responseText) || (response.headers.get('content-type') || '').includes('text/html');
      const explanation = response.status === 404 && path.startsWith('/api/')
        ? 'API endpoint not found on the running Express server (HTTP 404). Check that the backend source is updated and the old server process has been restarted.'
        : isHtml ? `Unexpected HTML response from the API (HTTP ${response.status}). Check the configured API address and running backend.`
        : `Server returned HTTP ${response.status}.`;
      throw new ApiError(explanation, response.status);
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
