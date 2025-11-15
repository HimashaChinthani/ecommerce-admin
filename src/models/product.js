const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const Category = require('./category');

const Product = sequelize.define('Product', {
  name: { type: DataTypes.STRING, allowNull: false },
  description: { type: DataTypes.STRING },
  price: { type: DataTypes.FLOAT, allowNull: false },
  // removed `imageUrl` (stored files on disk) in favor of storing image data and metadata in DB
  image: { type: DataTypes.BLOB('long') },
  filename: { type: DataTypes.STRING },
  mimeType: { type: DataTypes.STRING },
  size: { type: DataTypes.INTEGER },
  stock: { type: DataTypes.INTEGER, defaultValue: 0 },
});

Category.hasMany(Product);
Product.belongsTo(Category);

module.exports = Product;
