/**
 * 共享类型定义
 * 基座和子应用共用，确保数据格式一致
 */

// ===== 用户信息 =====
export interface UserInfo {
  id: string | number
  name: string
  avatar?: string
  roles: string[]
  permissions: string[]
}

// ===== 基座下发给子应用的全局数据 =====
export interface GlobalData {
  token: string
  userInfo: UserInfo | null
  /** 基座基础路由 */
  baseRoute?: string
  /** 当前主题 */
  theme?: 'light' | 'dark'
  /** 当前激活的页签列表 */
  tabs?: TabInfo[]
  [key: string]: unknown
}

// ===== 页签信息（下发给子应用） =====
export interface TabInfo {
  key: string
  title: string
  path: string
  affix: boolean
}

// ===== 打开页签参数（子应用 → 基座，对应后端 MenuData 结构） =====
export interface OpenTabOptions {
  /** 路由路径（必填） */
  path: string
  /** 页签标题 */
  title?: string
  /** 菜单名称（优先级高于 title） */
  menuName?: string
  /** 菜单编码（唯一标识） */
  menuCode?: string
  /** 菜单类型 */
  menuType?: string
  /** 图标 */
  icon?: string
  /** 菜单图标（menuIcon 别名） */
  menuIcon?: string
  /** 是否固定（不可关闭） */
  affix?: boolean
  /** 是否收藏 */
  fav?: boolean
  /** 应用ID */
  appId?: string
  /** 应用编码 */
  appCode?: string
  /** 微前端应用编码 */
  mfeCode?: string
  /** 微应用编码 */
  microCode?: string
  /** 打开行为 */
  openBehavior?: string
  /** 功能类型：in(内部路由) | out(外部链接) | local(本地页面) */
  funcType?: 'in' | 'out' | 'local'
  /** 访问URL（外部链接时使用） */
  visitUrl?: string
  /** 服务URL */
  svcUrl?: string
  /** 服务名称 */
  svcName?: string
  /** 关联路径 */
  linkedPath?: string
  /** 关联路径参数 */
  linkedPathArgs?: Record<string, unknown>
  /** 集成类型 */
  integrationType?: string
  /** 扩展元数据 */
  [key: string]: unknown
}

// ===== 子应用上报给基座的数据 =====
export interface SubAppData {
  /** 子应用名称 */
  name: string
  /** 子应用版本 */
  version?: string
  /** 子应用菜单（动态注册菜单场景） */
  menus?: DynamicMenuItem[]
  /** 子应用状态 */
  status?: 'mounted' | 'unmounted' | 'error'
  /** 事件总线消息 */
  event?: BusEvent
  /** 自定义数据 */
  [key: string]: unknown
}

// ===== 动态菜单项（子应用可上报菜单给基座动态注册） =====
export interface DynamicMenuItem {
  path: string
  title: string
  icon?: string
  permission?: string
  children?: DynamicMenuItem[]
}

// ===== 请求响应格式 =====
export interface ApiResponse<T = unknown> {
  code: number
  message: string
  data: T
}

// ===== ===== ===== 事件总线 ===== ===== =====

/**
 * 事件总线通道定义
 * 基座和子应用通过命名通道进行双向通信
 */
export enum BusChannel {
  /** 基座 → 子应用：全局状态变更 */
  STATE_CHANGE = 'state:change',
  /** 基座 → 子应用：路由跳转 */
  NAVIGATE = 'navigate',
  /** 基座 → 子应用：主题切换 */
  THEME_CHANGE = 'theme:change',
  /** 基座 → 子应用：用户信息变更 */
  USER_CHANGE = 'user:change',
  /** 子应用 → 基座：打开页签 */
  TAB_OPEN = 'tab:open',
  /** 子应用 → 基座：关闭页签 */
  TAB_CLOSE = 'tab:close',
  /** 子应用 → 基座：关闭自身页签 */
  TAB_CLOSE_SELF = 'tab:close-self',
  /** 子应用 → 基座：刷新自身 */
  TAB_REFRESH = 'tab:refresh',
  /** 子应用 → 基座：更新页面标题 */
  PAGE_TITLE = 'page:title',
  /** 子应用 → 基座：上报菜单 */
  MENU_REGISTER = 'menu:register',
  /** 双向：自定义数据 */
  CUSTOM = 'custom',
  /** 子应用 → 子应用：跨应用通信（基座中继） */
  APP_TO_APP = 'app:to-app',
}

/**
 * 强类型事件通道与 Payload 映射表
 * 赋予事件总线全量 TypeScript 补丁与类型安全
 */
