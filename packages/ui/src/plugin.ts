/**
 * LayoutPlugin — 一键注册 UI 组件并注入所有依赖
 *
 * 使用方式（基座 main.ts）：
 *   import { LayoutPlugin } from '@micro-public/ui'
 *   app.use(LayoutPlugin, { menuList, tabs, tabActions, ... })
 */

import type { App, Plugin, Ref } from 'vue'
import type {
  MenuItem,
  TabItem,
  TabActions,
  MicroAppConfig,
  UserInfo,
  Permission,
} from '@micro-public/core/types'
import {
  MenuListKey,
  SidebarCollapsedKey,
  ToggleSidebarKey,
  TabsKey,
  ActiveTabKeyKey,
  TabActionsKey,
  UserInfoKey,
  PermissionKey,
  MicroAppsKey,
  GetMicroAppByNameKey,
  ResolveTitleKey,
  LogoutKey,
  ToggleThemeKey,
  IsDarkKey,
  ToggleLocaleKey,
  CurrentLocaleKey,
} from '@micro-public/core/types'

export interface LayoutPluginOptions {
  /** 菜单列表（响应式） */
  menuList: Ref<MenuItem[]>
  /** 侧边栏折叠状态（响应式） */
  sidebarCollapsed: Ref<boolean>
  /** 切换侧边栏折叠 */
  toggleSidebar: () => void
  /** 页签列表（响应式） */
  tabs: Ref<TabItem[]>
  /** 当前激活页签 key（响应式） */
  activeTabKey: Ref<string>
  /** 页签操作 */
  tabActions: TabActions
  /** 用户信息（响应式） */
  userInfo?: Ref<UserInfo | null>
  /** 权限判断 */
  permission?: Permission
  /** 子应用配置列表 */
  microApps: MicroAppConfig[]
  /** 根据名称查找子应用配置 */
  getMicroAppByName?: (name: string) => MicroAppConfig | undefined
  /** 标题翻译函数 */
  resolveTitle?: (key: string) => string
  /** 登出回调 */
  onLogout?: () => void
  /** 主题切换回调 */
  onToggleTheme?: () => void
  /** 当前是否暗色主题（响应式） */
  isDark?: Ref<boolean>
  /** 语言切换回调 */
  onToggleLocale?: () => void
  /** 当前语言（响应式） */
  currentLocale?: Ref<string>
}

export const LayoutPlugin: Plugin = {
  install(app: App, options: LayoutPluginOptions) {
    app.provide(MenuListKey, options.menuList)
    app.provide(SidebarCollapsedKey, options.sidebarCollapsed)
    app.provide(ToggleSidebarKey, options.toggleSidebar)
    app.provide(TabsKey, options.tabs)
    app.provide(ActiveTabKeyKey, options.activeTabKey)
    app.provide(TabActionsKey, options.tabActions)

    if (options.userInfo) {
      app.provide(UserInfoKey, options.userInfo)
    }
    if (options.permission) {
      app.provide(PermissionKey, options.permission)
    }

    app.provide(MicroAppsKey, options.microApps)
    if (options.getMicroAppByName) {
      app.provide(GetMicroAppByNameKey, options.getMicroAppByName)
    }
    if (options.resolveTitle) {
      app.provide(ResolveTitleKey, options.resolveTitle)
    }
    if (options.onLogout) {
      app.provide(LogoutKey, options.onLogout)
    }
    if (options.onToggleTheme) {
      app.provide(ToggleThemeKey, options.onToggleTheme)
    }
    if (options.isDark) {
      app.provide(IsDarkKey, options.isDark)
    }
    if (options.onToggleLocale) {
      app.provide(ToggleLocaleKey, options.onToggleLocale)
    }
    if (options.currentLocale) {
      app.provide(CurrentLocaleKey, options.currentLocale)
    }
  },
}
