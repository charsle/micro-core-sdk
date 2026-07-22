/**
 * 全局错误处理插件（Core 包）
 *
 * 捕获 Vue 组件内未处理的异常、Promise 未捕获异常
 * 防重复日志，触发全局 app:error 事件供 UI 层展示提示
 */

import type { App, Plugin } from 'vue'

const errorCache = new Set<string>()
const MAX_CACHE_SIZE = 100

function dedupeKey(err: Error): string {
  return `${err.message}::${err.stack?.split('\n')[1] || ''}`
}

function shouldLog(err: Error): boolean {
  const key = dedupeKey(err)
  if (errorCache.has(key)) return false
  if (errorCache.size > MAX_CACHE_SIZE) errorCache.clear()
  errorCache.add(key)
  return true
}

export interface ErrorHandlerOptions {
  /** 自定义错误上报回调 */
  onError?: (error: Error, info?: string) => void
  /** 是否输出到 console */
  logToConsole?: boolean
}

/**
 * 创建 Vue 错误处理插件
 */
export function createErrorHandlerPlugin(options: ErrorHandlerOptions = {}): Plugin {
  const { onError, logToConsole = true } = options

  return {
    install(app: App) {
      app.config.errorHandler = (err, instance, info) => {
        const error = err as Error
        if (shouldLog(error)) {
          if (logToConsole) {
            console.error('[GlobalError] Vue component error:', {
              message: error.message,
              stack: error.stack,
              info,
            })
          }
          onError?.(error, info)
        }
        window.dispatchEvent(
          new CustomEvent('app:error', {
            detail: { type: 'vue', error: err, info },
          }),
        )
      }
    },
  }
}

/**
 * 全局未捕获异常处理（在 app 实例化之前调用）
 */
export function setupGlobalErrorHandlers(options: ErrorHandlerOptions = {}) {
  const { onError, logToConsole = true } = options

  window.onerror = (message, source, lineno, colno, error) => {
    if (error && shouldLog(error)) {
      if (logToConsole) {
        console.error('[GlobalError] window.onerror:', { message, source, lineno, colno })
      }
      onError?.(error)
    }
    window.dispatchEvent(
      new CustomEvent('app:error', {
        detail: { type: 'runtime', error, message },
      }),
    )
    return true
  }

  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason
    const err = reason instanceof Error ? reason : new Error(String(reason))
    if (shouldLog(err)) {
      if (logToConsole) {
        console.error('[GlobalError] Unhandled Promise rejection:', err)
      }
      onError?.(err)
    }
    window.dispatchEvent(
      new CustomEvent('app:error', {
        detail: { type: 'promise', error: err },
      }),
    )
    event.preventDefault()
  })
}
