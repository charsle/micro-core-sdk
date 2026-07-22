/**
 * createSubApp — 子应用脚手架函数
 *
 * 一行完成子应用初始化：
 *   const app = createSubApp({ routes, locales, baseRoute: '/sub-app' })
 *
 * 内部自动处理：
 * - 创建 Vue app + Router（自动识别微前端/独立模式）
 * - 注册 i18n + 合并语言包（仅独立模式）
 * - 挂载到正确容器（micro-app 元素 / #app）
 * - 导出标准生命周期（bootstrap/mount/unmount/update）
 */

import { createApp, type App as VueApp, type Component } from 'vue'
import {
  createRouter,
  createWebHistory,
  type Router,
  type RouteRecordRaw,
} from 'vue-router'
import {
  isMicroAppEnv,
  getMicroAppName,
  getBaseRoute,
  logger,
} from './index'
import { onGlobalDataChange } from './micro-bridge'
import { getEventBus, updatePageTitle, registerMenus } from './event-bus'
import { createI18n, registerMessages } from '../i18n'
import { BusChannel } from '../types'
import type { MountProps, UnmountProps, MicroEventBus, DynamicMenuItem } from '../types'

// ===== 配置选项 =====
export interface SubAppOptions {
  /** 子应用路由定义（必填） */
  routes: RouteRecordRaw[]
  /** 根组件，默认为带 <router-view> 的简单壳 */
  AppComponent?: Component
  /** 子应用基础路由前缀（如 '/sub-app'），独立模式下忽略 */
  baseRoute?: string
  /** 语言包（仅独立模式生效） */
  locales?: Record<string, Record<string, unknown>>
  /** 默认语言 */
  defaultLocale?: string
  /** 应用标题（独立模式 / 页签标题） */
  title?: string
  /** 全局样式导入函数（在 createApp 后调用） */
  setupStyles?: () => void
  /** bootstrap 阶段的自定义逻辑 */
  onBootstrap?: () => void | Promise<void>
  /** mount 阶段的额外逻辑（在 Vue 挂载之后） */
  onMount?: (props?: MountProps) => void
  /** unmount 阶段的额外清理逻辑 */
  onUnmount?: () => void
}

// ===== 内部状态 =====
interface SubAppState {
  vueApp: VueApp | null
  router: Router | null
  unlistenGlobalData: (() => void) | null
  unlistenBusEvents: (() => void)[]
}

// ===== 默认 App 组件 =====
const DefaultApp: Component = {
  name: 'SubAppShell',
  template: '<router-view />',
}

/**
 * 创建子应用（工厂函数）
 *
 * @example
 * ```ts
 * // main.ts
 * import { createSubApp } from '@micro-public/shared'
 * import routes from './router/routes'
 *
 * const app = createSubApp({
 *   routes,
 *   baseRoute: '/my-app',
 *   locales: { 'zh-CN': zhCN, 'en-US': enUS },
 *   title: '我的子应用',
 * })
 *
 * export const { bootstrap, mount, unmount, update } = app
 * export default app
 * ```
 */
