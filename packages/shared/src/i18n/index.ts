/**
 * i18n 引擎 — 统一的国际化基础设施
 *
 * 核心职责：
 * - 维护全局 i18n 单例实例（vue-i18n@9）
 * - 提供翻译函数 t()，供组件和非组件文件（router、store）使用
 * - 支持语言切换、语言包动态注册（基座/子应用各自的语言包自动合并）
 * - localStorage 持久化当前语言偏好
 *
 * 使用方式：
 * - 基座：调用 createI18n() 初始化 + registerMessages() 注册语言包
 * - 子应用：直接 registerMessages() 注册自己的语言包，import { t } from '@micro-public/shared'
 */

import { createI18n as _createI18n, type Composer } from 'vue-i18n'
import type { Plugin, App } from 'vue'
import { logger } from '../utils/logger'
import type { I18nOptions, LocaleMessages } from './types'

// ===== localStorage key =====
const LOCALE_STORAGE_KEY = 'locale'

// ===== 全局单例 =====
let _i18nInstance: ReturnType<typeof _createI18n> | null = null
let _composer: Composer | null = null

/**
 * 获取持久化的语言设置，无则返回默认 zh-CN
 */
function getSavedLocale(): string {
  try {
    return localStorage.getItem(LOCALE_STORAGE_KEY) || 'zh-CN'
  } catch {
    return 'zh-CN'
  }
}

/**
 * 创建 i18n 实例（由基座调用，只应调用一次）
 */
export function createI18n(options: I18nOptions = {}): ReturnType<typeof _createI18n> {
  const locale = options.locale || getSavedLocale()
  const fallbackLocale = options.fallbackLocale || 'zh-CN'

  _i18nInstance = _createI18n({
    legacy: false,
    locale,
    fallbackLocale,
    messages: (options.messages || {}) as any,
    // 未找到 key 时回退显示 key 本身，不抛警告
    missingWarn: false,
    fallbackWarn: false,
  })

  _composer = _i18nInstance.global as Composer
  return _i18nInstance
}

/**
 * 获取 i18n 实例（供 app.use() 注册）
 */
export function getI18n(): ReturnType<typeof _createI18n> | null {
  return _i18nInstance
}

/**
 * 获取 composer（内部翻译引擎）
 */
function getComposer(): Composer | null {
  return _composer
}

/**
 * 翻译函数 — 非组件文件中使用（router、store 等）
 * 组件内推荐使用 vue-i18n 的 $t() 或 useI18n().t()
 */
export function t(key: string, params?: Record<string, unknown>): string {
  const composer = getComposer()
  if (!composer) return key
  return composer.t(key, params || {}) as string
}

/**
 * 切换语言
 * - 更新 i18n 实例
 * - 持久化到 localStorage
 */
export function setLocale(locale: string): void {
  const composer = getComposer()
  if (composer) {
    composer.locale.value = locale
  }
  try {
    localStorage.setItem(LOCALE_STORAGE_KEY, locale)
  } catch {
    // ignore
  }
}

/**
 * 获取当前语言
 */
export function getLocale(): string {
  const composer = getComposer()
  return composer?.locale?.value || getSavedLocale()
}

/**
 * 注册语言包（基座/子应用各自调用，自动深度合并）
 * @param locale 语言代码，如 'zh-CN'、'en-US'
 * @param messages 语言包对象
 */
export function registerMessages(locale: string, messages: LocaleMessages): void {
  const composer = getComposer()
  if (!composer) {
    logger.warn('[i18n] registerMessages: i18n 实例未创建，请先调用 createI18n()')
    return
  }
  // 获取已有语言包并深度合并
  const existing = composer.getLocaleMessage(locale) as LocaleMessages
  const merged = deepMerge(existing, messages)
  composer.setLocaleMessage(locale, merged)
}

/**
 * Vue 插件 — 基座 app.use() 注册
 */
export const i18nPlugin: Plugin = {
  install(app: App) {
    if (_i18nInstance) {
      app.use(_i18nInstance as any)
    } else {
      logger.warn('[i18n] i18nPlugin: i18n 实例未创建，请先调用 createI18n()')
    }
  },
}

// ===== 工具函数 =====
function deepMerge(target: Record<string, any>, source: Record<string, any>): Record<string, any> {
  const result = { ...target }
  for (const key of Object.keys(source)) {
    if (
      source[key] &&
      typeof source[key] === 'object' &&
      !Array.isArray(source[key]) &&
      target[key] &&
      typeof target[key] === 'object' &&
      !Array.isArray(target[key])
    ) {
      result[key] = deepMerge(target[key], source[key])
    } else {
      result[key] = source[key]
    }
  }
  return result
}
