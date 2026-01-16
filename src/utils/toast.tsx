import toast, { Toaster } from 'react-hot-toast';

// Toast notification helpers
export const showSuccess = (message: string) => {
  toast.success(message, {
    duration: 3000,
    position: 'top-right',
  });
};

export const showError = (message: string) => {
  toast.error(message, {
    duration: 4000,
    position: 'top-right',
  });
};

export const showWarning = (message: string) => {
  toast.custom(() => (
    <div style={{
      background: '#f59e0b',
      color: 'white',
      padding: '16px',
      borderRadius: '8px',
      boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
      fontWeight: '500',
    }}>
      {message}
    </div>
  ), {
    duration: 3500,
    position: 'top-right' as const,
  });
};

export const showLoading = (message: string) => {
  return toast.loading(message, {
    position: 'top-right',
  });
};

export const updateToast = (toastId: string, message: string, type: 'success' | 'error' = 'success') => {
  toast.dismiss(toastId);
  if (type === 'success') {
    showSuccess(message);
  } else {
    showError(message);
  }
};

// Socket error handling
export class SocketError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SocketError';
  }
}

// API error handler
export const handleApiError = (error: any): string => {
  if (error.response?.data?.message) {
    return error.response.data.message;
  }
  if (error.message) {
    return error.message;
  }
  return 'An unexpected error occurred. Please try again.';
};

// Vote submission errors
export const VoteErrorMessages = {
  ALREADY_VOTED: 'You have already voted in this poll.',
  INVALID_POLL: 'This poll is no longer active.',
  NO_OPTION_SELECTED: 'Please select an option before submitting.',
  SUBMISSION_FAILED: 'Failed to submit your vote. Please try again.',
  TIME_EXPIRED: 'Time has expired for this poll.',
  NOT_CONNECTED: 'Connection lost. Please check your internet connection.',
  SERVER_ERROR: 'Server error. Please try again later.',
};

// Poll creation errors
export const PollErrorMessages = {
  EMPTY_QUESTION: 'Question cannot be empty.',
  INSUFFICIENT_OPTIONS: 'At least 2 options are required.',
  EMPTY_OPTION: 'All options must have text.',
  NO_CORRECT_ANSWER: 'At least one correct option must be selected.',
  INVALID_TIMER: 'Invalid timer duration.',
  CREATION_FAILED: 'Failed to create poll. Please try again.',
};

// Connection error messages
export const ConnectionErrorMessages = {
  CONNECTION_LOST: 'Connection lost. Attempting to reconnect...',
  CONNECTION_RESTORED: 'Connection restored.',
  CANNOT_CONNECT: 'Cannot connect to server. Please check your connection.',
};

export { Toaster };
