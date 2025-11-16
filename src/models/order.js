const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const User = require('./user');

const Order = sequelize.define('Order', {
  status: { type: DataTypes.STRING, defaultValue: 'Pending' },
  total: { type: DataTypes.FLOAT, defaultValue: 0 },
});

User.hasMany(Order);
Order.belongsTo(User);

// Ensure a newly created Order always has total set to 0 (force during creation)
Order.beforeCreate(async (order, options) => {
  order.total = 0;
});

// Also handle bulk creates to ensure every created order has total = 0
Order.beforeBulkCreate(async (orders, options) => {
  if (Array.isArray(orders)) {
    for (const order of orders) {
      order.total = 0;
    }
  }
});

module.exports = Order;
