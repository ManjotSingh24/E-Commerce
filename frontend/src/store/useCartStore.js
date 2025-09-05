import { create } from "zustand";
import axios from "../lib/axios";
import { toast } from "react-hot-toast";

export const useCartStore = create((set, get) => ({
  // my variables/states

  cart: [],
  coupon: null,
  total: 0,
  subtotal: 0,
  isCouponApplied : false,

  //my functions/actions

  getMyCoupon: async () => {
		try {
			const response = await axios.get("/coupons");
			set({ coupon: response.data });
		} catch (error) {
			console.error("Error fetching coupon:", error);
		}
	},


  applyCoupon: async (code) => {
		try {
			const response = await axios.post("/coupons/validate", { code });
			set({ coupon: response.data, isCouponApplied: true });
			get().calculateTotals();
			toast.success("Coupon applied successfully");
		} catch (error) {
			toast.error(error.response?.data?.message || "Failed to apply coupon");
		}
	},

  // will only hcnage the ui
	removeCoupon: () => {
		set({ coupon: null, isCouponApplied: false });
		get().calculateTotals();
		toast.success("Coupon removed");
	},

  getCartItems: async () => {
    try {
      const res = await axios.get("/cart");
      set({ cart: res.data });
      get().calculateTotals();
    } catch (error) {
      set({ cart: [] });
      toast.error(error.response.data.message || error.message);
    }
  },

  addToCart: async (product) => {
    try {
      await axios.post("/cart", { productId: product._id });
      toast.success("Product added to cart");
      // logic if new item added cart show +1 items but same item added again cart will not  update on navbar
      set((prevState) => {
        const existingItem = prevState.cart.find(
          (item) => item._id === product._id
        );
        const newCart = existingItem
          ? prevState.cart.map((item) =>
              item._id === product._id
                ? { ...item, quantity: item.quantity + 1 }
                : item
            )
          : [...prevState.cart, { ...product, quantity: 1 }];
        return { cart: newCart };
      });
      get().calculateTotals();
    } catch (error) {
      toast.error(error.response.data.message || "An error occurred");
    }
  },

  calculateTotals: async () => {
    const { cart, coupon } = get();
    const subtotal = cart.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    );
    let total = subtotal;

    if (coupon) {
      const discount = subtotal * (coupon.discountPercentage / 100);
      total = subtotal - discount;
    }
    set({ subtotal, total });
  },

  clearCart : async () =>{
    set({cart:[],coupon:null,total:0,subtotal:0,isCouponApplied:false});
  },

   updateQuantity: async (productId, quantity) => {
    try{
        if (quantity === 0) {
            get().removeFromCart(productId);
            return;
        }
        await axios.put(`/cart/${productId}`, { quantity });
        set((prevState) => ({
            cart: prevState.cart.map((item) => (item._id === productId ? { ...item, quantity } : item)),
        }));
        get().calculateTotals();
      }catch(error){
        toast.error(error?.response?.data?.message || error.message);
      }
    },


  removeFromCart: async (productId) => {
    try {
      await axios.delete(`/cart`, { data: { productId } });
      toast.success("Product removed from cart");
      set((state) => ({
        cart: state.cart.filter((item) => item._id !== productId),
      }));
      get().calculateTotals();
    } catch (error) {
      toast.error(error?.response?.data?.message || error.message);
    }
  },


}));
