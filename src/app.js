
require('dotenv').config();
const express = require('express');
const { sequelize } = require('./models');
const apiRoutes = require('./routes/api');
const adminModule = require('./admin/admin');

const app = express();
app.use(express.json());

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
