<!--
  默认布局组件（UI 包）

  结构：SideMenu + HeaderBar + TabBar + 内容区
  内容区 #micro-container 作为子应用和业务页面的挂载点

  通过 provide/inject 接收数据，不直接依赖 Pinia store。
-->
<template>
  <div class="layout" :class="{ collapsed: sidebarCollapsed }">
    <SideMenu :platformName="platformName" :iconMap="iconMap" />
    <div class="layout-main">
      <HeaderBar />
      <TabBar />
      <div class="layout-content" id="micro-container">
        <slot />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { inject, ref } from 'vue'
import SideMenu from './SideMenu.vue'
import HeaderBar from './HeaderBar.vue'
import TabBar from './TabBar.vue'
import { SidebarCollapsedKey } from '../types'

withDefaults(defineProps<{
  /** 平台名称 */
  platformName?: string
  /** 自定义图标映射 */
  iconMap?: Record<string, string>
}>(), {
  platformName: '微前端平台',
})

const sidebarCollapsed = inject(SidebarCollapsedKey, ref(false))
</script>

<style scoped lang="less">
.layout {
  display: flex;
  height: 100vh;
  overflow: hidden;
}
.layout-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
}
.layout-content {
  flex: 1;
  overflow: hidden;
  background: var(--color-bg);
}
</style>
