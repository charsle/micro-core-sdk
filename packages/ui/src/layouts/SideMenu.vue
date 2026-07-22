<!--
  侧边菜单组件（UI 包）

  通过 provide/inject 接收数据，不直接依赖 Pinia store：
  - MenuListKey: 菜单列表
  - SidebarCollapsedKey: 折叠状态
  - ToggleSidebarKey: 切换折叠
-->
<template>
  <aside class="sidebar" :class="{ collapsed: sidebarCollapsed }">
    <!-- Logo 区 -->
    <div class="sidebar-logo">
      <span class="sidebar-logo-icon">🏗️</span>
      <span v-show="!sidebarCollapsed" class="sidebar-logo-text">{{ platformName }}</span>
    </div>

    <!-- 菜单搜索 -->
    <div v-show="!sidebarCollapsed" class="sidebar-search">
      <input
        v-model="searchKeyword"
        type="text"
        :placeholder="t('menu.searchPlaceholder')"
        class="search-input"
      />
    </div>

    <!-- 菜单列表 -->
    <nav class="sidebar-menu">
      <div v-if="filteredMenuList.length === 0" class="menu-empty">
        {{ t('menu.noMatch') }}
      </div>
      <template v-for="menu in filteredMenuList" :key="menu.name">
        <!-- 有子菜单 -->
        <div v-if="menu.children?.length" class="menu-group">
          <div class="menu-group-title" :class="{ active: isGroupActive(menu) }" @click.stop>
            <span class="menu-icon">{{ mergedIconMap[menu.meta.icon as string] || '📄' }}</span>
            <span v-show="!sidebarCollapsed" class="menu-label">{{ menu.meta.title }}</span>
            <span v-show="!sidebarCollapsed" class="menu-arrow">▾</span>
          </div>
          <router-link
            v-for="child in menu.children"
            :key="child.name"
            :to="child.path"
            class="menu-item sub"
            :class="{ active: isActive(child) }"
          >
            <span class="menu-label">{{ child.meta.title }}</span>
          </router-link>
        </div>

        <!-- 叶子菜单 -->
        <router-link
          v-else
          :to="menu.path"
          class="menu-item"
          :class="{ active: isActive(menu) }"
        >
          <span class="menu-icon">{{ mergedIconMap[menu.meta.icon as string] || '📄' }}</span>
          <span v-show="!sidebarCollapsed" class="menu-label">{{ menu.meta.title }}</span>
        </router-link>
      </template>
    </nav>
  </aside>
</template>

<script setup lang="ts">
import { ref, computed, watch, inject } from 'vue'
import { useRoute } from 'vue-router'
import { t } from '@micro-public/shared'
import {
  MenuListKey,
  SidebarCollapsedKey,
  type MenuItem,
} from '../types'

const props = withDefaults(defineProps<{
  platformName?: string
  iconMap?: Record<string, string>
}>(), {
  platformName: '微前端平台',
})

const defaultIconMap: Record<string, string> = {
  dashboard: '📊',
  app: '📱',
  setting: '⚙️',
  user: '👤',
  role: '🛡️',
  list: '📋',
  form: '📝',
  chart: '📈',
  file: '📁',
  monitor: '📡',
}

const mergedIconMap = computed(() => ({ ...defaultIconMap, ...(props.iconMap || {}) }))

// 从 inject 获取数据
const menuList = inject(MenuListKey, ref([]))
const sidebarCollapsed = inject(SidebarCollapsedKey, ref(false))

const route = useRoute()
const searchKeyword = ref('')
const debouncedKeyword = ref('')

// 搜索防抖（300ms）
let debounceTimer: ReturnType<typeof setTimeout> | null = null
watch(searchKeyword, (val) => {
  if (debounceTimer) clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => {
    debouncedKeyword.value = val
  }, 300)
})

