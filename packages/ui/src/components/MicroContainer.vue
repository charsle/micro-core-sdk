<!--
  子应用容器组件（UI 包）

  核心职责：
  - 通过 <micro-app> 标签加载并渲染子应用
  - 管理加载状态（loading / timeout / error）
  - keep-alive 缓存控制
  - 路由切换智能判断

  通过 provide/inject 接收子应用配置，不直接依赖业务 store。
-->
<template>
  <div class="micro-wrapper" :class="{ loading: isLoading, error: hasError, timeout: isTimeout }">
    <!-- 加载中 -->
    <div v-if="isLoading && !isTimeout" class="micro-loading">
      <div class="micro-loading-spinner"></div>
      <span>{{ t('micro.loading', { name: displayName }) }}</span>
      <span class="loading-hint" v-if="loadingElapsed > 3">{{ t('micro.elapsed', { seconds: loadingElapsed }) }}</span>
    </div>

    <!-- 加载超时 -->
    <div v-if="isTimeout && !hasError" class="micro-timeout">
      <div class="timeout-icon">⏳</div>
      <p>{{ t('micro.timeout', { name: displayName, seconds: LOAD_TIMEOUT / 1000 }) }}</p>
      <p class="timeout-hint">{{ t('micro.timeoutHint') }}</p>
      <div class="timeout-actions">
        <button class="retry-btn" @click="retry">{{ t('micro.reload') }}</button>
        <button class="check-btn" @click="checkEntry">{{ t('micro.checkEntry') }}</button>
      </div>
    </div>

    <!-- 加载错误 -->
    <div v-if="hasError" class="micro-error">
      <div class="error-icon">⚠️</div>
      <p>{{ errorMessage }}</p>
      <button class="retry-btn" @click="retry">{{ t('micro.reload') }}</button>
    </div>

    <!-- 子应用容器 -->
    <micro-app
      v-show="!isLoading && !hasError && !isTimeout"
      :name="appName"
      :url="entry"
      :baseroute="baseRoute"
      :keep-alive="isKeepAlive"
      :data="microData"
      :inline="appConfig?.inline ?? false"
      :scopecss="appConfig?.scopedCSS ?? true"
      destroy
      @created="onCreated"
      @beforemount="onBeforeMount"
      @mounted="onMounted"
      @unmount="onUnmount"
      @error="onError"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, inject, onBeforeUnmount } from 'vue'
import { useRoute } from 'vue-router'
import { t, logger } from '@micro-public/shared'
import {
  MicroAppsKey,
  GetMicroAppByNameKey,
  TabsKey,
  type TabItem,
  type MicroAppConfig,
} from '../types'

const props = withDefaults(defineProps<{
  /** 子应用名称 */
  name?: string
  /** 子应用入口地址 */
  entry?: string
  /** 是否保持 alive */
  keepAlive?: boolean
  /** 传递给子应用的附加数据 */
  data?: Record<string, unknown>
}>(), {
  keepAlive: false,
})

const route = useRoute()
const microApps = inject(MicroAppsKey, [] as MicroAppConfig[])
const getMicroAppByName = inject(GetMicroAppByNameKey, (name: string) => microApps.find((a: MicroAppConfig) => a.name === name))
const tabs = inject(TabsKey, ref([] as TabItem[]))

const isLoading = ref(true)
const hasError = ref(false)
const isTimeout = ref(false)
const errorMessage = ref('')
const loadingElapsed = ref(0)

const LOAD_TIMEOUT = 15000
let loadingTimer: ReturnType<typeof setTimeout> | null = null
let elapsedTimer: ReturnType<typeof setInterval> | null = null

const appName = computed(() => {
  if (!route) return props.name || ''
  const metaName = route.meta?.microAppName as string | undefined
  return props.name || metaName || ''
})

const appConfig = computed(() => getMicroAppByName(appName.value))

const isKeepAlive = computed(() => {
  const tab = tabs.value.find(
    (tabItem: TabItem) => tabItem.microAppName === appName.value || tabItem.path === route?.path,
  )
  if (tab?.keepAlive !== undefined) return tab.keepAlive
  const metaKeepAlive = route.meta?.keepAlive
  if (metaKeepAlive !== undefined) return !!metaKeepAlive
  if (appConfig.value?.keepAlive !== undefined) return appConfig.value.keepAlive
  return props.keepAlive
})

const displayName = computed(() => {
  const meta = route?.meta
  return (meta?.title as string) || appName.value
})

const entry = computed(() => {
  if (props.entry) return props.entry
  const app = getMicroAppByName(appName.value)
  return app?.entry || ''
})

const baseRoute = computed(() => {
  const rule = appConfig.value?.activeRule
  if (rule) {
    return Array.isArray(rule) ? rule[0] : rule
  }
  return (props.data?.baseRoute as string) || route?.path || ''
})

const microData = computed(() => {
  return {
    baseRoute: baseRoute.value,
    token: localStorage.getItem('token') || '',
    appName: appName.value,
    _lifecycle: {
      bootstrap: true,
      mount: true,
      unmount: true,
      update: true,
    },
    ...(props.data || {}),
  }
})