export interface EventPayloadMap {
  [BusChannel.STATE_CHANGE]: Record<string, unknown>
  [BusChannel.NAVIGATE]: { path: string }
  [BusChannel.THEME_CHANGE]: { theme: 'light' | 'dark' | string }
  [BusChannel.USER_CHANGE]: UserInfo | null | unknown
  [BusChannel.TAB_OPEN]: OpenTabOptions
  [BusChannel.TAB_CLOSE]: { path: string }
  [BusChannel.TAB_CLOSE_SELF]: void | undefined
  [BusChannel.TAB_REFRESH]: void | undefined
  [BusChannel.PAGE_TITLE]: { title: string }
  [BusChannel.MENU_REGISTER]: { appName: string; menus: DynamicMenuItem[] }
  [BusChannel.CUSTOM]: unknown
  [BusChannel.APP_TO_APP]: { target: string; channel: string; payload?: unknown; from?: string }
  [key: string]: unknown
}

/**
 * 事件总线消息体
 */
export interface BusEvent {
  /** 通道名 */
  channel: BusChannel | string
  /** 消息负载 */
  payload?: unknown
  /** 发送方标识（app name） */
  source?: string
  /** 时间戳 */
  timestamp: number
}

/**
 * 事件回调函数类型
 */
export type EventCallback = (event: BusEvent) => void

// ===== ===== ===== 子应用生命周期 ===== ===== =====

/**
 * 子应用标准生命周期接口
 * 每个子应用必须导出实现了此接口的对象
 * 
 * 使用方式：
 *   // 在子应用入口文件 export default
 *   export { bootstrap, mount, unmount } from './lifecycle'
 * 
 * 或：
 *   // 在子应用 main.ts 中
 *   export const bootstrap = () => { ... }
 *   export const mount = (props: MountProps) => { ... }
 *   export const unmount = (props: UnmountProps) => { ... }
 */
export interface MicroAppLifecycle {
  /**
   * 初始化阶段 — 加载全局设置、注册插件等
   * 在子应用首次加载时调用，只执行一次
   * 可用于：初始化 SDK、注册全局组件、设置请求拦截器等
   */
  bootstrap?(): void | Promise<void>

  /**
   * 挂载阶段 — 渲染子应用到指定容器
   * 每次激活子应用时调用
   * @param props 基座传入的属性
   */
  mount(props: MountProps): void | Promise<void>

  /**
   * 卸载阶段 — 清理子应用
   * 每次离开子应用时调用
   * 必须销毁所有 Vue/React 实例、事件监听、定时器
   * @param props 基座传入的属性
   */
  unmount(props: UnmountProps): void | Promise<void>

  /**
   * 更新阶段 — 基座传入的 props 变化时调用
   * 可选实现
   * @param props 新的属性
   */
  update?(props: MountProps): void | Promise<void>
}

/**
 * mount 阶段基座传入的属性
 */
export interface MountProps {
  /** 挂载容器 DOM 元素 */
  container: HTMLElement
  /** 子应用名称 */
  appName: string
  /** 子应用的路由前缀 */
  baseRoute: string
  /** 当前用户认证 token */
  token: string
  /** 全局数据 */
  globalData?: GlobalData
  /** 事件总线实例引用 */
  eventBus?: MicroEventBus
  /** 扩展属性 */
  [key: string]: unknown
}

/**
 * unmount 阶段基座传入的属性
 */
export interface UnmountProps {
  /** 子应用名称 */
  appName: string
  /** 挂载容器 DOM 元素 */
  container: HTMLElement
}

/**
 * 强类型事件 Payload 映射契约
 */
export interface EventPayloadMap {
  'user:login': { userId: string | number; username: string }
  'user:logout': void
  'token:expired': { reason?: string }
  'theme:change': 'light' | 'dark'
  'lang:change': 'zh-CN' | 'en-US'
  'tab:open': OpenTabOptions
  'tab:close': string
  'route:navigate': { path: string; query?: Record<string, any> }
  [key: string]: any
}

// ===== ===== ===== 事件总线接口 ===== ===== =====

/**
 * 事件总线对外接口
 * 基座和子应用使用同一接口，保证松耦合
 */
export interface MicroEventBus {
  /** 订阅事件 */
  on(channel: string, callback: EventCallback): () => void
  /** 订阅强类型事件 */
  onTyped<K extends keyof EventPayloadMap>(channel: K, callback: (payload: EventPayloadMap[K]) => void): () => void
  /** 订阅事件（仅触发一次） */
  once(channel: string, callback: EventCallback): () => void
  /** 发布事件 */
  emit(channel: string, payload?: unknown): void
  /** 发布强类型事件 */
  emitTyped<K extends keyof EventPayloadMap>(channel: K, payload?: EventPayloadMap[K]): void
  /** 仅本地广播（不回传基座）——子应用接收基座下发事件时使用，避免事件回环 */
  emitLocal(channel: string, payload?: unknown, source?: string): void
  /** 取消订阅 */
  off(channel: string, callback?: EventCallback): void
}

// ===== micro-app 生命周期事件 =====
export interface MicroAppLifeCycleEvent {
  name: string
  /** 子应用容器元素 */
  container?: Element
}

// ===== 通信消息类型（兼容旧版） =====
export type MessageType = 'navigate' | 'auth' | 'theme' | 'data' | 'custom'

export interface CommMessage<T = unknown> {
  type: MessageType
  payload: T
  timestamp: number
}
