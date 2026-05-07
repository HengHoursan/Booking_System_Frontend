<template>
  <div class="booking-list">
    <!-- Page Header -->
    <div class="page-header">
      <h2>{{ $t("bookings.title") }}</h2>
      <div>
        <el-button
          v-permission="'bookings.create'"
          type="primary"
          @click="$router.push({ name: 'CreateBooking' })"
        >
          <el-icon>
            <Plus />
          </el-icon>
          {{ $t("bookings.addBooking") }}
        </el-button>
      </div>
    </div>

    <!-- Filters -->
    <el-card class="filter-card" shadow="never">
      <el-form :inline="true" :model="filters" class="filter-form">
        <el-form-item>
          <el-input
            v-model="filters.search"
            :placeholder="$t('bookings.searchBookings')"
            clearable
            @keyup.enter="loadBookings"
            @clear="loadBookings"
          />
        </el-form-item>
        <!-- Removed old showtime dropdown -->
        <el-form-item>
          <el-date-picker
            v-model="filters.show_date"
            type="date"
            :placeholder="$t('showtimes.showDate')"
            clearable
            style="width: 200px"
            value-format="YYYY-MM-DD"
          />
        </el-form-item>
        <el-form-item>
          <el-select
            v-model="filters.booking_status"
            clearable
            @change="handleFilterChange"
            style="width: 200px"
            :placeholder="$t('bookings.bookingStatus')"
          >
            <el-option
              v-for="status in bookingStatusOptions"
              :key="status.value"
              :label="$t('bookings.' + status.value.toLowerCase())"
              :value="status.value"
            />
          </el-select>
        </el-form-item>
        <!-- <el-form-item>
          <el-select
            v-model="filters.payment_status"
            clearable
            @change="handleFilterChange"
            style="width: 200px"
            :placeholder="$t('bookings.paymentStatus')"
          >
            <el-option
              v-for="status in paymentStatusOptions"
              :key="status.value"
              :label="$t('bookings.' + status.value.toLowerCase())"
              :value="status.value"
            />
          </el-select>
        </el-form-item> -->
        <!-- <el-form-item>
          <el-date-pick
              v-model="filters.dateRange"
              type="daterange"
              range-separator="-"
              :start-placeholder="$t('common.startDate')"
              :end-placeholder="$t('common.endDate')"
              @change="handleFilterChange"
          />
        </el-form-item>
        <el-form-item>
          <el-button @click="resetFilters">{{ $t('common.reset') }}</el-button>
        </el-form-item> -->
      </el-form>
    </el-card>

    <!-- Visual Showtime Picker -->
    <el-card class="showtime-picker-card" shadow="never">
      <div class="picker-header">
        <div class="date-selector">
          <el-radio-group v-model="selectedDateFilter" size="default" @change="onDateFilterChange">
            <el-radio-button label="today">{{ $t('actions.today') || 'Today' }}</el-radio-button>
            <el-radio-button label="tomorrow">{{ $t('actions.tomorrow') || 'Tomorrow' }}</el-radio-button>
          </el-radio-group>
        </div>
        <div class="showtime-label">
          <el-icon><Clock /></el-icon>
          <span>{{ $t('showtimes.title') || 'Showtimes' }}:</span>
        </div>
      </div>

      <!-- Horizontal Scrollable List -->
      <div v-loading="loading.showtimes" class="showtime-list-container">
        <div v-if="showtimeList.length > 0" class="showtime-horizontal-scroll">
          <div
            v-for="showtime in showtimeList"
            :key="showtime.id"
            class="showtime-card"
            :class="{ 'is-active': filters.showtimeId === showtime.id }"
            @click="selectShowtime(showtime.id)"
          >
            <div class="card-time">{{ showtime.start_time }}</div>
            <div class="card-movie" :title="showtime.movie_title">{{ showtime.movie_title }}</div>
            <div class="card-hall">{{ showtime.hall_name }}</div>
          </div>
        </div>
        <div v-else class="no-showtimes">
          <el-icon class="empty-icon"><Calendar /></el-icon>
          <p>{{ $t('dashboard.noShowtimesToday') }}</p>
        </div>
      </div>
    </el-card>

    <!-- Bookings Table -->
    <el-card shadow="never">
      <el-table
        :data="bookings"
        v-loading="loading.bookings"
        style="width: 100%"
        :empty-text="$t('messages.noData')"
      >
        <el-table-column
          prop="reference_code"
          :label="$t('bookings.referenceCode')"
          width="200"
        />
        <el-table-column :label="$t('customers.customer')" width="250">
          <template #default="{ row }">
            <div v-if="row.customer">
              <div>
                <strong>
                  {{
                    row.customer.name ||
                    (row.customer.phone
                      ? "Walk-in Customer"
                      : row.customer.email
                        ? "Guest Customer"
                        : "-")
                  }}
                </strong>
              </div>

              <div
                v-if="row.customer.phone"
                class="text-muted"
                style="display: flex; align-items: center; gap: 4px"
              >
                <el-icon><Phone /></el-icon>
                <span>{{ toLocalPhone(row.customer.phone) }}</span>
              </div>
              <div
                v-if="row.customer.email"
                class="text-muted"
                style="display: flex; align-items: center; gap: 4px"
              >
                <el-icon><ChatLineSquare /></el-icon>
                <span>{{ row.customer.email }}</span>
              </div>
              <el-tag
                :type="getCustomerTypeTag(row.customer.customerType)"
                size="small"
                v-if="row.customer.customerType"
                style="margin-top: 4px"
              >
                {{ $t(`customers.${row.customer.customerType}`) }}
              </el-tag>
            </div>
            <div v-else>
              <span class="text-muted">{{
                $t("bookings.noCustomerData")
              }}</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column :label="$t('showtimes.movie')" width="250">
          <template #default="{ row }">{{ row.movie?.title }}</template>
        </el-table-column>
        <el-table-column :label="$t('showtimes.showtimeDetails')" width="220">
          <template #default="{ row }">
            <div v-if="row.hall">{{ row.hall.hall_name }}</div>
            <small v-if="row.showtime" class="text-muted"
              >{{ formatDate(row.showtime.show_date) }}
              {{ row.showtime.start_time }}</small
            >
          </template>
        </el-table-column>
        <el-table-column
          prop="seat_count"
          :label="$t('bookings.seatCount')"
          width="150"
        />
        <el-table-column
          prop="total_price"
          :label="$t('bookings.totalPrice')"
          width="150"
        >
          <template #default="{ row }">{{
            formatCurrency(row.total_price)
          }}</template>
        </el-table-column>
        <el-table-column :label="$t('bookings.bookingStatus')" width="180">
          <template #default="{ row }">
            <el-tag
              :type="getStatusType(bookingStatusOptions, row.booking_status)"
            >
              {{ $t('bookings.' + row.booking_status.toLowerCase()) }}
            </el-tag>
          </template>
        </el-table-column>
        <!-- <el-table-column :label="$t('bookings.paymentStatus')" width="160">
          <template #default="{ row }">
            <el-tag
              :type="getStatusType(paymentStatusOptions, row.payment_status)"
            >
              {{ row.payment_status ? $t('bookings.' + row.payment_status.toLowerCase()) : '-' }}
            </el-tag>
          </template>
        </el-table-column> -->
        <el-table-column
          :label="$t('common.actions')"
          fixed="right"
          width="100"
        >
          <template #default="{ row }">
            <el-dropdown
              trigger="click"
              @command="(command) => handleCommand(command, row)"
            >
              <el-button size="small" :icon="MoreFilled" circle @click.stop />
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item command="view" class="text-info">
                    <el-icon>
                      <View />
                    </el-icon>
                    {{ $t("actions.view") }}
                  </el-dropdown-item>
                  <!-- <el-dropdown-item
                    command="edit"
                    class="text-primary"
                  >
                    <el-icon>
                      <Edit />
                    </el-icon>
                    {{ $t("actions.edit") }}
                  </el-dropdown-item> -->
                  <el-dropdown-item
                    v-if="hasPermission('bookings.delete') && row.booking_status !== 'Completed'"
                    command="delete"
                    class="text-danger"
                  >
                    <el-icon>
                      <Delete />
                    </el-icon>
                    {{ $t("actions.delete") }}
                  </el-dropdown-item>
                  <el-dropdown-item
                    v-if="
                      hasPermission('payments.create') &&
                      row.payment_status === 'Pending'
                    "
                    command="createPayment"
                    class="text-success"
                  >
                    <el-icon>
                      <Wallet />
                    </el-icon>
                    {{ $t("payments.createPayment") }}
                  </el-dropdown-item>
                  <el-dropdown-item
                    v-if="canEditSeats(row)"
                    command="editSeats"
                    class="text-primary"
                  >
                    <el-icon>
                      <Armchair />
                    </el-icon>
                    {{ $t("seats.editSeats") }}
                  </el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
          </template>
        </el-table-column>
      </el-table>

      <!-- Pagination -->
      <div class="pagination-wrapper" v-if="pagination.total > 0">
        <el-pagination
          v-model:current-page="pagination.current_page"
          v-model:page-size="pagination.per_page"
          :page-sizes="[10, 20, 50, 100]"
          :total="pagination.total"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="handleSizeChange"
          @current-change="handleCurrentChange"
        />
      </div>
    </el-card>

    <!-- Edit Booking Dialog -->
    <el-dialog
      v-model="editDialogVisible"
      :title="$t('bookings.editBooking')"
      width="500px"
    >
      <el-form :model="editForm" label-position="top">
        <el-form-item :label="$t('bookings.bookingStatus')">
          <el-select v-model="editForm.booking_status" style="width: 100%">
            <el-option
              v-for="status in bookingStatusOptions"
              :key="status.value"
              :label="$t('bookings.' + status.value.toLowerCase())"
              :value="status.value"
            />
          </el-select>
        </el-form-item>
        <!-- <el-form-item :label="$t('bookings.paymentStatus')">
          <el-select v-model="editForm.payment_status" style="width: 100%">
            <el-option
              v-for="status in paymentStatusOptions"
              :key="status.value"
              :label="$t('bookings.' + status.value.toLowerCase())"
              :value="status.value"
            />
          </el-select>
        </el-form-item> -->
      </el-form>
      <template #footer>
        <el-button @click="editDialogVisible = false">{{
          $t("actions.cancel")
        }}</el-button>
        <el-button type="primary" @click="handleUpdate" :loading="loading.edit">
          {{ $t("actions.update") }}
        </el-button>
      </template>
    </el-dialog>

    <!-- Create Payment Dialog -->
    <el-dialog
      v-model="paymentDialogVisible"
      :title="$t('payments.createPayment')"
      width="500px"
    >
      <el-form :model="paymentForm" label-position="top">
        <el-form-item :label="$t('payments.amount')">
          <el-input
            :model-value="formatCurrency(paymentForm.amount)"
            readonly
          />
        </el-form-item>
        <el-form-item
          :label="$t('payments.paymentMethod')"
          prop="payment_method"
        >
          <el-select v-model="paymentForm.payment_method" style="width: 100%">
            <el-option
              v-for="method in paymentMethods"
              :key="method.value"
              :label="$t('bookings.' + method.value.toLowerCase())"
              :value="method.value"
            />
          </el-select>
        </el-form-item>
        <!-- <el-form-item
          :label="$t('payments.transactionId')"
          prop="transaction_id"
        >
          <el-input v-model="paymentForm.transaction_id" />
        </el-form-item> -->
        <el-form-item :label="$t('payments.description')" prop="description">
          <el-input type="textarea" v-model="paymentForm.description" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="paymentDialogVisible = false">{{
          $t("actions.cancel")
        }}</el-button>
        <el-button
          type="primary"
          @click="handleCreatePayment"
          :loading="loading.payment"
        >
          {{ $t("actions.submit") }}
        </el-button>
      </template>
    </el-dialog>

    <!-- Bakong Payment Dialog -->
    <el-dialog
      v-model="showBakongDialog"
      :title="$t('payments.bakongPayment')"
      width="400px"
      :show-close="false"
      @closed="onPaymentDialogClose"
    >
      <bakong-qr-payment
        v-if="bakongPaymentData"
        :payment="bakongPaymentData"
        @paid="onPaymentPaid"
        @close="onPaymentDialogClose"
        @regenerate="handleRegenerateQR"
        style="margin: 0 auto"
      />
    </el-dialog>

    <!-- Edit Seats Dialog -->
    <el-dialog
      v-model="editSeatsDialogVisible"
      :title="$t('seats.editSeats')"
      width="680px"
      :close-on-click-modal="false"
      destroy-on-close
    >
      <div v-if="editingBooking" class="edit-seats-container">
        <el-alert
          v-if="editingBooking.currentPricePerSeat"
          :title="$t('bookings.samePriceRestrictionInfo', { price: formatCurrency(editingBooking.currentPricePerSeat) })"
          type="info"
          show-icon
          :closable="false"
          style="margin-bottom: 20px"
        />

        <SelectSeatsStep
          :showtime="editingBooking.showtime"
          v-model="newSelectedSeatIds"
          :exclude-booking-id="editingBooking.id"
          :restrict-to-price="editingBooking.currentPricePerSeat"
          @update:selectedSeatDetails="onSeatsUpdated"
        />

        <div class="edit-seats-summary mt-4">
          <div
            class="flex justify-between items-center p-4 bg-gray-50 rounded-lg dark:bg-gray-800"
          >
            <div>
              <p
                class="text-xs text-gray-500 font-bold uppercase tracking-wider"
              >
                {{ $t("bookings.selectedSeats") }}
              </p>
              <p class="text-lg font-bold text-primary">
                {{ selectedSeatLabels }}
              </p>
            </div>
            <div class="text-right">
              <p
                class="text-xs text-gray-500 font-bold uppercase tracking-wider"
              >
                {{ $t("bookings.totalPrice") }}
              </p>
              <p class="text-2xl font-black text-primary">
                {{ formatCurrency(calculatedTotalPrice) }}
              </p>
            </div>
          </div>
        </div>
      </div>
      <template #footer>
        <div class="dialog-footer">
          <el-button @click="editSeatsDialogVisible = false">{{
            $t("actions.cancel")
          }}</el-button>
          <el-button
            type="primary"
            :loading="loading.updatingSeats"
            :disabled="newSelectedSeatIds.size === 0"
            @click="confirmSeatUpdate"
          >
            {{ $t("actions.save") }}
          </el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { onMounted, reactive, ref, watch, computed } from "vue";
