require('dotenv').config();
const bcrypt = require('bcrypt');
const { sequelize, User } = require('../models');

(async () => {
  await sequelize.sync({ force: true });
  const hashed = await bcrypt.hash('Admin123!', 10);
  await User.create({
    name: 'Admin',
    email: 'admin@local.test',
    password: hashed,
    role: 'admin',
  });
  console.log('Admin user created.');
  process.exit();
})();
