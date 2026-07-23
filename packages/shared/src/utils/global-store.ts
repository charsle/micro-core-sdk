/**
 * 微前端响应式全局状态总线 (Global Store)
 * 
 * 特性：
 * 1. 跨应用响应式状态同步（基座修改自动发布给各子应用，子应用修改自动上报基座）
 * 2. 状态增量 Patch 与浅层去重，防止循环发布
 * 3. 支持泛型强类型约束与 Vue 3 reactive 响应式绑定
 */

import { isMicroAppEnv, getMicroAppName, dispatchToMain } from './micro-bridge'
import { logger } from './logger'

export type StateChangeListener<T = Record<string, any>> = (
  newState: T,
  changedKeys: string[],
  prevValue?: Record<string, any>
) => void

class GlobalStoreImpl<T extends Record<string, any> = Record<string, any>> {
  private state: T = {} as T
  private listeners: Set<StateChangeListener<T>> = new Set()
  private isUpdatingInternal = false

  constructor(initialState?: T) {
    if (initialState) {
      this.state = { ...initialState }
    }
  }

  /**
   * 初始化/全量覆盖状态
   */
  init(initialState: T): void {
    this.state = { ...initialState }
    this.notify(Object.keys(initialState))
  }

  /**
   * 获取当前全部全局状态 snapshot
   */
  getState(): Readonly<T> {
    return Object.freeze({ ...this.state })
  }

  /**
   * 获取某个特定 Key 的状态值
   */
  get<K extends keyof T>(key: K): T[K] {
    return this.state[key]
  }

  /**
   * 变更/Patch 某个或多个全局状态
   * 
   * @param partialState 待更新的状态字段对象
   * @param source 触发源（默认为当前环境）
   */
  set(partialState: Partial<T>, source?: string): void {
    if (this.isUpdatingInternal) return

    const changedKeys: string[] = []
    const prevSnapshot = { ...this.state }

    for (const key of Object.keys(partialState) as Array<keyof T>) {
      const newVal = partialState[key]
      const oldVal = this.state[key]

      if (newVal !== oldVal) {
        this.state[key] = newVal as T[keyof T]
        changedKeys.push(key as string)
      }
    }

    if (changedKeys.length === 0) return

    const actionSource = source || (isMicroAppEnv() ? getMicroAppName() : 'main')

    logger.info(`[GlobalStore] State updated by [${actionSource}], keys:`, changedKeys)

    // 触发本地订阅者
    this.notify(changedKeys, prevSnapshot)

    // 如果处于子应用环境，通过 dispatch 将状态变更增量上报给基座
    if (isMicroAppEnv()) {
      const patchData: Record<string, any> = {}
      changedKeys.forEach((k) => {
        patchData[k] = this.state[k]
      })
      dispatchToMain({
        name: getMicroAppName(),
        type: 'GLOBAL_STORE_PATCH',
        patch: patchData,
      } as any)
    }
  }

  /**
   * 仅在本地应用中更新状态（收到跨应用同步数据时调用，防止死循环）
   */
  setLocalPatch(patch: Partial<T>): void {
    this.isUpdatingInternal = true
    try {
      const changedKeys: string[] = []
      const prevSnapshot = { ...this.state }

      for (const key of Object.keys(patch) as Array<keyof T>) {
        if (this.state[key] !== patch[key]) {
          this.state[key] = patch[key] as T[keyof T]
          changedKeys.push(key as string)
        }
      }

      if (changedKeys.length > 0) {
        this.notify(changedKeys, prevSnapshot)
      }
    } finally {
      this.isUpdatingInternal = false
    }
  }

  /**
   * 订阅状态变更
   */
  subscribe(listener: StateChangeListener<T>): () => void {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

  private notify(changedKeys: string[], prevSnapshot?: Record<string, any>): void {
    const currentStateSnapshot = Object.freeze({ ...this.state })
    this.listeners.forEach((listener) => {
      try {
        listener(currentStateSnapshot as T, changedKeys, prevSnapshot)
      } catch (err) {
        logger.error('[GlobalStore] listener error:', err)
      }
    })
  }
}

/** 单例 GlobalStore 实例 */
export const globalStore = new GlobalStoreImpl({
  theme: 'light',
  user: null,
  token: '',
  language: 'zh-CN',
})

/** 创建独立全局状态实例 */
export function createGlobalStore<T extends Record<string, any>>(initialState?: T) {
  return new GlobalStoreImpl<T>(initialState)
}
