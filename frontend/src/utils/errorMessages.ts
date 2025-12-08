/**
 * Utility functions for generating user-friendly error messages
 */

export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    const message = error.message

    // Network errors
    if (message.includes('fetch') || message.includes('network') || message.includes('Network')) {
      return 'Network error. Please check your connection and try again.'
    }

    // 401 Unauthorized
    if (message.includes('401') || message.includes('Unauthorized') || message.includes('Authentication')) {
      return 'Authentication failed. Please check your credentials and try again.'
    }

    // 403 Forbidden
    if (message.includes('403') || message.includes('Forbidden')) {
      return 'Access denied. You do not have permission to perform this action.'
    }

    // 404 Not Found
    if (message.includes('404') || message.includes('Not Found')) {
      return 'The requested resource was not found.'
    }

    // 409 Conflict
    if (message.includes('409') || message.includes('Conflict') || message.includes('already exists')) {
      return 'This email is already registered. Please use a different email or try logging in.'
    }

    // 429 Too Many Requests
    if (message.includes('429') || message.includes('Too Many Requests') || message.includes('rate limit')) {
      return 'Too many requests. Please wait a moment and try again.'
    }

    // 500 Server errors
    if (message.includes('500') || message.includes('Internal Server Error')) {
      return 'Server error. Please try again later or contact support if the problem persists.'
    }

    // Session expired
    if (message.includes('expired') || message.includes('Session expired')) {
      return 'Your session has expired. Please log in again.'
    }

    // Token errors
    if (message.includes('token') || message.includes('Token')) {
      return 'Authentication token is invalid. Please log in again.'
    }

    // Return the original message if it's user-friendly, otherwise return a generic message
    if (message.length > 0 && message.length < 100) {
      return message
    }

    return 'An unexpected error occurred. Please try again.'
  }

  if (typeof error === 'string') {
    return error
  }

  return 'An unexpected error occurred. Please try again.'
}

