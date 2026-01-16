import express from 'express';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import cors from 'cors';

const app = express();
const server = http.createServer(app);
const io = new SocketIOServer(server, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST"]
  }
});

app.use(cors({
  origin: "http://localhost:5173",
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  credentials: true
}));
app.use(express.json());

let currentPoll = null;
let studentVotes = {};
let studentCount = 0;
let pollHistory = [];
let chatParticipants = [];
let chatMessages = [];

function countVotes(pollId, options) {
  const voteCount = {};
  options.forEach(opt => {
    const optionText = typeof opt === 'string' ? opt : opt.text;
    voteCount[optionText] = 0;
  });
  
  Object.values(studentVotes[pollId] || {}).forEach(vote => {
    if (voteCount[vote] !== undefined) {
      voteCount[vote]++;
    }
  });
  
  return voteCount;
}

function savePollToHistory() {
  if (!currentPoll) return;
  
  const pollId = currentPoll._id;
  const voteCounts = countVotes(pollId, currentPoll.options);
  
  const formattedOptions = currentPoll.options.map((opt, index) => {
    const optionText = typeof opt === 'string' ? opt : opt.text;
    return {
      _id: `opt_${pollId}_${index}`,
      text: optionText,
      votes: voteCounts[optionText] || 0
    };
  });
  
  pollHistory.push({
    _id: pollId,
    question: currentPoll.question,
    options: formattedOptions,
    timer: currentPoll.timer,
    teacherUsername: currentPoll.teacherUsername || 'unknown',
    createdAt: new Date(currentPoll.startedAt).toISOString()
  });
}

app.post('/teacher-login', (req, res) => {
  const username = 'teacher_' + Math.floor(Math.random() * 1000);
  res.json({ username });
});

app.get('/current-poll-state', (req, res) => {
  if (currentPoll) {
    const elapsed = Math.floor((Date.now() - currentPoll.startedAt) / 1000);
    const timeLeft = Math.max(currentPoll.timer - elapsed, 0);
    res.json({
      data: {
        ...currentPoll,
        timeLeft,
        totalTimeLimit: currentPoll.timer,
        isActive: timeLeft > 0
      }
    });
  } else {
    res.json({ data: null });
  }
});

app.get('/student-voted/:pollId', (req, res) => {
  const studentName = req.headers['x-student-name'] || 'anonymous';
  const hasVoted = !!studentVotes[req.params.pollId]?.[studentName];
  res.json({ hasVoted });
});

app.get('/poll-results/:pollId', (req, res) => {
  if (currentPoll && currentPoll._id === req.params.pollId) {
    const results = countVotes(req.params.pollId, currentPoll.options);
    res.json({ data: results });
  } else {
    res.json({ data: {} });
  }
});

app.get('/polls/:username', (req, res) => {
  const userPolls = pollHistory.filter(poll => poll.teacherUsername === req.params.username);
  res.json({ data: userPolls });
});

io.on('connection', (socket) => {
  studentCount++;
  io.emit('studentConnected', { studentCount });

  socket.on('createPoll', (data, callback) => {
    currentPoll = {
      ...data,
      _id: 'poll_' + Date.now(),
      startedAt: Date.now()
    };
    studentVotes[currentPoll._id] = {};
    
    io.emit('pollCreated', {
      question: currentPoll.question,
      options: currentPoll.options,
      timer: currentPoll.timer,
      startedAt: currentPoll.startedAt,
      _id: currentPoll._id
    });
    
    if (callback) {
      callback({ success: true });
    }

    setTimeout(() => {
      savePollToHistory();
      currentPoll = null;
      io.emit('pollEnded');
    }, currentPoll.timer * 1000);
  });

  socket.on('submitAnswer', (data, callback) => {
    if (!currentPoll) {
      if (callback) callback({ success: false, message: 'No active poll' });
      return;
    }

    const pollId = currentPoll._id;
    
    if (studentVotes[pollId][data.username]) {
      if (callback) callback({ success: false, message: 'You already voted' });
      return;
    }

    studentVotes[pollId][data.username] = data.option;
    const voteCount = countVotes(pollId, currentPoll.options);
    io.emit('votesUpdated', voteCount);
    
    if (callback) {
      callback({ success: true });
    }
  });

  socket.on('joinChat', (data) => {
    const { username } = data;
    if (!chatParticipants.includes(username)) {
      chatParticipants.push(username);
    }
    io.emit('participantsUpdate', chatParticipants);
  });

  socket.on('chatMessage', (data) => {
    chatMessages.push(data);
    io.emit('chatMessage', data);
  });

  socket.on('kickOut', (participant) => {
    chatParticipants = chatParticipants.filter(p => p !== participant);
    io.emit('participantsUpdate', chatParticipants);
    io.emit('kickedOut', { username: participant });
  });

  socket.on('disconnect', () => {
    studentCount--;
    io.emit('studentConnected', { studentCount });
  });
});

const PORT = 3000;
server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}/`);
});
