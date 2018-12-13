import React, { PureComponent } from "react"
import { DraggableCore } from "react-draggable"
import { batch } from "rval";
import { RValRender } from "../utils"

class BoxView extends PureComponent {
    render() {
        const { box, store } = this.props
        return <RValRender>
            {() => {
                const isSelected = store.selection() === box.id
                console.log("rendering box " + box.id)
                return <DraggableCore onDrag={this.handleDrag}>
                    <div
                        style={{
                            width: box.width(),
                            left: box.x(),
                            top: box.y()
                        }}
                        onClick={this.handleClick}
                        className={isSelected ? "box box-selected" : "box"}
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

    handleDrag = (e, dragInfo) => {
        const { box } = this.props
        batch(() => {
            box.x(box.x() + dragInfo.deltaX)
            box.y(box.y() + dragInfo.deltaY)
        })
    }
}

export default BoxView
