<template>
  <div class="payment-step">
    <el-card shadow="never" class="payment-card">
      <template #header>
        <div class="card-header">
          <span class="flex gap-[10px] items-center"
            ><Wallet :size="18" /> {{ $t("payments.paymentDetails") }}</span
          >
        </div>
      </template>

      <el-form label-position="top">
        <el-form-item 
          :label="$t('customers.customer')"
          required
        >
          <el-select
            :model-value="props.customerId"
            @update:modelValue="$emit('update:customerId', $event)"
            filterable
            remote
            :remote-method="loadCustomers"
            :loading="loading.customers"
            :placeholder="$t('customers.searchAndSelectCustomer')"
            clearable
            style="width: 100%"
            size="large"
            :class="{ 'is-error': !props.customerId }"
          >
            <template #prefix><User :size="18" /></template>
            <el-option
              v-for="customer in customerOptions"
              :key="customer.id"
              :label="getCustomerLabel(customer)"
              :value="customer.id"
            />
          </el-select>
          <div v-if="!props.customerId" class="validation-message">
            <el-text type="danger" size="small">
              <el-icon><WarningFilled /></el-icon>
              {{ $t('bookings.validation.customerRequired') }}
            </el-text>
          </div>
          <div v-else-if="isWalkinCustomer" class="helper-message">
            <el-text type="info" size="small">
              <el-icon><InfoFilled /></el-icon>
              {{ $t('bookings.walkinCustomerSelected') }}
            </el-text>
          </div>
        </el-form-item>

        <el-form-item :label="$t('payments.paymentMethod')">
          <el-radio-group
            :model-value="props.paymentMethod"
            @update:modelValue="$emit('update:paymentMethod', $event)"
            size="large"
            style="width: 100%"
          >
            <el-radio-button
              v-for="method in paymentMethods"
              :key="method.value"
              :label="method.value"
            >
              <div class="payment-method-option">
                <component
                  :is="getPaymentMethodIcon(method.value)"
                  :size="20"
                />
                <span>{{ method.value.toLowerCase() }}</span>
              </div>
            </el-radio-button>
          </el-radio-group>
        </el-form-item>

        <div v-if="props.paymentMethod" class="payment-instructions">
          <el-alert
            :title="
              $t(`payments.${props.paymentMethod.toLowerCase()}InstructionsTitle`)
            "
            type="info"
            show-icon
            :closable="false"
          >
            <p>
              {{ $t(`payments.${props.paymentMethod.toLowerCase()}Instructions`) }}
            </p>
          </el-alert>
        </div>
      </el-form>
    </el-card>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, computed } from "vue";
import { useI18n } from "vue-i18n";
import { ElMessage } from "element-plus";
import { customerService } from "@/services/customerService";
import { paymentService } from "@/services/paymentService";
import { toLocalPhone } from "@/utils/formatters";
import { CircleDollarSign, Wallet, User } from "lucide-vue-next";
import { WarningFilled, InfoFilled } from "@element-plus/icons-vue";

const props = defineProps({
  customerId: {
    type: String,
    default: null,
  },
  paymentMethod: {
    type: String,
    default: "Cash",
  },
});

const emit = defineEmits(["update:customerId", "update:paymentMethod"]);

const { t } = useI18n();

const loading = reactive({
  customers: false,
});
const customerOptions = ref([]);

const paymentMethods = paymentService.PAYMENT_METHODS.filter((p) =>
  ["Cash"].includes(p.value),
);

// Computed property to check if selected customer is walk-in
const isWalkinCustomer = computed(() => {
  if (!props.customerId) return false;
  const selectedCustomer = customerOptions.value.find(c => c.id === props.customerId);
  return selectedCustomer?.customerType === 'walkin' || 
         selectedCustomer?.name?.toLowerCase().includes('walk-in') ||
         selectedCustomer?.name?.toLowerCase().includes('walkin');
});

const getPaymentMethodIcon = (method) => {
  switch (method) {
    case "Cash":
      return CircleDollarSign;
    default:
      return CircleDollarSign;
  }
};

const getCustomerLabel = (customer) => {
  if (customer.customerType === "walkin") {
    return `${customer.name || t("customers.walkin", "Walk-in Customer")} (${t("customers.walkin")})`;
  }
  if (customer.name && customer.phone) {
    return `${customer.name} - ${toLocalPhone(customer.phone)}`;
  }
  if (customer.name) {
    return customer.name;
  }
  if (customer.email) {
    return customer.email;
  }
  return t("customers.walkin", "Walk-in Customer");
};

const loadCustomers = async (query = "") => {
  loading.customers = true;
  try {
    const response = await customerService.getCustomers({
      search: query,
      isActive: true,
      limit: 20,
    });
    
    // Sort customers to put walk-in customers first
    const sortedCustomers = response.data.sort((a, b) => {
      if (a.customerType === 'walkin' && b.customerType !== 'walkin') return -1;
      if (b.customerType === 'walkin' && a.customerType !== 'walkin') return 1;
      return 0;
    });
    
    customerOptions.value = sortedCustomers;
    
    // Auto-select walk-in customer if no customer is currently selected and it's the initial load
    if (!props.customerId && !query && sortedCustomers.length > 0) {
      const walkinCustomer = sortedCustomers.find(customer => 
        customer.customerType === 'walkin' || 
        customer.name?.toLowerCase().includes('walk-in') ||
        customer.name?.toLowerCase().includes('walkin')
      );
      
      if (walkinCustomer) {
        // Emit the walk-in customer selection as default
        emit('update:customerId', walkinCustomer.id);
      }
    }
  } catch (error) {
    console.error("Failed to load customers:", error);
    ElMessage.error(t("errors.loadDataFailed"));
  } finally {
    loading.customers = false;
  }
};

onMounted(() => {
  loadCustomers();
});
</script>

<style scoped>
.payment-card {
  border: none;
  background-color: transparent;
}
.card-header {
  font-size: 1.2em;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--el-text-color-primary);
}
.payment-method-option {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
}
.payment-instructions {
  margin-top: 20px;
}

.el-radio-group {
  display: flex;
}

.el-radio-button {
  flex: 1;
}

:deep(.el-radio-button__inner) {
  width: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
}

.is-error :deep(.el-select__wrapper) {
  border-color: var(--el-color-danger);
  box-shadow: 0 0 0 1px var(--el-color-danger) inset;
}

.validation-message {
  margin-top: 4px;
  display: flex;
  align-items: center;
  gap: 4px;
}

.helper-message {
  margin-top: 4px;
  display: flex;
  align-items: center;
  gap: 4px;
}
</style>