export function createSubApp(options: SubAppOptions) {
  const {
    routes,
    AppComponent,
    baseRoute = '/',
    locales,
    defaultLocale = 'zh-CN',
    title,
    setupStyles,
    onBootstrap,
    onMount,
    onUnmount,
  } = options

  const state: SubAppState = {
    vueApp: null,
    router: null,
    unlistenGlobalData: null,
    unlistenBusEvents: [],
  }

  const eventBus: MicroEventBus = getEventBus()

  // ===== 查找挂载容器 =====
  function findMountContainer(): HTMLElement {
    if (isMicroAppEnv()) {
      const microAppEl = document.querySelector('micro-app')
      if (microAppEl) return microAppEl as unknown as HTMLElement
      const allMicroApps = document.querySelectorAll('micro-app')
      if (allMicroApps.length > 0) return allMicroApps[0] as unknown as HTMLElement
    }
    return document.getElementById('app') || document.body
  }

  // ===== 从路由中提取菜单项 =====
  function extractMenusFromRoutes(routeList: RouteRecordRaw[]): DynamicMenuItem[] {
    return routeList
      .filter((r) => {
        // 过滤掉重定向、404、隐藏路由
        const path = r.path as string
        if (path === '/' || path.startsWith('/:') || r.redirect) return false
        if ((r.meta as any)?.hidden) return false
        return !!r.meta?.title || !!r.name
      })
      .map((r) => ({
        path: r.path as string,
        title: (r.meta as any)?.title || (r.name as string) || (r.path as string),
        icon: (r.meta as any)?.icon,
        ...(r.children?.length ? {
          children: r.children
            .filter((c) => !c.redirect && !(c.meta as any)?.hidden)
            .map((c) => ({
              path: c.path as string,
              title: (c.meta as any)?.title || (c.name as string) || (c.path as string),
            })),
        } : {}),
      })) as DynamicMenuItem[]
  }

  // ===== 创建 Vue 应用实例 =====
  function createVueApp(effectiveBaseRoute: string): VueApp {
    const app = createApp(AppComponent || DefaultApp)

    const isMicro = isMicroAppEnv()
    const microBaseRoute = (window as any).__MICRO_APP_BASE_ROUTE__ || effectiveBaseRoute || '/'

    state.router = createRouter({
      history: createWebHistory(isMicro ? microBaseRoute : '/'),
      routes,
    })

    app.use(state.router)
    setupStyles?.()

    state.vueApp = app
    return app
  }

  // ===== 生命周期 =====
  async function bootstrap(): Promise<void> {
    const appName = getMicroAppName()
    logger.log(`[${appName}] lifecycle: bootstrap`)
    await onBootstrap?.()
  }

  function mount(mountProps?: MountProps): void {
    const appName = getMicroAppName()
    const effectiveBaseRoute = mountProps?.baseRoute || getBaseRoute() || baseRoute

    logger.log(`[${appName}] lifecycle: mount`, {
      baseRoute: effectiveBaseRoute,
      hasToken: !!mountProps?.token,
    })

    // keep-alive 场景：已挂载则跳过
    if (state.vueApp && (state.vueApp as any)._container) {
      logger.log(`[${appName}] re-mounting (keep-alive)`)
      return
    }

    const app = createVueApp(effectiveBaseRoute)

    // 微前端模式：监听基座事件
    if (isMicroAppEnv()) {
      // 自动上报菜单
      const menus = extractMenusFromRoutes(routes)
      if (menus.length > 0) {
        const appName = getMicroAppName()
        registerMenus(appName, menus)
        logger.log(`[${appName}] 已上报动态菜单:`, menus.map((m) => m.title))
      }

      state.unlistenGlobalData = onGlobalDataChange((data: Record<string, unknown>) => {
        logger.log(`[${appName}] global data changed:`, data)
        if (data._event) {
          const busEvent = data._event as { channel: string; payload: unknown }
          eventBus.emitLocal(busEvent.channel, busEvent.payload, 'main')
        }
      })

      const unlistenTheme = eventBus.on(BusChannel.THEME_CHANGE, (event) => {
        logger.log(`[${appName}] theme changed:`, event.payload)
      })
      const unlistenUser = eventBus.on(BusChannel.USER_CHANGE, (event) => {
        logger.log(`[${appName}] user changed:`, event.payload)
      })
      const unlistenState = eventBus.on(BusChannel.STATE_CHANGE, (event) => {
        logger.log(`[${appName}] state changed:`, event.payload)
      })

      state.unlistenBusEvents = [unlistenTheme, unlistenUser, unlistenState]
    }

    // 挂载
    const container = mountProps?.container || findMountContainer()
    app.mount(container)

    // 设置标题
    const appTitle = title || appName || '子应用'
    updatePageTitle(isMicroAppEnv() ? `微前端 - ${appTitle}` : `${appTitle} - 独立运行`)

    onMount?.(mountProps)
    logger.log(`[${appName}] mounted successfully`)
  }

  function unmount(unmountProps?: UnmountProps): void {
    const appName = unmountProps?.appName || getMicroAppName()
    logger.log(`[${appName}] lifecycle: unmount`)

    if (state.unlistenGlobalData) {
      state.unlistenGlobalData()
      state.unlistenGlobalData = null
    }

    state.unlistenBusEvents.forEach((fn) => fn())
    state.unlistenBusEvents = []

    if (state.vueApp) {
      state.vueApp.unmount()
      state.vueApp = null
    }

    state.router = null
    onUnmount?.()
    logger.log(`[${appName}] unmounted successfully`)
  }

  function update(newProps: MountProps): void {
    const appName = getMicroAppName()
    logger.log(`[${appName}] lifecycle: update`, newProps)
  }

  // ===== 入口逻辑 =====
  if (isMicroAppEnv()) {
    logger.log(`[${getMicroAppName()}] running in micro-app mode`)
    mount()
  } else {
    logger.log('[sub-app] running in standalone mode')

    // 独立模式：初始化 i18n
    createI18n({ locale: defaultLocale, fallbackLocale: defaultLocale })
    if (locales) {
      for (const [locale, messages] of Object.entries(locales)) {
        registerMessages(locale, messages)
      }
    }

    mount({ baseRoute: '/' } as MountProps)
  }

  return { bootstrap, mount, unmount, update }
}
