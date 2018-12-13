import React, {memo} from 'react';
import { RValRender } from "../utils"

// // With autoRender:
// export default function ArrowView({arrowC, boxesC}) {
//     return autoRender(() => {
//         const arrow = arrowC.value()
//         const from = boxesC.select(arrow.from).value()
//         const to = boxesC.select(arrow.to).value()
//         const [x1, y1, x2, y2] = [
//             from.x + boxWidth(from) / 2,
//             from.y + 30,
//             to.x + boxWidth(to) / 2,
//             to.y + 30
//         ]
//         console.log("rendering arrow " + arrow.id)
//         return <path className="arrow"
//             d={`M${x1} ${y1} L${x2} ${y2}`}
//         />
//     })
// }


export default function ArrowView({arrow, store}) {
    return <RValRender>{() => {
        const from = store.boxes()[arrow.from]
        const to = store.boxes()[arrow.to]
        const [x1, y1, x2, y2] = [
            from.x() + from.width() / 2,
            from.y() + 30,
            to.x() + to.width() / 2,
            to.y() + 30
        ]
        console.log("rendering arrow " + arrow.id)
        return <path className="arrow"
            d={`M${x1} ${y1} L${x2} ${y2}`}
        />
    }}</RValRender>
}
