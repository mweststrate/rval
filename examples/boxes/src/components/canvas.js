import React, {Component} from "react"
import { RValRender } from "../utils"
import { act } from "@r-val/core"

import BoxView from "./box-view"
import ArrowView from "./arrow-view"
import Sidebar from './sidebar';
import FunStuff from './fun-stuff';

class Canvas extends Component {
    render() {
        const {store} = this.props
        return (
            <div className="app">
                <RValRender>{() => 
                    <div className="canvas" onClick={this.onCanvasClick}>
                        <svg>
                            {Object.entries(store.arrows()).map(([id, arrow]) => 
                                <ArrowView key={id} arrow={arrow} store={store} />
                            )}
                        </svg>
                        {Object.entries(store.boxes()).map(([id, box]) => 
                            <BoxView key={id} box={box} store={store} />
                        )}
                    </div>
                }</RValRender>
                {/* <Sidebar selection={selection} />
                <FunStuff store={store} /> */}
            </div>
        )
    }

    onCanvasClick = act(e => {
        const {store} = this.props
        if (e.ctrlKey === true && store.selection()) {
            const id = store.addBox("Hi.",  e.clientX - 50, e.clientY - 20)
            store.addArrow(store.selection(), id)
            store.selection(id)
        }
    })
}

export default Canvas
