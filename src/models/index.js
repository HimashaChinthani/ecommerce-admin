const sequelize = require('../config/database');
const User = require('./user');
const Category = require('./category');
const Product = require('./product');
const Order = require('./order');
const OrderItem = require('./orderItem');
const Setting = require('./setting');

module.exports = { sequelize, User, Category, Product, Order, OrderItem, Setting };
