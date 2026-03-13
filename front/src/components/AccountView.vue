<template>
  <div class="app-container">
    <!-- 顶栏 -->
    <el-header class="header">
      <div class="header-content">
        <div class="logo">
          <el-icon size="24" color="#fff"><Wallet /></el-icon>
          <span class="logo-text">个人收支管理系统</span>
        </div>
        <div class="user-info">
          <el-icon size="18" color="#fff"><User /></el-icon>
          <span class="username">{{ username }}</span>
          <el-button
            size="small"
            plain
            type="danger"
            class="logout-btn"
            @click="handleLogout"
          >退出登录</el-button>
        </div>
      </div>
    </el-header>

    <div class="main-content">
      <!-- 侧边栏 -->
      <el-aside class="sidebar">
        <el-menu
          default-active="1"
          class="sidebar-menu"
          @select="handleMenuSelect"
          background-color="#2c3e50"
          text-color="#fff"
          active-text-color="#409eff"
        >
          <el-menu-item index="1">
            <el-icon><Menu /></el-icon>
            <span slot="title">账单列表</span>
          </el-menu-item>
          <el-menu-item index="2">
            <el-icon><Plus /></el-icon>
            <span slot="title">添加账单</span>
          </el-menu-item>
          <el-menu-item index="3">
            <el-icon><DataAnalysis /></el-icon>
            <span slot="title">收支统计</span>
          </el-menu-item>
          <el-menu-item index="4">
            <el-icon><Upload /></el-icon>
            <span slot="title">账单导入</span>
          </el-menu-item>
          <el-menu-item index="5">
            <el-icon><Calendar /></el-icon>
            <span slot="title">周期管理</span>
          </el-menu-item>
        </el-menu>
      </el-aside>

      <!-- 主内容区 -->
      <el-main class="content">
        <!-- 页面标题 -->
        <div class="page-header">
          <h2 class="page-title">{{ 
            activePage === '1' ? '账单列表' : 
            activePage === '2' ? '添加账单' : 
            activePage === '3' ? '收支统计' : 
            activePage === '4' ? '账单导入' : 
            '周期管理' 
          }}</h2>
          <el-divider direction="vertical"></el-divider>
          <span class="page-desc">{{ 
            activePage === '1' ? '查看、筛选、管理所有账单' : 
            activePage === '2' ? '录入新的收支账单' : 
            activePage === '3' ? '可视化分析您的收支趋势' :
            activePage === '4' ? '从支付宝或微信生成的 CSV 文件导入账单' :
            '管理工资、会员等固定周期的收支项目'
          }}</span>
        </div>

        <!-- 账单列表页面 -->
        <div v-if="activePage === '1'" class="page-content">
          <!-- 筛选卡片 -->
          <el-card class="filter-card">
            <el-form :inline="true" :model="filterForm" class="filter-form">
              <el-form-item label="月份">
                <el-date-picker
                  v-model="filterForm.month"
                  type="month"
                  placeholder="选择月份"
                  format="YYYY-MM"
                  value-format="YYYY-MM"
                  class="filter-input"
                ></el-date-picker>
              </el-form-item>
              <el-form-item label="收支类型">
                <el-select v-model="filterForm.type" placeholder="全部" class="filter-input">
                  <el-option label="收入" value="收入"></el-option>
                  <el-option label="支出" value="支出"></el-option>
                </el-select>
              </el-form-item>
              <el-form-item label="分类">
                <el-select v-model="filterForm.category" placeholder="全部" class="filter-input">
                  <el-option
                    v-for="item in filterCategories"
                    :key="item.id"
                    :label="item.name"
                    :value="item.id"
                  ></el-option>
                </el-select>
              </el-form-item>
              <el-form-item>
                <el-button type="primary" @click="handleFilter" class="filter-btn">
                  <el-icon><Search /></el-icon> 筛选
                </el-button>
                <el-button @click="resetFilter" class="reset-btn">
                  <el-icon><Refresh /></el-icon> 重置
                </el-button>
              </el-form-item>
            </el-form>
          </el-card>

          <!-- 账单表格 -->
          <el-table
            :data="billList"
            border
            stripe
            hover
            style="width: 100%; margin-top: 20px"
            class="bill-table"
            empty-text="暂无账单数据，请添加新账单"
          >
            <el-table-column prop="type" label="收支类型">
              <template #default="scope">
                <el-tag :type="scope.row.type === '收入' ? 'success' : 'danger'">{{ scope.row.type }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="category_name" label="分类" width="120"></el-table-column>
            <el-table-column prop="amount" label="金额(元)" width="120">
              <template #default="scope">
                <span :class="scope.row.type === '收入' ? 'income-amount' : 'expense-amount'">
                  {{ scope.row.type === '收入' ? '+' : '-' }}{{ scope.row.amount.toFixed(2) }}
                </span>
              </template>
            </el-table-column>
            <el-table-column prop="date" label="日期" width="120"></el-table-column>
            <el-table-column prop="remark" label="备注" min-width="200"></el-table-column>
            <el-table-column label="操作" width="180" fixed="right">
              <template #default="scope">
                <el-button
                  type="primary"
                  size="small"
                  @click="handleEdit(scope.row)"
                  class="edit-btn"
                >
                  <el-icon><Edit /></el-icon> 修改
                </el-button>
                <el-button
                  type="danger"
                  size="small"
                  @click="handleDelete(scope.row.id)"
                  class="delete-btn"
                >
                  <el-icon><Delete /></el-icon> 删除
                </el-button>
              </template>
            </el-table-column>
          </el-table>

          <!-- 分页 -->
          <el-pagination
            @size-change="handleSizeChange"
            @current-change="handleCurrentChange"
            :current-page="pagination.currentPage"
            :page-sizes="[5, 10, 20]"
            :page-size="pagination.pageSize"
            layout="total, sizes, prev, pager, next, jumper"
            :total="totalBills"
            style="margin-top: 20px; text-align: right"
            class="pagination"
          >
          </el-pagination>
        </div>

        <!-- 添加/修改账单页面 -->
        <div v-if="activePage === '2'" class="page-content">
          <el-card class="form-card">
            <el-form
              :model="billForm"
              :rules="billRules"
              ref="billFormRef"
              label-width="100px"
              class="bill-form"
            >
              <el-form-item label="收支类型" prop="type">
                <el-radio-group v-model="billForm.type" class="radio-group">
                  <el-radio label="收入" border class="radio-item">收入</el-radio>
                  <el-radio label="支出" border class="radio-item">支出</el-radio>
                </el-radio-group>
              </el-form-item>
              <el-form-item label="分类" prop="category">
                <el-select v-model="billForm.category" placeholder="请选择分类" class="form-select">
                  <el-option
                    v-for="item in formCategories"
                    :key="item.id"
                    :label="item.name"
                    :value="item.id"
                  ></el-option>
                </el-select>
              </el-form-item>
              <el-form-item label="金额(元)" prop="amount">
                <el-input
                  v-model.number="billForm.amount"
                  type="number"
                  placeholder="请输入金额（保留2位小数）"
                  class="form-input"
                  step="0.01"
                  precision="2"
                ></el-input>
              </el-form-item>
              <el-form-item label="日期" prop="date">
                <el-date-picker
                  v-model="billForm.date"
                  type="date"
                  placeholder="选择日期"
                  format="YYYY-MM-DD"
                  value-format="YYYY-MM-DD"
                  class="form-input"
                ></el-date-picker>
              </el-form-item>
              <el-form-item label="备注" prop="remark">
                <el-input
                  v-model="billForm.remark"
                  type="textarea"
                  placeholder="请输入备注（选填）"
                  class="form-textarea"
                  :rows="3"
                ></el-input>
              </el-form-item>
              <el-form-item class="form-btn-group">
                <el-button type="primary" @click="handleSubmit" class="submit-btn">
                  <el-icon><Check /></el-icon> 提交
                </el-button>
                <el-button @click="resetForm" class="reset-form-btn">
                  <el-icon><Refresh /></el-icon> 重置
                </el-button>
              </el-form-item>
            </el-form>
          </el-card>
        </div>

        <!-- 收支统计页面 -->
        <div v-show="activePage === '3'" class="page-content stats-page">
          <el-row :gutter="20">
            <!-- 指标概览卡片 -->
            <el-col :span="6" v-for="card in statOverviewCards" :key="card.title">
              <el-card shadow="hover" class="stat-overview-card" :body-style="{ padding: '20px' }">
                <div class="stat-card-content">
                  <div class="stat-card-info">
                    <p class="stat-card-title">{{ card.title }}</p>
                    <h3 class="stat-card-value" :class="card.type">{{ card.value }}</h3>
                  </div>
                  <el-icon class="stat-card-icon" :class="card.type"><component :is="card.icon" /></el-icon>
                </div>
              </el-card>
            </el-col>
          </el-row>

          <!-- 颜色自定义工具栏 -->
          <el-card class="chart-card" style="margin-top: 20px;">
            <div class="color-picker-bar">
              <span class="toolbar-title"><el-icon><Brush /></el-icon> 图表颜色自定义</span>
              <div class="picker-group">
                <span>收入:</span>
                <el-color-picker v-model="chartColors.income[0]" size="small" />
                <el-color-picker v-model="chartColors.income[1]" size="small" />
              </div>
              <div class="picker-group">
                <span>支出:</span>
                <el-color-picker v-model="chartColors.expense[0]" size="small" />
                <el-color-picker v-model="chartColors.expense[1]" size="small" />
              </div>
              <div class="picker-group">
                <span>净收益:</span>
                <el-color-picker v-model="chartColors.net" size="small" />
              </div>
              <el-button type="primary" size="small" @click="refreshAllCharts">应用颜色</el-button>
            </div>
          </el-card>

          <el-row :gutter="20" style="margin-top: 20px;">
            <!-- 收支趋势图（折线+柱状） -->
            <el-col :span="16">
              <el-card class="chart-card">
                <template #header>
                  <div class="chart-header">
                    <div>
                      <span class="chart-title">收支趋势分析</span>
                      <span v-if="trendGranularity === 'week' && currentWeekRange" class="chart-subtitle">({{ currentWeekRange }})</span>
                    </div>
                    <el-radio-group v-model="trendGranularity" size="small" @change="fetchTrendData">
                      <el-radio-button label="week">周</el-radio-button>
                      <el-radio-button label="month">月</el-radio-button>
                      <el-radio-button label="year">年</el-radio-button>
                    </el-radio-group>
                  </div>
                </template>
                <div ref="trendChartRef" class="chart-container" style="height:400px;"></div>
              </el-card>
            </el-col>

            <!-- 支出占比饼图 -->
            <el-col :span="8">
              <el-card class="chart-card">
                <template #header>
                  <div class="chart-header">
                    <span class="chart-title">支出分类占比</span>
                    <el-date-picker 
                      v-model="statsMonth" 
                      type="month" 
                      size="small"
                      placeholder="选择月份" 
                      format="YYYY-MM" 
                      value-format="YYYY-MM" 
                      style="width: 120px"
                    />
                  </div>
                </template>
                <div ref="chartRef" class="chart-container" style="height:400px;"></div>
              </el-card>
            </el-col>
          </el-row>
        </div>

        <!-- 账单导入页面 -->
        <div v-if="activePage === '4'" class="page-content">
          <el-card class="import-card">
            <div class="import-tip">
              <el-alert
                title="导入说明"
                type="info"
                description="支持支付宝和微信导出的对账单。系统会自动识别分类并去除重复账单。"
                show-icon
                :closable="false"
              />
            </div>
            
            <div class="ai-switch-container">
              <span class="ai-switch-label">使用 AI 智能分类</span>
              <el-switch
                v-model="useAIClassify"
                inline-prompt
                active-text="开启"
                inactive-text="关闭"
              />
              <span class="ai-switch-desc">开启后将调用大模型，分类更加精准（处理速度视模型而定）</span>
            </div>

            <div class="upload-container">
              <el-upload
                class="bill-uploader"
                drag
                :action="API_BASE + '/api/bills/import'"
                :headers="{ Authorization: 'Bearer ' + token }"
                :on-success="handleUploadSuccess"
                :on-error="handleUploadError"
                :before-upload="beforeUpload"
                :data="{ use_ai: useAIClassify }"
                multiple
                name="file"
                accept=".csv, .xlsx, .xls"
              >
                <el-icon class="el-icon--upload"><upload-filled /></el-icon>
                <div class="el-upload__text">
                  将文件拖到此处，或 <em>点击上传</em>
                </div>
                <template #tip>
                  <div class="el-upload__tip">
                    只能上传 CSV 文件，建议单次上传文件不超过 10MB
                  </div>
                </template>
              </el-upload>
            </div>

            <!-- 导入结果统计 -->
            <div v-if="importResults" class="import-results">
              <el-divider>最近一次导入结果</el-divider>
              <el-row :gutter="20">
                <el-col :span="12">
                  <el-statistic title="成功导入" :value="importResults.imported" />
                </el-col>
                <el-col :span="12">
                  <el-statistic title="重复/跳过" :value="importResults.duplicate" />
                </el-col>
              </el-row>
            </div>
          </el-card>
        </div>

        <!-- 周期管理页面 -->
        <div v-if="activePage === '5'" class="page-content">
          <el-row :gutter="20">
            <!-- 添加周期规则 -->
            <el-col :span="8">
              <el-card class="box-card">
                <template #header><div class="card-header"><span>新增周期任务</span></div></template>
                <el-form :model="recurringForm" :rules="recurringRules" ref="recurringFormRef" label-position="top">
                  <el-form-item label="收支类型" prop="type">
                    <el-radio-group v-model="recurringForm.type">
                      <el-radio label="income">收入</el-radio>
                      <el-radio label="expense">支出</el-radio>
                    </el-radio-group>
                  </el-form-item>
                  <el-form-item label="分类" prop="category_id">
                    <el-select v-model="recurringForm.category_id" placeholder="请选择分类" style="width:100%">
                      <el-option v-for="c in categories.filter(x => x.type === recurringForm.type)" :key="c.id" :label="c.name" :value="c.id" />
                    </el-select>
                  </el-form-item>
                  <el-form-item label="金额" prop="amount">
                    <el-input v-model.number="recurringForm.amount" type="number" placeholder="0.00" />
                  </el-form-item>
                  <el-form-item label="周期" prop="period">
                    <el-select v-model="recurringForm.period" style="width:100%">
                      <el-option label="每天" value="daily" />
                      <el-option label="每周" value="weekly" />
                      <el-option label="每月" value="monthly" />
                      <el-option label="每年" value="yearly" />
                    </el-select>
                  </el-form-item>
                  <el-form-item label="下次执行日期" prop="next_date">
                    <el-date-picker v-model="recurringForm.next_date" type="date" value-format="YYYY-MM-DD" style="width:100%" />
                  </el-form-item>
                  <el-form-item label="备注">
                    <el-input v-model="recurringForm.remark" type="textarea" />
                  </el-form-item>
                  <el-button type="primary" @click="handleCreateRecurring" block>保存规则</el-button>
                </el-form>
              </el-card>
            </el-col>
            <!-- 规则列表 -->
            <el-col :span="16">
              <el-card class="box-card">
                <template #header><div class="card-header"><span>我的周期规则</span></div></template>
                <el-table :data="recurringList" style="width: 100%" empty-text="暂无周期规则">
                  <el-table-column prop="type" label="类型" width="80">
                    <template #default="s"><el-tag :type="s.row.type === 'income' ? 'success' : 'danger'">{{ s.row.type === 'income' ? '收入' : '支出' }}</el-tag></template>
                  </el-table-column>
                  <el-table-column prop="category_name" label="分类" />
                  <el-table-column prop="amount" label="金额">
                    <template #default="s">￥{{ s.row.amount.toFixed(2) }}</template>
                  </el-table-column>
                  <el-table-column prop="period" label="周期">
                    <template #default="s">{{ {daily:'每天', weekly:'每周', monthly:'每月', yearly:'每年'}[s.row.period] }}</template>
                  </el-table-column>
                  <el-table-column prop="next_date" label="下次执行" />
                  <el-table-column label="操作" width="100">
                    <template #default="s">
                      <el-button type="danger" size="small" @click="handleDeleteRecurring(s.row.id)">删除</el-button>
                    </template>
                  </el-table-column>
                </el-table>
              </el-card>
            </el-col>
          </el-row>
        </div>

        <!-- 修改账单弹窗 -->
        <el-dialog
          v-model="editDialogVisible"
          title="修改账单"
          width="600px"
          class="edit-dialog"
          :close-on-click-modal="false"
        >
          <el-form
            :model="billForm"
            :rules="billRules"
            ref="billFormRef"
            label-width="100px"
            class="edit-form"
          >
            <el-form-item label="收支类型" prop="type">
              <el-radio-group v-model="billForm.type" class="radio-group">
                <el-radio label="收入" border class="radio-item">收入</el-radio>
                <el-radio label="支出" border class="radio-item">支出</el-radio>
              </el-radio-group>
            </el-form-item>
            <el-form-item label="分类" prop="category">
              <el-select v-model="billForm.category" placeholder="请选择分类" class="form-select">
                <el-option
                  v-for="item in formCategories"
                  :key="item.id"
                  :label="item.name"
                  :value="item.id"
                ></el-option>
              </el-select>
            </el-form-item>
            <el-form-item label="金额(元)" prop="amount">
              <el-input
                v-model.number="billForm.amount"
                type="number"
                placeholder="请输入金额"
                class="form-input"
                step="0.01"
                precision="2"
              ></el-input>
            </el-form-item>
            <el-form-item label="日期" prop="date">
              <el-date-picker
                v-model="billForm.date"
                type="date"
                placeholder="选择日期"
                format="YYYY-MM-DD"
                value-format="YYYY-MM-DD"
                class="form-input"
              ></el-date-picker>
            </el-form-item>
            <el-form-item label="备注" prop="remark">
              <el-input
                v-model="billForm.remark"
                type="textarea"
                placeholder="请输入备注（选填）"
                class="form-textarea"
                :rows="3"
              ></el-input>
            </el-form-item>
          </el-form>
          <template #footer>
            <el-button @click="editDialogVisible = false" class="cancel-btn">取消</el-button>
            <el-button type="primary" @click="handleEditSubmit" class="confirm-btn">
              <el-icon><Check /></el-icon> 确认修改
            </el-button>
          </template>
        </el-dialog>
      </el-main>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { 
  Menu, Plus, Wallet, User, Search, Refresh, Edit, Delete, 
  Check, DataAnalysis, Upload, UploadFilled, Calendar
} from '@element-plus/icons-vue'
import dayjs from 'dayjs'
import * as echarts from 'echarts'

// 侧边栏切换页面
const activePage = ref('1')
const router = useRouter()
const handleMenuSelect = (index) => {
  activePage.value = index
  if (index === '2') {
    resetForm()
  }
  if (index === '3') {
    fetchMonthlyOverview()
    fetchCategoryRatio()
    fetchTrendData()
  }
  if (index === '5') {
    fetchRecurringBills()
  }
}

// 账单分类（从后端获取）
const categories = ref([])

// 账单数据（从后端获取）
const billList = ref([])
const totalBills = ref(0)

onMounted(() => {
  document.body.classList.add('full-width-app')
  fetchCategories()
  fetchBills()
  // 页面加载时自动处理本用户到期的周期账单
  processRecurringOnLoad()
})

onUnmounted(() => {
  document.body.classList.remove('full-width-app')
})

// 筛选表单（category 存储 category_id）
const filterForm = reactive({
  month: '',
  type: '',
  category: ''
})

// 分页参数
const pagination = reactive({
  currentPage: 1,
  pageSize: 10
})

const API_BASE = 'http://localhost:3000'
const token = localStorage.getItem('token') || ''
const username = ref(localStorage.getItem('username') || '普通用户')

const handleLogout = () => {
  ElMessageBox.confirm(
    '确定要退出登录吗？',
    '提示',
    {
      confirmButtonText: '退出',
      cancelButtonText: '取消',
      type: 'warning'
    }
  ).then(() => {
    localStorage.removeItem('token')
    localStorage.removeItem('username')
    localStorage.removeItem('isLoggedIn')
    localStorage.removeItem('rememberMe')
    ElMessage.success('您已退出登录')
    router.push('/login')
  }).catch(() => {})
}

// 统计相关
const statsMonth = ref(new Date().toISOString().slice(0,7))
const statsData = ref([])
const statsTotal = ref(0)
const trendGranularity = ref('month')
const currentWeekRange = ref('')
const chartRef = ref(null)
const trendChartRef = ref(null)
let chartInstance = null
let trendChartInstance = null

// 首页概览数据
const monthlyOverview = reactive({
  income: 0,
  expense: 0,
  balance: 0
})

const statOverviewCards = computed(() => [
  { title: '本月总收入', value: '￥' + monthlyOverview.income.toFixed(2), icon: 'ArrowUpBold', type: 'income' },
  { title: '本月总支出', value: '￥' + monthlyOverview.expense.toFixed(2), icon: 'ArrowDownBold', type: 'expense' },
  { title: '当前结余', value: '￥' + monthlyOverview.balance.toFixed(2), icon: 'Wallet', type: 'balance' },
  { title: '分类数', value: categories.value.length, icon: 'Menu', type: 'info' }
])

// 渐变色配置（响应式，支持自定义）
const chartColors = reactive({
  income: ['#84fab0', '#8fd3f4'],
  expense: ['#ff9a9e', '#fecfef'],
  net: '#6366f1',
  pie: ['#5470c6', '#91cc75', '#fac858', '#ee6666', '#73c0de', '#3ba272', '#fc8452', '#9a60b4', '#ea7ccc']
})

const fetchMonthlyOverview = async () => {
  try {
    const res = await fetch(`${API_BASE}/api/stat/monthly`, {
      headers: token ? { Authorization: 'Bearer ' + token } : {}
    })
    const data = await res.json()
    if (res.ok) {
      monthlyOverview.income = data.total_income
      monthlyOverview.expense = data.total_expense
      monthlyOverview.balance = data.balance
    }
  } catch (err) {
    console.error('fetchMonthlyOverview error', err)
  }
}

const fetchCategoryRatio = async () => {
  try {
    const params = new URLSearchParams()
    if (statsMonth.value) params.append('month', statsMonth.value)
    const res = await fetch(`${API_BASE}/api/stat/category-ratio?${params.toString()}`, {
      headers: token ? { Authorization: 'Bearer ' + token } : {}
    })
    const data = await res.json()
    if (!res.ok) {
      ElMessage.error(data.error || '获取分类占比失败')
      return
    }
    statsData.value = data.map(r => ({ name: r.category_name, value: Number(r.value) }))
    statsTotal.value = statsData.value.reduce((s, i) => s + (i.value || 0), 0)
    await nextTick()
    renderChart()
  } catch (err) {
    console.error('fetchCategoryRatio error', err)
    ElMessage.error('无法连接到服务器')
  }
}

const renderChart = () => {
  if (!chartRef.value) return
  if (!chartInstance) chartInstance = echarts.init(chartRef.value)
  const option = {
    tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)' },
    legend: { bottom: '5%', left: 'center', itemWidth: 10, itemHeight: 10 },
    series: [
      {
        name: '支出分类',
        type: 'pie',
        radius: ['50%', '70%'],
        avoidLabelOverlap: false,
        itemStyle: { borderRadius: 10, borderColor: '#fff', borderWidth: 2 },
        label: { show: false, position: 'center' },
        emphasis: { label: { show: true, fontSize: '20', fontWeight: 'bold' } },
        labelLine: { show: false },
        data: statsData.value
      }
    ]
  }
  chartInstance.setOption(option)
}

