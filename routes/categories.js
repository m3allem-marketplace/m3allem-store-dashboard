const express = require('express');
const router = express.Router();
const Category = require('../models/Category');
const auth = require('../middleware/auth');
const { upload } = require('../config/cloudinary');

/**
 * @swagger
 * /api/categories:
 *   post:
 *     summary: Create a new category with an image
 *     tags: [Categories]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - image
 *             properties:
 *               name:
 *                 type: string
 *               image:
 *                 type: string
 *                 format: binary
 *     responses:
 *       201:
 *         description: Category created successfully
 *       500:
 *         description: Server error
 */
router.post('/', auth, upload.single('image'), async (req, res) => {
  try {
    const { name } = req.body;
    
    if (!req.file) {
      return res.status(400).json({ message: 'Image is required' });
    }

    const category = new Category({
      name,
      image: req.file.path, // Cloudinary URL
      owner: req.user.id
    });

    await category.save();
    res.status(201).json({ message: 'Category created successfully', category });
  } catch (err) {
    console.error('Error creating category:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @swagger
 * /api/categories:
 *   get:
 *     summary: Get all categories for the authenticated seller
 *     tags: [Categories]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of categories
 *       500:
 *         description: Server error
 */
router.get('/', auth, async (req, res) => {
  try {
    const categories = await Category.find({ owner: req.user.id }).sort({ createdAt: -1 });
    res.json(categories);
  } catch (err) {
    console.error('Error fetching categories:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @swagger
 * /api/categories/{id}:
 *   put:
 *     summary: Update a category
 *     tags: [Categories]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               image:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Category updated successfully
 *       404:
 *         description: Category not found
 *       500:
 *         description: Server error
 */
router.put('/:id', auth, upload.single('image'), async (req, res) => {
  try {
    const { name } = req.body;
    
    const category = await Category.findOne({ _id: req.params.id, owner: req.user.id });
    if (!category) {
      return res.status(404).json({ message: 'Category not found or unauthorized' });
    }

    if (name) category.name = name;
    if (req.file) {
      category.image = req.file.path; // Update image if provided
    }

    await category.save();
    res.json({ message: 'Category updated successfully', category });
  } catch (err) {
    console.error('Error updating category:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @swagger
 * /api/categories/{id}:
 *   delete:
 *     summary: Delete a category
 *     tags: [Categories]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Category deleted successfully
 *       404:
 *         description: Category not found
 *       500:
 *         description: Server error
 */
router.delete('/:id', auth, async (req, res) => {
  try {
    const category = await Category.findOneAndDelete({ _id: req.params.id, owner: req.user.id });
    if (!category) {
      return res.status(404).json({ message: 'Category not found or unauthorized' });
    }
    res.json({ message: 'Category deleted successfully' });
  } catch (err) {
    console.error('Error deleting category:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
