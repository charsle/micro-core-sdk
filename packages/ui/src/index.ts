/**
 * @micro-public/ui — 微前端 UI 组件包
 *
 * 导出：
 * - 布局组件：DefaultLayout, SideMenu, HeaderBar, TabBar
 * - 容器组件：MicroContainer
 * - 插件：LayoutPlugin
 * - 类型与 InjectionKey：从 @micro-public/core 透传
 */

// ===== 布局组件 =====
export { default as DefaultLayout } from './layouts/DefaultLayout.vue'
export { default as SideMenu } from './layouts/SideMenu.vue'
export { default as HeaderBar } from './layouts/HeaderBar.vue'
export { default as TabBar } from './layouts/TabBar.vue'

// ===== 容器组件 =====
export { default as MicroContainer } from './components/MicroContainer.vue'

// ===== 插件 =====
export { LayoutPlugin, type LayoutPluginOptions } from './plugin'

// ===== 类型与 InjectionKey（从 core 透传） =====
export type {
  TabItem,
  MenuItem,
  UserInfo,
  Permission,
  TabActions,
  MicroAppConfig,
} from '@micro-public/core/types'

export {
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
