<template>
  <div class="create-booking-page">
    <div class="page-header">
      <h2>{{ $t("bookings.addBooking") }}</h2>
      <el-button @click="$router.back()">
        <ArrowLeft :size="20" /> {{ $t("actions.back") }}
      </el-button>
    </div>

    <el-row :gutter="24">
      <el-col :xs="20" :sm="15">
        <el-card shadow="never" class="stepper-card">
          <el-steps :active="activeStep" finish-status="success" align-center>
            <el-step :title="$t('bookings.steps.selectShowtime')" />
            <el-step :title="$t('bookings.steps.selectSeats')" />
            <el-step :title="$t('bookings.steps.payment')" />
          </el-steps>
        </el-card>

        <div class="step-content-wrapper">
          <select-showtime-step
            v-show="activeStep === 0"
            v-model="bookingState.showtime"
            :active-step="activeStep"
          />

          <select-seats-step
            v-if="activeStep === 1"
            :showtime="bookingState.showtime"
            v-model="bookingState.selectedSeats"
            @update:selectedSeatDetails="
              bookingState.selectedSeatDetails = $event
            "
          />

          <payment-step
            v-if="activeStep === 2"
            v-model:customerId="bookingState.customerId"
            v-model:paymentMethod="bookingState.paymentMethod"
          />
        </div>

        <!-- Navigation -->
        <div class="step-navigation">
          <div class="button-group">
            <el-button v-if="activeStep > 0" @click="prevStep">
              {{ $t("actions.previous") }}
            </el-button>

            <el-button
              v-if="activeStep < 2"
              type="primary"
              :disabled="!isStepValid"
              @click="nextStep"
            >
              {{ $t("actions.next") }}
            </el-button>

            <el-button
              v-if="activeStep === 2"
              type="success"
              :disabled="!isStepValid"
              :loading="loading.booking"
              @click="submitBooking"
            >
              {{ $t("bookings.createBooking") }}
            </el-button>
          </div>
          
          <!-- Validation hint when button is disabled -->
          <div v-if="activeStep === 2 && !isStepValid" class="validation-hint">
            <el-text type="info" size="small">
              <el-icon><InfoFilled /></el-icon>
              {{ !bookingState.customerId ? $t('bookings.validation.customerRequired') : $t('bookings.validation.paymentMethodRequired') }}
            </el-text>
          </div>
        </div>
      </el-col>

      <el-col :xs="24" :sm="9">
        <div class="summary-wrapper">
          <confirmation-step :booking-summary="bookingSummary" />
        </div>
      </el-col>
    </el-row>

    <el-dialog
      v-model="showBakongDialog"
      :title="$t('payments.bakongPayment')"
      width="400px"
      :show-close="false"
      :close-on-click-modal="false"
      :close-on-press-escape="false"
    >
      <bakong-qr-payment
        v-if="bakongPaymentData"
        :payment="bakongPaymentData"
        @paid="onPaymentPaid"
        @close="onPaymentDialogClose"
        style="margin: 0 auto"
      />
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onUnmounted } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useI18n } from "vue-i18n";
import { ElMessage } from "element-plus";
import { ArrowLeft } from "lucide-vue-next";
import { InfoFilled } from "@element-plus/icons-vue";
import { useAppStore } from "@/stores/app";

import { showtimeService } from "@/services/showtimeService";
import { seatService } from "@/services/seatService";
import { bookingService } from "@/services/bookingService";
import { paymentService } from "@/services/paymentService";
import { formatDate } from "@/utils/formatters";
import { usePath } from "@/composables/usePath";

import SelectShowtimeStep from "@/components/bookings/SelectShowtimeStep.vue";
import SelectSeatsStep from "@/components/bookings/SelectSeatsStep.vue";
import ConfirmationStep from "@/components/bookings/ConfirmationStep.vue";
import PaymentStep from "@/components/bookings/PaymentStep.vue";
import BakongQrPayment from "@/components/payments/BakongQRPayment.vue";

const { t } = useI18n();
const router = useRouter();
const route = useRoute();
const appStore = useAppStore();
const { getAdminPath } = usePath();

const activeStep = ref(0);
const showBakongDialog = ref(false);
const bakongPaymentData = ref(null);
const currentBookingId = ref(null);
const isHandlingClose = ref(false);

const loading = reactive({
  booking: false,
});

const bookingState = reactive({
  showtime: null,
  selectedSeats: new Set(),
  selectedSeatDetails: [],
  customerId: null,
  paymentMethod: "Cash",
});

