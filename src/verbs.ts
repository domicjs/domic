/**
 * Control structures to help with readability.
 */
import {
  o,
  MaybeObservable,
  Observable,
  PropObservable
} from 'domic-observable'

import {
  d,
} from './domic'

import {
  onmount,
  onunmount,
} from './decorators'

import {
  Component,
} from './controller'

import {
  BasicAttributes,
  NodeCreatorFn
} from './types'


/**
 * Base Component for components not using DOM Elements.
 *
 * Rendered as a several Comment nodes, it keeps its children
 * between a starting and an ending Comment (called `begin` and
 * `end` internally) which are kept immediately *after* `this.node`
 */
export class VirtualHolder extends Component {

  /**
   * A string used to keep track in the DOM of who we are.
   */
  name = 'virtual'

  /**
   * The Comment after which all children will be appended.
   */
  begin: Comment

  /**
   * The Comment before which all children will be inserted
   */
  end: Comment

  /**
   * An internal variable used to hold the next node that will be appended,
   * as since we wait for an Animation Frame to execute, updateChildren
   * can be thus called multiple times before actually adding anything into
   * the DOM
   */
  protected next_node: Node

  /**
   * A DocumentFragment in which manually removed children are stored
   * for later remounting if needed.
   */
  protected saved_children: DocumentFragment

  /**
   * True if updateChildren() was called but the new children
   * are still waiting for the AnimationFrame
   */
  protected waiting: boolean

  render(children?: DocumentFragment): Node {
    this.begin = document.createComment(` (( `)
    this.end = document.createComment(` ))`)

    if (children) {
      children.insertBefore(this.begin, children.firstChild)
      children.appendChild(this.end)
      this.saved_children = children
    }

    return document.createComment(` ${this.name}: `)
  }

  @onmount
  createOrAppendChildren(node: Node) {
    let parent = node.parentNode
    let next = node.nextSibling

    if (this.saved_children) {

      parent.insertBefore(this.saved_children, next)
      this.saved_children = null

    } else if (!this.begin.parentNode) {
      parent.insertBefore(this.begin, next)
      parent.insertBefore(this.end, next)
    }
  }

  @onunmount
  unmountChildrenIfNeeded(node: Node) {

    // If we have a parentNode in an unmount() method, it means
    // that we were not unmounted directly.
    // If there is no parentNode, `this.node` was specifically
    // removed from the DOM and since we keep our children
    // after `this.node`, we need to remove them as well.
    if (!node.parentNode) {
      requestAnimationFrame(() => {
        let fragment = document.createDocumentFragment()

        let iter: Node = this.begin
        let next: Node = null

        while (iter) {
          next = iter.nextSibling
          fragment.appendChild(iter)
          if (iter === this.end) break
          iter = next
        }

        this.saved_children = fragment
      })
    }

  }

  updateChildren(node: Node) {
    this.next_node = node

    let iter = this.begin.nextSibling
    let end = this.end
    let next: Node = null

    if (!iter) {
      // If we're here, we're most likely not mounted, so we will
      // put the next node into saved_children instead.
      this.saved_children = this.next_node as DocumentFragment
      this.next_node = null
      return
    }

    while (iter !== end) {
      next = iter.nextSibling
      iter.parentNode.removeChild(iter)
      iter = next
    }

    if (this.next_node)
      end.parentNode.insertBefore(this.next_node, end)
    this.next_node = null

  }

}


export interface HasToString {
  toString(): string
}


export class Writer extends Component {

  attrs: {
    obs: Observable<HasToString>
  }

  render() {
    let node = document.createTextNode('')

    this.observe(this.attrs.obs, value => {
      node.nodeValue = value != null ? value.toString() : ''
    })

    return node
  }

}


/**
 * Write and update the string value of an observable value into
 * a Text node.
 */
export function Write(obs: Observable<HasToString>): Node {
  return d(Writer, {obs})
}


export type DisplayCreator<T> = (a: T) => Node

export class Displayer<T> extends VirtualHolder {
  name = 'if'

  attrs: {
    condition?: MaybeObservable<T>
    display: MaybeObservable<DisplayCreator<T>|Node>
    display_otherwise?: MaybeObservable<DisplayCreator<T>|Node>
  }

  render(): Node {

    this.observe(o.merge({
      condition: this.attrs.condition,
      display: this.attrs.display,
      otherwise: this.attrs.display_otherwise
    }), ({condition, display, otherwise}) => {

      if ((typeof this.attrs.condition) !== 'undefined' && !condition) {
        if (otherwise)
          return this.updateChildren(typeof otherwise === 'function' ? otherwise(condition) : otherwise)
        return this.updateChildren(null)
      }

      this.updateChildren(typeof display === 'function' ? display(condition) : display)
    })
    return super.render()
  }

}


export function Display(display: MaybeObservable<NodeCreatorFn|Node>): Node {
  return d(Displayer, {display})
}


/**
 *
 */
export function DisplayIf<T>(condition: MaybeObservable<T>, display: MaybeObservable<DisplayCreator<T>>, display_otherwise?: MaybeObservable<DisplayCreator<T>>): Node {
  return d(Displayer, {condition: o(condition), display, display_otherwise})
}