// 搜索过滤
const filteredMenuList = computed(() => {
  const keyword = debouncedKeyword.value.trim().toLowerCase()
  if (!keyword) return menuList.value

  function filterMenu(items: MenuItem[]): MenuItem[] {
    return items
      .map((item): MenuItem | null => {
        if (item.children?.length) {
          const filteredChildren = filterMenu(item.children)
          if (filteredChildren.length > 0) {
            return { ...item, children: filteredChildren }
          }
          if (item.meta.title.toLowerCase().includes(keyword)) {
            return item
          }
          return null
        }
        if (item.meta.title.toLowerCase().includes(keyword)) {
          return item
        }
        return null
      })
      .filter(Boolean) as MenuItem[]
  }

  return filterMenu(menuList.value)
})

/** 菜单激活判断 */
function isActive(menu: MenuItem): boolean {
  if (!route) return false
  const activeMenu = route.meta?.activeMenu as string | undefined
  if (activeMenu) return activeMenu === menu.path
  return route.path === menu.path || route.path.startsWith(menu.path + '/')
}

/** 父级菜单组激活判断 */
function isGroupActive(group: MenuItem): boolean {
  if (!group.children?.length) return false
  if (group.children.some((child: MenuItem) => isActive(child))) return true
  return route?.path.startsWith(group.path + '/') || false
}
</script>

<style scoped lang="less">
.sidebar {
  width: var(--sidebar-width);
  height: 100vh;
  background: var(--color-bg-sidebar);
  color: #fff;
  display: flex;
  flex-direction: column;
  transition: width 0.3s;
  overflow: hidden;
  flex-shrink: 0;

  &.collapsed {
    width: var(--sidebar-collapsed-width);
  }
}

.sidebar-logo {
  height: var(--header-height);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  flex-shrink: 0;

  &-icon { font-size: 20px; }
  &-text { font-weight: 600; font-size: 15px; white-space: nowrap; }
}

.sidebar-menu {
  flex: 1;
  overflow-y: auto;
  padding: 8px 0;
}

.sidebar-search {
  padding: 8px 12px;

  .search-input {
    width: 100%;
    height: 32px;
    padding: 0 10px;
    border: 1px solid rgba(255, 255, 255, 0.15);
    border-radius: var(--radius);
    background: rgba(255, 255, 255, 0.08);
    color: #fff;
    font-size: 13px;
    outline: none;
    transition: all 0.2s;

    &::placeholder {
      color: rgba(255, 255, 255, 0.35);
    }

    &:focus {
      border-color: var(--color-primary);
      background: rgba(255, 255, 255, 0.12);
    }
  }
}

.menu-empty {
  padding: 20px;
  text-align: center;
  color: rgba(255, 255, 255, 0.35);
  font-size: 12px;
}

.menu-item {
  display: flex;
  align-items: center;
  gap: 10px;
  height: 44px;
  padding: 0 20px;
  color: rgba(255, 255, 255, 0.65);
  text-decoration: none;
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;

  &:hover {
    color: #fff;
    background: var(--color-bg-sidebar-hover);
  }

  &.active {
    color: #fff;
    background: var(--color-bg-sidebar-active);
  }

  &.sub {
    padding-left: 52px;
  }
}

.menu-icon { font-size: 16px; flex-shrink: 0; }
.menu-label { font-size: 14px; }
.menu-arrow { margin-left: auto; font-size: 10px; opacity: 0.5; }

.menu-group {
  border-top: 1px solid rgba(255, 255, 255, 0.06);
  margin-top: 4px;
  padding-top: 4px;
}

.menu-group-title {
  display: flex;
  align-items: center;
  gap: 10px;
  height: 44px;
  padding: 0 20px;
  color: rgba(255, 255, 255, 0.45);
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 1px;
  white-space: nowrap;

  &.active {
    color: rgba(255, 255, 255, 0.85);

    .menu-icon {
      opacity: 1;
    }
  }
}
</style>
