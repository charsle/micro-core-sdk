/**
 * 应用全局状态管理（Core 包）
 *
 * 提供工厂函数 createAppStore()，支持自定义配置。
 * 基座直接调用 createAppStore() 创建 Pinia store 实例。
 *
 * 职责：
 * - 认证状态：token、userInfo、permissions、roles
 * - 页签管理：tabs 列表、activeTabKey，支持 localStorage 持久化
 * - 权限判断：hasPermission / hasRole
 * - 侧边栏折叠状态
 */

import { defineStore } from 'pinia'
import { ref, watch } from 'vue'
import type { TabItem, UserInfo } from '../types'

/** 子应用动态菜单项（子应用通过事件总线上报） */
export interface DynamicMenuEntry {
  appName: string
  menus: Array<{ path: string; title: string; icon?: string; permission?: string; children?: Array<{ path: string; title: string }> }>
}

export interface AppStoreOptions {
  /** localStorage key 前缀 */
  storagePrefix?: string
  /** 首页页签配置 */
  dashboardTab?: TabItem
}

// ===== 默认首页页签 =====
const DEFAULT_DASHBOARD_TAB: TabItem = {
  key: 'Dashboard',
  title: '首页',
  path: '/dashboard',
  name: 'Dashboard',
  affix: true,
}

/**
 * 创建应用 Store（工厂函数）
 *
 * 使用方式：
 *   const useAppStore = createAppStore()
 *   // 或自定义
 *   const useAppStore = createAppStore({ storagePrefix: 'my_app_' })
 */
