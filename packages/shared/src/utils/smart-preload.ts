/**
 * 智能资源预加载调度器 (Smart Preloader)
 * 
 * 特性：
 * 1. 鼠标悬停 (Hover) 菜单自动延迟静默预加载 (150ms 节流)
 * 2. 浏览器空闲 (requestIdleCallback) 队列排队预加载
 * 3. 已预加载应用去重与状态监控
 */

import { logger } from './logger'

export interface PreloadAppItem {
  name: string
  url: string
}

class SmartPreloader {
  private preloadedApps = new Set<string>()
  private hoverTimers = new Map<string, ReturnType<typeof setTimeout>>()

  /**
   * 触发单个子应用预加载
   */
  preload(app: PreloadAppItem): void {
    if (this.preloadedApps.has(app.name)) {
      return
    }

    this.preloadedApps.add(app.name)
    logger.info(`[SmartPreload] Start preloading micro app: ${app.name} (${app.url})`)

    // 如果运行在 micro-app 环境，调用 micro-app 的原生 preloadApp API
    if (typeof window !== 'undefined' && (window as any).microApp?.preloadApp) {
      try {
        ;(window as any).microApp.preloadApp({
          name: app.name,
          url: app.url,
        })
      } catch (err) {
        logger.error(`[SmartPreload] Failed to preload ${app.name}:`, err)
      }
    } else {
      // 预连接与静态资源 Fetch 尝试
      this.fetchHtmlPreconnect(app.url)
    }
  }

  /**
   * 绑定 DOM 元素的 Hover 悬停预加载事件
   * 
   * @param element DOM 节点或 selector 选择器
   * @param app 目标子应用配置
   * @param delay 悬停判定延迟 (ms)，默认 150ms
   */
  bindHoverPreload(
    element: HTMLElement | string,
    app: PreloadAppItem,
    delay = 150
  ): () => void {
    const el = typeof element === 'string' ? document.querySelector(element) as HTMLElement : element
    if (!el) return () => {}

    const handleMouseEnter = () => {
      if (this.preloadedApps.has(app.name)) return
      const timer = setTimeout(() => {
        this.preload(app)
        this.hoverTimers.delete(app.name)
      }, delay)
      this.hoverTimers.set(app.name, timer)
    }

    const handleMouseLeave = () => {
      const timer = this.hoverTimers.get(app.name)
      if (timer) {
        clearTimeout(timer)
        this.hoverTimers.delete(app.name)
      }
    }

    el.addEventListener('mouseenter', handleMouseEnter)
    el.addEventListener('mouseleave', handleMouseLeave)

    return () => {
      el.removeEventListener('mouseenter', handleMouseEnter)
      el.removeEventListener('mouseleave', handleMouseLeave)
    }
  }

  /**
   * 利用浏览器空闲时段排队预加载多项应用
   */
  scheduleIdlePreload(apps: PreloadAppItem[]): void {
    if (typeof window === 'undefined') return

    const pendingApps = apps.filter((app) => !this.preloadedApps.has(app.name))
    if (pendingApps.length === 0) return

    const runIdleTask = (deadline: IdleDeadline) => {
      while (deadline.timeRemaining() > 0 && pendingApps.length > 0) {
        const app = pendingApps.shift()
        if (app) {
          this.preload(app)
        }
      }

      if (pendingApps.length > 0) {
        if ('requestIdleCallback' in window) {
          ;(window as any).requestIdleCallback(runIdleTask)
        } else {
          setTimeout(() => runIdleTask({ timeRemaining: () => 50 } as any), 1000)
        }
      }
    }

    if ('requestIdleCallback' in window) {
      ;(window as any).requestIdleCallback(runIdleTask)
    } else {
      setTimeout(() => runIdleTask({ timeRemaining: () => 50 } as any), 1000)
    }
  }

  private fetchHtmlPreconnect(url: string): void {
    try {
      const link = document.createElement('link')
      link.rel = 'preconnect'
      link.href = url
      document.head.appendChild(link)
    } catch {
      // 忽略无法操作 DOM 的边界情况
    }
  }
}

export const smartPreloader = new SmartPreloader()