const fetchTrendData = async () => {
  try {
    const res = await fetch(`${API_BASE}/api/stat/trend?granularity=${trendGranularity.value}`, {
      headers: token ? { Authorization: 'Bearer ' + token } : {}
    })
    const responseData = await res.json()
    if (!res.ok) return
    
    if (trendGranularity.value === 'week') {
      currentWeekRange.value = responseData.weekRange
      renderTrendChart(responseData.data)
    } else {
      currentWeekRange.value = ''
      renderTrendChart(responseData)
    }
  } catch (err) {
    console.error('fetchTrendData error', err)
  }
}

const renderTrendChart = (data) => {
  if (!trendChartRef.value) return
  if (!trendChartInstance) trendChartInstance = echarts.init(trendChartRef.value)
  
  const option = {
    grid: { left: '5%', right: '5%', bottom: '10%', top: '20%', containLabel: true },
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    legend: { top: '5%', data: ['收入', '支出', '净收益'] },
    xAxis: { 
      type: 'category', 
      data: data.map(i => i.period),
      axisLabel: { margin: 15 }
    },
    yAxis: { type: 'value' },
    series: [
      { 
        name: '收入', 
        type: 'bar', 
        barWidth: '20%',
        itemStyle: { 
          borderRadius: [4, 4, 0, 0],
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: chartColors.income[0] },
            { offset: 1, color: chartColors.income[1] }
          ])
        },
        data: data.map(i => i.income) 
      },
      { 
        name: '支出', 
        type: 'bar', 
        barWidth: '20%',
        itemStyle: { 
          borderRadius: [4, 4, 0, 0],
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: chartColors.expense[0] },
            { offset: 1, color: chartColors.expense[1] }
          ])
        },
        data: data.map(i => i.expense) 
      },
      {
        name: '净收益',
        type: 'line',
        smooth: true,
        symbolSize: 8,
        itemStyle: { color: chartColors.net },
        lineStyle: { width: 3, shadowColor: 'rgba(99, 102, 241, 0.3)', shadowBlur: 10 },
        data: data.map(i => (i.income - i.expense).toFixed(2))
      }
    ]
  }
  trendChartInstance.setOption(option)
}

