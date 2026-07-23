/**
 * 事件总线 — 基座与子应用双向通信的核心
 *
 * 设计要点：
 * 1. 基座环境：直接使用内存中的 EventBus 实例，所有子应用通过 micro-app 的 data 通道接入
 * 2. 子应用环境：通过 micro-app dispatch 代理到基座的 EventBus
 * 3. 独立运行：提供独立的 EventBus 实例，不抛错
 *
 * 通信流程：
 *   基座 emit → 回调直接触发（同进程）
 *   基座 emit → setData(appName, event) → 子应用 onGlobalDataChange → 解析 event → 触发回调
 *   子应用 emit → dispatch({ event }) → 基座 onMicroAppData → 解析 event → 触发回调
 */

import { isMicroAppEnv, getMicroAppName, dispatchToMain } from './micro-bridge'
import { logger } from './logger'
import type { BusEvent, EventCallback, MicroEventBus, OpenTabOptions, DynamicMenuItem, EventPayloadMap } from '../types'
import { BusChannel } from '../types'

// ===== 内部实现 =====
class EventBusImpl implements MicroEventBus {
  private listeners = new Map<string, Set<EventCallback>>()

  /** 订阅事件 */
  on(channel: string, callback: EventCallback): () => void {
    if (!this.listeners.has(channel)) {
      this.listeners.set(channel, new Set())
    }
    this.listeners.get(channel)!.add(callback)

    return () => {
      this.off(channel, callback)
    }
  }

  /** 订阅强类型事件 */
  onTyped<K extends keyof EventPayloadMap>(
    channel: K,
    callback: (payload: EventPayloadMap[K]) => void
  ): () => void {
    const wrapper: EventCallback = (event) => {
      callback(event.payload as EventPayloadMap[K])
    }
    return this.on(channel as string, wrapper)
  }

  /** 订阅事件（仅触发一次） */
  once(channel: string, callback: EventCallback): () => void {
    const wrapper: EventCallback = (event) => {
      callback(event)
      this.off(channel, wrapper)
    }
    return this.on(channel, wrapper)
  }

  /** 发布强类型事件 */
  emitTyped<K extends keyof EventPayloadMap>(channel: K, payload?: EventPayloadMap[K]): void {
    this.emit(channel as string, payload)
  }

  /** 发布事件 */
  emit(channel: string, payload?: unknown): void {
    const event: BusEvent = {
      channel,
      payload,
      source: isMicroAppEnv() ? getMicroAppName() : 'main',
      timestamp: Date.now(),
    }

    // 触发本地监听器（含通配符）
    this.trigger(event)

    // 如果当前在子应用环境，通过 dispatch 上报到基座
    if (isMicroAppEnv()) {
      dispatchToMain({
        name: getMicroAppName(),
        event,
      } as any)
    }
  }

  /**
   * 仅本地广播（不回传基座）
   *
   * 子应用接收基座下发的事件时使用：基座通过全局数据通道下发事件后，
   * 子应用需要把它分发给本地监听器，但绝不能再 dispatch 回基座——
   * 否则基座又转发回子应用，形成死循环。
   *
   * @param channel 通道名
   * @param payload 消息负载
   * @param source  来源标识（默认 'main'，表示来自基座）
   */
  emitLocal(channel: string, payload?: unknown, source = 'main'): void {
    const event: BusEvent = {
      channel,
      payload,
      source,
      timestamp: Date.now(),
    }
    this.trigger(event)
  }

  /** 触发本地监听器 + 通配符监听器（不涉及跨应用 dispatch） */
  private trigger(event: BusEvent): void {
    // 触发本地监听器
    const listeners = this.listeners.get(event.channel)
    if (listeners) {
      listeners.forEach((cb) => {
        try {
          cb(event)
        } catch (err) {
          logger.error(`[EventBus] error in listener for channel "${event.channel}":`, err)
        }
      })
    }

    // 同时触发通配符监听器（用于基座监听所有子应用事件）
    const wildcardListeners = this.listeners.get('*')
    if (wildcardListeners) {
      wildcardListeners.forEach((cb) => {
        try {
          cb(event)
        } catch (err) {
          logger.error(`[EventBus] error in wildcard listener:`, err)
        }
      })
    }
  }

