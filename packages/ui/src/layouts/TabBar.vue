<!--
  页签栏组件（UI 包）

  通过 provide/inject 接收数据：
  - TabsKey: 页签列表
  - ActiveTabKeyKey: 当前激活页签
  - TabActionsKey: 页签操作
  - ResolveTitleKey: 标题翻译函数
-->
<template>
  <div class="tab-bar" ref="tabBarRef">
    <div
      v-for="tab in tabs"
      :key="tab.key"
      class="tab-item"
      :class="{
        active: activeTabKey === tab.key,
        affix: tab.affix,
      }"
      @click="handleClick(tab)"
      @contextmenu.prevent="handleContextMenu($event, tab)"
    >
      <span class="tab-icon">{{ tab.key === 'Dashboard' ? '🏠' : '📄' }}</span>
      <span class="tab-title">{{ resolveTitle(tab.title) }}</span>
      <span v-if="tab.keepAlive" class="tab-cache-dot" :title="t('tab.cacheEnabled')"></span>
      <span
        v-if="!tab.affix"
        class="tab-close"
        @click.stop="handleClose(tab.key)"
      >
        ×
      </span>
    </div>

    <!-- 右键菜单 -->
    <Teleport to="body">
      <div
        v-if="contextMenu.visible"
        class="tab-context-menu"
        :style="{
          left: `${contextMenu.x}px`,
          top: `${contextMenu.y}px`,
        }"
      >
        <div class="menu-item" @click="handleMenuClose">{{ t('tab.close') }}</div>
        <div class="menu-item" @click="handleMenuCloseOther">{{ t('tab.closeOther') }}</div>
        <div class="menu-item" @click="handleMenuCloseAll">{{ t('tab.closeAll') }}</div>
        <div class="menu-divider"></div>
        <div class="menu-item" @click="handleMenuRefresh">{{ t('tab.refresh') }}</div>
        <div
          v-if="contextMenu.tab?.isMicro"
          class="menu-item"
          @click="handleMenuReloadApp"
        >
          {{ t('tab.reloadApp') }}
        </div>
        <div
          v-if="contextMenu.tab?.isMicro"
          class="menu-item"
          @click="handleMenuToggleKeepAlive"
        >
          {{ contextMenu.tab?.keepAlive ? t('tab.disableCache') : t('tab.enableCache') }}
        </div>
        <div
          class="menu-item"
          :class="{ disabled: contextMenu.tab?.key === 'Dashboard' }"
          @click="handleMenuToggleAffix"
        >
          {{ contextMenu.tab?.affix ? t('tab.unpin') : t('tab.pin') }}
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, inject, onMounted, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import { t, logger } from '@micro-public/shared'
import {
  TabsKey,
  ActiveTabKeyKey,
  TabActionsKey,
  ResolveTitleKey,
  type TabItem,
} from '../types'

const router = useRouter()
const tabs = inject(TabsKey, ref([]))
const activeTabKey = inject(ActiveTabKeyKey, ref(''))
const tabActions = inject(TabActionsKey)
const resolveTitle = inject(ResolveTitleKey, (key: string) => key)
const tabBarRef = ref<HTMLElement | null>(null)

const contextMenu = ref<{
  visible: boolean
  x: number
  y: number
  tab: TabItem | null
}>({
  visible: false,
  x: 0,
  y: 0,
  tab: null,
})

function handleClick(tab: TabItem) {
  if (activeTabKey.value === tab.key) return
  tabActions?.setActiveTab(tab.key)
  router.push(tab.path)
}

function handleClose(key: string) {
  const closedPath = tabs.value.find((t) => t.key === key)?.path
  const nextKey = tabActions?.removeTab(key) ?? activeTabKey.value
  const nextTab = tabs.value.find((t) => t.key === nextKey)
  if (nextTab && closedPath !== nextTab.path) {
    router.push(nextTab.path)
  }
}

function handleContextMenu(e: MouseEvent, tab: TabItem) {
  contextMenu.value = {
    visible: true,
    x: e.clientX,
    y: e.clientY,
    tab,
  }
}

function hideContextMenu() {
  contextMenu.value.visible = false
}

function handleMenuClose() {
  if (!contextMenu.value.tab) return
  if (contextMenu.value.tab.affix) {
    hideContextMenu()
    return
  }
  handleClose(contextMenu.value.tab.key)
  hideContextMenu()
}

