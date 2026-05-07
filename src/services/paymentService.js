import api from "@/utils/api";

export const paymentService = {
  // Get all payments with pagination and filters
  async getPayments(params = {}) {
    const backendParams = {
      page: params.page || 1,
      limit: params.limit || 10,
      search: params.search,
      bookingId: params.booking_id,
      status: params.status,
      payment_method: params.payment_method,
      currency: params.currency,
      dateFrom: params.date_from,
      dateTo: params.date_to,
      amountFrom: params.amount_from,
      amountTo: params.amount_to,
      includeDeleted: params.include_deleted || false,
      sortBy: params.sort_by || "payment_date",
      sortOrder: params.sort_order || "desc",
    };

    Object.keys(backendParams).forEach((key) => {
      if (backendParams[key] === undefined) {
        delete backendParams[key];
      }
    });

    const response = await api.get("/payments", { params: backendParams });

    if (response.data?.success && response.data?.data) {
      const { payments, pagination } = response.data.data;
      return {
        data: payments.map((payment) => ({
          id: payment._id,
          booking: payment.bookingId || {},
          amount: payment.amount,
          payment_method: payment.payment_method,
          fromAccount_id: payment.fromAccount_id,
          toAccount_id: payment.toAccount_id,
          currency: payment.currency,
          status: payment.status,
          paid: payment.paid,
          description: payment.description,
          payment_date: payment.payment_date,
          created_at: payment.createdAt,
          updated_at: payment.updatedAt,
          deleted_at: payment.deletedAt,
          is_deleted: !!payment.deletedAt,
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

  // Get single payment by ID
  async getPayment(id) {
    const response = await api.get(`/payments/${id}`);
    if (response.data?.success && response.data?.data?.payment) {
      const payment = response.data.data.payment;
      return {
        id: payment._id,
        booking: payment.bookingId || {},
        amount: payment.amount,
        payment_method: payment.payment_method,
        currency: payment.currency,
        status: payment.status,
        description: payment.description,
        payment_date: payment.payment_date,
        created_at: payment.createdAt,
        updated_at: payment.updatedAt,
      };
    }
    return response.data;
  },

  // Get all payments for a specific booking
  async getPaymentsByBookingId(bookingId) {
    const response = await api.get(`/payments/booking/${bookingId}`);
    if (response.data?.success && response.data?.data?.payments) {
      return response.data.data.payments.map((payment) => ({
        id: payment._id,
        booking: payment.bookingId || {},
        amount: payment.amount,
        payment_method: payment.payment_method,
        currency: payment.currency,
        status: payment.status,
        description: payment.description,
        payment_date: payment.payment_date,
      }));
    }
    return [];
  },

  // Check payment status by md5
  async checkPaymentStatus(md5) {
    const response = await api.post("/payments/check-payment", { md5 });
    return response.data;
  },

  // Create new payment
  async createPayment(paymentData, config = {}) {
    const backendData = {
      bookingId: paymentData.bookingId,
      amount: paymentData.amount,
      payment_method: paymentData.payment_method,
      currency: paymentData.currency,
      status: paymentData.status,
      description: paymentData.description,
    };
    const response = await api.post("/payments", backendData, config);
    return response.data;
  },

  // Update payment
  async updatePayment(id, paymentData) {
    const backendData = {
      bookingId: paymentData.bookingId,
      amount: paymentData.amount,
      payment_method: paymentData.payment_method,
      currency: paymentData.currency,
      status: paymentData.status,
      description: paymentData.description,
    };
    Object.keys(backendData).forEach((key) => {
      if (backendData[key] === undefined) {
        delete backendData[key];
      }
    });
    const response = await api.put(`/payments/${id}`, backendData);
    return response.data;
  },

  // Update payment status
  async updatePaymentStatus(id, status) {
    const response = await api.put(`/payments/${id}/status`, { status });
    return response.data;
  },

  // Delete payment (soft delete)
  async deletePayment(id) {
    const response = await api.delete(`/payments/${id}`);
    return response.data;
  },

  // Force delete payment (permanent)
  async forceDeletePayment(id) {
    const response = await api.delete(`/payments/${id}/force-delete`);
    return response.data;
  },

  // Restore deleted payment
  async restorePayment(id) {
    const response = await api.put(`/payments/${id}/restore`);
    return response.data;
  },

  // Get deleted payments
  async getDeletedPayments(params = {}) {
    const backendParams = {
      page: params.page || 1,
      limit: params.limit || 10,
      sortBy: params.sort_by || "deletedAt",
      sortOrder: params.sort_order || "desc",
    };

    const response = await api.get("/payments/deleted", {
      params: backendParams,
    });

    if (response.data?.success && response.data?.data) {
      const { payments, pagination } = response.data.data;
      return {
        data: payments.map((payment) => ({
          id: payment._id,
          booking: payment.bookingId || {},
          amount: payment.amount,
          payment_method: payment.payment_method,
          currency: payment.currency,
          status: payment.status,
          deleted_at: payment.deletedAt,
        })),
        total: pagination.totalCount,
        current_page: pagination.currentPage,
        per_page: pagination.limit,
        total_pages: pagination.totalPages,
      };
    }
    return response.data;
  },

  // Get payment analytics
  async getAnalytics() {
    const response = await api.get("/payments/analytics");
    return response.data;
  },

  // Constants
  PAYMENT_METHODS: [
    { value: "Bakong", label: "Bakong", type: "success" },
    { value: "Cash", label: "Cash", type: "primary" },
  ],

  PAYMENT_STATUSES: [
    { value: "Pending", label: "Pending", type: "warning" },
    { value: "Completed", label: "Completed", type: "success" },
    { value: "Failed", label: "Failed", type: "danger" },
    // { value: "Refunded", label: "Refunded", type: "info" },
    { value: "Expired", label: "Expired", type: "danger" },
  ],

  CURRENCIES: [
    { value: "USD", label: "USD" },
    { value: "KHR", label: "KHR" },
  ],

  SORT_OPTIONS: [
    { value: "amount", label: "Amount" },
    { value: "payment_method", label: "Payment Method" },
    { value: "payment_date", label: "Payment Date" },
    { value: "status", label: "Status" },
    { value: "createdAt", label: "Created Date" },
  ],
};