import { useI18n } from "vue-i18n";
import { useRouter } from "vue-router";
import { ElMessage, ElMessageBox } from "element-plus";
import { bookingService } from "@/services/bookingService";
import { showtimeService } from "@/services/showtimeService";
import { paymentService } from "@/services/paymentService";
import { useAppStore } from "@/stores/app";
import { formatDate, formatCurrency, toLocalPhone } from "@/utils/formatters";
import {
  Delete,
  Edit,
  MoreFilled,
  View,
  Wallet,
  Phone,
  ChatLineSquare,
  Plus,
  Calendar,
  Clock
} from "@element-plus/icons-vue";
import { Armchair } from "lucide-vue-next";
import BakongQrPayment from "@/components/payments/BakongQRPayment.vue";
import SelectSeatsStep from "@/components/bookings/SelectSeatsStep.vue";
import dayjs from "dayjs";

import { usePath } from "@/composables/usePath";
import { useAutoRefresh } from "@/composables/useAutoRefresh";
import { usePermissions } from "@/composables/usePermissions";

const { t } = useI18n();
const router = useRouter();
const appStore = useAppStore();
const { getAdminPath } = usePath();
const { hasPermission, canEditBookings } = usePermissions();

// Check if seats can be edited for a booking
const canEditSeats = (booking) => {
  // Must have permission to edit bookings
  if (!hasPermission('bookings.edit')) {
    return false;
  }
  
  // Cannot edit seats for failed bookings
  if (booking.booking_status === 'Failed') {
    return false;
  }
  
  // Can edit seats for Pending and Completed bookings
  return ['Pending', 'Completed'].includes(booking.booking_status);
};

