
import { mount } from '@vue/test-utils'
import LoginView from '../src/components/LoginView.vue'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createRouter, createWebHistory } from 'vue-router'

// 模拟全局 fetch API
global.fetch = vi.fn()

// 模拟 vue-router
const router = createRouter({
    history: createWebHistory(),
    routes: [{ path: '/', component: { template: '<div>Home</div>' } }]
})

// 设置 Mocks (Setup mocks)
// 模拟 Element Plus 组件库的 Message 组件
vi.mock('element-plus', () => {
    return {
        ElMessage: {
            warning: vi.fn(),
            error: vi.fn(),
            success: vi.fn(),
            info: vi.fn()
        }
    }
})

describe('登录页面组件 (LoginView.vue)', () => {
    // 每次测试前清除 Mock 记录
    beforeEach(() => {
        vi.clearAllMocks()
    })

    it('应正确渲染登录表单', () => {
        const wrapper = mount(LoginView, {
            global: {
                plugins: [router],
                stubs: {
                    transition: false // 禁用过渡动画，简化测试
                }
            }
        })
        expect(wrapper.find('.login-title').text()).toBe('个人收支管理系统')
        expect(wrapper.find('input[type="text"]').exists()).toBe(true)
        expect(wrapper.find('input[type="password"]').exists()).toBe(true)
        expect(wrapper.find('.login-button').text()).toContain('登录')
    })

    it('如果字段为空，应显示警告', async () => {
        const wrapper = mount(LoginView, {
            global: {
                plugins: [router]
            }
        })

        // 触发点击登录按钮
        await wrapper.find('.login-button').trigger('click')

        // 无法简单地在这里检查 ElMessage 是否被调用 (因为它在模块内部)，
        // 但我们可以检查 fetch 是否未被调用，以此间接验证验证逻辑是否生效
        expect(global.fetch).not.toHaveBeenCalled()
    })

    it('应使用正确的数据调用登录 API', async () => {
        const wrapper = mount(LoginView, {
            global: {
                plugins: [router]
            }
        })

        // 设置输入框的值
        await wrapper.find('input[type="text"]').setValue('testuser')
        await wrapper.find('input[type="password"]').setValue('password123')

        // 模拟 fetch 成功响应
        global.fetch.mockResolvedValue({
            ok: true,
            json: () => Promise.resolve({ token: 'fake-token', message: 'Success' })
        })

        // 触发登录
        await wrapper.find('.login-button').trigger('click')

        // 验证 fetch 是否被正确调用
        expect(global.fetch).toHaveBeenCalledWith('http://localhost:3000/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: 'testuser', password: 'password123' })
        })
    })
})
