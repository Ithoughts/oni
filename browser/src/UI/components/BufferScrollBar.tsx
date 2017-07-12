import * as React from "react"
import * as ReactDOM from "react-dom"

import { connect, Provider } from "react-redux"
import { store } from "./../index"
import * as State from "./../State"

require("./BufferScrollBar.less") // tslint:disable-line no-var-requires

export interface IBufferScrollBarProps {
    bufferSize: number
    height: number
    windowTopLine: number
    windowBottomLine: number
    markers: IScrollBarMarker[]
    visible: boolean
}

export interface IScrollBarMarker {
    line: number
    height: number
    color: string
}

export class BufferScrollBar extends React.PureComponent<IBufferScrollBarProps, void> {

    constructor(props: any) {
        super(props)
    }

    public render(): JSX.Element {

        if (!this.props.visible) {
            return null
        }

        const windowHeight = ((this.props.windowBottomLine - this.props.windowTopLine + 1) / this.props.bufferSize) * this.props.height
        const windowTop = ((this.props.windowTopLine - 1) / this.props.bufferSize) * this.props.height

        const windowStyle: any = {
            top: windowTop + "px",
            height: windowHeight + "px",
        }

        const markers = this.props.markers || []

        const markerElements = markers.map((m) => {
            const line = m.line - 1
            const pos = (line / this.props.bufferSize) * this.props.height
            const size = "2px"

            const markerStyle: any = {
                position: "absolute",
                top: pos + "px",
                height: size,
                backgroundColor: m.color,
                width: "100%",
            }

            return <div style={markerStyle} />
        })

        return <div className="scroll-bar-container">
                <div className="scroll-window" style={windowStyle}></div>
                {markerElements}
            </div>
    }
}

export interface IRenderBufferScrollBarArgs {
    bufferSize: number
    height: number
    windowTopLine: number
    windowBottomLine: number
    markers: IScrollBarMarker[]
}

const mapStateToProps = (state: State.IState, inProps: IRenderBufferScrollBarArgs): IBufferScrollBarProps => {
    const visible = state.configuration["editor.scrollBar.visible"]

    return {
        ...inProps,
        visible,
    }
}

const ConnectedBufferScrollBar = connect(mapStateToProps)(BufferScrollBar)

export function renderBufferScrollBar(props: IRenderBufferScrollBarArgs, element: HTMLElement) {
    ReactDOM.render(<Provider store={store}>
                        <ConnectedBufferScrollBar {...props} />
                    </Provider>, element)
}
