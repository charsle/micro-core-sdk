// micro-app window 全局变量声明
// @micro-zoe/micro-app 在子应用 window 上注入的变量

interface MicroAppWindow {
  __MICRO_APP_BASE_ROUTE__?: string
  __MICRO_APP_ENVIRONMENT__?: boolean
  __MICRO_APP_NAME__?: string
  microApp?: {
    getData: () => Record<string, unknown>
    setData: (appName: string, data: Record<string, unknown>) => void
    setGlobalData: (data: Record<string, unknown>) => void
    getGlobalData: () => Record<string, unknown> | null
    addGlobalDataListener: (cb: (data: unknown) => void, autoTrigger?: boolean) => void
    removeGlobalDataListener: (cb: (data: unknown) => void) => void
    dispatch: (data: Record<string, unknown>) => void
    addDataListener: (
      appNameOrCallback: string | ((data: unknown) => void),
      callback?: (data: unknown) => void,
    ) => void
    removeDataListener: (callback: (data: unknown) => void) => void
    clearDataListener: () => void
    reload: (appName: string) => void
    start: (config?: Record<string, unknown>) => void
  }
}

// 合并到 Window 类型
declare global {
  interface Window extends MicroAppWindow { }
}

export { }
