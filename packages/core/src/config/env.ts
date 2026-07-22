/**
 * 运行环境配置（Core 包）
 *
 * 子应用 entry 地址根据当前环境动态获取
 * 优先级：window.__MICRO_APP_CONFIG__ > 环境变量 > 默认值
 */

export interface EnvConfig {
  /** 子应用 entry 映射表 */
  subApps: Record<string, string>
  /** API 基地址 */
  apiBaseUrl: string
}

export interface EnvConfigOptions {
  /** 默认配置（开发环境） */
  defaultConfig: EnvConfig
  /** 生产配置 */
  productionConfig: EnvConfig
}

function getConfig(options: EnvConfigOptions): EnvConfig {
  // 1. 优先使用运行时注入的全局配置
  const runtimeConfig = (window as any).__MICRO_APP_CONFIG__ as EnvConfig | undefined
  if (runtimeConfig) return runtimeConfig

  // 2. 根据 hostname 判断环境
  const host = window.location.hostname
  if (host === 'localhost' || host === '127.0.0.1') {
    return options.defaultConfig
  }

  // 3. 生产环境
  return options.productionConfig
}

/**
 * 创建环境配置实例
 *
 * 使用方式：
 *   const env = createEnvConfig({
 *     defaultConfig: { subApps: { 'my-app': 'http://localhost:7100' }, apiBaseUrl: '/api' },
 *     productionConfig: { subApps: { 'my-app': '/my-app' }, apiBaseUrl: '/api' },
 *   })
 *   env.getSubAppEntry('my-app') // → 'http://localhost:7100'
 */
export function createEnvConfig(options: EnvConfigOptions) {
  const config = getConfig(options)

  return {
    /** 获取子应用 entry 地址 */
    getSubAppEntry(appName: string, fallback?: string): string {
      return config.subApps[appName] || fallback || ''
    },

    /** 获取 API 基地址 */
    getApiBaseUrl(): string {
      return config.apiBaseUrl
    },

    /** 获取完整配置 */
    getConfig(): Readonly<EnvConfig> {
      return config
    },
  }
}
