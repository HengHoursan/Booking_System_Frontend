<template>
  <div class="password-reset-page">
    <div class="reset-container">
      <div class="reset-card">
        <div class="reset-header">
          <h2>{{ $t('auth.resetPassword') }}</h2>
          <p class="reset-subtitle">{{ $t('auth.resetPasswordSubtitle') }}</p>
        </div>

        <!-- Step 1: Request Reset -->
        <div v-if="currentStep === 'request'" class="reset-form">
          <el-form
            ref="requestFormRef"
            :model="requestForm"
            :rules="requestRules"
            @submit.prevent="handleRequestReset"
          >
            <el-form-item prop="phone">
              <el-input
                v-model="displayPhone"
                :placeholder="$t('auth.phonePlaceholder')"
                @input="formatPhoneNumber"
                maxlength="10"
                size="large"
              >
                <template #prepend>+855</template>
                <template #prefix>
                  <el-icon><Phone /></el-icon>
                </template>
              </el-input>
            </el-form-item>

            <el-button
              type="primary"
              size="large"
              :loading="loading"
              @click="handleRequestReset"
              class="reset-button"
            >
              {{ $t('auth.sendResetCode') }}
            </el-button>
          </el-form>
        </div>

        <!-- Step 2: Verify OTP and Reset Password -->
        <div v-if="currentStep === 'verify'" class="reset-form">
          <el-alert
            :title="$t('auth.otpSentTitle')"
            :description="$t('auth.otpSentMessage', { phone: maskedPhone })"
            type="success"
            :closable="false"
            style="margin-bottom: 20px"
          />

          <el-form
            ref="verifyFormRef"
            :model="verifyForm"
            :rules="verifyRules"
            @submit.prevent="handleVerifyReset"
          >
            <el-form-item prop="otp">
              <el-input
                v-model="verifyForm.otp"
                :placeholder="$t('auth.otpPlaceholder')"
                maxlength="6"
                size="large"
                @input="handleOtpInput"
              >
                <template #prefix>
                  <el-icon><Key /></el-icon>
                </template>
              </el-input>
            </el-form-item>

            <el-form-item prop="newPassword">
              <el-input
                v-model="verifyForm.newPassword"
                type="password"
                :placeholder="$t('auth.newPassword')"
                show-password
                size="large"
              >
                <template #prefix>
                  <el-icon><Lock /></el-icon>
                </template>
              </el-input>
            </el-form-item>

            <el-form-item prop="confirmPassword">
              <el-input
                v-model="verifyForm.confirmPassword"
                type="password"
                :placeholder="$t('auth.confirmPassword')"
                show-password
                size="large"
              >
                <template #prefix>
                  <el-icon><Lock /></el-icon>
                </template>
              </el-input>
            </el-form-item>

            <div class="button-group">
              <el-button
                size="large"
                @click="goBackToRequest"
                class="back-button"
              >
                {{ $t('actions.back') }}
              </el-button>
              <el-button
                type="primary"
                size="large"
                :loading="loading"
                @click="handleVerifyReset"
                class="reset-button"
              >
                {{ $t('auth.resetPassword') }}
              </el-button>
            </div>
          </el-form>

          <!-- Resend OTP -->
          <div class="resend-section">
            <el-text type="info" size="small">
              {{ $t('auth.didntReceiveCode') }}
            </el-text>
            <el-button
              type="primary"
              link
              :disabled="resendCountdown > 0"
              @click="handleResendOtp"
              size="small"
            >
              {{ resendCountdown > 0 
                ? $t('auth.resendIn', { seconds: resendCountdown })
                : $t('auth.resendCode')
              }}
            </el-button>
          </div>
        </div>

        <!-- Step 3: Success -->
        <div v-if="currentStep === 'success'" class="reset-success">
          <el-result
            icon="success"
            :title="$t('auth.passwordResetSuccess')"
            :sub-title="$t('auth.passwordResetSuccessMessage')"
          >
            <template #extra>
              <el-button type="primary" @click="goToLogin">
                {{ $t('auth.backToLogin') }}
              </el-button>
            </template>
          </el-result>
        </div>

        <!-- Back to Login -->
        <div v-if="currentStep !== 'success'" class="login-link">
          <el-text type="info">
            {{ $t('auth.rememberPassword') }}
            <el-button type="primary" link @click="goToLogin">
              {{ $t('auth.backToLogin') }}
            </el-button>
          </el-text>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { ElMessage } from 'element-plus'
