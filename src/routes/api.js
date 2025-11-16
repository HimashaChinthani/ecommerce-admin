const express = require('express');
const router = express.Router();
const path = require('path');
const multer = require('multer');
const { login } = require('../controllers/auth.controller');
const { Product, Order, OrderItem, Category, User, sequelize } = require('../models');
const jwt = require('jsonwebtoken');
const { requireAuth, requireAdmin } = require('../middleware/roles');
const bcrypt = require('bcrypt');

// multer storage: use memory storage so we can store the file buffer in the DB
const storage = multer.memoryStorage();
const upload = multer({ storage });

// Public product list used by the frontend dashboard
router.get('/products', async (req, res) => {
	try {
		// include category name and exclude the binary `image` field to keep payloads small
		const productsRaw = await Product.findAll({
			attributes: { exclude: ['image'] },
			include: [{ model: Category, attributes: ['id', 'name'] }],
			order: [['id', 'ASC']],
		});

		const products = productsRaw.map(p => ({
			id: p.id,
			name: p.name,
			description: p.description,
			price: p.price,
			stock: p.stock,
			filename: p.filename,
			category: p.Category ? p.Category.name : null,
			categoryId: p.categoryId,
		}));

		res.json(products);
	} catch (err) {
		console.error('Failed to fetch products', err);
		res.status(500).json({ error: 'Failed to fetch products' });
	}
});

// serve the product image blob
router.get('/products/:id/image', async (req, res) => {
	try {
		const product = await Product.findByPk(req.params.id);
		if (!product || !product.image) return res.status(404).json({ error: 'Image not found' });
		res.set('Content-Type', product.mimeType || 'application/octet-stream');
		res.send(product.image);
	} catch (err) {
		console.error('Failed to serve product image', err);
		res.status(500).json({ error: 'Failed to serve image' });
	}
});

// Public orders list (include items) for demo/dashboard purposes
router.get('/orders', requireAuth, async (req, res) => {
	try {
		const where = {};
		if (req.user.role === 'user') where.UserId = req.user.id;

		const ordersRaw = await Order.findAll({
			where,
			include: [{ model: OrderItem }, { model: User, attributes: ['email'] }],
			order: [['createdAt', 'DESC']],
		});

		const orders = ordersRaw.map(o => ({
			id: o.id,
			status: o.status,
			total: o.total,
			createdAt: o.createdAt,
			OrderItems: o.OrderItems || [],
			email: o.User ? o.User.email : null,
		}));
		res.json(orders);
	} catch (err) {
		console.error('Failed to fetch orders', err);
		res.status(500).json({ error: 'Failed to fetch orders' });
	}
});

// Admin-only stats endpoint (protected with JWT). Returns totals and recent orders.
router.get('/stats', requireAdmin, async (req, res) => {
	try {
		const totalUsers = await User.count();
		const totalOrders = await Order.count();
		const revenue = await Order.sum('total') || 0;

		// fetch products (exclude binary image) and their category
		const productsRaw = await Product.findAll({
			attributes: { exclude: ['image'] },
			include: [{ model: Category, attributes: ['id', 'name'] }],
			order: [['id', 'ASC']],
		});
		const products = productsRaw.map(p => ({
			id: p.id,
			name: p.name,
			description: p.description,
			price: p.price,
			stock: p.stock,
			category: p.Category ? { id: p.Category.id, name: p.Category.name } : null,
		}));

		const categories = await Category.findAll({ attributes: ['id', 'name'] });

		// include the associated User so we can surface the user's email for recent orders
		const recentOrdersRaw = await Order.findAll({
			order: [['createdAt', 'DESC']],
			limit: 10,
			attributes: ['id', 'status', 'total', 'createdAt'],
			include: [{ model: User, attributes: ['email'] }],
		});
		const recentOrders = recentOrdersRaw.map(o => ({
			id: o.id,
			email: o.User ? o.User.email : null,
			status: o.status,
			total: o.total,
			createdAt: o.createdAt,
		}));

		return res.json({ totalUsers, totalOrders, revenue, products, categories, recentOrders });
	} catch (err) {
		console.error('Failed to fetch API stats', err);
		return res.status(500).json({ error: 'Failed to fetch stats' });
	}
});

router.post('/login', login);