// Debug superadmin permissions
console.log('Debug permissions:', {
  userRole: appStore.user?.role,
  isSuperAdmin: appStore.user?.role === 'superadmin',
  canEditBookings: canEditBookings.value,
  hasPermission: hasPermission('bookings.edit')
});

const loading = reactive({
  bookings: false,
  showtimes: false,
  edit: false,
  payment: false,
  updatingSeats: false,
});
const bookings = ref([]);
const showtimeList = ref([]);
const selectedDateFilter = ref("today");
const selectedDate = ref(dayjs().format("YYYY-MM-DD"));

const filters = reactive({
  search: "",
  booking_status: "",
  payment_status: "",
  showtimeId: "",
  show_date: "",
  dateRange: [],
});

const pagination = reactive({
  current_page: 1,
  per_page: 10,
  total: 0,
});

const editDialogVisible = ref(false);
const editForm = reactive({
  id: null,
  booking_status: "",
  payment_status: "",
});

watch(
  () => editForm.booking_status,
  (newStatus) => {
    if (newStatus === "Failed") {
      editForm.payment_status = "Failed";
    }
  },
);

const paymentDialogVisible = ref(false);
const paymentForm = reactive({
  bookingId: null,
  amount: 0,
  currency: "USD",
  payment_method: "Cash",
  status: "Completed",
  transaction_id: "",
  description: "",
});

