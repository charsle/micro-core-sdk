/**
 * @micro-public/core — 微前端业务基础设施包
 *
 * 导出：
 * - 类型与 InjectionKey
 * - Store 工厂函数
 * - 权限指令
 * - 路由守卫
 * - 错误处理插件
 * - 环境配置
 */

// ===== 规范类型与 InjectionKey =====
export * from './types'

// ===== Store =====
export { createAppStore, type AppStoreOptions, type DynamicMenuEntry } from './store'

// ===== 指令 =====
export { permissionDirective, type PermissionChecker } from './directives'

// ===== 守卫 =====
export { setupAuthGuard, defaultIsTokenExpired, type AuthGuardOptions } from './guards'

// ===== 插件 =====
export { createErrorHandlerPlugin, setupGlobalErrorHandlers, type ErrorHandlerOptions } from './plugins'

// ===== 配置 =====
export { createEnvConfig, type EnvConfig, type EnvConfigOptions } from './config'
