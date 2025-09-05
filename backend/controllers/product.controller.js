import { redis } from "../lib/redis.js";
import Product from "../models/product.model.js";
import cloudinary from "../lib/cloudinary.js";

// ✅ Get all products (Admin only)
export const getAllProducts = async (req, res) => {
  try {
    // 📦 Fetch all products from the database
    const products = await Product.find({});

    // 📤 Send response
    res.status(200).json({ products });
  } catch (error) {
    console.log("Error in getAllProducts controller:", error.message);
    // ⚠️ Handle server error
    res.status(500).json({ message: "Server error" });
  }
};


export const getFeaturedProducts = async (req, res) => {
  try {
    // 🧠 Try fetching from Redis cache
    let featuredProducts = await redis.get("featuredProducts");
    if (featuredProducts) {
      return res.status(200).json(JSON.parse(featuredProducts));
    }

    // 🐢 If not cached, fetch from DB (returns plain JS objects)
    featuredProducts = await Product.find({ isFeatured: true }).lean();

    // 🚫 If still not found
    if (!featuredProducts) {
      return res.status(404).json({ message: "No featured products found" });
    }

    // 🚀 Store fetched data in Redis for future fast access
    await redis.set("featuredProducts", JSON.stringify(featuredProducts));

    // 📤 Send response
    res.status(200).json(featuredProducts);
  } catch (error) {
    console.log("Error in getFeaturedProducts controller:", error.message);
    res.status(500).json({ message: "Server error" });
  }
};


export const createProduct = async (req, res) => {
  try {
    // 🎯 Input from request body
    const { name, description, price, image, category } = req.body;

    let cloudinaryResponse = null;

    // ☁️ Upload image to Cloudinary if provided
    if (image) {
      cloudinaryResponse = await cloudinary.uploader.upload(image, {
        folder: "products",
      });
    }

    //create product in database
    const product = await Product.create({
      name,
      description,
      price,
      image: cloudinaryResponse?.secure_url
        ? cloudinaryResponse.secure_url
        : "",
      category,
    });

    // ✅ Success response
    res.status(201).json({ message: "Product created successfully", product });
  } catch (error) {
    console.log("Error in createProduct controller:", error.message);
    res.status(500).json({ message: "Server error" });
  }
};

export const deleteProduct = async (req, res) => {
  try {
    // 🔍 Find the product by ID
    const product = await Product.findById(req.params.id);

    // 🚫 If product not found, return 404
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    // 🧹 If product has an image, delete it from Cloudinary
    if (product.image) {
      const publicId = product.image.split("/").pop().split(".")[0]; // extract public ID from image URL

      try {
        await cloudinary.uploader.destroy(`products/${publicId}`);
        console.log("Image deleted from Cloudinary successfully");
      } catch (error) {
        console.log("Error deleting image from Cloudinary:", error.message);

        // ⚠️ Return error if Cloudinary deletion fails
        return res
          .status(500)
          .json({ message: "Error deleting image from Cloudinary" });
      }
    }

    // 🗑️ Delete product from database
    await Product.findByIdAndDelete(req.params.id);

    // ✅ Success response
    res.status(200).json({ message: "Product deleted successfully" });
  } catch (error) {
    console.log("Error in deleteProduct controller:", error.message);
    res.status(500).json({ message: "Server error" });
  }
};


export const getRecommendedProducts = async (req, res) => {
  try {
    // 🎯 Use MongoDB Aggregation Pipeline to get random products
    const products = await Product.aggregate([
      {
        $sample: { size: 4 }, // 🎲 Randomly select 3 products from the collection
      },
      {
        $project: {
          _id: 1,           // Include product ID
          name: 1,          // Include product name
          description: 1,   // Include product description
          price: 1,         // Include product price
          image: 1,         // Include product image
        },
      },
    ]);

    // ✅ Send the selected random products as response
    res.json(products);
  } catch (error) {
    // ❌ Handle and log any errors
    console.log("Error in getRecommendedProducts controller:", error.message);
    res.status(500).json({ message: "Server error" });
  }
};

// 🧩 Get all products based on a given category from route parameters
export const getProductsByCategory = async (req, res) => {
  const { category } = req.params;
  try {
    // 🔍 Find all products matching the given category
    const products = await Product.find({ category });
    
    // ✅ Return the products object so we can use res.data.products
    res.json({products});
  } catch (error) {
    // ❌ Handle errors
    console.log("Error in getProductsByCategory controller:", error.message);
    res.status(500).json({ message: "Server error" });
  }
};


// 🔁 Toggle the isFeatured status of a product by ID
export const toggleFeaturedProduct = async (req, res) => {
  try {
    // 🔍 Find the product by ID
    const product = await Product.findById(req.params.id);

    if (product) {
      // 🔃 Toggle the isFeatured boolean
      product.isFeatured = !product.isFeatured;

      // 💾 Save the updated product
      const updatedProduct = await product.save();

      // 🔄 Update the Redis cache for featured products
      await updateFeaturedProductsCache();

      // ✅ Return updated product
      res.json(updatedProduct);
    } else {
      res.status(404).json({ message: "Product not found" });
    }
  } catch (error) {
    console.log("Error in toggleFeaturedProduct controller:", error.message);
    res.status(500).json({ message: "Server error" });
  }
};


// ♻️ Helper function to update Redis cache with latest featured products
async function updateFeaturedProductsCache() {
  try {
    // 🗃️ Get all products from DB marked as featured
    const featuredProducts = await Product.find({ isFeatured: true }).lean();

    // 💾 Update Redis with new list of featured products
    await redis.set("featuredProducts", JSON.stringify(featuredProducts));
  } catch (error) {
    console.log("Error updating featured products cache:", error.message);
  }
}

