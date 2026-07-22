/**
 * 路由认证守卫（Core 包）
 *
 * 提供工厂函数，创建路由 beforeEach 守卫。
 * 基座可自定义 token 获取、过期检测、白名单等逻辑。
 */

import type { Router } from 'vue-router'

export interface AuthGuardOptions {
  /** 获取当前 token */
  getToken: () => string | null
  /** 检测 token 是否过期 */
  isTokenExpired?: (token: string) => boolean
  /** 白名单路由（不需要认证） */
  whiteList?: string[]
  /** 登录页路径 */
  loginPath?: string
  /** 子应用路由运行时补全回调 */
  onMicroAppRoute?: (to: any, next: any) => boolean | void
}

/**
 * 安装路由认证守卫
 *
 * 使用方式：
 *   import { setupAuthGuard } from '@micro-public/core'
 *   setupAuthGuard(router, {
 *     getToken: () => localStorage.getItem('token'),
 *     isTokenExpired: (token) => { ... },
 *   })
 */
export function setupAuthGuard(router: Router, options: AuthGuardOptions) {
  const {
    getToken,
    isTokenExpired,
    whiteList = ['/login'],
    loginPath = '/login',
    onMicroAppRoute,
  } = options

  router.beforeEach(async (to, _from, next) => {
    // 子应用路由补全
    if (onMicroAppRoute) {
      const handled = onMicroAppRoute(to, next)
      if (handled) return
    }

    const token = getToken()

    // 白名单直接放行
    if (whiteList.includes(to.path)) return next()

    // 无 token → 跳登录
    if (!token) return next(`${loginPath}?redirect=${encodeURIComponent(to.fullPath)}`)

    // token 过期检测
    if (isTokenExpired && isTokenExpired(token)) {
      localStorage.removeItem('token')
      return next(`${loginPath}?redirect=${encodeURIComponent(to.fullPath)}&expired=1`)
    }

    next()
  })
}

/**
 * 默认 token 过期检测
 */
export function defaultIsTokenExpired(token: string): boolean {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return true
    const payload = JSON.parse(atob(parts[1]))
    if (payload.exp && payload.exp * 1000 < Date.now()) return true
    return false
  } catch {
    return true
  }
}