const refreshAllCharts = () => {
  fetchCategoryRatio()
  fetchTrendData()
}

watch(activePage, (newVal) => {
  if (newVal === '3') {
    nextTick(() => {
      fetchMonthlyOverview()
      fetchCategoryRatio()
      fetchTrendData()
    })
  }
})

watch(statsMonth, () => fetchCategoryRatio())

// 获取分类
const fetchCategories = async () => {
  try {
    const res = await fetch(`${API_BASE}/api/categories`)
    const data = await res.json()
    if (!res.ok) {
      ElMessage.error('获取分类失败')
      return
    }
    // 去重（以 type+name 为准），并按 type/name 排序
    const map = new Map()
    data.forEach(c => {
      if (c && c.name) {
        const key = `${c.type}|${c.name}`
        if (!map.has(key)) map.set(key, c)
      }
    })
    categories.value = Array.from(map.values()).sort((a, b) => {
      if (a.type === b.type) return a.name.localeCompare(b.name)
      return a.type.localeCompare(b.type)
    })
  } catch (err) {
    console.error('fetchCategories error', err)
    ElMessage.error('无法获取分类')
  }
}

// 获取账单列表
const fetchBills = async () => {
  try {
    const params = new URLSearchParams()
    params.append('page', pagination.currentPage)
    params.append('limit', pagination.pageSize)
    if (filterForm.month) params.append('month', filterForm.month)
    if (filterForm.type) params.append('type', filterForm.type === '收入' ? 'income' : 'expense')
    if (filterForm.category) params.append('category_id', filterForm.category)

    const res = await fetch(`${API_BASE}/api/bills?${params.toString()}`, {
      headers: token ? { 'Authorization': 'Bearer ' + token } : {}
    })
    const data = await res.json()
    if (!res.ok) {
      ElMessage.error(data.error || '获取账单失败')
      return
    }
    // 后端返回 data.data 和 pagination
    billList.value = data.data.map(item => ({ ...item, type: item.type === 'income' ? '收入' : '支出' }))
    totalBills.value = data.pagination?.total || 0
  } catch (err) {
    console.error('fetchBills error', err)
    ElMessage.error('无法连接到服务器')
  }
}