export function DisplayUnless<T>(condition: MaybeObservable<any>, display: MaybeObservable<DisplayCreator<T>>, display_otherwise?: MaybeObservable<DisplayCreator<T>>) {
  return d(Displayer, {condition: o(condition).isFalsy(), display, display_otherwise})
}



export type RepeatNode = {node: Node, index: Observable<number>}


/**
 *
 */
export class Repeater<T> extends VirtualHolder {

  attrs: {
    ob: MaybeObservable<T[]>,
    render: (e: PropObservable<T[], T>|T, oi?: number) => Node
    scroll?: boolean
    scroll_buffer_size?: number // default 10
    use_prop_observable?: boolean
  }

  protected obs: Observable<T[]>
  protected positions: Node[]
  protected index: number = -1
  protected renderfn: (e: PropObservable<T[], T>|T, oi?: number) => Node
  protected lst: T[] = []
  protected prop_obs: boolean = false
  protected parent: HTMLElement|undefined

  reset(lst: T[]) {
    this.lst = lst
    this.index = -1
    this.positions = []
    this.updateChildren(null)
  }

  /**
   * If we are dependant to the scroll, return false
   */
  next(): Node|null {
    if (this.index >= this.lst.length - 1)
      return null

    this.index++
    const comment = document.createComment('repeat-' + this.index)
    this.positions.push(comment)
    return this.renderfn(this.prop_obs ?
      this.obs.p(this.index) : this.lst[this.index], this.index)
  }

  draw() {

    if (!this.node.parentNode) return

    const diff = this.lst.length - this.positions.length
    var next: Node = null

    if (diff > 0) {
      if (!this.attrs.scroll) {
        var fr = document.createDocumentFragment()

        while (next = this.next()) {
          fr.appendChild(next)
        }

        this.end.parentNode.insertBefore(fr, this.end)
      } else {

        const bufsize = this.attrs.scroll_buffer_size || 10
        var count = 0
        const p = this.parent as HTMLElement

        while (p.scrollHeight - (p.clientHeight + p.scrollTop) < 500) {
          var fr = document.createDocumentFragment()
          while ((next = this.next()) && count++ < bufsize) {
            fr.appendChild(next)
          }
          this.end.parentNode.insertBefore(fr, this.end)
          count = 0

          if (!next) break
        }
      }

    } else if (diff < 0) {
      // Détruire jusqu'à la position concernée...
      let iter = this.positions[this.lst.length - 1]
      let next: Node = null
      let parent = iter.parentNode
      let end = this.end

      while (iter && iter !== end) {
        next = iter.nextSibling
        parent.removeChild(iter)
        iter = next
      }

      this.positions = this.positions.slice(0, this.lst.length)
    }

  }

  @onmount
  setupScrolling() {
    if (!this.attrs.scroll) return

    // Find parent with the overflow-y
    var iter = this.node.parentElement
    while (iter) {
      var over = getComputedStyle(iter).overflowY
      if (over === 'auto') {
        this.parent = iter
        break
      }
      iter = iter.parentElement
    }

    if (!this.parent)
      throw new Error(`Scroll repeat needs a parent with overflow-y: auto`)

    this.parent.addEventListener('scroll', this.draw)
  }

  @onunmount
  removeScrolling() {
    if (!this.attrs.scroll) return

    this.parent.removeEventListener('scroll', this.draw)
    this.parent = null
  }

  render(): Node {
    this.obs = o(this.attrs.ob)
    this.renderfn = this.attrs.render
    // Bind draw so that we can unregister it
    this.draw = this.draw.bind(this)
    this.prop_obs = this.attrs.use_prop_observable

    this.observe(this.obs, (lst, change) => {
      // if (change.valueChanged())
      if (!change.valueChanged()) return
      this.reset(lst)
      this.draw()
    })

    this.observe(this.obs.p('length'), (len, change) => {
      if (change.valueChanged()) {
        this.draw()
      }
    }, {updatesOnly: true})

    return super.render()
  }

}

/**
 *
 */

export function Repeat<T>(
  ob: MaybeObservable<T[]>,
  render: (e: T, oi?: number) => Node,
): Node {
  return d(Repeater, {ob, render})
}


export function RepeatObservable<T>(
  ob: MaybeObservable<T[]>,
  render: (e: PropObservable<T[], T>, oi?: number) => Node
): Node {
  return d(Repeater, {ob, render, use_prop_observable: true})
}

export function RepeatScroll<T>(
  ob: MaybeObservable<T[]>,
  render: (e: T, oi?: number) => Node,
  options: {
    scroll_buffer_size?: number // default 10
  } = {}
): Node {
  return d(Repeater, {ob, render, scroll: true, scroll_buffer_size: options.scroll_buffer_size})
}


export function RepeatScrollObservable<T>(
  ob: MaybeObservable<T[]>,
  render: (e: PropObservable<T[], T>, oi?: number) => Node,
  options: {
    scroll_buffer_size?: number // default 10
  } = {}
): Node {
  return d(Repeater, {ob, render,
    use_prop_observable: true,
    scroll: true,
    scroll_buffer_size: options.scroll_buffer_size
  })
}

/**
 *
 */
export function Fragment(attrs: BasicAttributes, children: DocumentFragment): Node {
  return children
}
