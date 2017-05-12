
export {
  getDocumentFragment,
  getChildren,
  d
} from './domic'

export {
  setupMounting
} from './mounting'

export {
  ArrayOrSingle,
  BasicAttributes,
  Insertable,
  ClassDefinition,
  ClassObject,
  ComponentFn,
  NodeCreatorFn,
  Decorator,
  DirectionValues,
  DraggableValues,
  DropZoneValues,
  Instantiator,
  Listener,
  StyleDefinition
} from './types'

export {
  bind,
  BindController,
  click,
  clickfix,
  focusOnMount,
  observe,
  onmount,
  onfirstmount,
  onrender,
  onunmount,
  on,
  scrollable
} from './decorators'

export {
  Component,
  Controller,
  ctrl
} from './controller'

export * from 'domic-observable'

export {
  DisplayIf,
  Fragment,
  Repeat,
  RepeatScroll,
  Repeater,
  VirtualHolder,
  Write,
  Writer,
} from './verbs'

////////////////////////////////////////////////////////

import {
  Component
} from './controller'

import {
  BasicAttributes
} from './types'

declare global {
  namespace JSX {
    export type Element = Node

    export interface ElementAttributesProperty {
      attrs: any
    }

    export interface ElementChildrenAttribute {
      children: any
    }

    export interface ElementClassFn {
      (attrs: BasicAttributes, children: DocumentFragment): HTMLElement
    }

    export type ElementClass = ElementClassFn | Component

    export interface IntrinsicElements {
      [name: string]: any
    }
  }
}
