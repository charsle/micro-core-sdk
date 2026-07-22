/**
 * UI 包类型定义
 *
 * 规范类型统一从 @micro-public/core 导入，此处仅做重导出，
 * 方便 UI 组件通过 '../types' 引用。
 */

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