export function createAppStore(options: AppStoreOptions = {}) {
  const {
    storagePrefix = 'micro_',
    dashboardTab = DEFAULT_DASHBOARD_TAB,
  } = options

  const TABS_STORAGE_KEY = `${storagePrefix}tabs`
  const ACTIVE_TAB_KEY = `${storagePrefix}active_tab`

  function loadTabs(): TabItem[] {
    try {
      const raw = localStorage.getItem(TABS_STORAGE_KEY)
      if (raw) {
        const tabs = JSON.parse(raw) as TabItem[]
        if (!tabs.find((t) => t.key === dashboardTab.key)) {
          tabs.unshift({ ...dashboardTab })
        }
        return tabs
      }
    } catch { /* ignore */ }
    return [{ ...dashboardTab }]
  }

  function saveTabs(tabs: TabItem[]) {
    try {
      localStorage.setItem(TABS_STORAGE_KEY, JSON.stringify(tabs))
    } catch { /* ignore */ }
  }

  function loadActiveTab(): string {
    return localStorage.getItem(ACTIVE_TAB_KEY) || dashboardTab.key
  }

  function saveActiveTab(key: string) {
    localStorage.setItem(ACTIVE_TAB_KEY, key)
  }

  return defineStore('app', () => {
    const token = ref<string>(localStorage.getItem('token') || '')
    const userInfo = ref<UserInfo | null>(null)
    const permissions = ref<string[]>([])
    const roles = ref<string[]>([])
    const sidebarCollapsed = ref(false)

    const tabs = ref<TabItem[]>(loadTabs())
    const activeTabKey = ref<string>(loadActiveTab())

    // 子应用动态菜单（子应用 mount 时通过事件总线上报）
    const dynamicMenus = ref<DynamicMenuEntry[]>([])

    watch(tabs, (newTabs) => saveTabs(newTabs), { deep: true })
    watch(activeTabKey, (key) => saveActiveTab(key))

    function hasPermission(perm: string): boolean {
      if (roles.value.includes('admin')) return true
      return permissions.value.includes(perm)
    }

    function hasRole(role: string): boolean {
      return roles.value.includes(role)
    }

    function addTab(tab: TabItem) {
      const exists = tabs.value.find((t) => t.key === tab.key)
      if (!exists) tabs.value.push(tab)
      activeTabKey.value = tab.key
    }

    function removeTab(key: string): string {
      const targetIndex = tabs.value.findIndex((t) => t.key === key)
      if (targetIndex === -1) return activeTabKey.value
      const target = tabs.value[targetIndex]
      if (target.affix) return activeTabKey.value
      tabs.value.splice(targetIndex, 1)
      if (activeTabKey.value === key) {
        const nextTab = tabs.value[targetIndex - 1] || tabs.value[targetIndex]
        activeTabKey.value = nextTab?.key || dashboardTab.key
      }
      return activeTabKey.value
    }

    function removeOtherTabs(key: string) {
      tabs.value = tabs.value.filter((t) => t.affix || t.key === key)
      activeTabKey.value = key
    }

    function removeAllTabs(): string {
      tabs.value = tabs.value.filter((t) => t.affix)
      activeTabKey.value = dashboardTab.key
      return activeTabKey.value
    }

    function setActiveTab(key: string) {
      activeTabKey.value = key
    }

    function toggleAffix(key: string) {
      const tab = tabs.value.find((t) => t.key === key)
      if (tab && tab.key !== dashboardTab.key) tab.affix = !tab.affix
    }

    function refreshTab(key: string) {
      const tab = tabs.value.find((t) => t.key === key)
      if (tab) tab.meta = { ...(tab.meta || {}), refreshTimestamp: Date.now() }
    }

    function toggleKeepAlive(key: string) {
      const tab = tabs.value.find((t) => t.key === key)
      if (tab) tab.keepAlive = !tab.keepAlive
    }

    function init() {
      if (token.value) {
        try {
          const payload = parseToken(token.value)
          if (payload) {
            permissions.value = payload.permissions || []
            roles.value = payload.roles || []
          }
        } catch {
          clearAuth()
        }
      }
    }

    function setToken(newToken: string) {
      token.value = newToken
      localStorage.setItem('token', newToken)
    }

    function setUserInfo(info: UserInfo | null) {
      userInfo.value = info
    }

    function clearAuth() {
      token.value = ''
      userInfo.value = null
      permissions.value = []
      roles.value = []
      localStorage.removeItem('token')
      tabs.value = [{ ...dashboardTab }]
      activeTabKey.value = dashboardTab.key
    }

    function toggleSidebar() {
      sidebarCollapsed.value = !sidebarCollapsed.value
    }

    /** 设置指定子应用的动态菜单 */
    function setDynamicMenus(appName: string, menus: DynamicMenuEntry['menus']) {
      const idx = dynamicMenus.value.findIndex((e) => e.appName === appName)
      if (idx >= 0) {
        dynamicMenus.value[idx].menus = menus
      } else {
        dynamicMenus.value.push({ appName, menus })
      }
    }

    /** 清除指定子应用的动态菜单 */
    function removeDynamicMenus(appName: string) {
      const idx = dynamicMenus.value.findIndex((e) => e.appName === appName)
      if (idx >= 0) dynamicMenus.value.splice(idx, 1)
    }

    /** 清除所有动态菜单 */
    function clearDynamicMenus() {
      dynamicMenus.value = []
    }

    return {
      token, userInfo, permissions, roles, sidebarCollapsed,
      tabs, activeTabKey, dynamicMenus,
      hasPermission, hasRole,
      addTab, removeTab, removeOtherTabs, removeAllTabs, setActiveTab,
      toggleAffix, refreshTab, toggleKeepAlive,
      init, setToken, setUserInfo, clearAuth, toggleSidebar,
      setDynamicMenus, removeDynamicMenus, clearDynamicMenus,
    }
  })
}

// ===== Token 解析 =====
interface TokenPayload {
  roles: string[]
  permissions: string[]
  exp: number
}

function parseToken(t: string): TokenPayload | null {
  try {
    const parts = t.split('.')
    if (parts.length !== 3) return null
    const payload = JSON.parse(atob(parts[1]))
    if (payload.exp && payload.exp * 1000 < Date.now()) return null
    return payload
  } catch {
    return null
  }
}
