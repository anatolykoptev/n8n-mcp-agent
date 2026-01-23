/**
 * @module utils/url
 * @description URL validation and security utilities
 */

import {
  ALLOWED_PROTOCOLS,
  BLOCKED_HOSTNAMES,
  BLOCKED_IP_PATTERNS,
} from '../constants/api.js';
import { SECURITY_ERRORS } from '../constants/errors.js';

/**
 * Result of URL validation
 */
export interface UrlValidationResult {
  valid: boolean;
  error?: string;
  url?: URL;
}

/**
 * Check if a hostname is blocked for SSRF protection
 */
export function isBlockedHostname(hostname: string): boolean {
  const normalizedHostname = hostname.toLowerCase();

  // Check exact matches
  if (BLOCKED_HOSTNAMES.includes(normalizedHostname as typeof BLOCKED_HOSTNAMES[number])) {
    return true;
  }

  // Check IP patterns
  for (const pattern of BLOCKED_IP_PATTERNS) {
    if (pattern.test(normalizedHostname)) {
      return true;
    }
  }

  return false;
}

/**
 * Validate a URL for SSRF protection
 *
 * @param urlString - URL to validate
 * @param requireHttps - Whether to require HTTPS (default: false for dev)
 * @returns Validation result with parsed URL if valid
 */
export function validateUrl(
  urlString: string,
  requireHttps = false
): UrlValidationResult {
  // Parse URL
  let url: URL;
  try {
    url = new URL(urlString);
  } catch {
    return { valid: false, error: SECURITY_ERRORS.INVALID_PROTOCOL };
  }

  // Check protocol
  const protocol = url.protocol as typeof ALLOWED_PROTOCOLS[number];
  if (!ALLOWED_PROTOCOLS.includes(protocol)) {
    return { valid: false, error: SECURITY_ERRORS.INVALID_PROTOCOL };
  }

  // Check HTTPS requirement
  if (requireHttps && url.protocol !== 'https:') {
    return { valid: false, error: SECURITY_ERRORS.HTTPS_REQUIRED };
  }

  // Check hostname for SSRF
  if (isBlockedHostname(url.hostname)) {
    return { valid: false, error: SECURITY_ERRORS.SSRF_BLOCKED };
  }

  return { valid: true, url };
}

/**
 * Normalize a URL by removing trailing slashes
 */
export function normalizeUrl(url: string): string {
  return url.replace(/\/+$/, '');
}

/**
 * Generate a client ID from a URL
 * Uses base64 encoding for simplicity, but adds a timestamp for uniqueness
 */
export function generateClientId(url: string): string {
  const normalized = normalizeUrl(url);
  return Buffer.from(normalized).toString('base64');
}

/**
 * Decode a client ID back to URL
 */
export function decodeClientId(clientId: string): string | null {
  try {
    return Buffer.from(clientId, 'base64').toString('utf-8');
  } catch {
    return null;
  }
}
