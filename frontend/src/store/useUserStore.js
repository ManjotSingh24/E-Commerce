import { create } from "zustand";
import axios from "../lib/axios";
import { toast } from "react-hot-toast";

export const useUserStore = create((set,get) => ({
  //my states
  user: null, // intiallyy this user is null but get filled later when signup or login using set
  checkingAuth: true, // whenver we refresh it will chechk ki loggedin hain to ->homepage else login page

  // my functions
  signup: async ({ name, email, password, confirmPassword }) => {
    set({ loading: true });

    if (password !== confirmPassword) {
      set({ loading: false });
      return toast.error("Password do not match");
    }

    try {
      const res = await axios.post("/auth/signup", { name, email, password }); // axios will post to "http://localhost:5000/api"+"/auth/signup"
      set({ user: res.data, loading: false });
    } catch (error) {
      set({ loading: false });
      toast.error(error.response.data.message || "An error occured");
    }
  },

  login: async (email, password) => {
    set({ loading: true });
    try {
      const res = await axios.post("/auth/login", { email, password }); // axios will post to "http://localhost:5000/api"+"/auth/login"
      //console.log("user is here",res.data);
      set({ user: res.data.user, loading: false });
    } catch (error) {
      set({ loading: false });
      toast.error(error.response.data.message || "An error occured");
    }
  },

  checkAuth: async () => {
    set({ checkingAuth: true });
    try {
      const response = await axios.get("/auth/profile");
      set({ user: response.data, checkingAuth: false });
    } catch (error) {
      console.log(error.message);
      set({ checkingAuth: false, user: null }); //now we are not loading
      //toast.error(error.response?.data.message )
      
    }
  },

  logout: async () => {
    try {
      await axios.post("/auth/logout");
      set({ user: null });
    } catch (error) {
      toast.error(
        error.response?.data.message || "An error occured during logout"
      );
    }
  },

  refreshToken: async () => {
		// Prevent multiple simultaneous refresh attempts
		if (get().checkingAuth) return;

		set({ checkingAuth: true });
		try {
			const response = await axios.post("/auth/refresh-token");
			set({ checkingAuth: false });
			return response.data;
		} catch (error) {
			set({ user: null, checkingAuth: false });
			throw error;
		}
	},

}));

// Axios interceptor for token refresh
let refreshPromise = null;

axios.interceptors.response.use(
  // this function will run when we get response from backend
	(response) => response,
  // this function will run when we get error from backend
	async (error) => {
		const originalRequest = error.config;
		if (error.response?.status === 401 && !originalRequest._retry) {
			originalRequest._retry = true;

			try {
				// If a refresh is already in progress, wait for it to complete
				if (refreshPromise) {
					await refreshPromise;
					return axios(originalRequest);
				}

				// Start a new refresh process
				refreshPromise = useUserStore.getState().refreshToken();
				await refreshPromise;
				refreshPromise = null;

				return axios(originalRequest);
			} catch (refreshError) {
				// If refresh fails, redirect to login or handle as needed
				useUserStore.getState().logout();
				return Promise.reject(refreshError);
			}
		}
		return Promise.reject(error);
	}
);

