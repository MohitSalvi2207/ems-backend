const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const dotenv = require('dotenv');
const connectDB = require('./config/db');
const errorHandler = require('./middleware/errorHandler');

// Load env variables
dotenv.config();

// Connect to database
connectDB();

const app = express();
const server = http.createServer(app);

// Allowed origins - exact matches
const allowedOrigins = [
    'http://localhost:5173',
    'http://localhost:3000',
    'https://employeemanagementsystem-zeta-six.vercel.app', // Production Vercel URL
    process.env.CLIENT_URL
].filter(Boolean);

// Pattern-based origins - Vercel generates different URLs per deployment
const allowedPatterns = [
    /^https?:\/\/.*\.vercel\.app$/,       // All Vercel deployments
    /^https?:\/\/localhost(:\d+)?$/,       // All localhost ports
];

console.log('Allowed CORS origins:', allowedOrigins);
console.log('NODE_ENV:', process.env.NODE_ENV);

// Check if origin is allowed
function isOriginAllowed(origin) {
    // Allow requests with no origin (e.g., mobile apps, curl, Postman)
    if (!origin) return true;
    // Check exact match list
    if (allowedOrigins.includes(origin)) return true;
    // Check pattern list
    if (allowedPatterns.some(pattern => pattern.test(origin))) return true;
    console.log('CORS blocked origin:', origin);
    return false;
}

// CORS options
const corsOptions = {
    origin: function (origin, callback) {
        if (isOriginAllowed(origin)) {
            callback(null, true);
        } else {
            callback(new Error(`CORS: origin '${origin}' not allowed`));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Cookie'],
    exposedHeaders: ['Set-Cookie'],
    optionsSuccessStatus: 200
};

// Socket.io setup
const io = new Server(server, {
    cors: {
        origin: function (origin, callback) {
            if (isOriginAllowed(origin)) {
                callback(null, true);
            } else {
                callback(new Error('Not allowed by CORS'));
            }
        },
        credentials: true,
        methods: ['GET', 'POST']
    }
});

// Make io accessible to routes
app.use((req, res, next) => {
    req.io = io;
    next();
});

// Middleware - handle preflight for all routes
app.options('/{*splat}', cors(corsOptions));
app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/employees', require('./routes/employeeRoutes'));
app.use('/api/departments', require('./routes/departmentRoutes'));
app.use('/api/attendance', require('./routes/attendanceRoutes'));
app.use('/api/tasks', require('./routes/taskRoutes'));
app.use('/api/payroll', require('./routes/payrollRoutes'));
app.use('/api/dashboard', require('./routes/dashboardRoutes'));
app.use('/api/notifications', require('./routes/notificationRoutes'));

// Health check
app.get('/api/health', (req, res) => {
    res.json({ success: true, message: 'EMS API is running', timestamp: new Date() });
});

// Error handler
app.use(errorHandler);

// Socket.io connection handling
io.on('connection', (socket) => {
    console.log(`Client connected: ${socket.id}`);

    socket.on('disconnect', () => {
        console.log(`Client disconnected: ${socket.id}`);
    });
});

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
    console.log(`\n🚀 EMS Server running on port ${PORT}`);
    console.log(`   Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`   API: http://localhost:${PORT}/api`);
    console.log(`   Health: http://localhost:${PORT}/api/health\n`);
});