const showBakongDialog = ref(false);
const bakongPaymentData = ref(null);

// Edit Seats State
const editSeatsDialogVisible = ref(false);
const editingBooking = ref(null);
const newSelectedSeatIds = ref(new Set());
const selectedSeatDetails = ref([]);

const selectedSeatLabels = computed(() => {
  return (
    selectedSeatDetails.value
      .map((s) => `${s.row}-${s.seat_number}`)
      .join(", ") || t("common.none")
  );
});

const calculatedTotalPrice = computed(() => {
  if (!editingBooking.value) return 0;
  // Use current price per seat if possible
  const seatCount = editingBooking.value.seat_count || 1;
  const currentPricePerSeat = editingBooking.value.total_price / seatCount;
  return newSelectedSeatIds.value.size * currentPricePerSeat;
});

const getCustomerTypeTag = (type) => {
  switch (type) {
    case "member":
      return "success";
    case "walkin":
      return "info";
    case "guest":
      return "warning";
    default:
      return "primary";
  }
};
const bookingStatusOptions = bookingService.BOOKING_STATUSES;
// const paymentStatusOptions = bookingService.PAYMENT_STATUSES;
const paymentMethods = paymentService.PAYMENT_METHODS;

const loadBookings = async () => {
  loading.bookings = true;
  try {
    const params = {
      page: pagination.current_page,
      limit: pagination.per_page,
      search: filters.search,
      booking_status: filters.booking_status,
      payment_status: filters.payment_status,
      showtimeId: filters.showtimeId,
      show_date: filters.show_date || undefined,
      date_from: filters.dateRange?.[0]
        ? new Date(filters.dateRange[0]).toISOString()
        : undefined,
      date_to: filters.dateRange?.[1]
        ? new Date(filters.dateRange[1]).toISOString()
        : undefined,
    };
    const response = await bookingService.getBookings(params);
    if (response.data) {
      bookings.value = response.data;
      // console.log("Loaded bookings:", bookings.value);
      pagination.total = response.total;
      pagination.current_page = response.current_page;
      pagination.per_page = response.per_page;
    } else {
      bookings.value = [];
      pagination.total = 0;
    }
  } catch (error) {
    ElMessage.error(error?.message || t("errors.loadDataFailed"));
    console.error(error);
  } finally {
    loading.bookings = false;
  }
};

