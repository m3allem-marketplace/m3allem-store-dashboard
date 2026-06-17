const express = require('express');
const router = express.Router();
const Product = require('../models/Product');
const Order = require('../models/Order');
const auth = require('../middleware/auth');
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

    const totalPrice = product.price * quantity;

    // Create the order in the database (default status is 'pending')
    const order = new Order({
      customerName,
      product: product._id,
      owner: product.owner,
      quantity,
      totalPrice
    });

    await order.save();

    const orderData = {
      orderId: order._id,
      customerName,
      productName: product.name,
      productId: product._id,
      quantity,
      price: product.price,
      totalPrice,
      status: order.status,
      createdAt: order.createdAt
    };

    // Trigger a Pusher event on a channel specific to the seller
    pusher.trigger(`seller-${product.owner}`, 'new-order', orderData);

    res.status(201).json({ message: 'Order placed and seller notified successfully', order: orderData });
  } catch (err) {
    console.error('Error creating order:', err);
    res.status(500).json({ message: 'Server error while creating order' });
  }
});

/**
 * @swagger
 * /api/orders:
 *   get:
 *     summary: Get all orders for the authenticated seller
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of orders
 *       500:
 *         description: Server error
 */
router.get('/', auth, async (req, res) => {
  try {
    const orders = await Order.find({ owner: req.user.id }).populate('product', 'name price').sort({ createdAt: -1 });
    res.json(orders);
  } catch (err) {
    console.error('Error fetching orders:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @swagger
 * /api/orders/{id}/status:
 *   put:
 *     summary: Update the status of an order
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The order id
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [pending, accepted, rejected]
 *     responses:
 *       200:
 *         description: Order status updated
 *       404:
 *         description: Order not found
 *       500:
 *         description: Server error
 */
router.put('/:id/status', auth, async (req, res) => {
  try {
    const { status } = req.body;
    
    if (!['pending', 'accepted', 'rejected'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    const order = await Order.findOne({ _id: req.params.id, owner: req.user.id });
    
    if (!order) {
      return res.status(404).json({ message: 'Order not found or unauthorized' });
    }

    order.status = status;
    await order.save();

    res.json({ message: 'Order status updated successfully', order });
  } catch (err) {
    console.error('Error updating order status:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
