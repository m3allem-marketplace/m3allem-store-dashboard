const express = require('express');
const Product = require('../models/Product');
const auth = require('../middleware/auth');

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Products
 *   description: Product management operations
 */

/**
 * @swagger
 * /api/products:
 *   post:
 *     summary: Create a new product
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               price:
 *                 type: number
 *     responses:
 *       201:
 *         description: Product created successfully
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 */
// Create a product
router.post('/', auth, async (req, res) => {
  try {
    const { name, description, price, category } = req.body;
    
    if (!name || !price) {
      return res.status(400).json({ message: 'Name and price are required.' });
    }

    const newProduct = new Product({
      name,
      description,
      price,
      owner: req.user
    });

    if (category) {
      newProduct.category = category;
    }

    const savedProduct = await newProduct.save();
    res.status(201).json(savedProduct);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * @swagger
 * /api/products:
 *   get:
 *     summary: Get all products for the logged-in user
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *         description: Filter products by category ID
 *     responses:
 *       200:
 *         description: List of products
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *       401:
 *         description: Unauthorized
 */
// Get all products for logged-in user (optionally filtered by category)
router.get('/', auth, async (req, res) => {
  try {
    const query = { owner: req.user };
    if (req.query.category) {
      query.category = req.query.category;
    }
    const products = await Product.find(query).populate('category', 'name image');
    res.json(products);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * @swagger
 * /api/products/{id}:
 *   put:
 *     summary: Update a product
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The product ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               price:
 *                 type: number
 *     responses:
 *       200:
 *         description: Product updated successfully
 *       404:
 *         description: Product not found or unauthorized
 */
// Update a product
router.put('/:id', auth, async (req, res) => {
  try {
    const product = await Product.findOne({ _id: req.params.id, owner: req.user });
    if (!product) {
      return res.status(404).json({ message: 'Product not found or unauthorized.' });
    }

    const { name, description, price, category: categoryId } = req.body;
    
    if (name) product.name = name;
    if (description) product.description = description;
    if (price) product.price = price;
    if (categoryId) product.category = categoryId;

    const updatedProduct = await product.save();
    res.json(updatedProduct);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * @swagger
 * /api/products/{id}:
 *   delete:
 *     summary: Delete a product
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The product ID
 *     responses:
 *       200:
 *         description: Product deleted successfully
 *       404:
 *         description: Product not found or unauthorized
 */
// Delete a product
router.delete('/:id', auth, async (req, res) => {
  try {
    const product = await Product.findOneAndDelete({ _id: req.params.id, owner: req.user });
    if (!product) {
      return res.status(404).json({ message: 'Product not found or unauthorized.' });
    }
    res.json({ message: 'Product deleted successfully.', product });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
