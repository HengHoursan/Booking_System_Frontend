import api from "@/utils/api";

export const bookingService = {
  /**
   * Get a paginated list of bookings with filters.
   * @param {object} params - Filtering and pagination parameters.
   * @returns {Promise<object>}
   */
  async getBookings(params = {}) {
    const backendParams = {
      page: params.page || 1,
      limit: params.limit || 10,
      search: params.search,
      booking_status: params.booking_status,
      payment_status: params.payment_status,
      showtimeId: params.showtimeId || params.showtime_id,
      show_date: params.show_date,
      dateFrom: params.date_from,
      dateTo: params.date_to,
      sortBy: params.sortBy || "booking_date",
      sortOrder: params.sortOrder || "desc",
    };

    Object.keys(backendParams).forEach(
      (k) =>
        (backendParams[k] === undefined || backendParams[k] === "") &&
        delete backendParams[k],
    );

    const response = await api.get("/bookings", { params: backendParams });

    if (response.data?.success && response.data?.data) {
      const { bookings, pagination } = response.data.data;
      return {
        data: bookings.map((b) => ({
          id: b._id,
          customer: b.customer,
          showtime: b.showtime,
          movie: b.movie,
          hall: b.hall,
          seats: b.seats,
          reference_code: b.reference_code,
          total_price: b.total_price,
          booking_status: b.booking_status,
          payment_status: b.payment_status,
          payment_id: b.payment_id,
          booking_date: b.booking_date,
          expired_at: b.expired_at,
          noted: b.noted,
          seat_count: b.seat_count,
          created_at: b.createdAt,
          updated_at: b.updatedAt,
        })),
        total: pagination.totalCount,
        current_page: pagination.currentPage,
        per_page: pagination.limit,
        total_pages: pagination.totalPages,
      };
    }
    return response.data;
  },

  /**
   * Get a single booking by its ID.
   * @param {string} id - The booking ID.
   * @returns {Promise<object>}
   */
  async getBookingById(id) {
    const response = await api.get(`/bookings/${id}`);
    if (response.data?.success && response.data?.data?.booking) {
      const booking = response.data.data.booking;
      return {
        success: true,
        data: {
          id: booking._id,
          customer: {
            id: booking.customerId?._id,
            name: booking.customerId?.name,
            email: booking.customerId?.email,
            phone: booking.customerId?.phone,
            customerType: booking.customerId?.customerType,
          },
          showtime: {
            // Flatten showtime details
            id: booking.showtimeId?._id,
            show_date: booking.showtimeId?.show_date,
            start_time: booking.showtimeId?.start_time,
            end_time: booking.showtimeId?.end_time,
            movie_id: booking.showtimeId?.movie_id?._id,
            movie_title: booking.showtimeId?.movie_id?.title,
            hall_id: booking.showtimeId?.hall_id?._id,
            hall_name: booking.showtimeId?.hall_id?.hall_name,
            price: booking.showtimeId?.price, // Assuming showtime has price
          },
          movie: {
            id: booking.showtimeId?.movie_id?._id,
            title: booking.showtimeId?.movie_id?.title,
            poster_url: booking.showtimeId?.movie_id?.poster_url,
          },
          hall: {
            id: booking.showtimeId?.hall_id?._id,
            hall_name: booking.showtimeId?.hall_id?.hall_name,
          },
          seats: booking.seats || [], // Ensure seats is an array
          reference_code: booking.reference_code,
          total_price: booking.total_price,
          booking_status: booking.booking_status,
          payment_status: booking.payment_status,
          payment_method: booking.payment_method, // Added payment_method
          payment_id: booking.payment_id,
          booking_date: booking.booking_date,
          expired_at: booking.expired_at,
          noted: booking.noted,
          seat_count: booking.seat_count,
          created_at: booking.createdAt,
          updated_at: booking.updatedAt,
        },
      };
    }
    // Return original response if not successful or data is missing
    return response.data;
  },

  /**
   * Create a new booking.
   * @param {object} bookingData - The data for the new booking.
   * @returns {Promise<object>}
   */
  async createBooking(bookingData, config = {}) {
    const response = await api.post("/bookings", bookingData, config);
    return response.data;
  },

  /**
   * Update an existing booking's statuses.
   * @param {string} id - The booking ID.
   * @param {object} updateData - The data to update (e.g., booking_status, payment_status).
   * @returns {Promise<object>}
   */
  async updateBooking(id, updateData) {
    const response = await api.put(`/bookings/${id}`, updateData);
    return response.data;
  },

  /**
   * Expire a booking (soft delete).
   * @param {string} id - The booking ID.
   * @returns {Promise<object>}
   */
  async expireBooking(id, config = {}) {
    const response = await api.patch(`/bookings/${id}/expire`, {}, config);
    return response.data;
  },

  /**
   * Delete a booking (admin soft delete).
   * @param {string} id - The booking ID.
   * @returns {Promise<object>}
   */
  async deleteBooking(id) {
    const response = await api.delete(`/bookings/${id}/soft-delete`);
    return response.data;
  },

  async changeSeats(id, data) {
    const response = await api.patch(`/bookings/${id}/change-seat`, data);
    return response.data;
  },

  // Constants for statuses
  BOOKING_STATUSES: [
    { value: "Completed", label: "Completed", type: "success" },
    { value: "Pending", label: "Pending", type: "info" },
    { value: "Failed", label: "Failed", type: "danger" },
    // { value: "Expired", label: "Failed", type: "danger" },
  ],

  PAYMENT_STATUSES: [
    { value: "Pending", label: "Pending", type: "warning" }, // Changed color to type
    { value: "Completed", label: "Completed", type: "success" }, // Changed color to type
    { value: "Failed", label: "Failed", type: "danger" }, // Changed color to type
    { value: "Refunded", label: "Refunded", type: "info" }, // Changed color to type
  ],
  PAYMENT_METHODS: [
    { value: "Bakong", label: "Bakong", type: "primary" },
    { value: "Cash", label: "Cash", type: "success" },
    { value: "PayAtCinema", label: "Pay At Cinema", type: "info" },
    { value: "Card", label: "Card", type: "warning" },
  ],
};
