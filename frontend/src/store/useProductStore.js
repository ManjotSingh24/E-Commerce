import { create } from "zustand";
import axios from "../lib/axios";
import { toast } from "react-hot-toast";

export const useProductStore = create((set) => ({
  products: [],
  loading: false,

  setProducts: (products) => set({ products }),

  createProduct: async (productData) => {
    set({ loading: true });
    try {
      const res = await axios.post("/products", productData);
      set((prevState) => ({
        products: [...prevState.products, res.data],
        loading: false,
      }));
      toast.success("Product created successfully");
    } catch (error) {
      set({ loading: false });
      toast.error(
        error.response?.data.message ||
          "An error occurred while creating the product"
      );
    }
  },

  deleteProduct: async (productId) => {
    set({ loading: true });
    try {
      await axios.delete(`/products/${productId}`);
      set((prevProducts) => ({
        products: prevProducts.products.filter((x) => x._id != productId),
        loading: false,
      }));
      toast.success("Product deleted successfully");
    } catch (error) {
      set({ loading: false });
      toast.error(
        error.response?.data.message ||
          "An error occurred while deleting the product"
      );
    }
  },

  fetchAllProducts: async () => {
    set({ loading: true });
    try {
      const res = await axios.get("/products");
      set({ products: res.data.products, loading: false });
    } catch (error) {
      set({ loading: false });
      toast.error(error.response?.data.message || "");
    }
  },

  toggleFeaturedProduct: async (productId) => {
    set({ loading: true });
    try {
      const res = await axios.patch(`/products/${productId}`);

      set((prevState) => ({
        products: prevState.products.map((product) =>
          product._id === productId ? res.data : product
        ),

        loading: false,
      }));
      toast.success("Product updated successfully");
    } catch (error) {
      set({ loading: false });
      toast.error(
        error.response?.data.message ||
          "An error occurred while updating the product"
      );
    }
  },

  fetchProductsByCategory: async (category) => {
    set({ loading: true });
    try {
      const res = await axios.get(`/products/category/${category}`);
      set({ products: res.data.products, loading: false });
    } catch (error) {
      set({ loading: false });
      toast.error(error.response.data.message || "Failed to fetch products");
    }
  },

  fetchFeaturedProducts: async () => {
		set({ loading: true });
		try {
			const response = await axios.get("/products/featured");
			set({ products: response.data, loading: false });
		} catch (error) {
			set({ error: "Failed to fetch products", loading: false });
			console.log("Error fetching featured products:", error);
		}
	},

}));
