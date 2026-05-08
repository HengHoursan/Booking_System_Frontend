import axios from "axios";
import { useAuthStore } from "@/stores/auth";
import { ElMessage, ElNotification } from "element-plus";
import router from "@/router";
import i18n from "@/i18n";

// Create axios instance
const api = axios.create({
  baseURL:
    import.meta.env.VITE_API_BASE_URL
      ? `${import.meta.env.VITE_API_BASE_URL}${import.meta.env.VITE_API_VERSION ? "/" + import.meta.env.VITE_API_VERSION : ""}`
      : "https://janette-semiexposed-carline.ngrok-free.dev/api/v1",
  timeout: parseInt(import.meta.env.VITE_API_TIMEOUT) || 10000,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
    "ngrok-skip-browser-warning": "true",
  },
});

// Prevent multiple simultaneous 401 handlers from running
let isHandling401 = false;

// Request interceptor with debugging
api.interceptors.request.use(
  (config) => {
    const authStore = useAuthStore();

    // Add auth token to headers
    if (authStore.token) {
      config.headers.Authorization = `Bearer ${authStore.token}`;
    }

    // Add request timestamp for debugging
    config.metadata = { startTime: Date.now() };

    return config;
  },
  (error) => {
    console.error("Request interceptor error:", error);
    return Promise.reject(error);
  },
);

// Response interceptor
api.interceptors.response.use(
  (response) => {
    // Log response time in development
    if (import.meta.env.VITE_APP_ENV === "development") {
      const duration = Date.now() - response.config.metadata.startTime;
      // console.log(`API: ${response.config.method?.toUpperCase()} ${response.config.url} - ${duration}ms`, response.status)
    }

    return response;
  },
  async (error) => {
    // Don't show error messages for login/logout attempts (let components handle it)
    const isLoginAttempt =
      error.config?.url?.includes("/auth/login") ||
      error.config?.url?.includes("/auth/admin-login") ||
      error.config?.url?.includes("/customer/auth/telegram-login") ||
      error.config?.url?.includes("/customer/auth/telegram-webapp-login");
    const isLogoutAttempt =
      error.config?.url?.includes("/auth/logout") ||
      error.config?.url?.includes("/customer/auth/logout");
    const isAuthAttempt = isLoginAttempt || isLogoutAttempt;

    if (error.response) {
      const { status, data } = error.response;
      const { url, method } = error.config;
      
       // We suppress the global error message for this specific case to avoid user confusion.
      if (
        status === 400 &&
        method === "post" &&
        url &&
        url.includes("/payments/check-payment")
      ) {
        return Promise.reject(error);
      }

      // Log API errors in development
      if (import.meta.env.VITE_APP_ENV === "development") {
        console.error(
          `API Error: ${error.config?.method?.toUpperCase()} ${error.config?.url}`,
          {
            status,
            data,
            message: error.message,
          },
        );
      }

      // Only show automatic error messages for non-auth requests and if not explicitly skipped
      if (!isAuthAttempt && !error.config?.skipGlobalError) {
        switch (status) {
          case 401: {
            // Unauthorized - token expired or invalid (but not for login)
            const authStore = useAuthStore();

            // Avoid repeated logout/redirect when multiple requests fail with 401
            if (!isHandling401 && authStore.isAuthenticated) {
              isHandling401 = true;
              try {
                await authStore.logout();

                // Check for deactivation message from backend
                const isDeactivated = data?.message
                  ?.toLowerCase()
                  .includes("deactivated");
                const errorMsg = isDeactivated
                  ? i18n.global.t("messages.accountDeactivated")
                  : i18n.global.t("messages.sessionExpired");

                ElMessage.error(errorMsg);

                const ADMIN_SUBDOMAIN = "admin";
                const IS_ADMIN_APP = window.location.hostname.startsWith(
                  `${ADMIN_SUBDOMAIN}.`,
                );

                // Redirection targets
                if (IS_ADMIN_APP) {
                  const hostname = window.location.hostname;
                  const mainDomain = hostname.replace(
                    `${ADMIN_SUBDOMAIN}.`,
                    "",
                  );
                  const protocol = window.location.protocol;
                  const port = window.location.port
                    ? `:${window.location.port}`
                    : "";
                  window.location.href = `${protocol}//${mainDomain}${port}`;
                } else {
                  if (router.currentRoute.value.name !== "Login Page") {
                    router.push({ name: "Login Page" });
                  }
                }
              } finally {
                isHandling401 = false;
              }
            }
            break;
          }

          case 403:
            ElMessage.error(i18n.global.t("messages.accessDenied"));
            break;

          case 404:
            ElMessage.error(i18n.global.t("messages.resourceNotFound"));
            break;

          case 422:
            // Validation errors - show all errors
            if (data.errors) {
              const errorMessages = Object.values(data.errors).flat();
              errorMessages.forEach((message) => {
                ElMessage.error(message);
              });
            } else {
              ElMessage.error(
                data.message || i18n.global.t("messages.validationFailed"),
              );
            }
            break;

          case 429:
            ElMessage.warning(i18n.global.t("messages.tooManyRequests"));
            break;

          case 500:
            ElMessage.error(i18n.global.t("messages.serverError"));
            break;

          default:
            ElMessage.error(
              data.message || i18n.global.t("messages.httpError", { status }),
            );
        }
      }
    } else if (error.request) {
      // Network error - only show for non-auth requests
      if (!isAuthAttempt) {
        ElMessage.error(i18n.global.t("messages.networkError"));
      }
    } else {
      // Other errors
      if (!isAuthAttempt) {
        ElMessage.error(i18n.global.t("messages.error"));
      }
    }

    return Promise.reject(error);
  },
);

export default api;
