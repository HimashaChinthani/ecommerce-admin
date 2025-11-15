const express = require('express');
const router = express.Router();
const path = require('path');
const multer = require('multer');
const { login } = require('../controllers/auth.controller');
const { Product, Order, OrderItem } = require('../models');

// multer storage: use memory storage so we can store the file buffer in the DB
const storage = multer.memoryStorage();
const upload = multer({ storage });

// Public product list used by the frontend dashboard
router.get('/products', async (req, res) => {
	try {
		// exclude the binary `image` field from the list to keep payloads small
		const products = await Product.findAll({ attributes: { exclude: ['image'] }, order: [['id', 'ASC']] });
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
router.get('/orders', async (req, res) => {
	try {
		const orders = await Order.findAll({
			include: [{ model: OrderItem }],
			order: [['createdAt', 'DESC']],
		});
		res.json(orders);
	} catch (err) {
		console.error('Failed to fetch orders', err);
		res.status(500).json({ error: 'Failed to fetch orders' });
	}
});

router.post('/login', login);

// Create product (with optional image upload). Public for demo purposes.
router.post('/products', upload.single('image'), async (req, res) => {
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

module.exports = router;
