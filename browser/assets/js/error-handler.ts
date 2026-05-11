// Error handling utilities

export class AppError extends Error {
  constructor(
    public code: string,
    message: string,
    public context?: any
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export function handleError(error: unknown, context?: string): { message: string; code: string } {
  if (error instanceof AppError) {
    return {
      message: error.message,
      code: error.code,
    };
  }

  if (error instanceof Error) {
    return {
      message: error.message,
      code: 'ERROR',
    };
  }

  return {
    message: `An unexpected error occurred: ${String(error)}`,
    code: 'UNKNOWN_ERROR',
  };
}

export function showError(message: string, context?: string): void {
  const errorContainer = document.getElementById('error-message');
  if (errorContainer) {
    errorContainer.textContent = message;
    errorContainer.style.display = 'block';
  } else {
    alert(`Error${context ? ` (${context})` : ''}: ${message}`);
  }
}

export function clearError(): void {
  const errorContainer = document.getElementById('error-message');
  if (errorContainer) {
    errorContainer.textContent = '';
    errorContainer.style.display = 'none';
  }
}