// 筛选事件
const handleFilter = () => {
  pagination.currentPage = 1
  fetchBills()
}

// 重置筛选条件
const resetFilter = () => {
  filterForm.month = ''
  filterForm.type = ''
  filterForm.category = ''
  pagination.currentPage = 1
  fetchBills()
}

// 分页事件
const handleSizeChange = (val) => {
  pagination.pageSize = val
  fetchBills()
}
const handleCurrentChange = (val) => {
  pagination.currentPage = val
  fetchBills()
}

// 账单表单
const billFormRef = ref(null)
const billForm = reactive({
  id: '',
  type: '',
  category: '',
  amount: '',
  date: '',
  remark: ''
})

// 根据筛选类型动态过滤分类（筛选下拉使用）
const filterCategories = computed(() => {
  if (!filterForm.type) return categories.value
  const t = filterForm.type === '收入' ? 'income' : 'expense'
  return categories.value.filter(c => c.type === t)
})

// 根据表单选择的类型动态过滤分类（添加/编辑表单使用）
const formCategories = computed(() => {
  if (!billForm.type) return categories.value
  const t = billForm.type === '收入' ? 'income' : 'expense'
  return categories.value.filter(c => c.type === t)
})

// 表单校验规则
const billRules = {
  type: [{ required: true, message: '请选择收支类型', trigger: 'change' }],
  category: [{ required: true, message: '请选择分类', trigger: 'change' }],
  amount: [
    { required: true, message: '请输入金额', trigger: 'blur' },
    { type: 'number', min: 0.01, message: '金额必须大于0', trigger: 'blur' }
  ],
  date: [{ required: true, message: '请选择日期', trigger: 'change' }]
}

