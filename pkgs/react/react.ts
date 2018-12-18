import { Observable, isVal, isDrv, defaultContext, rval, RValFactories, Val } from '@rval/core'
import { useState, useEffect, useMemo, ReactNode, ReactElement, createElement, Component, PureComponent } from 'react'

export function useVal<T>(observable: Observable<T>): T {
  if (!isVal(observable) && !isDrv(observable)) throw new Error('useval - expected val or drv')
  const [_, setTick] = useState(0)
  const disposer = useMemo(() => 
    rval(observable).sub(observable, () => setTick(tick => tick + 1))
  , [observable])
  useEffect(() => disposer, [observable])
  return observable()
}

export function useLocalVal<T>(initial: T, rvalContext = defaultContext): [T, Val<T>] {
  const val = useMemo(() => rvalContext.val(initial), [])
  const current = useVal(val)
  return [current, val]
}

export function useLocalDrv<T>(derivation: () => T, inputs: any[] = [], rvalContext = defaultContext): T {
  const drv = useMemo(() => rvalContext.drv(derivation), inputs)
  return useVal(drv)
}

export function rview(render: () => ReactNode, rvalContext = defaultContext, inputs?: any[]): ReactElement<any> | null {
  // TODO: or should rview be a HOC?
  // return props => <RView rvalContext={rvalContext}>{() => render(props)}</RView>
  return createElement(RView, {
    rvalContext, inputs, children: render
  })
}

export class RView extends PureComponent<{
  children?: () => ReactNode
  rvalContext?: RValFactories
  inputs?: any[]
}, {
  children: () => ReactNode,
  inputs: any[]
}> {

  static defaultProps = {
    rvalContext: defaultContext
  }

  disposer?: () => void
  renderPuller?: () => ReactNode
  lastChildren?: () => ReactNode

  render() {
    const { children } = this.props
    if (!this.disposer || this.props.children !== this.lastChildren) {
      const oldDisposer = this.disposer
      // this.disposer = undefined
      this.disposer = this.props.rvalContext!.effect(children!, (didChange, pull) => {
        this.renderPuller = pull
        if (didChange() && this.disposer) { // this.disposer = false? -> first rendering
          this.forceUpdate()
        }
      })
      this.lastChildren = children
      oldDisposer && oldDisposer()
    }
    return this.renderPuller!()
  }

  componentWillUnmount() {
    this.disposer && this.disposer()
  }
}

export function _RView({
  children,
  rvalContext = defaultContext,
  inputs = [children],
}: {
  children?: () => ReactNode
  rvalContext?: RValFactories
  inputs?: any[]
}): ReactElement<any> | null {
  if (typeof children !== 'function') throw new Error('RVal expected function as children')
  const [tick, setTick] = useState(0)
  const { render, dispose } = useMemo(
    () => {
      let render
      const dispose = rvalContext.effect(children!, (didChange, pull) => {
        render = pull
        if (didChange()) {
          setTick(tick + 1)
        }
      })
      return { render, dispose }
    },
    inputs
  )
  useEffect(() => dispose, inputs)
  return render()
}
