import Coupon from "../models/coupon.model.js";
import stripe from "../lib/stripe.js";
import dotenv from "dotenv";
import Order from "../models/order.model.js";


dotenv.config();

export const createCheckoutSession = async (req, res) => {
  try {
    const { products, couponCode } = req.body;

    if (!Array.isArray(products) || products.length === 0) {
      return res
        .status(400)
        .json({ error: "Products array is required and cannot be empty." });
    }

    let totalAmount = 0;

    const lineItems = products.map((product) => {
      const amount = Math.round(product.price*100);
      totalAmount += amount * product.quantity;

      return {
        price_data: {
          currency: "usd",
          product_data: {
            //side bar of checkout page
            name: product.name,
            images: [product.image],
          },
          unit_amount: amount,
        },
        quantity: product.quantity || 1,
      };
    });

    let coupon = null;
    //if user have entered a coupon code
    if (couponCode) {
      coupon = await Coupon.findOne({
        code: couponCode,
        isActive: true,
        userId: req.user._id,
      });
      if (coupon) {
        const discountedAmount = Math.round(
          (totalAmount * coupon.discountPercentage) / 100
        );
        totalAmount -= discountedAmount;
      }
    }

    // Create a Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      //mandatory feilds to create session
      payment_method_types: ["card"],
      line_items: lineItems,
      mode: "payment",
      success_url: `${process.env.CLIENT_URL}/purchase-success?session_id={CHECKOUT_SESSION_ID}`, //frontend can use the variable sessionif to get the value
      cancel_url: `${process.env.CLIENT_URL}/purchase-cancel`,
      //optional feilds -1
      discounts: coupon
        ? [
            {
              coupon: await createStripeCoupon(coupon.discountPercentage),
            },
          ]
        : [],
      //optional feilds -2
        metadata: {
          userId: req.user._id.toString(), // toString() is used to convert ObjectId to string
          couponCode: couponCode || "",
          products: JSON.stringify(
            products.map(
              (p) => ({
                id: p._id,
                quantity: p.quantity,
                price: p.price,
              })
            )
          ), // to store products in the session metadata
        },
      
    });

    // the the purchase is greater than 20000 then create a one time use coupon in the db of that user for next time use
    if (totalAmount > 20000) {
      // Create a new coupon in the database
      const newCoupon = await createNewCoupon(req.user._id);
    }
    //session.id is used to get the session details in the frontend to show the user
    // and totalAmount is used to show the total amount in the frontend
    res.status(200).json({ id: session.id, totalAmount: totalAmount /100});
  } catch (error) {
    console.error("Error creating checkout session:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

// will create onetime use couon
async function createStripeCoupon(discountPercentage) {
  const coupon = await stripe.coupons.create({
    percent_off: discountPercentage,
    duration: "once",
  });
  return coupon.id;
}

//create Coupon on the database
async function createNewCoupon(userId) {
  // but fisrt delete the old coupon of that user if it exists
  await Coupon.findOneAndDelete({ userId: userId});
  const newCoupon = new Coupon({
    code: "GIFT" + Math.random().toString(36).substring(2, 8).toUpperCase(),
    discountPercentage: 10, // Example discount percentage
    isActive: true,
    userId: userId,
    expirationDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
  });

  await newCoupon.save();
  return newCoupon;
}

export const checkoutSuccess = async (req, res) => {
  try {
    const { sessionId } = req.body;

    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (session.payment_status === "paid") {
      if (session.metadata.couponCode) {
        // If a coupon was used, you can mark it as redeemed or inactive
        await Coupon.findOneAndUpdate(
          {
            code: session.metadata.couponCode,
            userId: session.metadata.userId,
          },
          { isActive: false }
        );
      }

      //create new Order
      const products = JSON.parse(session.metadata.products);
      const newOrder = new Order({
        user: session.metadata.userId,
        products: products.map((p) => ({
          product: p.id,
          quantity: p.quantity,
          price: p.price,
        })),
        totalAmount: session.amount_total,
        stripeSessionId: sessionId,
      });
      await newOrder.save();
      res.status(200).json({
        success: true,
        message: "Checkout successful",
        orderId: newOrder._id,
      });
    }
  } catch (error) {
    console.error("Error in checkout success controller:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};
