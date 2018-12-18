import { Observable, isVal, isDrv, defaultContext, rval, RValFactories, Val } from '@rval/core'
import { useState, useEffect, useMemo, ReactNode, ReactElement, createElement, Component } from 'react'

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

export function rview(render: () => ReactNode, inputs?: any[], rvalContext?: RValFactories): ReactElement<any> | null {
  // TODO: or should rview be a HOC?
  // return props => <RView rvalContext={rvalContext}>{() => render(props)}</RView>
  return createElement(RView, {
    rvalContext, inputs, children: render
  })
}

export class RView extends Component<{
  children?: () => ReactNode
  inputs?: any[],
  rvalContext?: RValFactories
}, {
  children: () => ReactNode,
  inputs: any[]
}> {

  static defaultProps = {
    rvalContext: defaultContext,
    inputs: []
  }

  disposer?: () => void
  renderPuller?: () => ReactNode
  inputsAtom = this.props.rvalContext!.val(0)

  shouldComponentUpdate() {
    return false;
  }

  inputsChanged(nextProps) {
    const { inputs } = nextProps
    if (inputs.length !== this.props.inputs!.length)
      return true
    for (let i = 0; i < inputs.length; i++)
      if (this.props.inputs![i] !== inputs[i])
        return true
    return false
  }

  componentWillReceiveProps(nextProps) {
    // Yes, unsafe solution! Either this, or migrate to _RView as defined below
    if (this.inputsChanged(nextProps))
      this.inputsAtom(this.inputsAtom() + 1)
  }

  render() {
    if (!this.disposer) {
      this.disposer = this.props.rvalContext!.effect(() => {
        this.inputsAtom();
        return this.props.children!()
      }, (didChange, pull) => {
        this.renderPuller = pull
        if (didChange() && this.disposer) { // this.disposer = false? -> first rendering
          this.forceUpdate()
        }
      })
    }
    return this.renderPuller!()
  }

  componentWillUnmount() {
    this.disposer && this.disposer()
  }
}

// export function _RView({
//   children,
//   rvalContext = defaultContext,
//   inputs = [children],
// }: {
//   children?: () => ReactNode
//   rvalContext?: RValFactories
//   inputs?: any[]
// }): ReactElement<any> | null {
//   if (typeof children !== 'function') throw new Error('RVal expected function as children')
//   const [tick, setTick] = useState(0)
//   const { render, dispose } = useMemo(
//     () => {
//       let render
//       const dispose = rvalContext.effect(children!, (didChange, pull) => {
//         render = pull
//         if (didChange()) {
//           setTick(tick + 1)
//         }
//       })
//       return { render, dispose }
//     },
//     inputs
//   )
//   useEffect(() => dispose, inputs)
//   return render()
// }
