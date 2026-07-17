const express = require('express');
const Product = require('../models/Product');
const auth = require('../middleware/auth');
const { upload } = require('../config/cloudinary');

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
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               name_ar:
 *                 type: string
 *               description:
 *                 type: string
 *               price:
 *                 type: number
 *               image:
 *                 type: string
 *                 format: binary
 *     responses:
 *       201:
 *         description: Product created successfully
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 */
// Create a product
router.post('/', auth, upload.single('image'), async (req, res) => {
  try {
    const { name, name_ar, description, price, product_id, sub_category, brand, currency, unit, specifications } = req.body;
    let image = req.body.image;
    if (req.file) {
      image = req.file.path;
    }
    
    if ((!name && !name_ar) || !price) {
      return res.status(400).json({ message: 'Name (or name_ar) and price are required.' });
    }

    // Fetch user to get shop info and category
    const user = await require('../models/User').findById(req.user);
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    // Find the actual Category document using the user's categoryId string
    const categoryDoc = await require('../models/Category').findOne({ categoryId: user.categoryId });
    const categoryObjectId = categoryDoc ? categoryDoc._id : null;

    const newProduct = new Product({
      name,
      name_ar,
      description,
      price,
      image,
      product_id,
      sub_category,
      brand,
      currency,
      unit,
      specifications,
      shop: {
        shop_id: user._id.toString(),
        name_ar: user.shopName,
        address: user.location
      },
      category: categoryObjectId,
      owner: req.user
    });

    const savedProduct = await newProduct.save();
    res.status(201).json(savedProduct);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * @swagger
 * /api/products/store:
 *   get:
 *     summary: Get all products grouped by category for the public store
 *     tags: [Products]
 *     responses:
 *       200:
 *         description: Organized catalog of categories and products
 */
// Public store endpoint to get all products grouped by category
router.get('/store', async (req, res) => {
  try {
    const categories = await require('../models/Category').find().lean();
    const products = await Product.find().lean();

    const catalog = categories.map(cat => {
      const catProducts = products.filter(p => p.category && p.category.toString() === cat._id.toString());
      return {
        ...cat,
        products: catProducts
      };
    });

    res.json(catalog);
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
// Get all products (for the logged in user: their own + global products in their category)
router.get('/', auth, async (req, res) => {
  try {
    // Fetch user to get their categoryId
    const user = await require('../models/User').findById(req.user);
    const categoryDoc = user ? await require('../models/Category').findOne({ categoryId: user.categoryId }) : null;
    const categoryObjectId = categoryDoc ? categoryDoc._id : null;

    const query = {
      $or: [
        { owner: req.user }
      ]
    };
    
    // If we found their category object ID, allow them to also see global products in that category
    if (categoryObjectId) {
      query.$or.push({ isGlobal: true, category: categoryObjectId });
    }

    // Optional category filter if the frontend still passes it explicitly
    if (req.query.category) {
      // If frontend explicitly asks for a category, we still enforce the OR condition but we can just use the provided one
      // Actually, since they just want their own or global, we don't strictly need to override if they are already in a category
      // We will just leave it as is since dashboard typically fetches without category query, relying on backend default.
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
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               product_id:
 *                 type: string
 *               name:
 *                 type: string
 *               name_ar:
 *                 type: string
 *               description:
 *                 type: string
 *               price:
 *                 type: number
 *               sub_category:
 *                 type: string
 *               brand:
 *                 type: string
 *               currency:
 *                 type: string
 *               unit:
 *                 type: string
 *               specifications:
 *                 type: object
 *               shop:
 *                 type: object
 *               category:
 *                 type: string
 *               image:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Product updated successfully
 *       404:
 *         description: Product not found or unauthorized
 */
// Update a product
router.put('/:id', auth, upload.single('image'), async (req, res) => {
  try {
    const product = await Product.findOne({
      _id: req.params.id,
      $or: [{ owner: req.user }, { isGlobal: true }]
    });
    if (!product) {
      return res.status(404).json({ message: 'Product not found or unauthorized.' });
    }

    const { name, name_ar, description, price, category: categoryId, product_id, sub_category, brand, currency, unit, specifications, shop } = req.body;
    let image = req.body.image;
    if (req.file) {
      image = req.file.path;
    }
    
    if (name) product.name = name;
    if (name_ar) product.name_ar = name_ar;
    if (description) product.description = description;
    if (price) product.price = price;
    if (image) product.image = image;
    if (categoryId) product.category = categoryId;
    if (product_id) product.product_id = product_id;
    if (sub_category) product.sub_category = sub_category;
    if (brand) product.brand = brand;
    if (currency) product.currency = currency;
    if (unit) product.unit = unit;
    if (specifications) product.specifications = specifications;
    if (shop) product.shop = shop;

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
