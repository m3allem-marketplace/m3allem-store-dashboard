const mongoose = require('mongoose');
require('dotenv').config();

const Category = require('./models/Category');
const Product = require('./models/Product');
const User = require('./models/User');
const data = require('./data.json');

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');
  } catch (err) {
    console.error('Error connecting to MongoDB:', err.message);
    process.exit(1);
  }
};

const seedData = async () => {
  await connectDB();

  try {
    // Find an admin user to own these items, or create a dummy one
    let owner = await User.findOne();
    if (!owner) {
      console.log('No user found to own the items. Please create a user first.');
      process.exit(1);
    }

    console.log('Starting seed process...');

    for (const catData of data) {
      // Upsert Category
      let category = await Category.findOne({ categoryId: catData.category_id });
      if (!category) {
        category = new Category({
          name: catData.category_name_ar,
          name_ar: catData.category_name_ar,
          categoryId: catData.category_id,
          owner: owner._id
        });
        await category.save();
        console.log(`Created category: ${category.name_ar}`);
      } else {
        category.name = catData.category_name_ar;
        category.name_ar = catData.category_name_ar;
        await category.save();
        console.log(`Updated category: ${category.name_ar}`);
      }

      // Process Shops and Products
      for (const shopData of catData.shops) {
        const shopInfo = {
          shop_id: shopData.shop_id,
          name_ar: shopData.name_ar,
          rating: shopData.rating,
          address: shopData.address,
          delivery_time: shopData.delivery_time
        };

        for (const prodData of shopData.products) {
          // Upsert Product
          let product = await Product.findOne({ product_id: prodData.product_id });
          if (!product) {
            product = new Product({
              product_id: prodData.product_id,
              name: prodData.name_ar,
              name_ar: prodData.name_ar,
              sub_category: prodData.sub_category,
              brand: prodData.brand,
              price: prodData.price,
              currency: prodData.currency,
              unit: prodData.unit,
              specifications: prodData.specifications,
              shop: shopInfo,
              category: category._id,
              owner: owner._id
            });
            await product.save();
            console.log(`Created product: ${product.name_ar}`);
          } else {
            product.name = prodData.name_ar;
            product.name_ar = prodData.name_ar;
            product.sub_category = prodData.sub_category;
            product.brand = prodData.brand;
            product.price = prodData.price;
            product.currency = prodData.currency;
            product.unit = prodData.unit;
            product.specifications = prodData.specifications;
            product.shop = shopInfo;
            product.category = category._id;
            await product.save();
            console.log(`Updated product: ${product.name_ar}`);
          }
        }
      }
    }

    console.log('Seed process completed successfully.');
    process.exit(0);
  } catch (err) {
    console.error('Error during seeding:', err);
    process.exit(1);
  }
};

seedData();