  /** 取消订阅 */
  off(channel: string, callback?: EventCallback): void {
    if (!callback) {
      this.listeners.delete(channel)
      return
    }
    const listeners = this.listeners.get(channel)
    if (listeners) {
      listeners.delete(callback)
      if (listeners.size === 0) {
        this.listeners.delete(channel)
      }
    }
  }

  /** 销毁所有监听器 */
  destroy(): void {
    this.listeners.clear()
  }
}

// ===== 全局单例（基座环境） =====
let globalBus: EventBusImpl | null = null

/** 获取全局事件总线实例 */
export function getEventBus(): MicroEventBus {
  if (!globalBus) {
    globalBus = new EventBusImpl()
  }
  return globalBus
}

/** 仅测试/重置使用 */
export function resetEventBus(): void {
  globalBus?.destroy()
  globalBus = null
}

// ===== 便捷方法：Tab 操作 =====

/** 子应用：通知基座打开一个新的页签 */
export function openTab(options: OpenTabOptions): void {
  getEventBus().emit(BusChannel.TAB_OPEN, options)
}

/** 子应用：通知基座关闭指定页签 */
export function closeTab(path: string): void {
  getEventBus().emit(BusChannel.TAB_CLOSE, { path })
}

/** 子应用：通知基座关闭自身页签 */
export function closeSelfTab(): void {
  getEventBus().emit(BusChannel.TAB_CLOSE_SELF)
}

/** 子应用：刷新自身 */
export function refreshSelfTab(): void {
  getEventBus().emit(BusChannel.TAB_REFRESH)
}

/** 子应用：更新页面标题 */
export function updatePageTitle(title: string): void {
  getEventBus().emit(BusChannel.PAGE_TITLE, { title })
  document.title = title
}

/**
 * 子应用：向基座动态注册菜单
 *
 * 子应用在 mount 阶段调用，将自己的路由菜单上报给基座，
 * 基座收到后合并到对应子应用的侧边栏菜单分组中。
 *
 * @param appName 子应用名称（对应 micro-app 注册的 name）
 * @param menus 菜单项列表
 */
export function registerMenus(
  appName: string,
  menus: DynamicMenuItem[],
): void {
  getEventBus().emit(BusChannel.MENU_REGISTER, { appName, menus })
}

/** 基座/子应用：发送自定义事件到基座 */
export function sendCustomEvent(payload: unknown): void {
  getEventBus().emit(BusChannel.CUSTOM, payload)
}

// ===== 便捷方法：导航 =====

/** 子应用：请求基座导航到指定路由（通过事件总线） */
export function navigateToBase(path: string): void {
  getEventBus().emit(BusChannel.NAVIGATE, { path })
}

// ===== 便捷方法：用户/状态 =====

/** 基座：通知所有子应用用户信息变更 */
export function notifyUserChange(userInfo: unknown): void {
  getEventBus().emit(BusChannel.USER_CHANGE, userInfo)
}

/** 基座：通知所有子应用主题变更 */
export function notifyThemeChange(theme: string): void {
  getEventBus().emit(BusChannel.THEME_CHANGE, { theme })
}

// ===== 子应用间通信 =====

/**
 * 子应用 A → 子应用 B：发送消息到指定子应用（基座中继）
 *
 * 原理：子应用通过 dispatch 上报到基座，基座解析后通过 setData 下发给目标子应用
 *
 * @param targetAppName 目标子应用名称
 * @param channel 通信通道
 * @param payload 消息负载
 */
export function emitToApp(targetAppName: string, channel: string, payload?: unknown): void {
  getEventBus().emit(BusChannel.APP_TO_APP, {
    target: targetAppName,
    channel,
    payload,
    from: isMicroAppEnv() ? getMicroAppName() : 'main',
  })
}

/**
 * 子应用：监听来自其他子应用的消息
 *
 * @param channel 监听的通道名
 * @param callback 回调函数
 * @returns 取消监听函数
 */
export function onAppMessage(
  channel: string,
  callback: (payload: unknown, fromApp: string) => void,
): () => void {
  const appChannel = `app:msg:${channel}`
  return getEventBus().on(appChannel, (event) => {
    const { payload, from } = event.payload as { payload: unknown; from: string }
    callback(payload, from)
  })
}

/** 单例 EventBus 引用 */
export const eventBus = getEventBus()