// 重置表单
const resetForm = () => {
  billFormRef.value?.resetFields()
  billForm.id = ''
  billForm.type = ''
  billForm.category = ''
  billForm.amount = ''
  billForm.date = ''
  billForm.remark = ''
}

// 提交添加账单
const handleSubmit = async () => {
  billFormRef.value.validate(async (valid) => {
    if (!valid) {
      ElMessage.error('请完善表单信息')
      return false
    }
    try {
      const body = {
        type: billForm.type === '收入' ? 'income' : 'expense',
        amount: Number(billForm.amount),
        category_id: billForm.category || null,
        date: billForm.date,
        remark: billForm.remark
      }
      const res = await fetch(`${API_BASE}/api/bills`, {
        method: 'POST',
        headers: Object.assign({ 'Content-Type': 'application/json' }, token ? { Authorization: 'Bearer ' + token } : {}),
        body: JSON.stringify(body)
      })
      const data = await res.json()
      if (!res.ok) {
        ElMessage.error(data.error || '添加失败')
        return
      }
      ElMessage.success('账单添加成功')
      activePage.value = '1'
      resetForm()
      fetchBills()
    } catch (err) {
      console.error('handleSubmit error', err)
      ElMessage.error('无法连接到服务器')
    }
  })
}

// 修改账单相关
const editDialogVisible = ref(false)
const handleEdit = (row) => {
  billForm.id = row.id
  billForm.type = row.type === '收入' ? '收入' : '支出'
  billForm.category = row.category_id || ''
  billForm.amount = row.amount
  billForm.date = row.date
  billForm.remark = row.remark
  editDialogVisible.value = true
}