const loadShowtimes = async () => {
  loading.showtimes = true;
  try {
    const response = await showtimeService.getShowtimes({
      show_date: selectedDate.value,
      status: "scheduled",
      forBooking: true,
      per_page: 50,
      sort_by: "start_time",
      sort_order: "asc",
    });
    showtimeList.value = response.data || [];
  } catch (error) {
    console.error("Failed to load showtimes:", error);
  } finally {
    loading.showtimes = false;
  }
};

const onDateFilterChange = (val) => {
  if (val === "today") {
    selectedDate.value = dayjs().format("YYYY-MM-DD");
    loadShowtimes();
  } else if (val === "tomorrow") {
    selectedDate.value = dayjs().add(1, "day").format("YYYY-MM-DD");
    loadShowtimes();
  }
};

const selectShowtime = (id) => {
  if (filters.showtimeId === id) {
    filters.showtimeId = ""; // Toggle off if clicked again
  } else {
    filters.showtimeId = id;
  }
  handleFilterChange();
};

const handleFilterChange = () => {
  pagination.current_page = 1;
  loadBookings();
};

const resetFilters = () => {
  Object.assign(filters, {
    search: "",
    booking_status: "",
    payment_status: "",
    showtimeId: "",
    show_date: "",
    dateRange: [],
  });
  handleFilterChange();
};

