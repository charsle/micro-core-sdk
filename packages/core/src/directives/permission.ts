/**
 * v-permission 权限指令
 *
 * 使用方式：
 *   import { permissionDirective } from '@micro-public/core'
 *   app.directive('permission', permissionDirective(hasPermission))
 *
 *   // 模板中
 *   <button v-permission="'user:delete'">删除</button>
 *   <button v-permission="['user:edit', 'admin']">编辑</button>
 */

import type { Directive, DirectiveBinding } from 'vue'

export type PermissionChecker = (value: string | string[]) => boolean

export function permissionDirective(checker: PermissionChecker): Directive {
  return {
    mounted(el: HTMLElement, binding: DirectiveBinding<string | string[]>) {
      const { value } = binding
      if (value && !checker(value)) {
        el.parentNode?.removeChild(el)
      }
    },
    updated(el: HTMLElement, binding: DirectiveBinding<string | string[]>) {
      const { value } = binding
      if (value && !checker(value)) {
        el.parentNode?.removeChild(el)
      }
    },
  }
}
