/**
 * MonoBlocks — API error helpers
 *
 * The real API answers failures with RFC 7807 `ProblemDetail` bodies
 * (`detail`, `status`, `errors`). These helpers turn the pipeline's
 * `HttpError` into a human message and expose the not-found check by
 * status code instead of by sniffing the message string.
 */

import { HttpError } from '@/http/types';

interface ProblemDetailBody {
  detail?: unknown;
  errors?: unknown;
}

/** Narrow an unknown error body to the parts of a ProblemDetail we render. */
const asProblemDetail = (body: unknown): ProblemDetailBody | null => {
  if (typeof body !== 'object' || body === null) return null;
  return body;
};

/**
 * Whether an error represents an HTTP 404 from the API.
 *
 * @param error - the thrown value
 * @returns `true` only for `HttpError` instances with status 404
 */
export const isNotFoundError = (error: unknown): boolean => {
  return error instanceof HttpError && error.status === 404;
};

/**
 * Extract a displayable message from an error, preferring the ProblemDetail
 * `detail` field over the generic `HTTP 400 Bad Request — /path` message.
 *
 * @param error - the thrown value
 * @param fallback - message used when nothing better is available
 * @returns a human-readable message
 */
export const apiErrorMessage = (error: unknown, fallback = 'Something went wrong.'): string => {
  if (error instanceof HttpError) {
    const problem = asProblemDetail(error.body);
    if (problem && typeof problem.detail === 'string' && problem.detail.length > 0) {
      return problem.detail;
    }
  }
  if (error instanceof Error && error.message.length > 0) {
    return error.message;
  }
  return fallback;
};
