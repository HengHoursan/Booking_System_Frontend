<template>
  <div class="booking-detail">
    <div class="page-header">
      <h2>{{ $t("bookings.bookingDetails") }}</h2>
      <el-button @click="$router.back()" :icon="ArrowLeft">{{
        $t("actions.back")
      }}</el-button>
    </div>

    <el-card
      v-if="loading"
      v-loading="loading"
      :element-loading-text="$t('common.loading')"
      style="min-height: 200px"
    ></el-card>

    <el-row :gutter="20" v-else-if="booking">
      <el-col :span="16">
        <!-- Main Details -->
        <el-card class="details-card">
          <template #header>
            <div class="card-header">
              <span>{{ $t("bookings.bookingSummary") }}</span>
            </div>
          </template>
          <el-descriptions :column="2" border>
            <el-descriptions-item :label="$t('bookings.referenceCode')"
              >{{ booking.reference_code }}
            </el-descriptions-item>
            <el-descriptions-item :label="$t('bookings.bookingDate')"
              >{{ formatDateTime(booking.booking_date) }}
            </el-descriptions-item>

            <el-descriptions-item :label="$t('bookings.bookingStatus')">
              <el-tag
                :type="
                  getStatusType(bookingStatusOptions, booking.booking_status)
                "
              >
                {{ $t('bookings.' + booking.booking_status.toLowerCase()) }}
              </el-tag>
            </el-descriptions-item>
            <el-descriptions-item :label="$t('bookings.paymentStatus')">
              <el-tag
                :type="
                  getStatusType(paymentStatusOptions, booking.payment_status)
                "
              >
                {{ $t('bookings.' + booking.payment_status.toLowerCase()) }}
              </el-tag>
            </el-descriptions-item>
            <el-descriptions-item :label="$t('bookings.paymentMethod')">
              <el-tag
                :type="
                  getStatusType(paymentMethodOptions, booking.payment_method)
                "
              >
                {{ booking.payment_method ? $t('bookings.' + booking.payment_method.toLowerCase()) : $t("n_a") }}
              </el-tag>
            </el-descriptions-item>
          </el-descriptions>
        </el-card>

        <!-- Showtime Details -->
        <el-card class="details-card">
          <template #header>
            <div class="card-header">
              <span>{{ $t("showtimes.title") }}</span>
            </div>
          </template>
          <el-descriptions :column="2" border>
            <el-descriptions-item :label="$t('showtimes.movie')">
              <router-link
                :to="{ name: 'MovieDetail', params: { id: booking.movie.id } }"
                class="tracking-link"
                v-if="booking.movie?.id"
              >
                {{ booking.movie?.title }}
              </router-link>
              <span v-else>{{ booking.movie?.title }}</span>
            </el-descriptions-item>
            <el-descriptions-item :label="$t('showtimes.hall')">
              <router-link
                :to="{ name: 'HallDetail', params: { id: booking.hall.id } }"
                class="tracking-link"
                v-if="booking.hall?.id"
              >
                {{ booking.hall?.hall_name }}
              </router-link>
              <span v-else>{{ booking.hall?.hall_name }}</span>
            </el-descriptions-item>
            <el-descriptions-item :label="$t('showtimes.showDate')">
              {{ formatDate(booking.showtime?.show_date) }}
            </el-descriptions-item>
            <el-descriptions-item :label="$t('showtimes.startTime')"
              >{{ booking.showtime?.start_time }}
            </el-descriptions-item>
          </el-descriptions>
        </el-card>

        <!-- Seats Details -->
        <el-card class="details-card">
          <template #header>
            <div class="card-header">
              <span>{{ $t("seats.title") }} ({{ booking.seat_count }})</span>
            </div>
          </template>
          <el-table :data="booking.seats" stripe>
            <el-table-column
              prop="seat_identifier"
              :label="$t('seats.indentifier')"
            />
            <el-table-column prop="seat_type" :label="$t('seats.type')">
              <template #default="{ row }">
                <el-tag size="small">{{
                  $t(`seats.types.${row.seat_type}`)
                }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="row" :label="$t('seats.row')" />
            <el-table-column prop="seat_number" :label="$t('seats.number')" />
          </el-table>
        </el-card>
      </el-col>
      <el-col :span="8">
        <!-- Customer Details -->
        <el-card class="details-card">
          <template #header>
            <div class="card-header">
              <span>{{ $t("customers.customerDetails") }}</span>
            </div>
          </template>
          <el-descriptions direction="vertical" :column="1" border>
            <el-descriptions-item
              :label="$t('customers.customerType')"
              v-if="booking.customer?.customerType"
            >
              <el-tag>{{ booking.customer.customerType }}</el-tag>
            </el-descriptions-item>
            <el-descriptions-item
              :label="$t('customers.name')"
              v-if="booking.customer?.name"
            >
              <router-link
                :to="{
                  name: 'CustomerDetail',
                  params: { id: booking.customer.id },
                }"
                class="customer-link"
              >
                {{ booking.customer.name }}
              </router-link>
            </el-descriptions-item>
            <el-descriptions-item
              :label="$t('customers.phone')"
              v-if="booking.customer?.phone"
            >
              {{ toLocalPhone(booking.customer.phone) }}
            </el-descriptions-item>
            <el-descriptions-item
              :label="$t('customers.email')"
              v-if="booking.customer?.email"
            >
              {{ booking.customer.email }}
            </el-descriptions-item>
          </el-descriptions>
        </el-card>
        <!-- Pricing Details -->
        <el-card class="details-card">
          <template #header>
            <div class="card-header">
              <span>{{ $t("bookings.pricing") }}</span>
            </div>
          </template>
          <el-descriptions direction="vertical" :column="1" border>
            <el-descriptions-item :label="$t('bookings.totalPrice')">
              <span class="total-price">{{
                formatCurrency(booking.total_price)
              }}</span>
            </el-descriptions-item>
          </el-descriptions>
        </el-card>
      </el-col>
    </el-row>

    <el-empty v-else :description="$t('messages.noData')" />
  </div>
