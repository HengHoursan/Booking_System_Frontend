<template>
  <el-dialog
    v-model="dialogVisible"
    :title="$t('users.updatePhone')"
    width="450px"
    :close-on-click-modal="false"
    :close-on-press-escape="false"
    @close="handleClose"
  >
    <el-form
      ref="formRef"
      :model="form"
      :rules="rules"
      label-width="120px"
      @submit.prevent="handleSubmit"
    >
      <!-- User Info -->
      <el-alert
        v-if="user"
        :title="`${$t('users.updatePhoneFor')}: ${user.name}`"
        type="info"
        :closable="false"
        style="margin-bottom: 20px"
      >
        <template #default>
          <p><strong>{{ $t('users.username') }}:</strong> {{ user.username }}</p>
          <p><strong>{{ $t('users.currentPhone') }}:</strong> {{ user.phone || $t('common.notSet') }}</p>
        </template>
      </el-alert>

      <el-form-item :label="$t('users.newPhone')" prop="phone">
        <el-input
          v-model="displayPhone"
          :placeholder="$t('auth.phonePlaceholder')"
          @input="formatPhoneNumber"
          maxlength="10"
        >
          <template #prepend>+855</template>
        </el-input>
        <div class="form-tip">
          {{ $t('users.phoneFormatTip') }}
        </div>
      </el-form-item>
    </el-form>

    <template #footer>
      <div class="dialog-footer">
        <el-button @click="handleClose">{{ $t('actions.cancel') }}</el-button>
        <el-button
          type="primary"
          :loading="loading"
          @click="handleSubmit"
        >
          {{ $t('users.updatePhone') }}
        </el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, reactive, computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { ElMessage } from 'element-plus'
import { userService } from '@/services/userService'
import { toLocalPhone, toInternationalPhone } from '@/utils/formatters'

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  },
  user: {
    type: Object,
    default: null
  }
})

const emit = defineEmits(['update:modelValue', 'success'])

const { t } = useI18n()
const formRef = ref()
const loading = ref(false)
const displayPhone = ref('')

const dialogVisible = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})

const form = reactive({
  phone: ''
})

// Phone number validation
const validatePhone = (rule, value, callback) => {
  if (!value) {
    callback(new Error(t('validation.phoneRequired')))
  } else if (!/^\+855[0-9]{8,9}$/.test(value)) {
    callback(new Error(t('validation.phoneInvalid')))
  } else {
    callback()
  }
}

const rules = {
  phone: [{ validator: validatePhone, trigger: 'blur' }]
}

// Format phone number input
const formatPhoneNumber = (inputValue) => {
  let cleanedDisplay = inputValue.replace(/\D/g, '')

  if (cleanedDisplay.startsWith('855') && cleanedDisplay.length > 3) {
    cleanedDisplay = '0' + cleanedDisplay.substring(3)
  } else if (!cleanedDisplay.startsWith('0') && cleanedDisplay.length > 0 && cleanedDisplay.length < 10) {
    cleanedDisplay = '0' + cleanedDisplay
  }
  
  displayPhone.value = cleanedDisplay.substring(0, 10)
  form.phone = toInternationalPhone(displayPhone.value)
}

// Reset form when dialog opens/closes
watch(() => props.modelValue, (newValue) => {
  if (newValue) {
    resetForm()
  }
})

// Reset form
const resetForm = () => {
  form.phone = ''
  displayPhone.value = ''
  
  if (formRef.value) {
    formRef.value.clearValidate()
  }
}

// Handle form submission
const handleSubmit = async () => {
  if (!formRef.value) return
  
  try {
    await formRef.value.validate()
    
    if (!props.user?.id) {
      ElMessage.error(t('users.userNotFound'))
      return
    }
    
    // Check if phone number is the same
    if (form.phone === props.user.phone) {
      ElMessage.warning(t('users.phoneNotChanged'))
      return
    }
    
    loading.value = true
    
    const phoneData = {
      phone: form.phone
    }
    
    await userService.updateUserPhone(props.user.id, phoneData)
    
    ElMessage.success(t('users.phoneUpdateSuccess'))
    emit('success')
    handleClose()
    
  } catch (error) {
    console.error('Phone update error:', error)
    
    if (error.response?.data?.message) {
      ElMessage.error(error.response.data.message)
    } else {
      ElMessage.error(t('users.phoneUpdateError'))
    }
  } finally {
    loading.value = false
  }
}

// Handle dialog close
const handleClose = () => {
  resetForm()
  emit('update:modelValue', false)
}
</script>

<style scoped>
.form-tip {
  color: var(--el-text-color-secondary);
  font-size: 12px;
  margin-top: 4px;
  line-height: 1.4;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

:deep(.el-alert) {
  margin-bottom: 20px;
}

:deep(.el-alert p) {
  margin: 4px 0;
  font-size: 14px;
}

:deep(.el-input-group__prepend) {
  background-color: var(--el-fill-color-light);
  color: var(--el-text-color-regular);
  font-weight: 500;
}
</style>