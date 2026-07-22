/**
 * 路由工具
 * 
 * 子应用在 micro-app 环境中需要使用 baseroute
 * 独立运行时使用根路径
 */

import { isMicroAppEnv } from './micro-bridge'

// ===== 获取子应用基础路由 =====
export function getBaseRoute(): string {
  if (isMicroAppEnv()) {
    return window.__MICRO_APP_BASE_ROUTE__ || ''
  }
  return '/'
}

// ===== 拼接子应用路由（考虑 baseroute 前缀） =====
export function joinRoute(...parts: string[]): string {
  const base = getBaseRoute()
  const path = parts.join('/').replace(/\/+/g, '/')
  return `${base}${path}`.replace(/\/+/g, '/')
}

// ===== 基座跳转（子应用通知基座跳转） =====
export function navigateTo(path: string): void {
  if (isMicroAppEnv()) {
    // 在 micro-app 环境中，通过 history API 让基座感知路由变化
    window.history.pushState(null, '', path)
    // 触发 popstate 事件让基座路由守卫响应
    window.dispatchEvent(new PopStateEvent('popstate'))
  } else {
    // 独立运行时直接跳转
    window.history.pushState(null, '', path)
    window.dispatchEvent(new PopStateEvent('popstate'))
  }
}
