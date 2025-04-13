const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const sequelize = require('./config/sequelize.js');
const config = require('./config/index.js');
const apiRoutes = require('./routes/api.js');
const { authMiddleware } = require('./middleware/auth');
const createDefaultUsers = require('./seeders/default-users');
const path = require('path');
const { requestLogger } = require('./middleware/logger');

// Initialize express app
const app = express();

// Custom CSP middleware
app.use((req, res, next) => {
    res.setHeader(
        'Content-Security-Policy',
        "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; script-src-attr 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'"
    );
    next();
});

// Apply middleware
// Use helmet with custom CSP configuration
app.use(helmet({
    contentSecurityPolicy: false // Disable helmet's CSP in favor of our custom one above
}));

app.use(cors({
    origin: true,
    credentials: true // Allow cookies to be sent with requests
}));
app.use(express.json());
app.use(morgan('dev'));
app.use(cookieParser());
app.use(session({
    secret: process.env.SESSION_SECRET || 'your-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
        sameSite: 'lax' // Helps with CSRF protection while allowing redirects
    }
}));

// Add request logger middleware BEFORE routes
app.use(requestLogger);

// Public static files
app.use(express.static(path.join(__dirname, 'public'), {
    index: 'login.html',
    extensions: ['html']
}));

// Add auth routes BEFORE protected routes
const authRoutes = require('./routes/authRoutes');
app.use('/api/auth', authRoutes);

// API routes - include both auth and protected routes
app.use('/api', apiRoutes);

// Protected HTML routes
app.use('/cards.html', authMiddleware, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'cards.html'));
});

app.use('/admin', authMiddleware, (req, res, next) => {
    if (req.path.endsWith('.html')) {
        res.sendFile(path.join(__dirname, 'public', 'admin', req.path));
    } else {
        next();
    }
});

// Default error handler
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send('Something broke!');
});

// Initialize database and start server
async function initDb() {
    try {
        await sequelize.authenticate();
        console.log('Connected to MySQL database');

        if (config.environment === 'development') {
            // Force sync all models with the database
            await sequelize.sync({ force: true });
            console.log('Database models synchronized');
            
            // Verify that all tables were created
            const [tables] = await sequelize.query('SHOW TABLES');
            console.log('Tables created:', tables.map(t => Object.values(t)[0]));
            
            try {
                // Seed default users with better error handling
                await createDefaultUsers();
                console.log('Default users created successfully');
            } catch (seedError) {
                console.error('Error creating default users:', seedError);
                // Continue execution even if seeding fails
            }
            
            console.log('Database setup complete');
        } else {
            // In production, just sync without force to avoid data loss
            await sequelize.sync();
            console.log('Database models synchronized (without force)');
        }
    } catch (err) {
        console.error('Failed to connect to database:', err);
        process.exit(1);
    }
}

initDb().then(() => {
    app.listen(config.port, () => {
        console.log(`Credit Card Vault API running on port ${config.port}`);
        console.log(`Environment: ${config.environment}`);
    });
});

// Remove this line as it's redundant and comes after the server starts
// app.use('/api', authMiddleware, apiRoutes);
