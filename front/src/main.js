import { createApp } from 'vue'
import './style.css'
import { createRouter, createWebHistory } from 'vue-router'
import App from './App.vue'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import LoginView from './components/LoginView.vue'
import AccountView from './components/AccountView.vue'
import RegisterView from './components/Registerview.vue'

const routes = [
  { path: '/', redirect: '/login' }, 
  { path: '/login', component: LoginView },
  { path: '/account', component: AccountView, meta: { requiresAuth: true } },
  { path: '/register', component: RegisterView }
  
]


const router = createRouter({
  history: createWebHistory(),
  routes
})

router.beforeEach((to, from, next) => {
  const token = localStorage.getItem('token')
  if (to.meta?.requiresAuth && !token) {
    return next('/login')
  }
  if ((to.path === '/login' || to.path === '/register') && token) {
    return next('/account')
  }
  next()
})

createApp(App).use(ElementPlus).use(router).mount('#app')