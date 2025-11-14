const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const User = require('./user');

const Order = sequelize.define('Order', {
  status: { type: DataTypes.STRING, defaultValue: 'Pending' },
  total: { type: DataTypes.FLOAT, defaultValue: 0 },
});

User.hasMany(Order);
Order.belongsTo(User);

module.exports = Order;
