import React, { PureComponent } from "react"
import { DraggableCore } from "react-draggable"
import { act } from "@r-val/core";
import { RValRender } from "../utils"

class BoxView extends PureComponent {
    render() {
        const { box } = this.props
        return <RValRender>
            {() => {
                console.log("rendering box " + box.id)
                return <DraggableCore onDrag={this.handleDrag}>
                    <div
                        style={{
                            width: box.width(),
                            left: box.x(),
                            top: box.y()
                        }}
                        onClick={this.handleClick}
                        className={box.selected() ? "box box-selected" : "box"}
                    >
                        {box.name()}
                    </div>
                </DraggableCore>
            }}
        </RValRender>
    }

    handleClick = e => {
        this.props.store.selection(this.props.box.id)
        e.stopPropagation()
    }

    handleDrag = act((e, dragInfo) => {
        const { box } = this.props
        box.x(box.x() + dragInfo.deltaX)
        box.y(box.y() + dragInfo.deltaY)
    })
}

export default BoxView
