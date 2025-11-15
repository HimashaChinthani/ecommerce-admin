
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
  app.use(admin.options.rootPath, adminRouter);

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
