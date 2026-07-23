/**
 * 微前端统一路由与页签控制 SDK (Micro Router)
 * 
 * 职责：
 * 1. 自动处理子应用与基座路由 BaseRoute 拼接
 * 2. 封装页签操作：打开新页签 (openTab)、关闭当前页签 (closeSelfTab)、关闭指定页签 (closeTab)
 * 3. 实现独立运行模式与微前端环境的无缝适配
 */

import { isMicroAppEnv } from './micro-bridge'
import { eventBus } from './event-bus'
import { BusChannel, type OpenTabOptions } from '../types'

export function getBaseRoute(): string {
  if (isMicroAppEnv()) {
    return window.__MICRO_APP_BASE_ROUTE__ || ''
  }
  return '/'
}

export function joinRoute(...parts: string[]): string {
  const base = getBaseRoute()
  const path = parts.join('/').replace(/\/+/g, '/')
  return `${base}${path}`.replace(/\/+/g, '/')
}

/**
 * 组合式微前端路由钩子
 */
export function useMicroRouter() {
  /**
   * 路由跳转（自动处理独立运行 / 基座环境）
   */
  const push = (path: string, query?: Record<string, any>): void => {
    let targetUrl = path
    if (query && Object.keys(query).length > 0) {
      const queryString = new URLSearchParams(query).toString()
      targetUrl = `${path}${path.includes('?') ? '&' : '?'}${queryString}`
    }

    if (isMicroAppEnv()) {
      window.history.pushState(null, '', targetUrl)
      window.dispatchEvent(new PopStateEvent('popstate'))
    } else {
      window.history.pushState(null, '', targetUrl)
      window.dispatchEvent(new PopStateEvent('popstate'))
    }
  }

  /**
   * 打开新的基座页签
   * 
   * @example
   * microRouter.openTab({ path: '/sub-order/detail?id=12', title: '订单详情' })
   */
  const openTab = (options: OpenTabOptions): void => {
    if (isMicroAppEnv()) {
      eventBus.emitTyped(BusChannel.TAB_OPEN, options)
    } else {
      // 独立运行环境直接跳转
      push(options.path)
    }
  }

  /**
   * 关闭指定页签
   * 
   * @param path 要关闭的页签路径
   */
  const closeTab = (path: string): void => {
    if (isMicroAppEnv()) {
      eventBus.emitTyped(BusChannel.TAB_CLOSE, { path })
    }
  }

  /**
   * 关闭当前子应用所在的页签
   */
  const closeSelfTab = (): void => {
    if (isMicroAppEnv()) {
      eventBus.emitTyped(BusChannel.TAB_CLOSE_SELF, undefined)
    } else {
      window.close()
    }
  }

  /**
   * 刷新当前页签
   */
  const refreshTab = (): void => {
    if (isMicroAppEnv()) {
      eventBus.emitTyped(BusChannel.TAB_REFRESH, undefined)
    } else {
      window.location.reload()
    }
  }

  return {
    getBaseRoute,
    joinRoute,
    push,
    openTab,
    closeTab,
    closeSelfTab,
    refreshTab,
  }
}

/** 传统全局导航函数（兼容非 Setup 上下文） */
export const navigateTo = (path: string): void => {
  useMicroRouter().push(path)
}
