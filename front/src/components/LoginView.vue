<template>
  <div class="login-container">
    <!-- 动态背景元素 -->
    <div class="blob blob1"></div>
    <div class="blob blob2"></div>

    <div class="login-card">
      <!-- 顶部标题区域 -->
      <div class="login-header">
        <div class="logo-container">
          <div class="logo">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M5.121 17.804A13.936 13.936 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div class="pulse-dot"></div>
        </div>

        <h1 class="login-title">个人收支管理系统</h1>
        <p class="login-subtitle">请输入登录信息</p>
      </div>

      <!-- 登录表单 -->
      <div class="login-form">
        <!-- 用户名输入 -->
        <div class="form-group">
          <label class="form-label">用户名</label>
          <div class="input-group">
            <input type="text" class="form-input" placeholder="输入您的用户名" v-model="form.username" required autofocus />
            <div class="input-icon">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
          </div>
        </div>

        <!-- 密码输入 -->
        <div class="form-group">
          <label class="form-label">密码</label>
          <div class="input-group">
            <input type="password" class="form-input" placeholder="输入您的密码" v-model="form.password" required />
            <div class="input-icon" @click="showPassword = !showPassword" style="cursor: pointer;">
              <svg v-if="showPassword" xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24"
                stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.543-7z" />
              </svg>
              <svg v-else xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24"
                stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.968 9.968 0 011.563-4.255A10.05 10.05 0 0112 5c4.478 0 8.268 2.943 9.543 7a9.968 9.968 0 01-1.563 4.255A10.05 10.05 0 0112 19z" />
              </svg>
            </div>
          </div>
        </div>

        <!-- 表单选项：已对齐 + 增加上方间距 -->
        <div class="form-options">
          <div class="remember-me">
            <input type="checkbox" id="remember" class="remember-checkbox" v-model="rememberMe" />
            <label for="remember" class="remember-label">记住我</label>
          </div>
          <a href="#" class="forgot-password" @click.prevent="showForgotPassword">忘记密码？</a>
        </div>

        <!-- 登录按钮 -->
        <button @click="handleLogin" class="login-button" :class="{ 'is-submitting': isSubmitting }">
          <div v-if="isSubmitting" class="spinner">
            <div class="spinner-circle"></div>
          </div>
          <span v-else>登录</span>
        </button>

        <!-- 注册链接 -->
        <div class="register-link">
          <span>没有账号？</span>
          <a href="#" class="register-link-text" @click.prevent="navigateToRegister">立即注册</a>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'

const router = useRouter()
const form = reactive({
  username: '',
  password: ''
})
const showPassword = ref(false)
const isSubmitting = ref(false)
const rememberMe = ref(false)

const API_BASE = 'http://localhost:3000'