const handleSizeChange = (size) => {
  pagination.per_page = size;
  pagination.current_page = 1;
  loadBookings();
};

const handleCurrentChange = (page) => {
  pagination.current_page = page;
  loadBookings();
};

const handleRowClick = (row, column, event) => {
  // Prevent row click from triggering when action buttons/dropdown are clicked
  const target = event.target;
  const isButtonClick =
    target.tagName === "BUTTON" ||
    target.closest(".el-button") ||
    target.closest(".el-dropdown");
  if (isButtonClick) {
    return;
  }
  router.push({ name: "BookingDetail", params: { id: row.id } });
};

const handleCommand = (command, row) => {
  switch (command) {
    case "view":
      router.push({ name: "BookingDetail", params: { id: row.id } });
      break;
    case "edit":
      openEditDialog(row);
      break;
    case "delete":
      if (row.booking_status === "Completed") {
        ElMessage.warning(t("bookings.cannotDeleteCompleted"));
        return;
      }
      deleteBooking(row.id);
      break;
    case "createPayment":
      openCreatePaymentDialog(row);
      break;
    case "editSeats":
      handleEditSeats(row);
      break;
    default:
      break;
  }
};

const handleEditSeats = (booking) => {
  // Ensure the showtime object has all the required info for the seat map
  // and normalize IDs (prefer _id if coming from backend aggregation)
  const showtimeInfo = {
    ...(booking.showtime || {}),
    id:
      booking.showtimeId?._id ||
      booking.showtimeId ||
      booking.showtime?._id ||
      booking.showtime?.id,
    hall_id:
      booking.hall_id ||
      (booking.hall ? booking.hall._id || booking.hall.id : null) ||
      booking.showtime?.hall_id ||
      booking.showtime?.hall_id?._id,
  };
  
  // Calculate current price per seat to restrict seat selection
  const currentPricePerSeat = booking.seat_count > 0 
    ? booking.total_price / booking.seat_count 
    : null;
  
  editingBooking.value = { 
    ...booking, 
    showtime: showtimeInfo,
    currentPricePerSeat 
  };

  // Initialize with current seats
  const currentSeatIds = (booking.seats || []).map((s) => {
    if (typeof s === "object") {
      return (s._id || s.id)?.toString();
    }
    return s?.toString();
  });
  newSelectedSeatIds.value = new Set(currentSeatIds.filter((id) => id));
  editSeatsDialogVisible.value = true;
};

const onSeatsUpdated = (details) => {
  selectedSeatDetails.value = details;
};

