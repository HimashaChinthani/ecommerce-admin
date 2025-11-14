require('dotenv').config();
const { sequelize, User } = require('../models');

(async () => {
  // force sync recreates tables — use only in development
  await sequelize.sync({ force: true });
  // Do NOT pre-hash the password here because the User model has a beforeCreate
  // hook that hashes passwords. Passing the plain password ensures it's hashed once.
  await User.create({
    name: 'Admin',
    email: 'admin@local.test',
    password: 'Admin123!',
    role: 'admin',
  });
  console.log('Admin user created.');
  process.exit();
})();