</template>

<script setup>
import { onMounted, ref } from "vue";
import { useRoute } from "vue-router";
import { useI18n } from "vue-i18n";
import { ElMessage } from "element-plus";
import { ArrowLeft } from "@element-plus/icons-vue";
import { bookingService } from "@/services/bookingService";
import { useAppStore } from "@/stores/app";
import { usePath } from "@/composables/usePath";
import {
  formatDate,
  formatDateTime,
  formatCurrency,
  toLocalPhone,
} from "@/utils/formatters";

const { t } = useI18n();
const route = useRoute();
const appStore = useAppStore();
const { getAdminPath } = usePath();

const loading = ref(true);
const booking = ref(null);

const bookingStatusOptions = bookingService.BOOKING_STATUSES;
const paymentStatusOptions = bookingService.PAYMENT_STATUSES;
const paymentMethodOptions = bookingService.PAYMENT_METHODS;

const loadBookingDetails = async () => {
  loading.value = true;
  try {
    const response = await bookingService.getBookingById(route.params.id);
    if (response?.success && response.data) {
      booking.value = response.data;
      console.log("Loaded booking details:", response.data);
    } else {
      ElMessage.error(t("errors.loadDataFailed"));
    }
  } catch (error) {
    console.error("Failed to load booking details:", error);
    ElMessage.error(error.message || t("errors.loadDataFailed"));
  } finally {
    loading.value = false;
  }
};

const getStatusType = (options, status) => {
  const option = options.find((opt) => opt.value === status);
  return option ? option.type : "info"; // Default to 'info' type if not found
};

onMounted(() => {
  loadBookingDetails();
  appStore.setBreadcrumbs([
    { title: t("nav.dashboard"), path: getAdminPath("/dashboard") },
    { title: t("bookings.title"), path: getAdminPath("/bookings") },
    {
      title: t("bookings.bookingDetails"),
      path: getAdminPath(`/bookings/${route.params.id}`),
    },
  ]);
});
</script>

<style scoped>
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.details-card {
  margin-bottom: 20px;
}

.total-price {
  font-size: 1.5rem;
  font-weight: bold;
  color: var(--primary-color);
}
.tracking-link,
.customer-link {
  color: var(--el-color-primary);
  text-decoration: none;
  font-weight: 500;
}

.tracking-link:hover,
.customer-link:hover {
  text-decoration: underline;
}
</style>
