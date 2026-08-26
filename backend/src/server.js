const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
require('dotenv').config();

const authRoutes = require('./routes/authRoutes');
const reportRoutes = require('./routes/reportRoutes');
const geminiRoutes = require('./routes/geminiRoutes');
const issuesRoutes = require('./routes/issuesRoutes');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*' }
});

app.set('io', io); // makes io accessible in route handlers via req.app.get('io')

app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/gemini', geminiRoutes);
app.use('/api/issues', issuesRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'CivicVoice backend running' });
});

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  socket.on('disconnect', () => console.log('Client disconnected:', socket.id));
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`CivicVoice backend running on port ${PORT}`);
});
