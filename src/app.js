
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const session = require('express-session');
const path = require('path');
const { sequelize } = require('./models');
const apiRoutes = require('./routes/api');
const adminModule = require('./admin/admin');

const app = express();
app.use(express.json());
// Allow frontend dev server (and others) to talk to this API during development
app.use(cors());

// session middleware used by AdminJS (and other parts). Providing explicit options
// removes the express-session deprecation warnings that occur when defaults are used.
app.use(
  session({
    secret: process.env.ADMIN_COOKIE_SECRET || 'change-me',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false },
  })
);

// simple root for sanity checks
app.get('/', (req, res) => res.send('eCommerce Admin API')); 

// Serve uploaded files (images) from the project uploads/ folder
const uploadsPath = path.join(process.cwd(), 'uploads');
app.use('/uploads', express.static(uploadsPath));

// Routes and async admin initialization
app.use('/api', apiRoutes);

(async () => {
  const { admin, router: adminRouter } = await adminModule.buildAdmin();

  // JWT verification middleware: accepts Authorization Bearer token or cookie 'token' or 'adminToken'
  const jwt = require('jsonwebtoken');
  const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';
  function verifyAdminJwt(req, res, next) {
    try {
      const authHeader = req.headers.authorization || req.headers.Authorization;
      let token = null;
      if (authHeader && typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
        token = authHeader.split(' ')[1];
      }
      // fallback to cookies for browser-based access
      if (!token) token = req.cookies && (req.cookies.adminToken || req.cookies.token);
      if (!token) return next(); // no token -> let AdminJS's own router handle login page

      const decoded = jwt.verify(token, JWT_SECRET);
      // Only set session for admin role to prevent regular users from gaining AdminJS access
      if (decoded && decoded.role === 'admin') {
        req.session.adminUser = { id: decoded.id, email: decoded.email, role: decoded.role };
      } else {
        req.session.adminUser = null;
      }
      return next();
    } catch (err) {
      // invalid token -> clear any session adminUser and continue
      req.session.adminUser = null;
      return next();
    }
  }

  // Parse cookies so middleware can read token cookie (AdminJS uses express-session; ensure cookie parser exists)
  const cookieParser = require('cookie-parser');
  app.use(cookieParser());

  // Add an optional helper route to set a token cookie and session for quick local testing.
  // Example: /admin/auth/set-token?token=<JWT>
  app.get('/admin/auth/set-token', (req, res) => {
    try {
      const token = req.query.token;
      if (!token) return res.status(400).send('token query parameter required');
      try {
        const decoded = require('jsonwebtoken').verify(token, JWT_SECRET);
        // Only allow setting admin session if token belongs to an admin
        if (!decoded || decoded.role !== 'admin') return res.status(403).send('forbidden: not an admin token');
        // set a cookie for browser and set session
        res.cookie('adminToken', token, { httpOnly: false });
        req.session.adminUser = { id: decoded.id, email: decoded.email, role: decoded.role };
        return res.redirect(admin.options.rootPath);
      } catch (err) {
        return res.status(400).send('invalid token');
      }
    } catch (err) {
      console.error('set-token helper failed', err);
      return res.status(500).send('server error');
    }
  });

  // Install JWT verification before AdminJS router so a valid token creates a session
  app.use(admin.options.rootPath, verifyAdminJwt, adminRouter);

  try {
    // Use alter in development to update DB schema to match models without dropping data
    await sequelize.sync({ alter: true });
    console.log('Database synced');
    app.listen(process.env.PORT || 4000, () => {
      console.log(`Server running on port ${process.env.PORT || 4000}`);
    });
  } catch (err) {
    console.error('Failed to sync database', err);
    process.exit(1);
  }
})();
