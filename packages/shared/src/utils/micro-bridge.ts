/**
 * micro-app 通信工具
 * 
 * 设计理念：子应用不需要直接依赖 @micro-zoe/micro-app，
 * 而是通过 window 上的 microApp 全局对象进行通信。
 * 这样子应用独立运行时也不会报错。
 */

import type { GlobalData, SubAppData, CommMessage } from '../types'

// ===== 跨应用传输通道（共享 window） =====
// 背景：本项目子应用入口以 <script type="module"> 加载，micro-app 0.8.x
// 不对 module 脚本注入沙箱，子应用实际运行在与基座相同的真实 window 上
// （已验证：__MICRO_APP_ENVIRONMENT__ 在顶层 window 可见）。但 micro-app 只会把
// window.microApp（EventCenterForMicroApp）注入到沙箱代理 window，module 脚本
// 拿不到，导致 dispatch / addGlobalDataListener 全部失效。
// 因此这里改用共享 window 上的 CustomEvent 作为可靠传输通道：
//   子应用 → 基座：window 派发 UP_CHANNEL
//   基座 → 子应用：window 派发 DOWN_CHANNEL
// 若处于真正的沙箱环境（window.microApp 存在），则优先走 micro-app 官方数据通道。
export const MICRO_BUS_UP_CHANNEL = '__micro_app_bus_up__'
export const MICRO_BUS_DOWN_CHANNEL = '__micro_app_bus_down__'

// ===== 宿主（基座）标记 =====
// 关键：本项目基座与子应用共享同一真实 window，子应用把 __MICRO_APP_ENVIRONMENT__
// 泄漏到了顶层 window，导致基座的 isMicroAppEnv() 也返回 true。若不区分，基座在
// eventBus.emit 时会误以为自己是子应用而 dispatchToMain（派发 UP），又被基座自己的
// onSubAppDispatch 接收 → 再 emit → 再 UP，形成自我放大的死循环。
//
// 由于基座（Rspack）与子应用（Vite）各自打包了独立的 shared 副本，这里用「模块级」
// 变量而非 window 全局来标记宿主：基座启动时调用 markAsMainHost()，只影响基座这一份
// shared 实例；子应用那一份不受影响，仍按子应用逻辑运行。
let __isMainHost = false

/** 基座专用：在应用启动最早期调用，声明当前 shared 实例运行于宿主（基座） */
export function markAsMainHost(): void {
  __isMainHost = true
}

/** 是否为宿主（基座）环境 */
export function isMainHost(): boolean {
  return __isMainHost
}

// ===== 判断当前是否在 micro-app 环境中运行 =====
// 宿主（基座）即使因共享 window 而读到 __MICRO_APP_ENVIRONMENT__，也绝不算子应用环境
export function isMicroAppEnv(): boolean {
  if (__isMainHost) return false
  return !!window.__MICRO_APP_ENVIRONMENT__
}

// ===== 获取当前子应用名称 =====
export function getMicroAppName(): string {
  return window.__MICRO_APP_NAME__ || ''
}

// ===== 获取基座下发的全局数据 =====
// 基座通过 microApp.setGlobalData 下发，子应用用 getGlobalData 读取（全局数据通道）
// module-bypass 环境下 window.microApp 不存在，回退读取共享 window 上的缓存快照
export function getGlobalData<T extends GlobalData = GlobalData>(): Partial<T> {
  if (!isMicroAppEnv()) return {}
  const microApp = (window as any).microApp
  if (microApp?.getGlobalData) {
    return (microApp.getGlobalData() || {}) as Partial<T>
  }
  return (((window as any).__MICRO_APP_GLOBAL_DATA__ as Partial<T>) || {})
}

// ===== 子应用 → 基座：上报数据 =====
export function dispatchToMain(data: SubAppData): void {
  if (!isMicroAppEnv()) return
  const microApp = (window as any).microApp
  if (microApp?.dispatch) {
    // 正常沙箱环境：走 micro-app 官方数据通道
    microApp.dispatch(data as unknown as Record<string, unknown>)
    return
  }
  // module-bypass 环境：走共享 window 传输通道
  window.dispatchEvent(new CustomEvent(MICRO_BUS_UP_CHANNEL, { detail: data }))
}

// ===== 基座端：监听子应用上报（共享 window 通道） =====
export function onSubAppDispatch(callback: (data: SubAppData) => void): () => void {
  const handler = (e: Event) => callback((e as CustomEvent).detail as SubAppData)
  window.addEventListener(MICRO_BUS_UP_CHANNEL, handler as EventListener)
  return () => window.removeEventListener(MICRO_BUS_UP_CHANNEL, handler as EventListener)
}

// ===== 基座端：向子应用下发事件（共享 window 通道） =====
export function pushEventToSubApps(detail: Record<string, unknown>): void {
  window.dispatchEvent(new CustomEvent(MICRO_BUS_DOWN_CHANNEL, { detail }))
}

// ===== 子应用 → 基座：发送通信消息 =====
export function sendMessage<T = unknown>(
  type: CommMessage['type'],
  payload: T,
): void {
  dispatchToMain({
    name: getMicroAppName(),
    data: { type, payload, timestamp: Date.now() },
  })
}

// ===== 子应用监听基座全局数据变化 =====
// 基座 setGlobalData 走的是全局数据通道，子应用须用 addGlobalDataListener 监听
// module-bypass 环境下 window.microApp 不存在，回退监听共享 window 下行通道
export function onGlobalDataChange<T = GlobalData>(
  callback: (data: Partial<T>) => void,
): () => void {
  if (!isMicroAppEnv()) return () => { }
  const microApp = (window as any).microApp

  if (microApp?.addGlobalDataListener) {
    const listener = (data: unknown) => {
      callback(data as Partial<T>)
    }
    // autoTrigger=true：绑定时若已有缓存的全局数据（如初始 token），立即触发一次
    microApp.addGlobalDataListener(listener, true)
    return () => {
      microApp.removeGlobalDataListener?.(listener)
    }
  }

  // module-bypass 回退：监听共享 window 下行通道
  const handler = (e: Event) => {
    const detail = (e as CustomEvent).detail as Record<string, unknown>
    // 缓存全局数据快照，供 getGlobalData 同步读取
    if (detail && detail._globalData) {
      ; (window as any).__MICRO_APP_GLOBAL_DATA__ = detail._globalData
    }
    callback(detail as Partial<T>)
  }
  window.addEventListener(MICRO_BUS_DOWN_CHANNEL, handler as EventListener)
  return () => {
    window.removeEventListener(MICRO_BUS_DOWN_CHANNEL, handler as EventListener)
  }
}

// ===== 基座端：向指定子应用下发数据（基座专用） =====
export function setSubAppData(
  appName: string,
  data: Record<string, unknown>,
): void {
  // 仅在非子应用环境（即基座环境）中调用
  if (isMicroAppEnv()) return
  const microApp = (window as any).microApp
  microApp?.setData?.(appName, data)
}

// ===== 基座端：设置全局数据（基座专用） =====
export function setGlobalData(data: Record<string, unknown>): void {
  if (isMicroAppEnv()) return
  const microApp = (window as any).microApp
  microApp?.setGlobalData?.(data)
}
