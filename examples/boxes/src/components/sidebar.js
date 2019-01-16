import React, { PureComponent } from 'react'
import { rview } from '@r-val/react'
import { act } from '@r-val/core'

class Sidebar extends PureComponent {
  render() {
    const { selection } = this.props
    return rview(() =>
      selection() ? (
        <div className="sidebar sidebar-open">
          <input onChange={this.onChange} value={selection().name()} />
        </div>
      ) : (
        <div className="sidebar" />
      )
    )
  }

  onChange = e => {
    this.props.selection().name(e.target.value)
  }
}

export default Sidebar
