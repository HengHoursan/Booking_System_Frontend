import { defineStore } from "pinia";
import { ref, computed } from "vue";
import api from "@/utils/api";

export const useAuthStore = defineStore("auth", () => {
  const getUserFromStorage = () => {
    try {
      const stored = localStorage.getItem("cinema_user");
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  };

  const user = ref(getUserFromStorage());
  const token = ref(
    localStorage.getItem(
      import.meta.env.VITE_AUTH_TOKEN_KEY || "cinema_auth_token",
    ) || null,
  );
  const refreshToken = ref(
    localStorage.getItem(
      import.meta.env.VITE_AUTH_REFRESH_TOKEN_KEY || "cinema_refresh_token",
    ) || null,
  );
  const isLoading = ref(false);
  const isInitialized = ref(false);

  const isAuthenticated = computed(() => !!token.value);
  const userRole = computed(() => user.value?.role || "user");
  const isAdmin = computed(() =>
    ["admin", "superadmin", "cashier"].includes(userRole.value),
  );
  const isSuperAdmin = computed(() => userRole.value === "superadmin");
  const isRegularAdmin = computed(() => userRole.value === "admin");
  const isCashier = computed(() => userRole.value === "cashier");
  const userPermissions = computed(() => user.value?.permissions || []);

  const setToken = (newToken) => {
    token.value = newToken;
    const tokenKey = import.meta.env.VITE_AUTH_TOKEN_KEY || "cinema_auth_token";
    if (newToken) localStorage.setItem(tokenKey, newToken);
    else localStorage.removeItem(tokenKey);
  };

  const setRefreshToken = (newRefreshToken) => {
    refreshToken.value = newRefreshToken;
    const refreshTokenKey =
      import.meta.env.VITE_AUTH_REFRESH_TOKEN_KEY || "cinema_refresh_token";
    if (newRefreshToken) localStorage.setItem(refreshTokenKey, newRefreshToken);
    else localStorage.removeItem(refreshTokenKey);
  };

  const setUser = (userData) => {
    user.value = userData;
    if (userData) localStorage.setItem("cinema_user", JSON.stringify(userData));
    else localStorage.removeItem("cinema_user");
  };

  const login = async (credentials) => {
    isLoading.value = true;
    try {
      const response = await api.post("/auth/admin-login", {
        username: credentials.username,
        password: credentials.password,
        remember: credentials.remember,
      });

      const responseData = response.data;

      if (responseData.success && responseData.data) {
        const data = responseData.data;
        setToken(data.accessToken);
        if (data.refreshToken) setRefreshToken(data.refreshToken);
        setUser(data.user);
        return responseData;
      }

      const accessToken = responseData.access_token || responseData.token;
      const refToken = responseData.refresh_token;
      const userData = responseData.user || responseData.data;

      setToken(accessToken);
      if (refToken) setRefreshToken(refToken);
      setUser(userData);

      return responseData;
    } catch (error) {
      throw error;
    } finally {
      isLoading.value = false;
    }
  };

  const telegramLogin = async (telegramData) => {
    isLoading.value = true;
    try {
      const response = await api.post(
        "/customer/auth/telegram-login",
        telegramData,
      );
      const responseData = response.data;

      if (responseData.success && responseData.data) {
        const data = responseData.data;
        setToken(data.accessToken);
        if (data.refreshToken) setRefreshToken(data.refreshToken);
        setUser(data.customer);
        if (data.sessionId)
          localStorage.setItem("cinema_session_id", data.sessionId);
        return responseData;
      }
      return responseData;
    } catch (error) {
      throw error;
    } finally {
      isLoading.value = false;
    }
  };

  const telegramWebAppLogin = async (initData, phone) => {
    isLoading.value = true;
    try {
      const response = await api.post("/customer/auth/telegram-webapp-login", {
        initData,
        phone,
      });
      const responseData = response.data;

      if (responseData.success && responseData.data) {
        const data = responseData.data;
        setToken(data.accessToken);
        if (data.refreshToken) setRefreshToken(data.refreshToken);
        setUser(data.customer);
        if (data.sessionId)
          localStorage.setItem("cinema_session_id", data.sessionId);
        return responseData;
      }
      return responseData;
    } catch (error) {
      throw error;
    } finally {
      isLoading.value = false;
    }
  };

  const logout = async () => {
    const wasAuthenticated = !!token.value;
    const currentUser = user.value;

    if (wasAuthenticated && import.meta.env.VITE_API_BASE_URL) {
      // Determine if logging out of customer or admin BEFORE clearing user
      const isCustomer =
        currentUser &&
        ("customerType" in currentUser || !("role" in currentUser));
      const logoutEndpoint = isCustomer
        ? "/customer/auth/logout"
        : "/auth/logout";

      // Send logout request while token is still present in the store/config
      // We await it to ensure the interceptor can grab the token before we clear it below
      try {
        await api.post(logoutEndpoint);
      } catch (err) {
        console.warn("Logout API call failed:", err);
      }
    }

    // Now clear the local state
    setToken(null);
    setRefreshToken(null);
    setUser(null);
    localStorage.removeItem("cinema_session_id");
    isInitialized.value = false;
  };

  const fetchUserProfile = async () => {
    if (!token.value) return;
    try {
      // Determine if the user is a customer or an admin staff
      const isCustomer =
        user.value && ("customerType" in user.value || !("role" in user.value));
      const endpoint = isCustomer ? "/customer/auth/profile" : "/auth/profile";
      const response = await api.get(endpoint);

      let userData;
      if (response.data?.success && response.data?.data) {
        // Higher priority for explicitly nested user/customer
        userData =
          response.data.data.user ||
          response.data.data.customer ||
          response.data.data;
      } else {
        userData =
          response.data.user || response.data.customer || response.data;
      }

      if (userData) {
        setUser(userData);
        return userData;
      }

      // Fallback for customer structure
      if (response.data?.data?.customer) {
        userData = response.data.data.customer;
        setUser(userData);
        return userData;
      }

      throw new Error("No user data in response");
    } catch (error) {
      throw error;
    }
  };

  const updateProfile = async (profileData) => {
    try {
      const isCustomer =
        user.value && ("customerType" in user.value || !("role" in user.value));
      const endpoint = isCustomer ? "/customer/auth/profile" : "/auth/profile";
      const response = await api.put(endpoint, profileData, { skipGlobalError: true });
      const userData =
        response.data.user ||
        response.data.customer ||
        response.data.data ||
        response.data;

      // Handle nested structures
      const finalUser = userData.customer || userData.user || userData;
      setUser(finalUser);
      return finalUser;
    } catch (error) {
      throw error;
    }
  };

  const changePassword = async (passwordData) => {
    try {
      await api.put("/auth/change-password", {
        current_password: passwordData.currentPassword,
        new_password: passwordData.newPassword,
        new_password_confirmation: passwordData.confirmPassword,
      });
    } catch (error) {
      throw error;
    }
  };

  const initializeAuth = async () => {
    try {
      if (token.value && user.value) {
        try {
          await fetchUserProfile();
        } catch {
          setToken(null);
          setRefreshToken(null);
          setUser(null);
        }
      } else if (token.value && !user.value) {
        try {
          await fetchUserProfile();
        } catch {
          setToken(null);
          setRefreshToken(null);
          setUser(null);
        }
      }
    } finally {
      isInitialized.value = true;
    }
  };

  return {
    user,
    token,
    refreshToken,
    isLoading,
    isInitialized,
    isAuthenticated,
    userRole,
    isAdmin,
    isSuperAdmin,
    isRegularAdmin,
    isCashier,
    userPermissions,
    login,
    telegramLogin,
    telegramWebAppLogin,
    logout,
    fetchUserProfile,
    updateProfile,
    changePassword,
    initializeAuth,
    setToken,
    setRefreshToken,
    setUser,
  };
});