import { Phone, Key, Lock } from '@element-plus/icons-vue'
import { userService } from '@/services/userService'
import { toInternationalPhone } from '@/utils/formatters'

const router = useRouter()
const { t } = useI18n()

// Refs
const requestFormRef = ref()
const verifyFormRef = ref()
const loading = ref(false)
const currentStep = ref('request') // 'request', 'verify', 'success'
const displayPhone = ref('')
const resendCountdown = ref(0)
const resendTimer = ref(null)

// Forms
const requestForm = reactive({
  phone: ''
})

const verifyForm = reactive({
  otp: '',
  newPassword: '',
  confirmPassword: ''
})

// Computed
const maskedPhone = computed(() => {
  if (!requestForm.phone) return ''
  return requestForm.phone.replace(/(\+\d{1,3})\d{4,}(\d{4})/, '$1****$2')
})

// Validation rules
const validatePhone = (rule, value, callback) => {
  if (!value) {
    callback(new Error(t('validation.phoneRequired')))
  } else if (!/^\+855[0-9]{8,9}$/.test(value)) {
    callback(new Error(t('validation.phoneInvalid')))
  } else {
    callback()
  }
}

const validateOtp = (rule, value, callback) => {
  if (!value) {
    callback(new Error(t('validation.otpRequired')))
  } else if (!/^\d{6}$/.test(value)) {
    callback(new Error(t('validation.otpInvalid')))
  } else {
    callback()
  }
}

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
  } else if (value !== verifyForm.newPassword) {
    callback(new Error(t('validation.passwordMismatch')))
  } else {
    callback()
  }
}

const requestRules = {
  phone: [{ validator: validatePhone, trigger: 'blur' }]
}

const verifyRules = {
  otp: [{ validator: validateOtp, trigger: 'blur' }],
  newPassword: [{ validator: validatePassword, trigger: 'blur' }],
  confirmPassword: [{ validator: validateConfirmPassword, trigger: 'blur' }]
}

// Methods
const formatPhoneNumber = (inputValue) => {
  let cleanedDisplay = inputValue.replace(/\D/g, '')

  if (cleanedDisplay.startsWith('855') && cleanedDisplay.length > 3) {
    cleanedDisplay = '0' + cleanedDisplay.substring(3)
  } else if (!cleanedDisplay.startsWith('0') && cleanedDisplay.length > 0 && cleanedDisplay.length < 10) {
    cleanedDisplay = '0' + cleanedDisplay
  }
  
  displayPhone.value = cleanedDisplay.substring(0, 10)
  requestForm.phone = toInternationalPhone(displayPhone.value)
}

const handleOtpInput = (value) => {
  // Only allow digits
  verifyForm.otp = value.replace(/\D/g, '').substring(0, 6)
}

const handleRequestReset = async () => {
  if (!requestFormRef.value) return
  
  try {
    await requestFormRef.value.validate()
    loading.value = true
    
    await userService.requestPasswordReset({
      phone: requestForm.phone
    })
    
    ElMessage.success(t('auth.resetCodeSent'))
    currentStep.value = 'verify'
    startResendCountdown()
    
  } catch (error) {
    console.error('Request password reset error:', error)
    
    if (error.response?.data?.message) {
      ElMessage.error(error.response.data.message)
    } else {
      ElMessage.error(t('auth.resetCodeSendError'))
    }
  } finally {
    loading.value = false
  }
}

