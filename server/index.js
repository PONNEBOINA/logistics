import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import mongoose from 'mongoose';
import vehiclesRouter from './routes/vehicles.js';
import bookingsRouter from './routes/bookings.js';
import authRouter from './routes/auth.js';
import adminRouter from './routes/admin.js';
import feedbackRouter from './routes/feedback.js';

dotenv.config();

const app = express();
const server = http.createServer(app);

const allowedOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',')
  : ['http://localhost:5173', 'http://localhost:8080', 'http://localhost:8081'];
const io = new SocketIOServer(server, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'OPTIONS'],
    credentials: true,
  },
});

// Socket rooms: customer:<id>, driver:<id>
io.on('connection', (socket) => {
  const { role, userId } = socket.handshake.query;
  console.log(`🔌 Socket.IO connection: role=${role}, userId=${userId}`);
  
  if (role && userId) {
    const room = `${role}:${userId}`;
    socket.join(room);
    console.log(`✅ Socket joined room: ${room}`);
  } else {
    console.warn('⚠️ Socket connection missing role or userId');
  }

  // Relay driver's live location updates to the customer's room
  socket.on('driver_location_update', (payload) => {
    // Expected payload: { bookingId, customerId, driverId, coords: { lat, lng }, timestamp }
    if (payload && payload.customerId) {
      io.to(`customer:${payload.customerId}`).emit('driver_location_update', payload);
    }
  });

  socket.on('disconnect', () => {
    console.log(`🔌 Socket disconnected: ${role}:${userId}`);
  });
});

// Attach io to req for routes that need to emit
app.use((req, _res, next) => {
  req.io = io;
  next();
});

const corsOptions = {
  origin: function (origin, callback) {
    // Allow no-origin (mobile apps, curl) and any localhost origin in dev
    if (!origin || /^(http:\/\/localhost(:\d+)?)$/.test(origin)) {
      return callback(null, true);
    }
    if (allowedOrigins.includes(origin)) return callback(null, true);
    return callback(null, false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PATCH', 'PUT', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  optionsSuccessStatus: 204,
};
app.use(cors(corsOptions));
app.options('*', cors(corsOptions));
app.use(express.json());

app.get('/health', (_req, res) => res.json({ ok: true }));

app.use('/api/auth', authRouter);
app.use('/api/vehicles', vehiclesRouter);
app.use('/api/bookings', bookingsRouter);
app.use('/api/admin', adminRouter);
app.use('/api/feedback', feedbackRouter);

const PORT = process.env.PORT || 4000;
const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('Missing MONGODB_URI');
  process.exit(1);
}

const mongoOptions = {};
if (process.env.TLS_INSECURE === 'true') {
  console.warn('[WARN] TLS_INSECURE enabled: allowing invalid TLS certificates for MongoDB (DEV ONLY)');
  mongoOptions.tlsAllowInvalidCertificates = true;
  mongoOptions.tlsAllowInvalidHostnames = true;
}

mongoose
  .connect(MONGODB_URI, mongoOptions)
  .then(() => {
    server.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error('Mongo connection error:', err);
    process.exit(1);
  });
