/**
 * 统一日志工具
 *
 * 仅在开发环境（import.meta.env.DEV）输出日志
 * 生产环境静默，避免 console 噪音
 *
 * 使用方式：
 *   import { logger } from '@micro-public/shared'
 *   logger.log('[Base] 初始化完成')
 *   logger.warn('[HTTP] 401 未授权')
 *   logger.error('[MicroContainer] 加载失败', err)
 */

const isDev = (): boolean => {
  try {
    return typeof process !== 'undefined' ? process.env?.NODE_ENV !== 'production' : true
  } catch {
    return true
  }
}

export const logger = {
  log(...args: unknown[]) {
    if (isDev()) console.log(...args)
  },
  warn(...args: unknown[]) {
    if (isDev()) console.warn(...args)
  },
  error(...args: unknown[]) {
    // error 始终输出，便于生产排查严重问题
    console.error(...args)
  },
  info(...args: unknown[]) {
    if (isDev()) console.info(...args)
  },
}