const confirmSeatUpdate = async () => {
  if (!editingBooking.value) return;

  loading.updatingSeats = true;
  try {
    const seatIds = Array.from(newSelectedSeatIds.value);
    const response = await bookingService.changeSeats(
      editingBooking.value.id,
      {
        seats: seatIds,
        totalPrice: calculatedTotalPrice.value,
      },
    );

    if (response.success) {
      ElMessage.success(t("bookings.updateSuccess"));
      editSeatsDialogVisible.value = false;
      appStore.triggerRefresh(); // Sync change
    } else {
      ElMessage.error(response.message || t("errors.updateFailed"));
    }
  } catch (error) {
    console.error("Update seats error:", error);
    ElMessage.error(error.response?.data?.message || t("errors.updateFailed"));
  } finally {
    loading.updatingSeats = false;
  }
};

const openEditDialog = (booking) => {
  editForm.id = booking.id;
  editForm.booking_status = booking.booking_status;
  // editForm.payment_status = booking.payment_status;
  editDialogVisible.value = true;
};

const handleUpdate = async () => {
  loading.edit = true;
  try {
    const response = await bookingService.updateBooking(editForm.id, {
      booking_status: editForm.booking_status,
      payment_status: editForm.payment_status,
    });
    if (response.success) {
      ElMessage.success(t("bookings.updateSuccess"));
      editDialogVisible.value = false;
      appStore.triggerRefresh();
    } else {
      ElMessage.error(response.message || t("errors.updateFailed"));
    }
  } catch (error) {
    ElMessage.error(error?.message || t("errors.updateFailed"));
    console.error(error);
  } finally {
    loading.edit = false;
  }
};

const deleteBooking = async (id) => {
  try {
    await ElMessageBox.confirm(
      t("bookings.confirmDelete"),
      t("common.warning"),
      {
        confirmButtonText: t("actions.delete"),
        cancelButtonText: t("actions.cancel"),
        type: "warning",
      },
    );
    const response = await bookingService.deleteBooking(id);
    if (response.success) {
      ElMessage.success(t("bookings.deleteSuccess"));
      appStore.triggerRefresh();
    } else {
      ElMessage.error(response.message || t("errors.deleteFailed"));
    }
  } catch (error) {
    if (error !== "cancel") {
      ElMessage.error(error?.message || t("errors.deleteFailed"));
      console.error(error);
    }
  }
};

const openCreatePaymentDialog = (booking) => {
  paymentForm.bookingId = booking.id;
  paymentForm.amount = booking.total_price;
  paymentForm.description = `Payment for booking ${booking.reference_code}`;
  paymentDialogVisible.value = true;
};

const handleCreatePayment = async () => {
  loading.payment = true;
  try {
    const response = await paymentService.createPayment(paymentForm);
    if (response.success) {
      if (paymentForm.payment_method === "Bakong") {
        bakongPaymentData.value = response.data.payment;
        paymentDialogVisible.value = false;
        showBakongDialog.value = true;
      } else {
        ElMessage.success(t("payments.createSuccess"));
        paymentDialogVisible.value = false;
        appStore.triggerRefresh();
      }
    } else {
      ElMessage.error(response.message || t("errors.createFailed"));
    }
  } catch (error) {
    ElMessage.error(error?.message || t("errors.createFailed"));
    console.error(error);
  } finally {
    loading.payment = false;
  }
};

const onPaymentPaid = async () => {
  ElMessage.success(t("payments.paymentSuccess"));
  showBakongDialog.value = false;
  appStore.triggerRefresh();
};

const onPaymentDialogClose = () => {
  showBakongDialog.value = false;
  appStore.triggerRefresh();
};

const handleRegenerateQR = async () => {
  // Similar to create payment but with existing booking
  loading.payment = true;
  try {
    const response = await paymentService.createPayment(paymentForm);
    if (response.success) {
      bakongPaymentData.value = response.data.payment;
    } else {
      ElMessage.error(response.message || t("errors.createFailed"));
    }
  } catch (error) {
    console.error(error);
  } finally {
    loading.payment = false;
  }
};

const getStatusType = (options, status) => {
  const option = options.find((opt) => opt.value === status);
  return option ? option.type : "info";
};

// Auto-refresh the booking list when filters change, the tab is focused, or global CRUD occurs
useAutoRefresh(() => loadBookings(), {
  deps: [filters, () => appStore.dataVersion],
});