function startLoadingTimers() {
  clearLoadingTimers()
  loadingElapsed.value = 0
  isTimeout.value = false

  elapsedTimer = setInterval(() => {
    loadingElapsed.value++
  }, 1000)

  loadingTimer = setTimeout(() => {
    isTimeout.value = true
    isLoading.value = false
    if (elapsedTimer) clearInterval(elapsedTimer)
    logger.warn(`[MicroContainer] ${appName.value} 加载超时（${LOAD_TIMEOUT}ms）`)
  }, LOAD_TIMEOUT)
}

function clearLoadingTimers() {
  if (loadingTimer) { clearTimeout(loadingTimer); loadingTimer = null }
  if (elapsedTimer) { clearInterval(elapsedTimer); elapsedTimer = null }
}

function getAppNameFromPath(path: string | undefined): string {
  if (!path) return ''
  const matched = microApps.find((app: MicroAppConfig) => {
    const rule = Array.isArray(app.activeRule) ? app.activeRule : [app.activeRule]
    return rule.some((r: string) => path === r || path.startsWith(r + '/'))
  })
  return matched?.name || ''
}

watch(
  () => route?.fullPath,
  (newPath, oldPath) => {
    const oldAppName = getAppNameFromPath(oldPath)
    const newAppName = getAppNameFromPath(newPath)

    if (oldAppName && oldAppName === newAppName && newAppName === appName.value) {
      logger.log(`[MicroContainer] 子应用内部路由切换: ${oldPath} → ${newPath}`)
      window.dispatchEvent(new PopStateEvent('popstate', { state: window.history.state }))
      return
    }

    isLoading.value = true
    hasError.value = false
    isTimeout.value = false
    startLoadingTimers()
  },
)

startLoadingTimers()

function dispatchLifecycleEvent(type: string, extra?: Record<string, unknown>) {
  window.dispatchEvent(new CustomEvent('app:micro-lifecycle', {
    detail: { name: appName.value, type, ...extra },
  }))
}

function onCreated() {
  logger.log(`[MicroContainer] ${appName.value} created`)
  dispatchLifecycleEvent('created')
}

function onBeforeMount() {
  logger.log(`[MicroContainer] ${appName.value} beforemount`)
}

function onMounted() {
  clearLoadingTimers()
  isLoading.value = false
  hasError.value = false
  isTimeout.value = false
  logger.log(`[MicroContainer] ${appName.value} mounted`)
  dispatchLifecycleEvent('mounted')
}

function onUnmount() {
  clearLoadingTimers()
  logger.log(`[MicroContainer] ${appName.value} unmounted`)
  dispatchLifecycleEvent('unmounted')
}

function onError(e: CustomEvent) {
  clearLoadingTimers()
  logger.error(`[MicroContainer] ${appName.value} error:`, e.detail)
  isLoading.value = false
  hasError.value = true
  isTimeout.value = false
  errorMessage.value = t('micro.loadFailed', { name: appName.value, detail: e.detail || t('micro.unknownError') })
  dispatchLifecycleEvent('error', { message: e.detail || t('micro.unknownError') })
}

function retry() {
  hasError.value = false
  isTimeout.value = false
  isLoading.value = true
  startLoadingTimers()

  const microApp = (window as any).microApp
  if (microApp?.reload) {
    microApp.reload(appName.value)
  }
}

async function checkEntry() {
  try {
    await fetch(entry.value, { method: 'HEAD', mode: 'no-cors' })
    alert(t('micro.entryReachable', { name: appName.value, entry: entry.value }))
  } catch {
    alert(t('micro.entryUnreachable', { name: appName.value, entry: entry.value }))
  }
}

onBeforeUnmount(() => {
  clearLoadingTimers()
  logger.log(`[MicroContainer] container for ${appName.value} will unmount`)
})
</script>

<style scoped lang="less">
.micro-wrapper {
  width: 100%;
  height: 100%;
  position: relative;
  overflow: hidden;

  &.loading {
    display: flex;
    align-items: center;
    justify-content: center;
  }
}

:deep(micro-app) {
  width: 100%;
  height: 100%;
  display: block;
}

.micro-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  color: var(--color-text-secondary);
  font-size: 13px;

  &-spinner {
    width: 32px;
    height: 32px;
    border: 3px solid var(--color-border);
    border-top-color: var(--color-primary);
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }

  .loading-hint {
    font-size: 12px;
    color: var(--color-text-disabled);
  }
}

.micro-timeout {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  gap: 12px;
  color: var(--color-text-secondary);

  .timeout-icon { font-size: 48px; }
  .timeout-hint { font-size: 12px; color: var(--color-text-disabled); }
  .timeout-actions { display: flex; gap: 12px; margin-top: 8px; }

  .check-btn {
    padding: 8px 20px;
    background: var(--color-bg-white);
    color: var(--color-text-secondary);
    border: 1px solid var(--color-border);
    border-radius: var(--radius);
    cursor: pointer;
    font-size: 14px;

    &:hover {
      border-color: var(--color-primary);
      color: var(--color-primary);
    }
  }
}

.micro-error {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  gap: 16px;
  color: var(--color-text-secondary);

  .error-icon { font-size: 48px; }

  .retry-btn {
    padding: 8px 20px;
    background: var(--color-primary);
    color: #fff;
    border: none;
    border-radius: var(--radius);
    cursor: pointer;
    font-size: 14px;

    &:hover { opacity: 0.9; }
  }
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
</style>
