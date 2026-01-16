import { useState, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import axios from 'axios';
import { showError, showWarning, handleApiError } from '../utils/toast';
import { Poll, PollResults, CurrentPollState } from '../types';

const apiUrl = import.meta.env.VITE_NODE_ENV === 'production'
  ? import.meta.env.VITE_API_BASE_URL
  : 'http://localhost:3000';

export const useSocket = () => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const newSocket = io(apiUrl, {
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5
    });

    newSocket.on('connect', () => setIsConnected(true));
    newSocket.on('disconnect', () => {
      setIsConnected(false);
      showWarning('Disconnected from server. Reconnecting...');
    });
    newSocket.on('connect_error', (error: Error) => {
      showError('Connection error: ' + error.message);
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, []);

  return { socket, isConnected };
};

export const usePollTimer = (
  initialTimeLeft: number,
  onTimeEnd?: () => void,
  serverStartedAt?: number
) => {
  const [timeLeft, setTimeLeft] = useState(initialTimeLeft);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (serverStartedAt) {
      const elapsed = Math.floor((Date.now() - serverStartedAt) / 1000);
      const adjustedTime = Math.max(initialTimeLeft - elapsed, 0);
      setTimeLeft(adjustedTime);
    }
  }, [initialTimeLeft, serverStartedAt]);

  useEffect(() => {
    if (timeLeft > 0) {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }

      timerRef.current = setInterval(() => {
        setTimeLeft((prevTime) => {
          if (prevTime <= 1) {
            clearInterval(timerRef.current as NodeJS.Timeout);
            onTimeEnd?.();
            return 0;
          }
          return prevTime - 1;
        });
      }, 1000);
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [timeLeft, onTimeEnd]);

  return timeLeft;
};

export const useStudentPollRecovery = (socket: Socket | null, username: string | null) => {
  const [pollQuestion, setPollQuestion] = useState('');
  const [pollOptions, setPollOptions] = useState<Poll['options']>([]);
  const [votes, setVotes] = useState<PollResults>({});
  const [timeLeft, setTimeLeft] = useState(0);
  const [pollId, setPollId] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [serverStartedAt, setServerStartedAt] = useState<number | undefined>();

  useEffect(() => {
    const recoverPollState = async () => {
      if (!username) {
        setIsLoading(false);
        return;
      }

      try {
        const response = await axios.get(`${apiUrl}/current-poll-state`, {
          headers: { 'X-Student-Name': username },
          timeout: 5000
        });

        if (response.data.data) {
          const state: CurrentPollState = response.data.data;
          setPollQuestion(state.question);
          setPollOptions(state.options);
          setPollId(state.pollId);
          setTimeLeft(state.timeLeft);
          setServerStartedAt(state.startedAt);
          
          try {
            const voteCheckResponse = await axios.get(
              `${apiUrl}/student-voted/${state.pollId}`,
              { 
                headers: { 'X-Student-Name': username },
                timeout: 5000
              }
            );
            setSubmitted(voteCheckResponse.data.hasVoted || false);
          } catch (voteError) {
            setSubmitted(false);
          }
        }
        setIsLoading(false);
      } catch (err) {
        handleApiError(err);
        setIsLoading(false);
      }
    };

    recoverPollState();
  }, [username]);

  useEffect(() => {
    if (!socket) return;

    const handlePollCreated = (pollData: Poll & { startedAt?: number; _id?: string }) => {
      setPollQuestion(pollData.question);
      setPollOptions(pollData.options);
      setVotes({});
      setSubmitted(false);
      setPollId(pollData._id || '');
      setTimeLeft(Number(pollData.timer));
      setServerStartedAt(pollData.startedAt || Date.now());
    };

    const handleVotesUpdated = (updatedVotes: PollResults) => {
      setVotes(updatedVotes);
    };

    socket.on('pollCreated', handlePollCreated);
    socket.on('votesUpdated', handleVotesUpdated);

    return () => {
      socket.off('pollCreated', handlePollCreated);
      socket.off('votesUpdated', handleVotesUpdated);
    };
  }, [socket]);

  return {
    pollQuestion,
    pollOptions,
    votes,
    timeLeft,
    pollId,
    submitted,
    setSubmitted,
    isLoading,
    serverStartedAt
  };
};

export const useTeacherPollRecovery = (socket: Socket | null) => {
  const [pollQuestion, setPollQuestion] = useState('');
  const [pollOptions, setPollOptions] = useState<Poll['options']>([]);
  const [votes, setVotes] = useState<PollResults>({});
  const [totalVotes, setTotalVotes] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [pollId, setPollId] = useState('');

  useEffect(() => {
    const recoverPollState = async () => {
      try {
        const response = await axios.get(`${apiUrl}/current-poll-state`, {
          timeout: 5000
        });

        if (response.data.data) {
          const state: CurrentPollState = response.data.data;
          setPollQuestion(state.question);
          setPollOptions(state.options);
          setPollId(state.pollId);
          
          try {
            const resultsResponse = await axios.get(
              `${apiUrl}/poll-results/${state.pollId}`,
              { timeout: 5000 }
            );
            const results = resultsResponse.data.data || {};
            setVotes(results);
            setTotalVotes(Object.values(results).reduce((a: number, b: number) => a + b, 0));
          } catch (resultsError) {
            setVotes({});
          }
        }
        setIsLoading(false);
      } catch (err) {
        handleApiError(err);
        setIsLoading(false);
      }
    };

    recoverPollState();
  }, []);

  useEffect(() => {
    if (!socket) return;

    const handlePollCreated = (pollData: Poll & { _id?: string }) => {
      setPollQuestion(pollData.question);
      setPollOptions(pollData.options);
      setVotes({});
      setPollId(pollData._id || '');
      setTotalVotes(0);
    };

    const handleVotesUpdated = (updatedVotes: PollResults) => {
      setVotes(updatedVotes);
      setTotalVotes(Object.values(updatedVotes).reduce((a: number, b: number) => a + b, 0));
    };

    socket.on('pollCreated', handlePollCreated);
    socket.on('votesUpdated', handleVotesUpdated);

    return () => {
      socket.off('pollCreated', handlePollCreated);
      socket.off('votesUpdated', handleVotesUpdated);
    };
  }, [socket]);

  return {
    pollQuestion,
    pollOptions,
    votes,
    totalVotes,
    isLoading,
    pollId
  };
};

