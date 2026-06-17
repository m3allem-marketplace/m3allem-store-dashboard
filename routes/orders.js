const express = require('express');
const router = express.Router();
const Product = require('../models/Product');
const Pusher = require('pusher');

// Configure Pusher using environment variables
const pusher = new Pusher({
  appId: process.env.PUSHER_APP_ID,
  key: process.env.PUSHER_KEY,
  secret: process.env.PUSHER_SECRET,
  cluster: process.env.PUSHER_CLUSTER,
  useTLS: true
});

/**
 * @swagger
 * /api/orders:
 *   post:
 *     summary: Create a new order and notify the seller
 *     tags: [Orders]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - customerName
 *               - productId
 *             properties:
 *               customerName:
 *                 type: string
 *               productId:
 *                 type: string
 *               quantity:
 *                 type: number
 *     responses:
 *       201:
 *         description: Order created successfully
 *       404:
 *         description: Product not found
 *       500:
 *         description: Server error
 */
router.post('/', async (req, res) => {
  try {
    const { customerName, productId, quantity = 1 } = req.body;

    // Find the product to get the seller (owner) details
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    // In a real application, you might save the order to the database here
    const orderData = {
      customerName,
      productName: product.name,
      productId: product._id,
      quantity,
      price: product.price,
      total: product.price * quantity,
      createdAt: new Date()
    };

    // Trigger a Pusher event on a channel specific to the seller
    // The seller's client side should subscribe to `seller-${product.owner}`
    pusher.trigger(`seller-${product.owner}`, 'new-order', orderData);

    res.status(201).json({ message: 'Order placed and seller notified successfully', order: orderData });
  } catch (err) {
    console.error('Error creating order:', err);
    res.status(500).json({ message: 'Server error while creating order' });
  }
});

module.exports = router;
