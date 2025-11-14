
require('dotenv').config();
const express = require('express');
const { sequelize } = require('./models');
const apiRoutes = require('./routes/api');
const { admin, router: adminRouter } = require('./admin/admin');

const app = express();
app.use(express.json());

// Routes
app.use('/api', apiRoutes);
app.use(admin.options.rootPath, adminRouter);

sequelize.sync().then(() => {
  console.log('Database synced');
  app.listen(process.env.PORT || 4000, () => {
    console.log(`Server running on port ${process.env.PORT || 4000}`);
  });
});
