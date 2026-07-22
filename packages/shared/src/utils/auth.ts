/**
 * 权限工具
 * 
 * 子应用从基座获取用户权限信息，进行本地权限校验
 * 独立运行时从 localStorage 获取
 */

import { isMicroAppEnv, getGlobalData } from './micro-bridge'
import type { UserInfo } from '../types'

// ===== 获取当前用户信息 =====
export function getCurrentUser(): UserInfo | null {
  if (isMicroAppEnv()) {
    return getGlobalData().userInfo || null
  }
  // 独立运行时从 localStorage 获取
  try {
    const raw = localStorage.getItem('userInfo')
    if (raw) return JSON.parse(raw)
  } catch {
    // ignore
  }
  return null
}

// ===== 获取角色列表 =====
export function getRoles(): string[] {
  return getCurrentUser()?.roles || []
}

// ===== 获取权限列表 =====
export function getPermissions(): string[] {
  return getCurrentUser()?.permissions || []
}

// ===== 检查是否有指定权限 =====
export function hasPermission(perm: string): boolean {
  const user = getCurrentUser()
  if (!user) return false
  if (user.roles.includes('admin')) return true
  if (user.permissions.includes('*')) return true
  return user.permissions.includes(perm)
}

// ===== 检查是否有指定角色 =====
export function hasRole(role: string): boolean {
  return getRoles().includes(role)
}

// ===== 检查是否有任一权限 =====
export function hasAnyPermission(perms: string[]): boolean {
  return perms.some(hasPermission)
}

// ===== 检查是否有全部权限 =====
export function hasAllPermissions(perms: string[]): boolean {
  return perms.every(hasPermission)
}

// ===== 权限指令 v-permission 的核心逻辑 =====
export function checkPermission(value: string | string[]): boolean {
  if (typeof value === 'string') {
    return hasPermission(value)
  }
  return hasAnyPermission(value)
}
