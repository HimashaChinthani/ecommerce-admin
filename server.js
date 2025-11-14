require('dotenv').config();
const express = require('express');
const cors = require('cors');
const sequelize = require('./config/database');
require('./models'); // load all models

// AdminJS
const adminJs = require('./admin/admin.config');  // your AdminJS configuration
const adminRouter = require('./admin/admin.router'); // router for AdminJS

const app = express();

app.use(express.json());
app.use(cors());

// test route
app.get("/", (req, res) => {
  res.send("Server running successfully");
});

// DB connection test
sequelize.authenticate()
  .then(() => console.log("Database connected!"))
  .catch(err => console.error("DB connection error:", err));

// AdminJS route
app.use(adminJs.options.rootPath, adminRouter);

// start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
