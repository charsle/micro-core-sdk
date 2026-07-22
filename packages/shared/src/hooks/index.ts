/**
 * Vue Hooks — 给子应用使用的组合式函数
 */

import { ref, onMounted, onUnmounted, computed, watch } from 'vue'
import {
  isMicroAppEnv,
  getGlobalData,
  onGlobalDataChange,
  getCurrentUser,
  hasPermission,
  hasRole,
  getToken,
} from '../utils'
import { getEventBus } from '../utils/event-bus'
import { updatePageTitle } from '../utils/event-bus'
import type { MicroEventBus, BusEvent, EventCallback } from '../types'

// ===== 当前是否在微前端环境 =====
export function useMicroApp() {
  const isMicro = ref(isMicroAppEnv())
  const globalData = ref(getGlobalData())

  let unlisten: (() => void) | null = null

  onMounted(() => {
    unlisten = onGlobalDataChange((data) => {
      globalData.value = { ...globalData.value, ...data }
    })
  })

  onUnmounted(() => {
    unlisten?.()
  })

  return {
    isMicro,
    globalData,
  }
}

// ===== 事件总线 Hook =====
export function useEventBus() {
  const bus: MicroEventBus = getEventBus()
  const events = ref<BusEvent[]>([])
  const unlisteners: (() => void)[] = []

  function on(channel: string, callback: EventCallback) {
    const unlisten = bus.on(channel, callback)
    unlisteners.push(unlisten)
    return unlisten
  }

  function once(channel: string, callback: EventCallback) {
    return bus.once(channel, callback)
  }

  function emit(channel: string, payload?: unknown) {
    bus.emit(channel, payload)
  }

  function off(channel: string, callback?: EventCallback) {
    bus.off(channel, callback)
  }

  onUnmounted(() => {
    unlisteners.forEach((fn) => fn())
    unlisteners.length = 0
  })

  return {
    bus,
    events,
    on,
    once,
    emit,
    off,
  }
}

// ===== 当前用户信息 =====
export function useUser() {
  const user = ref(getCurrentUser())
  const roles = computed(() => user.value?.roles || [])
  const permissions = computed(() => user.value?.permissions || [])
  const isAdmin = computed(() => roles.value.includes('admin'))

  function refresh() {
    user.value = getCurrentUser()
  }

  return {
    user,
    roles,
    permissions,
    isAdmin,
    refresh,
    hasPermission,
    hasRole,
  }
}

// ===== Token 管理 =====
export function useToken() {
  const token = ref(getToken())
  return {
    token,
    refresh: () => { token.value = getToken() },
  }
}

// ===== 页面标题管理 =====
/**
 * 动态设置页签标题
 *
 * 在微前端模式下通知基座更新页签标题；
 * 在独立模式下直接设置 document.title。
 *
 * @example
 * ```ts
 * usePageTitle('用户详情')
 * // 或使用响应式
 * const title = ref('用户详情')
 * usePageTitle(title)
 * ```
 */
export function usePageTitle(title: string | (() => string)) {
  const resolvedTitle = typeof title === 'function' ? computed(title) : ref(title)

  function applyTitle(t: string) {
    updatePageTitle(t)
  }

  // 初始设置
  applyTitle(resolvedTitle.value)

  // 如果是 ref，监听变化
  if (typeof title !== 'function') {
    watch(resolvedTitle, (newTitle) => {
      applyTitle(newTitle)
    })
  }

  return {
    /** 手动刷新标题 */
    refresh: () => applyTitle(resolvedTitle.value),
  }
}

// ===== 权限判断 =====
/**
 * 组件内权限判断 Hook
 *
 * 提供响应式的权限和角色检查能力。
 *
 * @example
 * ```ts
 * const { can, canAny, isAdmin } = usePermission()
 *
 * // 检查单个权限
 * if (can('user:delete')) { ... }
 *
 * // 检查任一权限
 * if (canAny(['user:edit', 'user:delete'])) { ... }
 *
 * // 模板中
 * <button v-if="can('user:delete')">删除</button>
 * ```
 */
export function usePermission() {
  const user = ref(getCurrentUser())
  const roles = computed(() => user.value?.roles || [])
  const permissions = computed(() => user.value?.permissions || [])
  const isAdmin = computed(() => roles.value.includes('admin'))

  function refresh() {
    user.value = getCurrentUser()
  }

  /** 检查是否有指定权限 */
  function can(permission: string): boolean {
    return hasPermission(permission)
  }

  /** 检查是否有任一指定权限 */
  function canAny(perms: string[]): boolean {
    return perms.some((p) => hasPermission(p))
  }

  /** 检查是否有所有指定权限 */
  function canAll(perms: string[]): boolean {
    return perms.every((p) => hasPermission(p))
  }

  /** 检查是否有指定角色 */
  function is(role: string): boolean {
    return hasRole(role)
  }

  return {
    roles,
    permissions,
    isAdmin,
    can,
    canAny,
    canAll,
    is,
    refresh,
  }
}
