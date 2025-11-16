const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const Order = require('./order');
const Product = require('./product');

const OrderItem = sequelize.define('OrderItem', {
  quantity: { type: DataTypes.INTEGER, allowNull: false },
  price: { type: DataTypes.FLOAT, allowNull: false },
});

Order.hasMany(OrderItem);
OrderItem.belongsTo(Order);
OrderItem.belongsTo(Product);

// Helper to recalculate and persist the parent Order total
async function recalcOrderTotal(orderId) {
  if (!orderId) return;
  try {
    const items = await OrderItem.findAll({ where: { OrderId: orderId } });
    const total = items.reduce((sum, it) => sum + (Number(it.price || 0) * Number(it.quantity || 0)), 0);
    // Update the Order total directly
    await Order.update({ total }, { where: { id: orderId } });
  } catch (err) {
    console.error('Failed to recalc order total for OrderId=', orderId, err);
  }
}

// Recalculate after item is created, updated or destroyed
OrderItem.afterCreate(async (item, options) => {
  await recalcOrderTotal(item.OrderId);
});

OrderItem.afterUpdate(async (item, options) => {
  await recalcOrderTotal(item.OrderId);
});

OrderItem.afterDestroy(async (item, options) => {
  await recalcOrderTotal(item.OrderId);
});

// Ensure price is taken from the selected Product when creating/updating an OrderItem
OrderItem.beforeCreate(async (item, options) => {
  try {
    if ((item.price === null || typeof item.price === 'undefined' || item.price === '') && item.ProductId) {
      const product = await Product.findByPk(item.ProductId);
      if (product && typeof product.price !== 'undefined') {
        item.price = product.price;
      }
    }
  } catch (err) {
    console.error('OrderItem.beforeCreate price fill error', err);
  }
});

OrderItem.beforeUpdate(async (item, options) => {
  try {
    if ((item.price === null || typeof item.price === 'undefined' || item.price === '') && item.ProductId) {
      const product = await Product.findByPk(item.ProductId);
      if (product && typeof product.price !== 'undefined') {
        item.price = product.price;
      }
    }
  } catch (err) {
    console.error('OrderItem.beforeUpdate price fill error', err);
  }
});

module.exports = OrderItem;