function handleMenuCloseOther() {
  if (!contextMenu.value.tab) return
  tabActions?.removeOtherTabs(contextMenu.value.tab.key)
  if (activeTabKey.value !== contextMenu.value.tab.key) {
    router.push(contextMenu.value.tab.path)
  }
  hideContextMenu()
}

function handleMenuCloseAll() {
  const nextKey = tabActions?.removeAllTabs() ?? 'Dashboard'
  const nextTab = tabs.value.find((t) => t.key === nextKey)
  if (nextTab) router.push(nextTab.path)
  hideContextMenu()
}

function handleMenuRefresh() {
  if (!contextMenu.value.tab) return
  tabActions?.refreshTab(contextMenu.value.tab.key)
  hideContextMenu()
  if (contextMenu.value.tab.isMicro && contextMenu.value.tab.microAppName) {
    const microApp = (window as any).microApp
    microApp?.reload?.(contextMenu.value.tab.microAppName)
  }
}

function handleMenuReloadApp() {
  if (!contextMenu.value.tab?.microAppName) return
  const microApp = (window as any).microApp
  if (microApp?.reload) {
    microApp.reload(contextMenu.value.tab.microAppName)
    logger.log(`[TabBar] 重载子应用: ${contextMenu.value.tab.microAppName}`)
  }
  hideContextMenu()
}

function handleMenuToggleKeepAlive() {
  if (!contextMenu.value.tab) return
  tabActions?.toggleKeepAlive(contextMenu.value.tab.key)
  hideContextMenu()
}

function handleMenuToggleAffix() {
  if (!contextMenu.value.tab || contextMenu.value.tab.key === 'Dashboard') {
    hideContextMenu()
    return
  }
  tabActions?.toggleAffix(contextMenu.value.tab.key)
  hideContextMenu()
}

onMounted(() => {
  document.addEventListener('click', hideContextMenu)
})

onBeforeUnmount(() => {
  document.removeEventListener('click', hideContextMenu)
})
</script>

<style scoped lang="less">
.tab-bar {
  height: 40px;
  background: var(--color-bg-white);
  border-bottom: 1px solid var(--color-border);
  display: flex;
  align-items: center;
  padding: 0 12px;
  gap: 6px;
  flex-shrink: 0;
  overflow-x: auto;
  overflow-y: hidden;

  &::-webkit-scrollbar {
    height: 4px;
  }
  &::-webkit-scrollbar-thumb {
    background: var(--color-border);
    border-radius: 2px;
  }
}

.tab-item {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 32px;
  padding: 0 12px;
  border-radius: var(--radius);
  border: 1px solid var(--color-border);
  background: var(--color-bg-white);
  color: var(--color-text-secondary);
  font-size: 13px;
  cursor: pointer;
  user-select: none;
  transition: all 0.2s;
  white-space: nowrap;

  &:hover {
    color: var(--color-primary);
    border-color: var(--color-primary);
  }

  &.active {
    color: var(--color-primary);
    border-color: var(--color-primary);
    background: rgba(59, 130, 246, 0.08);
  }

  &.affix {
    .tab-title {
      font-weight: 500;
    }
  }
}

.tab-icon {
  font-size: 14px;
}

.tab-title {
  max-width: 140px;
  overflow: hidden;
  text-overflow: ellipsis;
}

.tab-close {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 14px;
  height: 14px;
  margin-left: 2px;
  border-radius: 50%;
  font-size: 14px;
  line-height: 1;
  transform: translateY(-1px);

  &:hover {
    background: rgba(0, 0, 0, 0.08);
    color: #ef4444;
  }
}

.tab-cache-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--color-success);
  flex-shrink: 0;
}

.tab-context-menu {
  position: fixed;
  z-index: 9999;
  min-width: 120px;
  background: #fff;
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
  padding: 4px 0;

  .menu-item {
    padding: 8px 14px;
    font-size: 13px;
    color: var(--color-text-primary, #333);
    cursor: pointer;

    &:hover {
      background: var(--color-bg);
      color: var(--color-primary);
    }

    &.disabled {
      color: var(--color-text-disabled);
      cursor: not-allowed;

      &:hover {
        background: transparent;
        color: var(--color-text-disabled);
      }
    }
  }

  .menu-divider {
    height: 1px;
    background: var(--color-border);
    margin: 4px 0;
  }
}
</style>
