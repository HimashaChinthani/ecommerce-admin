// Build and return AdminJS and its authenticated router using dynamic imports.
// AdminJS packages publish ESM entry points; using dynamic import() lets this CommonJS app load them.
const { User, Category, Product, Order, OrderItem, Setting, sequelize } = require('../models');
const bcrypt = require('bcrypt');

async function buildAdmin() {
  const AdminJSModule = await import('adminjs');
  const AdminJS = AdminJSModule.default || AdminJSModule;

  const AdminJSExpressModule = await import('@adminjs/express');
  const AdminJSExpress = AdminJSExpressModule.default || AdminJSExpressModule;

  const AdminJSSequelizeModule = await import('@adminjs/sequelize');
  const AdminJSSequelize = AdminJSSequelizeModule.default || AdminJSSequelizeModule;

  AdminJS.registerAdapter(AdminJSSequelize);

  const admin = new AdminJS({
    databases: [sequelize],
    rootPath: '/admin',
    branding: {
      companyName: 'eCommerce Admin',
      softwareBrothers: false,
    },
    resources: [
      {
        resource: User,
        options: {
          properties: { password: { isVisible: false } },
          actions: {
            new: {
              before: async (req) => {
                if (req.payload && req.payload.password) {
                  req.payload.password = await bcrypt.hash(req.payload.password, 10);
                }
                return req;
              },
            },
          },
          isAccessible: ({ currentAdmin }) => currentAdmin && currentAdmin.role === 'admin',
        },
      },
      { resource: Product },
      { resource: Category },
      { resource: Order },
      { resource: OrderItem },
      {
        resource: Setting,
        options: {
          isAccessible: ({ currentAdmin }) => currentAdmin && currentAdmin.role === 'admin',
        },
      },
    ],
  });

  const router = AdminJSExpress.buildAuthenticatedRouter(admin, {
    authenticate: async (email, password) => {
      const user = await User.findOne({ where: { email } });
      if (!user) return false;
      const valid = await bcrypt.compare(password, user.password);
      if (valid) return user;
      return false;
    },
    cookiePassword: process.env.ADMIN_COOKIE_SECRET,
  });

  return { admin, router };
}

module.exports = { buildAdmin };
