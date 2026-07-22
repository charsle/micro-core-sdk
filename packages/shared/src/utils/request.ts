/**
 * 请求封装（基于 axios）
 *
 * 核心职责：
 * - 统一的 HTTP 客户端，自动注入 token、拼接 API 基地址
 * - 请求拦截器：自动携带 Authorization 头
 * - 响应拦截器：统一错误处理（401 跳登录、403 无权限、超时/网络错误提示）
 * - 错误提示文本接入 i18n，通过 t() 获取国际化文案
 *
 * 兼容说明：
 * - 保持 http.get/post/put/delete/patch 便捷方法签名不变
 * - 保持 getToken() / getApiBaseUrl() 不变
 * - 自动从 micro-app 全局数据或 localStorage 获取 token
 */

import axios, { type AxiosInstance, type InternalAxiosRequestConfig, type AxiosResponse } from 'axios'
import { isMicroAppEnv, getGlobalData } from './micro-bridge'
import { t } from '../i18n'
import { logger } from './logger'
import type { ApiResponse } from '../types'

// ===== 获取 token =====
export function getToken(): string {
  if (isMicroAppEnv()) {
    return getGlobalData().token || ''
  }
  return localStorage.getItem('token') || ''
}

// ===== 获取 API 基地址 =====
export function getApiBaseUrl(): string {
  if (isMicroAppEnv()) {
    return getGlobalData().apiBaseUrl as string || '/api'
  }
  // 独立运行时使用环境变量或默认值
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (import.meta as unknown as { env?: Record<string, string> }).env?.VITE_API_BASE_URL || '/api'
}

// ===== 创建 axios 实例 =====
const instance: AxiosInstance = axios.create({
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// ===== 请求拦截器 =====
instance.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // 动态设置 baseURL
    if (!config.url?.startsWith('http')) {
      config.baseURL = getApiBaseUrl()
    }

    // 自动注入 token
    const token = getToken()
    if (token) {
      config.headers.set('Authorization', `Bearer ${token}`)
    }

    return config
  },
  (err) => Promise.reject(err),
)

// ===== 响应拦截器 =====
instance.interceptors.response.use(
  (response: AxiosResponse<ApiResponse>) => {
    const { data } = response
    // 业务状态码判断
    if (data.code !== 0 && data.code !== 200) {
      return Promise.reject(new Error(data.message || t('http.requestFailed')))
    }
    return response
  },
  (err) => {
    if (err.response) {
      const { status } = err.response
      switch (status) {
        case 401:
          // 未授权 — 跳转登录
          logger.warn('[HTTP] 401 未授权，跳转登录')
          localStorage.removeItem('token')
          window.location.href = '/login?expired=1'
          break
        case 403:
          logger.warn('[HTTP] 403 无权限')
          break
        case 404:
          logger.warn('[HTTP] 404 资源不存在')
          break
        case 500:
          logger.error('[HTTP] 500 服务异常')
          break
        default:
          logger.error(`[HTTP] ${status} 请求失败`)
      }
      return Promise.reject(new Error(t(`http.${status}`) || err.message))
    }

    if (err.code === 'ECONNABORTED' || err.name === 'CanceledError') {
      return Promise.reject(new Error(t('http.timeout')))
    }

    return Promise.reject(new Error(t('http.networkError')))
  },
)

// ===== 核心请求方法 =====
export async function request<T = unknown>(
  url: string,
  options: {
    method?: string
    body?: unknown
    headers?: Record<string, string>
    timeout?: number
    auth?: boolean
  } = {},
): Promise<T> {
  const {
    method = 'GET',
    body,
    headers = {},
    timeout,
  } = options

  const response = await instance.request<ApiResponse<T>>({
    url,
    method,
    data: body,
    headers,
    timeout,
  })

  return response.data.data
}

// ===== 便捷方法 =====
export const http = {
  get<T = unknown>(url: string, options?: { headers?: Record<string, string>; timeout?: number }) {
    return request<T>(url, { ...options, method: 'GET' })
  },
  post<T = unknown>(url: string, data?: unknown, options?: { headers?: Record<string, string>; timeout?: number }) {
    return request<T>(url, { ...options, method: 'POST', body: data })
  },
  put<T = unknown>(url: string, data?: unknown, options?: { headers?: Record<string, string>; timeout?: number }) {
    return request<T>(url, { ...options, method: 'PUT', body: data })
  },
  delete<T = unknown>(url: string, options?: { headers?: Record<string, string>; timeout?: number }) {
    return request<T>(url, { ...options, method: 'DELETE' })
  },
  patch<T = unknown>(url: string, data?: unknown, options?: { headers?: Record<string, string>; timeout?: number }) {
    return request<T>(url, { ...options, method: 'PATCH', body: data })
  },
}

/**
 * 获取 axios 原始实例（高级场景使用，如自定义拦截器）
 */
export function getAxiosInstance(): AxiosInstance {
  return instance
}