const bookingSummary = computed(() => {
  if (!bookingState.showtime)
    return {
      movie: "",
      hall: "",
      showDate: "",
      startTime: "",
      seats: "",
      totalPrice: 0,
    };

  const totalPrice = bookingState.selectedSeatDetails.reduce(
    (total, seat) => total + (seat?.price || 0),
    0,
  );

  return {
    movie: bookingState.showtime.movie_title,
    hall: bookingState.showtime.hall_name,
    showDate: formatDate(bookingState.showtime.show_date),
    startTime: bookingState.showtime.start_time,
    seats:
      bookingState.selectedSeatDetails
        .map((s) => `${s.seat_identifier}`)
        .join(", ") || "",
    totalPrice,
  };
});

const isStepValid = computed(() => {
  if (activeStep.value === 0) return !!bookingState.showtime;
  if (activeStep.value === 1) return bookingState.selectedSeats.size > 0;
  if (activeStep.value === 2) {
    // Payment step validation: must have payment method AND customer selection
    return !!bookingState.paymentMethod && !!bookingState.customerId;
  }
  return false;
});

const nextStep = () => {
  if (activeStep.value === 1) {
    // Validate seats
    const seats = bookingState.selectedSeatDetails;
    if (seats.length > 10) {
      ElMessage.error(t("bookings.maxSeatsError", { count: 10 }));
      return;
    }

    if (seats.length > 1) {
      // Rule 2: All seats must be in the same row
      const firstRow = seats[0].row;
      if (!seats.every((s) => s.row === firstRow)) {
        ElMessage.error(t("bookings.sameRowError"));
        return;
      }

      // Rule 3: No gaps between seats
      const sorted = [...seats].sort((a, b) => {
        const numA = parseInt(a.seat_number);
        const numB = parseInt(b.seat_number);
        return numA - numB;
      });
      for (let i = 0; i < sorted.length - 1; i++) {
        const numA = parseInt(sorted[i].seat_number);
        const numB = parseInt(sorted[i + 1].seat_number);
        if (numA + 1 !== numB) {
          ElMessage.error(t("bookings.noGapsError"));
          return;
        }
      }
    }
  }
  if (activeStep.value < 2) activeStep.value++;
};

const prevStep = () => {
  if (activeStep.value > 0) activeStep.value--;
};

/* ===================== */
/* ENTER KEY FUNCTIONALITY */
/* ===================== */
const handleEnterKey = (e) => {
  if (e.key !== "Enter") return;

  // prevent Enter from triggering inside textarea
  const tag = e.target.tagName;
  if (tag === "TEXTAREA") return;

  e.preventDefault();

  if (!isStepValid.value) return;

  if (activeStep.value < 2) {
    nextStep();
  } else if (activeStep.value === 2) {
    submitBooking();
  }
};

/* ===================== */
/* SUBMIT BOOKING FUNCTION */
/* ===================== */
const submitBooking = async () => {
  if (!isStepValid.value) {
    // Show specific validation messages
    if (!bookingState.customerId) {
      ElMessage.error(t("bookings.validation.customerRequired"));
      return;
    }
    if (!bookingState.paymentMethod) {
      ElMessage.error(t("bookings.validation.paymentMethodRequired"));
      return;
    }
    return;
  }
  
  loading.booking = true;

  const bookingData = {
    showtimeId: bookingState.showtime?.id,
    seats: Array.from(bookingState.selectedSeats),
    total_price: bookingSummary.value.totalPrice,
    seat_count: bookingState.selectedSeats.size,
    payment_method: bookingState.paymentMethod,
    customerId: bookingState.customerId,
    noted: "",
  };

  try {
    const bookingResponse = await bookingService.createBooking(bookingData);

    if (!bookingResponse.success) {
      // Handle specific validation errors from backend
      const errorMessage = bookingResponse.message || t("bookings.createFailed");
      
      // Check for customer-related validation errors
      if (errorMessage.includes("customerId") || errorMessage.includes("customer")) {
        ElMessage.error(t("bookings.validation.customerRequired"));
      } else if (errorMessage.includes("Validation failed")) {
        ElMessage.error(t("bookings.validation.validationFailed"));
      } else {
        ElMessage.error(errorMessage);
      }
      
      loading.booking = false;
      return;
    }

    const booking = bookingResponse.data.booking;
    currentBookingId.value = booking?._id;

    if (bookingState.paymentMethod === "Bakong") {
      // Initiate Bakong payment
      const paymentResponse = await paymentService.createPayment({
        bookingId: booking._id,
        amount: booking.total_price,
        payment_method: "Bakong",
        currency: "USD", // Default to USD
        description: `Payment for booking ${booking.reference_code}`,
      });

      if (paymentResponse.success) {
        bakongPaymentData.value = paymentResponse.data.payment;
        showBakongDialog.value = true;
      } else {
        // Payment initiation failed - expire the booking
        if (currentBookingId.value) {
          await bookingService.expireBooking(currentBookingId.value);
        }
        ElMessage.error(
          paymentResponse.message || t("payments.initiateFailed"),
        );
      }
    } else {
      ElMessage.success(t("bookings.createSuccess"));
      appStore.triggerRefresh();
      router.push(getAdminPath("/bookings"));
    }
  } catch (error) {
    // Handle network or other errors
    let errorMessage = error.message || t("bookings.createFailed");
    
    // Check for specific validation errors in the error response
    if (error.response?.data?.message) {
      const backendMessage = error.response.data.message;
      if (backendMessage.includes("customerId") || backendMessage.includes("customer")) {
        errorMessage = t("bookings.validation.customerRequired");
      } else if (backendMessage.includes("Validation failed")) {
        errorMessage = t("bookings.validation.validationFailed");
      } else {
        errorMessage = backendMessage;
      }
    }
    
    ElMessage.error(errorMessage);
  } finally {
    loading.booking = false;
  }
};

