import Coupon from "../models/coupon.model.js";

// ✅ Controller to fetch the active coupon for the logged-in user
export const getCoupon = async (req, res) => {
  try {
    // 🔍 Look for a coupon that belongs to the current user and is still active
    const coupon = await Coupon.findOne({
      userId: req.user._id,
      isActive: true,
    });
        // 📦 Send the coupon if found, else send null (no active coupon)
    res.json(coupon || null);
  } catch (error) {
    console.error("Error fetching coupon:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// ✅ Controller to validate a coupon code for the logged-in user
export const validateCoupon = async (req, res) => {
  try {
    // 📨 Extract the coupon code from request body
    const { code } = req.body;
    // 🔍 Find a matching active coupon for the current user
    const coupon = await Coupon.findOne({
      code: code,
      isActive: true,
      userId: req.user._id,
    });

    if (!coupon) {
      return res.status(404).json({ message: "Coupon not found or inactive" });
    }
    // Check if the coupon has expired
    if (coupon.expirationDate < new Date()) {
      coupon.isActive = false;
      await coupon.save();
      return res.status(400).json({ message: "Coupon has expired" });
    }

        // ✅ Coupon is valid – respond with details
    res.json({
      message: "Coupon is valid",
      code: coupon.code,
      discountPercentage: coupon.discountPercentage,
    });
  } catch (error) {
    console.error("Error validating coupon Controller :", error);
    res.status(500).json({ message: "Internal server error" });
  }
};