// 提交修改账单
const handleEditSubmit = async () => {
  billFormRef.value.validate(async (valid) => {
    if (!valid) {
      ElMessage.error('请完善表单信息')
      return false
    }
    try {
      const body = {
        type: billForm.type === '收入' ? 'income' : 'expense',
        amount: Number(billForm.amount),
        category_id: billForm.category || null,
        date: billForm.date,
        remark: billForm.remark
      }
      const res = await fetch(`${API_BASE}/api/bills/${billForm.id}`, {
        method: 'PUT',
        headers: Object.assign({ 'Content-Type': 'application/json' }, token ? { Authorization: 'Bearer ' + token } : {}),
        body: JSON.stringify(body)
      })
      const data = await res.json()
      if (!res.ok) {
        ElMessage.error(data.error || '更新失败')
        return
      }
      ElMessage.success('账单修改成功')
      editDialogVisible.value = false
      fetchBills()
    } catch (err) {
      console.error('handleEditSubmit error', err)
      ElMessage.error('无法连接到服务器')
    }
  })
}

// 删除账单
const handleDelete = (id) => {
  ElMessageBox.confirm(
    '确定要删除该账单吗？',
    '提示',
    {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    }
  ).then(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/bills/${id}`, {
        method: 'DELETE',
        headers: token ? { Authorization: 'Bearer ' + token } : {}
      })
      const data = await res.json()
      if (!res.ok) {
        ElMessage.error(data.error || '删除失败')
        return
      }
      ElMessage.success('账单删除成功')
      fetchBills()
    } catch (err) {
      console.error('handleDelete error', err)
      ElMessage.error('无法连接到服务器')
    }
  }).catch(() => {
    ElMessage.info('已取消删除')
  })
}

// 账单导入相关逻辑
const importResults = ref(null)
const useAIClassify = ref(false) // 是否使用AI辅助分类，默认关闭

/**
 * 上传前的校验
 * @param {File} file - 待上传的文件
 */
const beforeUpload = (file) => {
  const isCSV = file.name.toLowerCase().endsWith('.csv')
  const isExcel = file.name.toLowerCase().endsWith('.xlsx') || file.name.toLowerCase().endsWith('.xls')
  const isLt10M = file.size / 1024 / 1024 < 10

  if (!isCSV && !isExcel) {
    ElMessage.error('只能上传 CSV 或 Excel 格式的文件')
    return false
  }
  if (!isLt10M) {
    ElMessage.error('文件大小不能超过 10MB')
    return false
  }
  return true
}

/**
 * 上传成功处理程序
 * @param {Object} response - 后端返回的 JSON 数据
 */
const handleUploadSuccess = (response) => {
  ElMessage.success('账单解析并导入完成')
  importResults.value = {
    imported: response.imported,
    duplicate: response.duplicate
  }
  // 导入成功后刷新账单列表
  if (activePage.value === '4') {
    // 延迟切换到列表页，让用户看清统计结果
    setTimeout(() => {
      activePage.value = '1'
      fetchBills()
    }, 2000)
  }
}

/**
 * 上传失败处理程序
 * @param {Error} err - 错误对象
 */
const handleUploadError = (err) => {
  console.error('Upload error:', err)
  try {
    const errorData = JSON.parse(err.message)
    ElMessage.error(errorData.error || '上传或解析失败')
  } catch (e) {
    ElMessage.error('无法连接到服务器或文件解析出错')
  }
}

// --- 周期性账单相关逻辑 ---

const recurringList = ref([])
const recurringFormRef = ref(null)
const recurringForm = reactive({
  type: 'expense',
  category_id: '',
  amount: '',
  period: 'monthly',
  next_date: dayjs().format('YYYY-MM-DD'),
  remark: ''
})

const recurringRules = {
  amount: [{ required: true, message: '请输入金额', trigger: 'blur' }],
  next_date: [{ required: true, message: '请选择开始日期', trigger: 'change' }]
}

const fetchRecurringBills = async () => {
  const res = await fetch(`${API_BASE}/api/recurring-bills`, {
    headers: token ? { Authorization: 'Bearer ' + token } : {}
  })
  if (res.ok) recurringList.value = await res.json()
}

const handleCreateRecurring = async () => {
  recurringFormRef.value.validate(async (valid) => {
    if (!valid) return
    const res = await fetch(`${API_BASE}/api/recurring-bills`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
      body: JSON.stringify(recurringForm)
    })
    if (res.ok) {
      ElMessage.success('周期规则已创建')
      fetchRecurringBills()
      // 清空部分表单
      recurringForm.amount = ''
      recurringForm.remark = ''
    }
  })
}

const handleDeleteRecurring = async (id) => {
  await ElMessageBox.confirm('确定要删除该周期规则吗？')
  const res = await fetch(`${API_BASE}/api/recurring-bills/${id}`, {
    method: 'DELETE',
    headers: { Authorization: 'Bearer ' + token }
  })
  if (res.ok) {
    ElMessage.success('规则已删除')
    fetchRecurringBills()
  }
}

const processRecurringOnLoad = async () => {
  if (!token) return
  await fetch(`${API_BASE}/api/recurring-bills/process`, {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + token }
  })
  // 处理完如果有新生成的账单，刷新一下列表
  fetchBills()
}

  onUnmounted(() => {
    if (chartInstance) {
      chartInstance.dispose()
      chartInstance = null
    }
    if (trendChartInstance) {
      trendChartInstance.dispose()
      trendChartInstance = null
    }
  })
</script>

<style scoped>
/* 全局布局 - 确保全屏 */
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

html, body {
  height: 100%;
  overflow: hidden;
}

.app-container {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background-color: #f5f7fa;
  width: 100%;
  box-sizing: border-box;
}

/* 在 full-width 模式下取消内部所有卡片的圆角 */
:deep(body.full-width-app) .filter-card,
:deep(body.full-width-app) .bill-table,
:deep(body.full-width-app) .form-card {
  border-radius: 0 !important;
}

/* 在 full-width 模式下使添加/编辑表单卡片横向铺满 */
:deep(body.full-width-app) .form-card {
  max-width: none !important;
  width: 100% !important;
  margin: 0 !important;
  border-radius: 0 !important;
}

:deep(body.full-width-app) .page-content {
  width: 100% !important;
  padding-left: 20px !important;
  padding-right: 20px !important;
}

/* 顶栏样式 */
.header {
  background: linear-gradient(135deg, #409eff 0%, #66b1ff 100%);
  color: white;
  padding: 0 20px;
  height: 64px !important;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
  z-index: 10;
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  height: 100%;
}

.logo {
  display: flex;
  align-items: center;
  gap: 10px;
}

.logo-text {
  font-size: 18px;
  font-weight: 600;
  letter-spacing: 1px;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 14px;
}

.logout-btn {
  border-color: rgba(255, 255, 255, 0.6);
  color: #fff;
}

.logout-btn:hover {
  border-color: #fff;
  color: #fff;
  background-color: rgba(255, 255, 255, 0.15);
}

/* 主内容布局 */
.main-content {
  display: flex;
  flex: 1;
  overflow: hidden;
}

/* 侧边栏样式 */
.sidebar {
  width: 200px !important;
  background-color: #2c3e50;
  box-shadow: 2px 0 12px 0 rgba(0, 0, 0, 0.05);
  transition: all 0.3s ease;
}

.sidebar-menu {
  height: 100%;
  border-right: none;
}

.el-menu-item {
  transition: all 0.2s ease;
}

.el-menu-item:hover {
  background-color: #1abc9c !important;
}

/* 主内容区样式 */
.content {
  flex: 1;
  padding: 20px;
  overflow-y: auto;
  background-color: #f5f7fa;
  scrollbar-gutter: stable;
}

/* 页面标题 */
.page-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 20px;
}

.page-title {
  font-size: 20px;
  font-weight: 600;
  color: #303133;
}

.page-desc {
  font-size: 14px;
  color: #909399;
}

/* 导入页面样式 */
.import-card {
  padding: 20px;
  border-radius: 8px;
}

.import-tip {
  margin-bottom: 24px;
}

.ai-switch-container {
  display: flex;
  align-items: center;
  margin-bottom: 20px;
  padding: 15px;
  background-color: #f6f8fb;
  border-radius: 8px;
  border: 1px dashed #dcdfe6;
}

.ai-switch-label {
  margin-right: 15px;
  font-weight: 600;
  color: #303133;
}

.ai-switch-desc {
  margin-left: 15px;
  color: #909399;
  font-size: 13px;
}

.upload-container {
  display: flex;
  justify-content: center;
  padding: 40px 0;
}

.bill-uploader {
  width: 100%;
  max-width: 600px;
}

.import-results {
  margin-top: 30px;
  text-align: center;
}

:deep(.el-statistic__title) {
  font-size: 16px;
  margin-bottom: 8px;
}

:deep(.el-statistic__content) {
  font-size: 24px;
  font-weight: bold;
  color: #409eff;
}

/* 页面内容容器 */
.page-content {
  width: 100%;
}

.pie-chart {
  width: 100%;
  height: 420px;
}

/* 筛选卡片样式 */
.filter-card {
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.05);
  padding: 15px;
  transition: all 0.3s ease;
}

.filter-card:hover {
  box-shadow: 0 4px 16px 0 rgba(0, 0, 0, 0.08);
}

.filter-form {
  width: 100%;
}

.filter-input {
  width: 180px;
}

.filter-btn, .reset-btn {
  padding: 8px 20px;
  border-radius: 4px;
  transition: all 0.2s ease;
}

.filter-btn:hover {
  background-color: #337ecc;
}

/* 账单表格样式 */
.bill-table {
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.05);
}

.income-amount {
  color: #67c23a;
  font-weight: 600;
}

.expense-amount {
  color: #f56c6c;
  font-weight: 600;
}

.edit-btn, .delete-btn {
  transition: all 0.2s ease;
}

.edit-btn:hover {
  background-color: #337ecc;
}

.delete-btn:hover {
  background-color: #e4393c;
}

/* 分页样式 */
.pagination {
  margin-top: 20px;
}

/* 表单卡片样式 */
.form-card {
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.05);
  padding: 20px;
  max-width: 800px;
  margin: 0 auto;
}

/* 确保添加/编辑页面的卡片在页面内容容器中横向铺满 */
.page-content .form-card {
  max-width: none !important;
  width: 100% !important;
  margin: 0 !important;
  border-radius: 0 !important;
  padding-left: 20px !important;
  padding-right: 20px !important;
}

.bill-form {
  width: 100%;
}

.radio-group {
  display: flex;
  gap: 20px;
}

.radio-item {
  padding: 8px 20px;
}

.form-select, .form-input {
  width: 100%;
  padding: 8px;
  border-radius: 4px;
}

.form-textarea {
  width: 100%;
  border-radius: 4px;
}

.form-btn-group {
  display: flex;
  gap: 10px;
  margin-top: 10px;
}

.submit-btn, .reset-form-btn {
  padding: 10px 30px;
  border-radius: 4px;
  transition: all 0.2s ease;
}

.submit-btn:hover {
  background-color: #337ecc;
}

/* 空页面样式 */
.empty-page {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 400px;
}

/* 弹窗样式 */
.edit-dialog {
  border-radius: 8px;
  overflow: hidden;
}

.edit-form {
  width: 100%;
}

.cancel-btn, .confirm-btn {
  padding: 8px 20px;
  border-radius: 4px;
  transition: all 0.2s ease;
}

.confirm-btn:hover {
  background-color: #337ecc;
}

/* 响应式适配 */
@media (max-width: 768px) {
  .sidebar {
    width: 60px !important;
  }

  .el-menu-item span {
    display: none;
  }

  .filter-form {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .filter-input {
    width: 100%;
  }
}
/* 统计页面样式 */
.stat-overview-card {
  transition: all 0.3s ease;
  border: none;
  border-radius: 12px;
}
.stat-overview-card:hover {
  transform: translateY(-5px);
}
.stat-card-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.stat-card-title {
  font-size: 14px;
  color: #909399;
  margin: 0;
}
.stat-card-value {
  font-size: 24px;
  font-weight: bold;
  margin: 8px 0 0 0;
}
.stat-card-icon {
  font-size: 32px;
  opacity: 0.8;
}
.stat-card-value.income { color: #67C23A; }
.stat-card-value.expense { color: #F56C6C; }
.stat-card-value.balance { color: #409EFF; }
.stat-card-icon.income { color: #67C23A; }
.stat-card-icon.expense { color: #F56C6C; }
.stat-card-icon.balance { color: #409EFF; }

.chart-card {
  border-radius: 12px;
  border: none;
  box-shadow: 0 4px 12px rgba(0,0,0,0.05);
}
.chart-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.chart-title {
  font-size: 16px;
  font-weight: bold;
  color: #303133;
}
.chart-subtitle {
  font-size: 12px;
  color: #909399;
  margin-left: 8px;
  font-weight: normal;
}
.color-picker-bar {
  display: flex;
  align-items: center;
  gap: 20px;
  flex-wrap: wrap;
}
.toolbar-title {
  font-size: 14px;
  font-weight: bold;
  color: #606266;
  display: flex;
  align-items: center;
  gap: 5px;
}
.picker-group {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: #606266;
}
</style>