/* ============ */
/* OTHER FUNCTIONS */
/* ============ */

const onPaymentPaid = async () => {
  ElMessage.success(t("payments.paymentSuccess"));
  showBakongDialog.value = false;
  appStore.triggerRefresh();
  router.push(getAdminPath("/bookings"));
};

const onPaymentDialogClose = async (paid) => {
  // Guard against double-firing (e.g. from component @close + dialog @closed)
  if (isHandlingClose.value) return;
  isHandlingClose.value = true;

  showBakongDialog.value = false;

  if (paid) {
    ElMessage.success(t("payments.paymentSuccess"));
    appStore.triggerRefresh();
    router.push(getAdminPath("/bookings"));
  } else {
    // If not paid, expire the booking to release the seats
    const bookingIdToExpire = currentBookingId.value;
    currentBookingId.value = null; // Clear immediately to prevent re-use
    bakongPaymentData.value = null;

    if (bookingIdToExpire) {
      try {
        await bookingService.expireBooking(bookingIdToExpire);
        ElMessage.warning(t("payments.paymentFailed"));
      } catch (error) {
        console.error("Failed to expire unpaid booking:", error);
      }
    }
    appStore.triggerRefresh();
    router.push(getAdminPath("/bookings"));
  }

  isHandlingClose.value = false;
};

/* ===================== */
/* LIFECYCLE HOOKS */
/* ===================== */
onMounted(async () => {
  window.addEventListener("keydown", handleEnterKey);

  appStore.setBreadcrumbs([
    { title: t("nav.dashboard"), path: getAdminPath("/dashboard") },
    { title: t("bookings.title"), path: getAdminPath("/bookings") },
    { title: t("bookings.addBooking"), path: getAdminPath("/bookings/create") },
  ]);

  // Handle auto-population from Dashboard quick-actions
  const { showtime, seats } = route.query;
  if (showtime) {
    loading.booking = true;
    try {
      const showtimeData = await showtimeService.getShowtime(showtime);
      if (showtimeData) {
        bookingState.showtime = showtimeData;
        
        if (seats) {
          const seatIds = seats.split(',');
          seatIds.forEach(id => bookingState.selectedSeats.add(id));
          
          // Hydrate seat details for the summary
          const seatResponse = await seatService.getSeatsByHall(showtimeData.hall_id, { per_page: 100 });
          if (seatResponse?.data) {
            const selectedDetails = seatResponse.data.filter(s => {
              const sId = (s._id || s.id)?.toString();
              return seatIds.includes(sId);
            });
            bookingState.selectedSeatDetails = selectedDetails;
          }
          
          // Skip directly to Payment step
          activeStep.value = 2;
        } else {
          // Or just skip to Seat Selection step
          activeStep.value = 1;
        }
      }
    } catch (e) {
      console.error("Failed to load booking context from URL:", e);
    } finally {
      loading.booking = false;
    }
  }
});

onUnmounted(() => {
  window.removeEventListener("keydown", handleEnterKey);
});
</script>

<style scoped>
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.stepper-card {
  margin-bottom: 20px;
}

.step-content-wrapper {
  background-color: var(--el-bg-color);
  padding: 4px;
  border-radius: 4px;
  min-height: 400px;
  margin-bottom: 20px;
}

.step-navigation {
  display: flex;
  justify-content: center;
  gap: 12px;
  margin-top: 20px;
  padding: 20px;
  background-color: var(--el-bg-color);
  border-radius: 4px;
  flex-direction: column;
  align-items: center;
}

.button-group {
  display: flex;
  gap: 12px;
  justify-content: center;
}

.validation-hint {
  margin-top: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
}
</style>
