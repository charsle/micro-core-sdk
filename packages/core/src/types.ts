/**
 * Core 包规范类型定义
 *
 * 所有类型统一在此定义，UI 包和基座均引用此处的类型。
 * InjectionKey 使用字符串常量（而非 Symbol），确保微前端跨沙箱兼容。
 */

import type { InjectionKey, Ref } from 'vue'

// ===== 页签项 =====
export interface TabItem {
  /** 唯一标识，一般用 route name 或 menuCode */
  key: string
  /** 显示标题 */
  title: string
  /** 路由路径 */
  path: string
  /** 路由名称 */
  name: string
  /** 是否固定（首页常驻） */
  affix: boolean
  /** 是否激活 */
  active?: boolean
  /** 是否为 micro-app 子应用 */
  isMicro?: boolean
  /** 子应用名称 */
  microAppName?: string
  /** 是否缓存子应用（keep-alive） */
  keepAlive?: boolean
  /** 图标 */
  icon?: string
  /** 菜单编码 */
  menuCode?: string
  /** 应用编码 */
  appCode?: string
  /** 微前端编码 */
  mfeCode?: string
  /** 功能类型 */
  funcType?: 'in' | 'out' | 'local'
  /** 访问URL（外部链接） */
  visitUrl?: string
  /** 关联路径 */
  linkedPath?: string
  /** 扩展元数据 */
  meta?: Record<string, unknown>
}

// ===== 菜单项 =====
export interface MenuItem {
  path: string
  name: string
  meta: {
    title: string
    icon?: string
    hidden?: boolean
    permission?: string
    roles?: string[]
    isMicro?: boolean
    microAppName?: string
    keepAlive?: boolean
  }
  children?: MenuItem[]
}

// ===== 用户信息 =====
export interface UserInfo {
  name: string
  avatar?: string
  token?: string
  roles?: string[]
}

// ===== 权限判断 =====
export interface Permission {
  hasPermission: (perm: string) => boolean
  hasRole: (role: string) => boolean
}

// ===== 页签操作 =====
export interface TabActions {
  addTab: (tab: TabItem) => void
  removeTab: (key: string) => string
  removeOtherTabs: (key: string) => void
  removeAllTabs: () => string
  setActiveTab: (key: string) => void
  toggleAffix: (key: string) => void
  toggleKeepAlive: (key: string) => void
  refreshTab: (key: string) => void
}

// ===== 子应用配置 =====
export interface MicroAppConfig {
  name: string
  entry: string
  activeRule: string | string[]
  title?: string
  icon?: string
  inline?: boolean
  scopedCSS?: boolean
  keepAlive?: boolean
}

// ===== Provide/Inject Keys（字符串常量，微前端跨沙箱兼容） =====

/** 菜单列表 */
export const MenuListKey: InjectionKey<Ref<MenuItem[]>> = 'ui-menu-list' as any

/** 侧边栏折叠状态 */
export const SidebarCollapsedKey: InjectionKey<Ref<boolean>> = 'ui-sidebar-collapsed' as any

/** 切换侧边栏折叠 */
export const ToggleSidebarKey: InjectionKey<() => void> = 'ui-toggle-sidebar' as any

/** 页签列表 */
export const TabsKey: InjectionKey<Ref<TabItem[]>> = 'ui-tabs' as any

/** 当前激活页签 key */
export const ActiveTabKeyKey: InjectionKey<Ref<string>> = 'ui-active-tab-key' as any

/** 页签操作 */
export const TabActionsKey: InjectionKey<TabActions> = 'ui-tab-actions' as any

/** 用户信息 */
export const UserInfoKey: InjectionKey<Ref<UserInfo | null>> = 'ui-user-info' as any

/** 权限判断 */
export const PermissionKey: InjectionKey<Permission> = 'ui-permission' as any

/** 子应用配置列表 */
export const MicroAppsKey: InjectionKey<MicroAppConfig[]> = 'ui-micro-apps' as any

/** 根据名称查找子应用配置 */
export const GetMicroAppByNameKey: InjectionKey<(name: string) => MicroAppConfig | undefined> = 'ui-get-micro-app-by-name' as any

/** 标题翻译函数 */
export const ResolveTitleKey: InjectionKey<(key: string) => string> = 'ui-resolve-title' as any

/** 登出回调 */
export const LogoutKey: InjectionKey<() => void> = 'ui-logout' as any

/** 主题切换回调 */
export const ToggleThemeKey: InjectionKey<() => void> = 'ui-toggle-theme' as any

/** 语言切换回调 */
export const ToggleLocaleKey: InjectionKey<() => void> = 'ui-toggle-locale' as any

/** 当前主题 */
export const IsDarkKey: InjectionKey<Ref<boolean>> = 'ui-is-dark' as any

/** 当前语言 */
export const CurrentLocaleKey: InjectionKey<Ref<string>> = 'ui-current-locale' as any
