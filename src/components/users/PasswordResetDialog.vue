<template>
  <el-dialog
    v-model="dialogVisible"
    :title="$t('users.resetPassword')"
    width="500px"
    :close-on-click-modal="false"
    :close-on-press-escape="false"
    @close="handleClose"
  >
    <el-form
      ref="formRef"
      :model="form"
      :rules="rules"
      label-width="140px"
      @submit.prevent="handleSubmit"
    >
      <!-- User Info -->
      <el-alert
        v-if="user"
        :title="`${$t('users.resetPasswordFor')}: ${user.name}`"
        type="info"
        :closable="false"
        style="margin-bottom: 20px"
      >
        <template #default>
          <p><strong>{{ $t('users.username') }}:</strong> {{ user.username }}</p>
          <p><strong>{{ $t('users.phone') }}:</strong> {{ user.phone || $t('common.notSet') }}</p>
          <p><strong>{{ $t('users.role') }}:</strong> {{ $t(`users.${user.role}`) }}</p>
        </template>
      </el-alert>

      <el-form-item :label="$t('auth.newPassword')" prop="newPassword">
        <el-input
          v-model="form.newPassword"
          type="password"
          :placeholder="$t('auth.newPassword')"
          show-password
          maxlength="50"
        />
      </el-form-item>

      <el-form-item :label="$t('auth.confirmPassword')" prop="confirmPassword">
        <el-input
          v-model="form.confirmPassword"
          type="password"
          :placeholder="$t('auth.confirmPassword')"
          show-password
          maxlength="50"
        />
      </el-form-item>

      <!-- <el-form-item :label="$t('users.sendNotification')">
        <el-switch
          v-model="form.sendNotification"
          :active-text="$t('common.yes')"
          :inactive-text="$t('common.no')"
          :disabled="!user?.phone"
        />
        <div class="form-tip" v-if="!user?.phone">
          {{ $t('users.noPhoneForNotification') }}
        </div>
        <div class="form-tip" v-else>
          {{ $t('users.notificationWillBeSent', { phone: maskPhone(user.phone) }) }}
        </div>
      </el-form-item> -->
    </el-form>

    <template #footer>
      <div class="dialog-footer">
        <el-button @click="handleClose">{{ $t('actions.cancel') }}</el-button>
        <el-button
          type="primary"
          :loading="loading"
          @click="handleSubmit"
        >
          {{ $t('users.resetPassword') }}
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

const dialogVisible = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})

const form = reactive({
  newPassword: '',
  confirmPassword: '',
  sendNotification: true
})

// Validation rules
const validatePassword = (rule, value, callback) => {
  if (!value) {
    callback(new Error(t('validation.passwordRequired')))
  } else if (value.length < 6) {
    callback(new Error(t('validation.passwordMin')))
  } else {
    callback()
  }
}

const validateConfirmPassword = (rule, value, callback) => {
  if (!value) {
    callback(new Error(t('validation.confirmPasswordRequired')))
  } else if (value !== form.newPassword) {
    callback(new Error(t('validation.passwordMismatch')))
  } else {
    callback()
  }
}

const rules = {
  newPassword: [{ validator: validatePassword, trigger: 'blur' }],
  confirmPassword: [{ validator: validateConfirmPassword, trigger: 'blur' }]
}

// Mask phone number for display
const maskPhone = (phone) => {
  if (!phone) return ''
  return phone.replace(/(\+\d{1,3})\d{4,}(\d{4})/, '$1****$2')
}

// Reset form when dialog opens/closes
watch(() => props.modelValue, (newValue) => {
  if (newValue) {
    resetForm()
  }
})

// Reset form
const resetForm = () => {
  Object.assign(form, {
    newPassword: '',
    confirmPassword: '',
    sendNotification: !!props.user?.phone
  })
  
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
    
    loading.value = true
    
    const resetData = {
      newPassword: form.newPassword,
      confirmPassword: form.confirmPassword,
      sendNotification: form.sendNotification
    }
    
    await userService.resetUserPassword(props.user.id, resetData)
    
    ElMessage.success(t('users.passwordResetSuccess'))
    emit('success')
    handleClose()
    
  } catch (error) {
    console.error('Password reset error:', error)
    
    if (error.response?.data?.message) {
      ElMessage.error(error.response.data.message)
    } else {
      ElMessage.error(t('users.passwordResetError'))
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
</style>