const handleLogin = async () => {
  if (!form.username || !form.password) {
    ElMessage.warning('请输入用户名和密码')
    return
  }

  isSubmitting.value = true

  try {
    const res = await fetch(`${API_BASE}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: form.username, password: form.password })
    })

    const data = await res.json()

    if (!res.ok) {
      ElMessage.error(data.message || '登录失败')
      isSubmitting.value = false
      return
    }

    // 保存 token、用户名和登录状态
    if (data.token) {
      localStorage.setItem('token', data.token)
      localStorage.setItem('username', form.username)
      localStorage.setItem('isLoggedIn', 'true')
      if (rememberMe.value) localStorage.setItem('rememberMe', 'true')
      ElMessage.success('登录成功！')
      router.push('/account')
    } else {
      ElMessage.warning('登录成功，但未收到 token')
    }
  } catch (err) {
    console.error('登录错误', err)
    ElMessage.error('无法连接到服务器')
  } finally {
    isSubmitting.value = false
  }
}

const showForgotPassword = () => {
  ElMessage.info('密码重置功能正在开发中，敬请期待！')
}

const navigateToRegister = () => {
  router.push('/register')
}
</script>

<style scoped>
/* 全局容器 */
.login-container {
  position: relative;
  min-height: 90vh;
  width: 900px;
  display: flex;
  justify-content: center;
  align-items: center;
  background: linear-gradient(135deg, #f5f7fa 0%, #e4edf9 100%);
  overflow: hidden;
  box-sizing: border-box;
  border-radius: 24px;
}

/* 背景 Blob 动画 */
.blob {
  position: absolute;
  border-radius: 50%;
  filter: blur(60px);
  z-index: 0;
}

.blob1 {
  width: 300px;
  height: 300px;
  background: #6366f1;
  top: -100px;
  left: -100px;
  animation: float 12s infinite ease-in-out;
}

.blob2 {
  width: 250px;
  height: 250px;
  background: #8b5cf6;
  bottom: -80px;
  right: -80px;
  animation: float 10s infinite ease-in-out reverse;
}

@keyframes float {
  0%, 100% { transform: translate(0, 0); }
  50% { transform: translate(20px, 20px); }
}

/* 登录卡片 */
.login-card {
  background: white;
  border-radius: 20px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
  padding: 40px;
  width: 100%;
  max-width: 520px;
  position: relative;
  z-index: 1;
  text-align: center;
}

/* Logo 区域 */
.logo-container {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 24px;
}

.logo {
  width: 56px;
  height: 56px;
  background: linear-gradient(135deg, #6366f1, #8b5cf6);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
}

.pulse-dot {
  position: absolute;
  width: 12px;
  height: 12px;
  background: #10b981;
  border-radius: 50%;
  bottom: 4px;
  right: 4px;
  box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.4);
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.4); }
  70% { box-shadow: 0 0 0 10px rgba(16, 185, 129, 0); }
  100% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0); }
}

/* 标题 */
.login-title {
  font-size: 28px;
  font-weight: 700;
  color: #1e293b;
  margin: 16px 0 8px;
}

.login-subtitle {
  color: #64748b;
  margin-bottom: 32px;
}

/* 表单组 - 缩短宽度 */
.form-group {
  margin-bottom: 24px;
  max-width: 480px;
  margin-left: auto;
  margin-right: auto;
}

.form-label {
  display: block;
  text-align: left;
  font-size: 14px;
  font-weight: 600;
  color: #334155;
  margin-bottom: 8px;
}

.input-group {
  position: relative;
}

.form-input {
  width: 100%;
  padding: 14px 16px 14px 48px;
  border: 1px solid #cbd5e1;
  border-radius: 12px;
  font-size: 16px;
  transition: border-color 0.3s, box-shadow 0.3s;
  background-color: #fff;
}

.form-input:focus {
  outline: none;
  border-color: #8b5cf6;
  box-shadow: 0 0 0 3px rgba(139, 92, 246, 0.15);
}

.input-icon {
  position: absolute;
  left: 16px;
  top: 50%;
  transform: translateY(-50%);
  color: #94a3b8;
  pointer-events: none;
}

/* 表单选项：关键对齐 + 间距 */
.form-options {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 32px; /* 增加上方距离 */
  margin-bottom: 25px;
  max-width: 600px;
  margin-left: auto;
  margin-right: auto;
}

.remember-checkbox {
  margin-right: 8px;
  accent-color: #6366f1;
}

.remember-label {
  font-size: 14px;
  color: #475569;
  cursor: pointer;
}

.forgot-password {
  font-size: 14px;
  color: #6366f1;
  text-decoration: none;
  transition: color 0.2s;
}

.forgot-password:hover {
  color: #8b5cf6;
  text-decoration: underline;
}

/* 登录按钮 */
.login-button {
  width: 100%;
  max-width: 640px;
  padding: 14px;
  background: linear-gradient(135deg, #6366f1, #8b5cf6);
  color: white;
  border: none;
  border-radius: 12px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.3s, transform 0.2s;
  margin-bottom: 24px;
}

.login-button:hover:not(.is-submitting) {
  opacity: 0.9;
  transform: translateY(-2px);
}

.login-button.is-submitting {
  cursor: not-allowed;
  opacity: 0.85;
}

.spinner {
  display: inline-block;
  width: 20px;
  height: 20px;
}

.spinner-circle {
  width: 100%;
  height: 100%;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: white;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* 注册链接 */
.register-link {
  max-width: 480px;
  margin: 0 auto;
  font-size: 14px;
  color: #64748b;
}

.register-link-text {
  color: #6366f1;
  text-decoration: none;
  margin-left: 6px;
  transition: color 0.2s;
}

.register-link-text:hover {
  color: #8b5cf6;
  text-decoration: underline;
}
</style>