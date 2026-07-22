/**
 * i18n 类型定义
 * 基座和子应用共用，确保语言包格式一致
 */

/** i18n 创建选项 */
export interface I18nOptions {
  /** 默认语言，默认 'zh-CN' */
  locale?: string
  /** 回退语言，默认 'zh-CN' */
  fallbackLocale?: string
  /** 初始语言包 */
  messages?: Record<string, Record<string, unknown>>
}

/** 语言包嵌套结构 */
export type LocaleMessages = Record<string, unknown>
