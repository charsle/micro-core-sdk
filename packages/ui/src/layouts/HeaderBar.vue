<!--
  顶栏组件（UI 包）

  通过 provide/inject 接收数据：
  - UserInfoKey: 用户信息
  - ToggleSidebarKey: 切换侧边栏
  - LogoutKey: 登出回调
  - ToggleThemeKey / IsDarkKey: 主题
  - ToggleLocaleKey / CurrentLocaleKey: 语言
-->
<template>
  <header class="header">
    <div class="header-left">
      <button class="header-collapse" @click="toggleSidebar" :title="t('header.collapseMenu')">
        ☰
      </button>
    </div>

    <div class="header-right">
      <!-- 语言切换 -->
      <button class="header-action lang-btn" @click="toggleLocale" :title="currentLocale === 'zh-CN' ? '中文' : 'English'">
        {{ currentLocale === 'zh-CN' ? '中' : 'EN' }}
      </button>

      <!-- 主题切换 -->
      <button class="header-action" @click="toggleTheme" :title="isDark ? t('header.switchLight') : t('header.switchDark')">
        {{ isDark ? '☀️' : '🌙' }}
      </button>

      <span class="header-user" v-if="userInfo">
        {{ userInfo.name }}
      </span>
      <span class="header-user" v-else>{{ t('header.notLoggedIn') }}</span>

      <button class="header-action logout-btn" @click="handleLogout" v-if="userInfo?.token" :title="t('header.logout')">
        {{ t('header.logout') }}
      </button>
    </div>
  </header>
</template>

<script setup lang="ts">
import { inject, ref } from 'vue'
import { t } from '@micro-public/shared'
import {
  UserInfoKey,
  ToggleSidebarKey,
  LogoutKey,
  ToggleThemeKey,
  IsDarkKey,
  ToggleLocaleKey,
  CurrentLocaleKey,
} from '../types'

const userInfo = inject(UserInfoKey)
const toggleSidebar = inject(ToggleSidebarKey, () => {})
const handleLogoutFn = inject(LogoutKey, () => {})
const toggleTheme = inject(ToggleThemeKey, () => {})
const isDark = inject(IsDarkKey, ref(false))
const toggleLocale = inject(ToggleLocaleKey, () => {})
const currentLocale = inject(CurrentLocaleKey, ref('zh-CN'))

function handleLogout() {
  if (!confirm(t('header.confirmLogout'))) return
  handleLogoutFn()
}
</script>

<style scoped lang="less">
.header {
  height: var(--header-height);
  background: var(--color-bg-white);
  border-bottom: 1px solid var(--color-border);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px;
  flex-shrink: 0;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.03);
}

.header-left { display: flex; align-items: center; }

.header-collapse {
  background: none;
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  width: 32px;
  height: 32px;
  font-size: 16px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-text-secondary);

  &:hover {
    color: var(--color-primary);
    border-color: var(--color-primary);
  }
}

.header-right { display: flex; align-items: center; gap: 16px; }

.header-user {
  font-size: 13px;
  color: var(--color-text-secondary);
}

.header-action {
  background: none;
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  padding: 4px 10px;
  font-size: 13px;
  cursor: pointer;
  color: var(--color-text-secondary);
  transition: all 0.2s;

  &:hover {
    border-color: var(--color-primary);
    color: var(--color-primary);
  }
}

.lang-btn {
  font-weight: 600;
  min-width: 32px;
}

.logout-btn:hover {
  border-color: var(--color-error) !important;
  color: var(--color-error) !important;
}
</style>
