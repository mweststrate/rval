import { Observable, isVal, isDrv, defaultInstance, rval, RValInstance, Val } from '@r-val/core'
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

export function useLocalVal<T>(initial: T, rvalInstance = defaultInstance): [T, Val<T>] {
  const val = useMemo(() => rvalInstance.val(initial), [])
  const current = useVal(val)
  return [current, val]
}

export function useLocalDrv<T>(derivation: () => T, inputs: any[] = [], rvalInstance = defaultInstance): T {
  const drv = useMemo(() => rvalInstance.drv(derivation), inputs)
  return useVal(drv)
}

export function rview(render: () => ReactNode, memo?: any[] | boolean, rvalInstance?: RValInstance): ReactElement<any> | null {
  // TODO: or should rview be a HOC?
  // return props => <RView rvalInstance={rvalInstance}>{() => render(props)}</RView>
  return createElement(RView, {
    rvalInstance, memo, children: render
  })
}

export class RView extends Component<{
  children?: () => ReactNode
  memo?: any[] | boolean,
  rvalInstance?: RValInstance
}, {}> {

  static defaultProps = {
    rvalInstance: defaultInstance,
    memo: false
  }

  disposer?: () => void
  renderPuller?: () => ReactNode
  inputsAtom = this.props.rvalInstance!.val(0)

  shouldComponentUpdate() {
    return false;
  }

  inputsChanged(nextProps) {
    // memo:
    // - true: always memoize! children only depends on reactive vals, nothing else (equals memo=[])
    // - falsy: never memoize: if we get a new children func, re-render (equals memo=[children])
    // - array: re-render if any of the given inputs change 
    const { memo } = nextProps
    if (memo === true)
      return false
    const newInputs = Array.isArray(memo) ? memo : [nextProps.children]
    const currentInputs = Array.isArray(this.props.memo) ? this.props.memo : [this.props.children]
    if (newInputs.length !== currentInputs.length)
      return true
    for (let i = 0; i < newInputs.length; i++)
      if (currentInputs![i] !== newInputs[i])
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
      this.disposer = this.props.rvalInstance!.effect(() => {
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
//   rvalInstance = defaultContext,
//   inputs = [children],
// }: {
//   children?: () => ReactNode
//   rvalInstance?: RValFactories
//   inputs?: any[]
// }): ReactElement<any> | null {
//   if (typeof children !== 'function') throw new Error('RVal expected function as children')
//   const [tick, setTick] = useState(0)
//   const { render, dispose } = useMemo(
//     () => {
//       let render
//       const dispose = rvalInstance.effect(children!, (didChange, pull) => {
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
