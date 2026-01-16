// Poll types
export interface PollOption {
  id: number;
  text: string;
  correct: boolean | null;
  votes?: number;
  _id?: string;
}

export interface Poll {
  _id?: string;
  question: string;
  options: PollOption[];
  timer: number | string;
  teacherUsername: string;
  createdAt?: string;
  isActive?: boolean;
}

export interface PollResults {
  [key: string]: number;
}

export interface PollHistoryItem {
  _id: string;
  question: string;
  options: Array<{
    _id: string;
    text: string;
    votes: number;
  }>;
  timer: number;
  teacherUsername: string;
  createdAt: string;
}

// Current Poll State (for recovery)
export interface CurrentPollState {
  pollId: string;
  question: string;
  options: PollOption[];
  timeLeft: number;
  totalTimeLimit: number;
  startedAt: number; // server timestamp
  teacherUsername: string;
  isActive: boolean;
}

// Vote submission
export interface VotePayload {
  username: string;
  option: string;
  pollId: string;
}

// Chat types
export interface ChatMessage {
  user: string;
  text: string;
  timestamp?: number;
}

// Socket event types
export interface SocketEventMap {
  pollCreated: Poll & { _id?: string; startedAt?: number };
  pollResults: PollResults;
  kickedOut: void;
  chatMessage: ChatMessage;
  participantsUpdate: string[];
  currentPollState: CurrentPollState;
}
