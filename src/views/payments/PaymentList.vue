<template>
  <div class="payment-list-container">
    <!-- Page Header -->
    <div class="page-header">
      <h2>{{ $t("payments.paymentList") }}</h2>
    </div>

    <!-- Filters -->
    <el-card class="filter-card" shadow="never">
      <el-form :inline="true" :model="filters" class="filter-form">
        <el-form-item>
          <el-input
            v-model="filters.search"
            :placeholder="$t('payments.searchPayments')"
            clearable
            @keyup.enter="fetchPayments"
            @clear="fetchPayments"
            style="width: 250px"
          />
        </el-form-item>
        <el-form-item>
          <el-select
            v-model="filters.status"
            clearable
            @change="handleFilterChange"
            style="width: 250px"
            :placeholder="$t('payments.filterByPaymentStatus')"
          >
            <el-option
              v-for="status in paymentStatusOptions"
              :key="status.value"
              :label="status.label"
              :value="status.value"
            />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-select
            v-model="filters.payment_method"
            clearable
            @change="handleFilterChange"
            style="width: 250px"
            :placeholder="$t('payments.filterByPaymentMethod')"
          >
            <el-option
              v-for="method in paymentMethodOptions"
              :key="method.value"
              :label="method.label"
              :value="method.value"
            />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-date-picker
            v-model="filters.payment_date"
            type="date"
            :placeholder="$t('payments.filterByPaymentDate')"
            clearable
            style="width: 250px"
            value-format="YYYY-MM-DD"
            @change="handleFilterChange"
          />
        </el-form-item>
      </el-form>
    </el-card>

    <!-- Payments Table -->
    <el-card shadow="never">
      <el-table
        :data="payments"
        v-loading="loading.payments"
        style="width: 100%"
        :empty-text="$t('messages.noData')"
      >
        <el-table-column
          prop="fromAccount_id"
          :label="$t('payments.fromAccount')"
        >
          <template #default="{ row }">
            {{ row.fromAccount_id ? row.fromAccount_id : "-" }}
          </template>
        </el-table-column>
        <el-table-column prop="toAccount_id" :label="$t('payments.toAccount')">
          <template #default="{ row }">
            {{ row.toAccount_id ? row.toAccount_id : "-" }}
          </template>
        </el-table-column>
        <el-table-column prop="amount" :label="$t('payments.amount')">
          <template #default="{ row }"> ${{ row.amount.toFixed(2) }} </template>
        </el-table-column>
        <el-table-column
          prop="currency"
          :label="$t('payments.currency')"
        ></el-table-column>
        <el-table-column
          prop="payment_method"
          :label="$t('payments.paymentMethod')"
        >
          <template #default="{ row }">
            <el-tag :type="getPaymentMethodType(row.payment_method)">
              {{ row.payment_method }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="status" :label="$t('bookings.paymentStatus')">
          <template #default="{ row }">
            <el-tag :type="getStatusType(paymentStatusOptions, row.status)">
              {{ row.status }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="paid" :label="$t('payments.paid')">
          <template #default="{ row }">
            <el-tag :type="row.paid ? 'success' : 'danger'">
              {{ row.paid ? $t("payments.paid") : $t("payments.unpaid") }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column
          prop="description"
          width="250"
          :label="$t('payments.description')"
        ></el-table-column>
        <el-table-column
          prop="payment_date"
          :label="$t('payments.paymentDate')"
        ></el-table-column>
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
  </div>
</template>

<script setup>
import { ref, onMounted, reactive, watch } from "vue";
import { paymentService } from "@/services/paymentService"; // Destructure paymentService
import { ElMessage, ElTag } from "element-plus";
import { useI18n } from "vue-i18n"; // Import useI18n
import { formatDate } from "../../utils/formatters"; // Import date formatter

const { t } = useI18n();
const payments = ref([]);
const loading = reactive({
  payments: false,
});

const filters = reactive({
  search: "",
  status: "",
  payment_method: "",
  payment_date: null,
});

const pagination = reactive({
  current_page: 1,
  per_page: 10,
  total: 0,
});

const paymentStatusOptions = paymentService.PAYMENT_STATUSES;
const paymentMethodOptions = paymentService.PAYMENT_METHODS;

const fetchPayments = async () => {
  loading.payments = true;
  try {
    const params = {
      page: pagination.current_page || 1,
      limit: pagination.per_page || 10,
      search: filters.search || undefined,
      status: filters.status || undefined,
      payment_method: filters.payment_method || undefined,
      date_from: filters.payment_date ? `${filters.payment_date}T00:00:00` : undefined,
      date_to: filters.payment_date ? `${filters.payment_date}T23:59:59` : undefined,
    };
    const response = await paymentService.getPayments(params);
    if (response && Array.isArray(response.data)) {
      payments.value = response.data
        .filter((p) => p)
        .map((payment) => ({
          ...payment,
          currency: payment.currency,
          paid: payment.paid,
          description: payment.description,
          payment_date: formatDate(payment.payment_date),
          fromAccount_id: payment.fromAccount_id,
          toAccount_id: payment.toAccount_id,
          booking: payment.booking || {},
          payment_method: payment.payment_method || "",
        }));
      pagination.total = response.total;
      pagination.current_page = response.current_page;
      pagination.per_page = response.per_page;
    } else {
      payments.value = [];
      pagination.total = 0;
    }
  } catch (error) {
    console.error(error.message); // Use t() for translation
  } finally {
    loading.payments = false;
  }
};

const handleFilterChange = () => {
  pagination.current_page = 1;
  fetchPayments();
};

const handleSizeChange = (size) => {
  pagination.per_page = size;
  pagination.current_page = 1;
  fetchPayments();
};

const handleCurrentChange = (page) => {
  pagination.current_page = page;
  fetchPayments();
};

const getStatusType = (options, status) => {
  const option = options.find((opt) => opt.value === status);
  return option ? option.type : "info";
};

const getPaymentMethodType = (method) => {
  const option = paymentMethodOptions.find((opt) => opt.value === method);
  return option ? option.type : "info";
};

// Watchers (autoload when filters change)
watch([() => filters.search, () => filters.status, () => filters.payment_method, () => filters.payment_date], () => {
  pagination.current_page = 1;
  fetchPayments();
});

onMounted(() => {
  fetchPayments();
});
</script>

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
</style>
