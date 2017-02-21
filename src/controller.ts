
import {
  o,
  MaybeObservable,
  ObserveOptions,
  Observer,
  UnregisterFn
} from 'domic-observable'

import {
  Instantiator,
  BasicAttributes,
  ControllerCallback,
} from './types'


declare global {
  interface Node {
    _domic_controllers: Controller[] | undefined
  }
}


export class Controller {

  node: Node
  mounted = false
  onmount: ControllerCallback[] = this.onmount ? this.onmount.slice() : []
  onunmount: ControllerCallback[] = this.onunmount ? this.onunmount.slice() : []
  onrender: ControllerCallback[] = this.onrender ? this.onrender.slice() : []

  /**
   * Recursively find a controller starting at a node and making its
   * way up.
   */
  static get<C extends Controller>(this: Instantiator<C>, node: Node): C {
    let iter = node

    while (iter && iter._domic_controllers) {
      for (var c of iter._domic_controllers) {
        if (c instanceof this)
          return c as C
      }
      iter = iter.parentNode
    }

    return null
  }

  /**
   * Get all the controllers for a given node.
   *
   * @returns undefined if the node was not associated with a controller array
   */
  static all(node: Node): Controller[] {
    return node._domic_controllers
  }

  /**
   * Get all the controllers for a Node. If there was no controller array,
   * setup a new one.
   */
  static init(node: Node): Controller[] {
    if (!node._domic_controllers)
      node._domic_controllers = []
    return node._domic_controllers
  }

  /**
   * Associate a Controller to a Node.
   */
  bindToNode(node: Node): void {
    this.node = node
    node._domic_controllers.push(this)
  }

  /**
   * Observe an observer whenever it is mounted. Stop observing when
   * unmounted. Reobserve when mounted again.
   */
  observe<T>(a: MaybeObservable<T>, cbk: Observer<T>, options?: ObserveOptions<T>): this {
    var unload: UnregisterFn
    const obs = o(a)

    this.onmount.push(function () {
      unload = obs.addObserver(cbk, options)
    })

    this.onunmount.push(function () {
      unload()
      unload = null
    })

    return this
  }

  /**
   * Observe an observer but only when it changes, do not call the callback
   * right away like observe. (?)
   */
  observeChanges(): this {
    return this
  }

}


/**
 * Useless controller just used to register observables used by class or style
 */
export class DefaultController extends Controller {

  static get(n: Node): DefaultController {

    let d = super.get.call(this, n) as DefaultController
    if (!d) {
      d = new DefaultController()
      d.bindToNode(n)
    }

    return d
  }

}



/**
 *
 */
export function ctrl(...ctrls: (Instantiator<Controller>|Controller)[]) {
  return function (node: Node): void {
    var instance: Controller = null

    for (var c of ctrls) {
      if (c instanceof Controller) {
        instance = c
      } else {
        instance = new c
      }
      node._domic_controllers.push(instance)
    }
  }
}



/**
 * attrs is not set in the constructor, but will be in render()
 */
export class Component extends Controller {

  attrs: BasicAttributes

  constructor(attrs: BasicAttributes) {
    super()
    this.attrs = attrs
  }

  render(children: DocumentFragment): Node {
    return null
  }

}

export class HTMLComponent extends Component {

  node: HTMLElement

}
