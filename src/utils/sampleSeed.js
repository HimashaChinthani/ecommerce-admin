require('dotenv').config();
const { sequelize, User, Category, Product, Order, OrderItem } = require('../models');

// Idempotent sample data loader that won't recreate existing items
(async () => {
  try {
    await sequelize.sync();

    // admin
    const [admin, adminCreated] = await User.findOrCreate({
      where: { email: 'admin@local.test' },
      defaults: {
        name: 'Admin',
        password: 'Admin123!', // User model will hash this in beforeCreate
        role: 'admin',
      },
    });
    if (adminCreated) console.log('Admin created'); else console.log('Admin exists');

    // default category
    const [cat] = await Category.findOrCreate({ where: { name: 'Default' }, defaults: { description: 'Default category' } });

    // sample products
    const sampleProducts = [
      { name: 'T-shirt', description: 'Comfortable cotton t-shirt', price: 1999, categoryId: cat.id || cat.dataValues?.id },
      { name: 'Sneakers', description: 'Lightweight sneakers', price: 5999, categoryId: cat.id || cat.dataValues?.id },
    ];

    for (const p of sampleProducts) {
      const [prod, created] = await Product.findOrCreate({ where: { name: p.name }, defaults: p });
      if (created) console.log('Created product', prod.name);
    }

    // sample order (only if none exists)
    const orderCount = await Order.count();
    if (orderCount === 0) {
      const order = await Order.create({ total: 1999, email: 'buyer@local.test', status: 'pending' });
      const product = await Product.findOne({ where: { name: 'T-shirt' } });
      if (product) {
        await OrderItem.create({ orderId: order.id, productId: product.id, price: product.price, quantity: 1 });
      }
      console.log('Sample order created');
    } else {
      console.log('Orders already exist');
    }

    console.log('Sample seeding finished');
    process.exit(0);
  } catch (err) {
    console.error('Sample seed failed', err);
    process.exit(1);
  }
})();