const handleVerifyReset = async () => {
  if (!verifyFormRef.value) return
  
  try {
    await verifyFormRef.value.validate()
    loading.value = true
    
    await userService.verifyPasswordReset({
      phone: requestForm.phone,
      otp: verifyForm.otp,
      newPassword: verifyForm.newPassword,
      confirmPassword: verifyForm.confirmPassword
    })
    
    ElMessage.success(t('auth.passwordResetSuccess'))
    currentStep.value = 'success'
    
  } catch (error) {
    console.error('Verify password reset error:', error)
    
    if (error.response?.data?.message) {
      ElMessage.error(error.response.data.message)
    } else {
      ElMessage.error(t('auth.passwordResetError'))
    }
  } finally {
    loading.value = false
  }
}

const handleResendOtp = async () => {
  if (resendCountdown.value > 0) return
  
  try {
    loading.value = true
    
    await userService.requestPasswordReset({
      phone: requestForm.phone
    })
    
    ElMessage.success(t('auth.resetCodeResent'))
    startResendCountdown()
    
  } catch (error) {
    console.error('Resend OTP error:', error)
    
    if (error.response?.data?.message) {
      ElMessage.error(error.response.data.message)
    } else {
      ElMessage.error(t('auth.resetCodeSendError'))
    }
  } finally {
    loading.value = false
  }
}

const startResendCountdown = () => {
  resendCountdown.value = 60
  resendTimer.value = setInterval(() => {
    resendCountdown.value--
    if (resendCountdown.value <= 0) {
      clearInterval(resendTimer.value)
      resendTimer.value = null
    }
  }, 1000)
}

const goBackToRequest = () => {
  currentStep.value = 'request'
  // Clear verify form
  Object.assign(verifyForm, {
    otp: '',
    newPassword: '',
    confirmPassword: ''
  })
  
  if (verifyFormRef.value) {
    verifyFormRef.value.clearValidate()
  }
}

const goToLogin = () => {
  router.push('/auth/login')
}

// Cleanup
onUnmounted(() => {
  if (resendTimer.value) {
    clearInterval(resendTimer.value)
  }
})
</script>

<style scoped>
.password-reset-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 20px;
}

.reset-container {
  width: 100%;
  max-width: 400px;
}

.reset-card {
  background: white;
  border-radius: 12px;
  padding: 40px 32px;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
}

.reset-header {
  text-align: center;
  margin-bottom: 32px;
}

.reset-header h2 {
  margin: 0 0 8px 0;
  color: var(--el-text-color-primary);
  font-size: 24px;
  font-weight: 600;
}

.reset-subtitle {
  margin: 0;
  color: var(--el-text-color-secondary);
  font-size: 14px;
  line-height: 1.5;
}

.reset-form {
  margin-bottom: 24px;
}

.reset-button {
  width: 100%;
  margin-top: 16px;
}

.button-group {
  display: flex;
  gap: 12px;
  margin-top: 16px;
}

.back-button {
  flex: 1;
}

.reset-button {
  flex: 2;
}

.resend-section {
  text-align: center;
  margin-top: 20px;
  padding-top: 20px;
  border-top: 1px solid var(--el-border-color-lighter);
}

.resend-section .el-text {
  display: block;
  margin-bottom: 8px;
}

.login-link {
  text-align: center;
  padding-top: 20px;
  border-top: 1px solid var(--el-border-color-lighter);
}

.reset-success {
  text-align: center;
}

:deep(.el-input-group__prepend) {
  background-color: var(--el-fill-color-light);
  color: var(--el-text-color-regular);
  font-weight: 500;
}

:deep(.el-form-item) {
  margin-bottom: 20px;
}

:deep(.el-alert) {
  border-radius: 8px;
}

:deep(.el-result) {
  padding: 20px 0;
}
</style>