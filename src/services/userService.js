import api from "@/utils/api";

// Only admin, cashier, and superadmin roles are allowed in the system
const ALLOWED_ROLES = ["admin", "cashier", "superadmin"];
const sanitizeRole = (role, fallback = "cashier") => {
  if (!role) return fallback;
  const r = String(role).toLowerCase();
  return ALLOWED_ROLES.includes(r) ? r : fallback;
};

export const userService = {
  // Get all users with pagination and filters
  async getUsers(params = {}) {
    // Convert frontend params to backend format
    const backendParams = {
      page: params.page || 1,
      limit: params.per_page || 10,
      search: params.search,
      status:
        params.status === "active"
          ? true
          : params.status === "inactive"
            ? false
            : undefined,
      role: params.role,
      sortBy: params.sort_by || "createdAt",
      sortOrder: params.sort_order || "desc",
    };

    // Remove undefined values
    Object.keys(backendParams).forEach((key) => {
      if (backendParams[key] === undefined) {
        delete backendParams[key];
      }
    });

    const response = await api.get("/users", { params: backendParams });

    // Backend returns: { success: true, data: { users, pagination } }
    if (response.data?.success && response.data?.data) {
      const { users, pagination } = response.data.data;
      return {
        data: users.map((user) => ({
          id: user._id,
          name: user.name,
          username: user.username,
          phone: user.phone,
          email: user.email || user.phone, // Use phone as email if no email
          role: user.role,
          status: user.isActive ? "active" : "inactive",
          isVerified: user.isVerified,
          created_at: user.createdAt,
          updated_at: user.updatedAt,
          lastLogin: user.lastLogin,
        })),
        total: pagination.totalCount,
        current_page: pagination.currentPage,
        per_page: pagination.limit,
        total_pages: pagination.totalPages,
        has_next_page: pagination.hasNextPage,
        has_prev_page: pagination.hasPrevPage,
      };
    }

    return response.data;
  },

  // Get single user by ID
  async getUser(id) {
    const response = await api.get(`/users/${id}`);

    if (response.data?.success && response.data?.data?.user) {
      const user = response.data.data.user;
      return {
        id: user._id,
        name: user.name,
        username: user.username,
        phone: user.phone,
        email: user.email || user.phone,
        role: user.role,
        status: user.isActive ? "active" : "inactive",
        isVerified: user.isVerified,
        created_at: user.createdAt,
        updated_at: user.updatedAt,
        lastLogin: user.lastLogin,
        provider: user.provider,
      };
    }

    return response.data;
  },

  // Create new user
  async createUser(userData) {
    // Convert frontend format to backend format
    const backendData = {
      name: userData.name,
      username: userData.username,
      email: userData.email,
      phone: userData.phone,
      role: sanitizeRole(userData.role, "cashier"),
      password: userData.password,
      isVerified: userData.isVerified ?? true,
      isActive: userData.isActive ?? true,
    };

    const response = await api.post("/users", backendData);
    return response.data;
  },

  // Update user
  async updateUser(id, userData) {
    // Convert frontend format to backend format
    const backendData = {
      name: userData.name,
      phone: userData.phone,
      role: userData.role ? sanitizeRole(userData.role) : undefined,
      isVerified: userData.isVerified,
    };

    // Only include isActive if status is explicitly provided
    if (userData.status !== undefined) {
      backendData.isActive = userData.status === "active";
    }

    // Only include password if provided
    if (userData.password) {
      backendData.password = userData.password;
    }

    // Remove undefined values
    Object.keys(backendData).forEach((key) => {
      if (backendData[key] === undefined) {
        delete backendData[key];
      }
    });

    const response = await api.put(`/users/${id}`, backendData);
    return response.data;
  },

  // Delete user (soft delete)
  async deleteUser(id) {
    const response = await api.delete(`/users/${id}`);
    return response.data;
  },

  // Update user status
  async updateUserStatus(id, isActive) {
    const response = await api.put(`/users/${id}`, { isActive });
    return response.data;
  },



  // Get activity logs for the current admin
  async getActivityLogs(params = {}) {
    const response = await api.get("/auth/activity-logs", { params });
    return response.data;
  },

  // Password Reset Functions

  // Reset user password (admin function)
  async resetUserPassword(id, passwordData) {
    const response = await api.put(`/users/${id}/reset-password`, passwordData);
    return response.data;
  },

  // Update user phone number (admin function)
  async updateUserPhone(id, phoneData) {
    const response = await api.put(`/users/${id}/phone`, phoneData);
    return response.data;
  },

  // Request password reset (public - for users)
  async requestPasswordReset(phoneData) {
    const response = await api.post("/auth/request-password-reset", phoneData);
    return response.data;
  },

  // Verify OTP and reset password (public - for users)
  async verifyPasswordReset(resetData) {
    const response = await api.post("/auth/verify-password-reset", resetData);
    return response.data;
  },

  // Change password (authenticated user)
  async changePassword(passwordData) {
    const response = await api.post("/auth/change-password", passwordData);
    return response.data;
  },
};