// Create an order (authenticated users only). Body: { items: [{ productId, quantity }] }
router.post('/orders', requireAuth, async (req, res) => {
	const t = await sequelize.transaction();
	try {
		const user = req.user; // set by requireAuth
		const items = Array.isArray(req.body.items) ? req.body.items : [];
		if (!items.length) return res.status(400).json({ error: 'Order must include items' });

		const productIds = items.map(i => i.productId);
		const products = await Product.findAll({ where: { id: productIds } });
		const productMap = new Map(products.map(p => [p.id, p]));

		let total = 0;
		for (const it of items) {
			const p = productMap.get(Number(it.productId));
			if (!p) throw new Error(`Product ${it.productId} not found`);
			const qty = Number(it.quantity) || 1;
			total += (Number(p.price) || 0) * qty;
		}

		const order = await Order.create({ total, status: 'pending', UserId: user.id }, { transaction: t });
		for (const it of items) {
			const p = productMap.get(Number(it.productId));
			const qty = Number(it.quantity) || 1;
			await OrderItem.create({ OrderId: order.id, ProductId: p.id, quantity: qty, price: p.price }, { transaction: t });
		}

		await t.commit();
		const orderFull = await Order.findByPk(order.id, { include: [{ model: OrderItem }] });
		return res.status(201).json(orderFull);
	} catch (err) {
		await t.rollback();
		console.error('Create order failed', err);
		return res.status(500).json({ error: err.message || 'Failed to create order' });
	}
});

// Get current user's profile
router.get('/users/me', requireAuth, async (req, res) => {
	try {
		const user = await User.findByPk(req.user.id, { attributes: ['id', 'name', 'email', 'role'] });
		if (!user) return res.status(404).json({ error: 'User not found' });
		res.json(user);
	} catch (err) {
		console.error('Failed to fetch profile', err);
		res.status(500).json({ error: 'Failed to fetch profile' });
	}
});

// Update current user's profile (cannot change role)
router.put('/users/me', requireAuth, async (req, res) => {
	try {
		const user = await User.findByPk(req.user.id);
		if (!user) return res.status(404).json({ error: 'User not found' });

		const { name, email, password } = req.body;
		if (name) user.name = name;
		if (email) user.email = email;
		if (password) {
			const hashed = await bcrypt.hash(password, 10);
			user.password = hashed;
		}
		// Do not allow role changes via this endpoint
		await user.save();
		const out = { id: user.id, name: user.name, email: user.email, role: user.role };
		res.json(out);
	} catch (err) {
		console.error('Failed to update profile', err);
		res.status(500).json({ error: 'Failed to update profile' });
	}
});

// Create product (with optional image upload). Public for demo purposes.
// Create product (admin only)
router.post('/products', requireAdmin, upload.single('image'), async (req, res) => {
	try {
		const { name, description, price, stock, categoryId } = req.body;
		if (!name || !price) return res.status(400).json({ error: 'name and price are required' });

		const productData = { name, description, price: Number(price), stock: Number(stock || 0) };
		if (categoryId) productData.categoryId = Number(categoryId);
		if (req.file) {
			productData.filename = req.file.originalname;
			productData.mimeType = req.file.mimetype;
			productData.size = req.file.size;
			productData.image = req.file.buffer;
		}

		const created = await Product.create(productData);
		// return without the binary image
		const toReturn = await Product.findByPk(created.id, { attributes: { exclude: ['image'] } });
		res.status(201).json(toReturn);
	} catch (err) {
		console.error('Failed to create product', err);
		res.status(500).json({ error: 'Failed to create product' });
	}
});

// Create category (admin only)
router.post('/categories', requireAdmin, async (req, res) => {
	try {
		const { name } = req.body;
		if (!name) return res.status(400).json({ error: 'name is required' });
		const created = await Category.create({ name });
		res.status(201).json(created);
	} catch (err) {
		console.error('Failed to create category', err);
		res.status(500).json({ error: 'Failed to create category' });
	}
});

// Delete an order - admins can delete any order; regular users can delete only their own orders
router.delete('/orders/:id', requireAuth, async (req, res) => {
	const t = await sequelize.transaction();
	try {
		const order = await Order.findByPk(req.params.id, { include: [{ model: OrderItem }] });
		if (!order) return res.status(404).json({ error: 'Order not found' });

		// allow admins, or the owner of the order
		if (req.user.role !== 'admin' && order.UserId !== req.user.id) {
			return res.status(403).json({ error: 'Forbidden' });
		}

		// remove order items first then the order
		await OrderItem.destroy({ where: { OrderId: order.id }, transaction: t });
		await order.destroy({ transaction: t });
		await t.commit();
		return res.json({ ok: true });
	} catch (err) {
		await t.rollback();
		console.error('Failed to delete order', err);
		return res.status(500).json({ error: 'Failed to delete order' });
	}
});

// Delete an order item - admins can delete any; regular users can delete only items belonging to their orders
router.delete('/order-items/:id', requireAuth, async (req, res) => {
	try {
		const item = await OrderItem.findByPk(req.params.id, { include: [{ model: Order }] });
		if (!item) return res.status(404).json({ error: 'Order item not found' });

		const parentOrder = item.Order;
		if (!parentOrder) return res.status(400).json({ error: 'Parent order missing' });

		if (req.user.role !== 'admin' && parentOrder.UserId !== req.user.id) {
			return res.status(403).json({ error: 'Forbidden' });
		}

		await item.destroy();
		return res.json({ ok: true });
	} catch (err) {
		console.error('Failed to delete order item', err);
		return res.status(500).json({ error: 'Failed to delete order item' });
	}
});

module.exports = router;

