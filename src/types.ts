
import {O} from 'stalkr'

export type ArrayOrSingle<T> = T | T[]

export interface Instantiator<T> {
  new (...a: any[]): T
}

/**
 * Decorators used on Nodes
 */
export type Decorator = (n: Node) => ( Node | void )
/**
 * Classes.
 */
export type ClassObject = {[name: string]: O<boolean>}
export type ClassDefinition = ClassObject | O<string>

/**
 * Styles
 */
export type StyleDefinition = {[name: string]: O<string>}


export type DirectionValues = 'ltr' | 'rtl'
export type DropZoneValues = 'copy' | 'move' | 'link'
export type DraggableValues = boolean | 'true' | 'false' | 'auto'


/**
 * Basic attributes used on all nodes.
 */
export interface BasicAttributes {
  id?: O<string>

  tabindex?: O<string>
  accesskey?: O<string>
  contenteditable?: O<boolean>
  contextmenu?: O<string>
  dropzone?: O<DropZoneValues>
  draggable?: O<DraggableValues>
  dir?: O<DirectionValues>
  hidden?: O<boolean>

  class?: ArrayOrSingle<ClassDefinition> // special attributes
  style?: ArrayOrSingle<StyleDefinition>
  $$?: ArrayOrSingle<Decorator>
}

export type Child = Node | string | number
export type Children = ArrayOrSingle<Child>
export type CreatorFn = (attrs: BasicAttributes, children: Children) => Node