watch(
  () => [
    filters.search,
    filters.booking_status,
    filters.payment_status,
    filters.showtimeId,
    filters.show_date,
  ],
  () => {
    pagination.current_page = 1;
  },
  { deep: true },
);
onMounted(() => {
  loadShowtimes();
  appStore.setBreadcrumbs([
    { title: t("nav.dashboard"), path: getAdminPath("/dashboard") },
    { title: t("bookings.title"), path: getAdminPath("/bookings") },
  ]);
});
</script>

<!-- Global styles for dropdown items -->
<style>
.el-dropdown-menu__item.text-info,
.el-dropdown-menu__item.text-info .el-icon {
  color: var(--el-color-info);
}

.el-dropdown-menu__item.text-info:hover,
.el-dropdown-menu__item.text-info:hover .el-icon {
  color: var(--el-color-info) !important; /* Keep color on hover */
  background-color: var(
    --el-color-info-light-9
  ); /* Element Plus default hover background */
}

.el-dropdown-menu__item.text-primary,
.el-dropdown-menu__item.text-primary .el-icon {
  color: var(--el-color-primary);
}

.el-dropdown-menu__item.text-danger,
.el-dropdown-menu__item.text-danger .el-icon {
  color: var(--el-color-danger);
}

.el-dropdown-menu__item.text-danger:hover,
.el-dropdown-menu__item.text-danger:hover .el-icon {
  color: var(--el-color-danger) !important; /* Keep color on hover */
  background-color: var(--el-color-danger-light-9);
}

.el-dropdown-menu__item.text-success,
.el-dropdown-menu__item.text-success .el-icon {
  color: var(--el-color-success);
}

.el-dropdown-menu__item.text-success:hover,
.el-dropdown-menu__item.text-success:hover .el-icon {
  color: var(--el-color-success) !important; /* Keep color on hover */
  background-color: var(--el-color-success-light-9);
}
</style>

<style scoped>
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.filter-card {
  margin-bottom: 20px;
}

.filter-form {
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
  align-items: center;
}

.pagination-wrapper {
  margin-top: 20px;
  display: flex;
  justify-content: center;
}

.text-muted {
  color: #909399;
}

/* Showtime Picker Styling */
.showtime-picker-card {
  margin-bottom: 12px;
  border-radius: 12px;
}

.picker-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.showtime-label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
  font-weight: 600;
  color: var(--el-text-color-secondary);
}

.showtime-label .el-icon {
  font-size: 16px;
  color: var(--el-color-primary);
}

.showtime-list-container {
  min-height: 60px;
}

.showtime-horizontal-scroll {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  padding: 2px 2px 8px 2px;
  scrollbar-width: thin;
}

.showtime-horizontal-scroll::-webkit-scrollbar {
  height: 6px;
}

.showtime-horizontal-scroll::-webkit-scrollbar-thumb {
  background: var(--el-border-color-lighter);
  border-radius: 3px;
}

.showtime-card {
  flex: 0 0 130px;
  padding: 10px 12px;
  background: var(--el-fill-color-lighter);
  border: 2px solid transparent;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.2s;
  text-align: center;
}

.showtime-card:hover {
  background: var(--el-fill-color);
  transform: translateY(-1px);
}

.showtime-card.is-active {
  background: var(--el-color-primary-light-9);
  border-color: var(--el-color-primary);
  box-shadow: 0 2px 8px rgba(64, 158, 255, 0.12);
}

.card-time {
  font-size: 16px;
  font-weight: 800;
  color: var(--el-color-primary);
  margin-bottom: 2px;
}

.card-movie {
  font-size: 12px;
  font-weight: 600;
  color: var(--el-text-color-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-bottom: 1px;
}

.card-hall {
  font-size: 11px;
  color: var(--el-text-color-secondary);
}

.no-showtimes {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 20px;
  color: var(--el-text-color-secondary);
}

.empty-icon {
  font-size: 24px;
  margin-bottom: 4px;
  opacity: 0.5;
}
</style>
