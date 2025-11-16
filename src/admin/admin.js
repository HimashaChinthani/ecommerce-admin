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
  // We no longer use filesystem `imageUrl` field. Keep features empty; Admin uploads
  // would require a custom feature to write into the DB BLOB column.
  const productFeatures = [];

  const admin = new AdminJS({
    databases: [sequelize],
    rootPath: '/admin',
    // Provide a server-side dashboard handler that returns data the Admin UI can fetch.
    // Admins receive global stats; regular users receive a limited personal dashboard.
    dashboard: {
      handler: async (request, response, context) => {
        try {
          const req = request;
          const currentAdmin = req && req.session && req.session.adminUser;
          if (!currentAdmin) return { error: 'Not authenticated' };

          if (currentAdmin.role === 'admin') {
            const totalUsers = await User.count();
            const totalOrders = await Order.count();
            const revenue = await Order.sum('total') || 0;
            return { totalUsers, totalOrders, revenue };
          }

          // Regular user: return profile + recent orders
          const profile = await User.findByPk(currentAdmin.id, {
            attributes: ['id', 'name', 'email', 'role'],
          });
          const recentOrders = await Order.findAll({
            where: { UserId: currentAdmin.id },
            order: [['createdAt', 'DESC']],
            limit: 10,
            attributes: ['id', 'status', 'total', 'createdAt'],
          });
          return { profile, recentOrders };
        } catch (err) {
          console.error('Dashboard handler error', err);
          return { error: 'Failed to fetch dashboard data' };
        }
      },
      // No custom frontend component provided here; Admin UI will call the handler for JSON.
      component: false,
    },
    branding: {
      companyName: 'eCommerce Admin',
      softwareBrothers: false,
    },
    resources: [
      {
        resource: User,
        options: {
          // Show password on create/edit forms, but hide everywhere else
          properties: { password: { type: 'password', isVisible: { list: false, filter: false, show: false, edit: true } } },
          // Do NOT double-hash here; the User model already hashes on beforeCreate.
          // Keep actions default so AdminJS will pass the plain password to Sequelize.
          // Only admins can view and manage users
          isAccessible: ({ currentAdmin }) => currentAdmin && currentAdmin.role === 'admin',
          // Only show the Users resource in the UI for admins
          isVisible: ({ currentAdmin }) => currentAdmin && currentAdmin.role === 'admin',
          // Hide Users from navigation for non-admins
          navigation: ({ currentAdmin }) => (currentAdmin && currentAdmin.role === 'admin' ? 'Administration' : null),
          // Ensure every action is restricted to admins server-side
          actions: {
            list: { isAccessible: ({ currentAdmin }) => currentAdmin && currentAdmin.role === 'admin' },
            show: { isAccessible: ({ currentAdmin }) => currentAdmin && currentAdmin.role === 'admin' },
            new: { isAccessible: ({ currentAdmin }) => currentAdmin && currentAdmin.role === 'admin', isVisible: ({ currentAdmin }) => currentAdmin && currentAdmin.role === 'admin' },
            edit: { isAccessible: ({ currentAdmin }) => currentAdmin && currentAdmin.role === 'admin', isVisible: ({ currentAdmin }) => currentAdmin && currentAdmin.role === 'admin' },
            delete: { isAccessible: ({ currentAdmin }) => currentAdmin && currentAdmin.role === 'admin', isVisible: ({ currentAdmin }) => currentAdmin && currentAdmin.role === 'admin' },
          },
        },
      },
      {
        resource: Product,
        features: productFeatures,
        options: {
          properties: {
            price: { type: 'number', label: 'Price ($)', description: 'Enter price in USD ($)' },
            // hide binary and metadata fields from the Admin UI
            image: { isVisible: false },
            filename: { isVisible: false },
            mimeType: { isVisible: false },
            size: { isVisible: false },
          },
          // allow any authenticated admin or regular user to view products in the admin UI
          isAccessible: ({ currentAdmin }) => !!currentAdmin,
          // restrict mutating actions to admins only
          actions: {
            list: { isAccessible: ({ currentAdmin }) => !!currentAdmin },
            show: { isAccessible: ({ currentAdmin }) => !!currentAdmin },
            new: { isAccessible: ({ currentAdmin }) => currentAdmin && currentAdmin.role === 'admin', isVisible: ({ currentAdmin }) => currentAdmin && currentAdmin.role === 'admin' },
            edit: { isAccessible: ({ currentAdmin }) => currentAdmin && currentAdmin.role === 'admin', isVisible: ({ currentAdmin }) => currentAdmin && currentAdmin.role === 'admin' },
            delete: { isAccessible: ({ currentAdmin }) => currentAdmin && currentAdmin.role === 'admin', isVisible: ({ currentAdmin }) => currentAdmin && currentAdmin.role === 'admin' },
            bulkDelete: { isAccessible: ({ currentAdmin }) => currentAdmin && currentAdmin.role === 'admin', isVisible: ({ currentAdmin }) => currentAdmin && currentAdmin.role === 'admin' },
          },
        },
      },
      {
        resource: Category,
        options: {
          isAccessible: ({ currentAdmin }) => !!currentAdmin,
          actions: {
            list: { isAccessible: ({ currentAdmin }) => !!currentAdmin },
            show: { isAccessible: ({ currentAdmin }) => !!currentAdmin },
            new: { isAccessible: ({ currentAdmin }) => currentAdmin && currentAdmin.role === 'admin', isVisible: ({ currentAdmin }) => currentAdmin && currentAdmin.role === 'admin' },
            edit: { isAccessible: ({ currentAdmin }) => currentAdmin && currentAdmin.role === 'admin', isVisible: ({ currentAdmin }) => currentAdmin && currentAdmin.role === 'admin' },
            delete: { isAccessible: ({ currentAdmin }) => currentAdmin && currentAdmin.role === 'admin', isVisible: ({ currentAdmin }) => currentAdmin && currentAdmin.role === 'admin' },
            bulkDelete: { isAccessible: ({ currentAdmin }) => currentAdmin && currentAdmin.role === 'admin', isVisible: ({ currentAdmin }) => currentAdmin && currentAdmin.role === 'admin' },
          },
        },
      },
      { resource: Order, options: { isAccessible: ({ currentAdmin }) => currentAdmin && currentAdmin.role === 'admin' } },
      { resource: OrderItem, options: { isAccessible: ({ currentAdmin }) => currentAdmin && currentAdmin.role === 'admin' } },
      {
        resource: Setting,
        options: {
          // Only admins should see and edit settings
          isAccessible: ({ currentAdmin }) => currentAdmin && currentAdmin.role === 'admin',
          // Only show Settings in the UI for admins
          isVisible: ({ currentAdmin }) => currentAdmin && currentAdmin.role === 'admin',
          // Hide the Settings resource from non-admins in navigation
          navigation: ({ currentAdmin }) => (currentAdmin && currentAdmin.role === 'admin' ? 'Configuration' : null),
          actions: {
            list: { isAccessible: ({ currentAdmin }) => currentAdmin && currentAdmin.role === 'admin' },
            show: { isAccessible: ({ currentAdmin }) => currentAdmin && currentAdmin.role === 'admin' },
            new: { isAccessible: ({ currentAdmin }) => currentAdmin && currentAdmin.role === 'admin' },
            edit: { isAccessible: ({ currentAdmin }) => currentAdmin && currentAdmin.role === 'admin' },
            delete: { isAccessible: ({ currentAdmin }) => currentAdmin && currentAdmin.role === 'admin' },
          },
        },
      },
    ],
    // Add a lightweight page for Settings that admins can open (handler returns JSON).
    pages: {
      SettingsPage: {
        label: 'Settings',
        handler: async (request, response, context) => {
          const req = request;
          const currentAdmin = req && req.session && req.session.adminUser;
          if (!currentAdmin || currentAdmin.role !== 'admin') {
            return { error: 'Forbidden' };
          }
          const settings = await Setting.findAll({ attributes: ['id', 'key', 'value'] });
          return { settings };
        },
        component: false,
      },
    },
  });

  const router = AdminJSExpress.buildAuthenticatedRouter(admin, {
    authenticate: async (email, password) => {
      try {
        const user = await User.findOne({ where: { email } });
        if (!user) {
          console.warn('[AdminJS] authenticate: user not found', email);
          return false;
        }
        const valid = await bcrypt.compare(password, user.password);
        if (!valid) {
          console.warn('[AdminJS] authenticate: invalid password for', email);
          return false;
        }
        // Allow any authenticated user to sign in to the AdminJS UI.
        // Resource-level options (isAccessible/isVisible) will restrict access to sensitive resources like Users and Settings.
        const plain = user.get ? user.get({ plain: true }) : user;
        console.log('[AdminJS] authenticate: login success for', email, 'role=', plain.role);
        return plain;
      } catch (err) {
        console.error('[AdminJS] authenticate error', err);
        return false;
      }
    },
    cookiePassword: process.env.ADMIN_COOKIE_SECRET || 'dev-admin-cookie-secret',
  });

  // Add a small stats endpoint for the Admin UI (only accessible after authentication)
  // Returns full site stats for admins, and a limited personal dashboard for regular users.
  router.get('/stats', async (req, res) => {
    try {
      // currentAdmin is attached by AdminJS session/auth middleware
      const currentAdmin = req.session && req.session.adminUser;
      if (!currentAdmin) return res.status(403).json({ error: 'Not authenticated' });

      // If the logged-in user is an admin, return global statistics
      if (currentAdmin.role === 'admin') {
        const totalUsers = await User.count();
        const totalOrders = await Order.count();
        const revenue = await Order.sum('total') || 0;
        return res.json({ totalUsers, totalOrders, revenue });
      }

      // For regular users, return a limited personal dashboard: profile + recent orders
      const profile = await User.findByPk(currentAdmin.id, {
        attributes: ['id', 'name', 'email', 'role'],
      });

      const recentOrders = await Order.findAll({
        where: { UserId: currentAdmin.id },
        order: [['createdAt', 'DESC']],
        limit: 10,
        attributes: ['id', 'status', 'total', 'createdAt'],
      });

      return res.json({ profile, recentOrders });
    } catch (err) {
      console.error('Failed to fetch admin stats', err);
      res.status(500).json({ error: 'Failed to fetch stats' });
    }
  });

  return { admin, router };
}

module.exports = { buildAdmin };
