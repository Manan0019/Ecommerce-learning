import { API_BASE_URL } from "../config/api";

export class ApiError extends Error {
  constructor(message, status, data) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.data = data;
  }
}

export function publicApiMessage(message, status) {
  const text=typeof message==='string'?message.trim():'';
  if (!text || /(?:apply|run)\s+migration\s+\d+|restart\s+(?:the\s+)?(?:old\s+)?server|backend\s+source|node_modules|sqlstate|postgres|stack trace|relation .* does not exist|column .* does not exist/i.test(text))
    return status>=500 ? 'The store is temporarily unavailable. Please try again later.' : 'The request could not be completed. Please try again.';
  return text;
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
        ? 'This feature is temporarily unavailable. Please try again later.'
        : isHtml ? 'The store could not complete the request. Please try again.'
        : 'The store could not complete the request. Please try again.';
      throw new ApiError(explanation, response.status);
    }
  }

  if (!response.ok) {
    throw new ApiError(publicApiMessage(data.message, response.status), response.status, data);
  }

  return data;
}

export function apiAssetUrl(path) {
  return path ? `${API_BASE_URL}${path}` : "";
}

export function isAuthenticationError(error) {
  return error?.status === 401 || error?.status === 403;
}
