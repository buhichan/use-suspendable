import "jest"
//@ts-ignore
import * as React from "react"
//@ts-ignore
import * as ReactDOM from "react-dom"
//@ts-ignore
import { act } from "react-dom/test-utils"
import { BehaviorSubject, Observable } from "rxjs"
import { useSuspendable } from "../src"

// jest.useFakeTimers("modern")

describe("useSuspendable tests", () => {
    let state = {
        a: null as null | BehaviorSubject<number>,
        b: null as null | Observable<string>,
        c: new Promise<string>(resolve => {
            setTimeout(() => {
                act(() => {
                    resolve("promise value")
                })
            }, 200)
        }),
    }

    const rootEl = document.createElement("div")

    document.body.appendChild(rootEl)

    const App = () => {
        const [va, vb, vc] = useSuspendable(state.a, state.b, state.c)

        return (
            <div>
                <div id="a">{va}</div>
                <div id="b">{vb}</div>
                <div id="c">{vc}</div>
            </div>
        )
    }

    beforeEach(() => {
        state.a = new BehaviorSubject(1)
        state.b = new Observable(ob => {
            setTimeout(() => {
                act(() => {
                    ob.next("2")
                    ob.complete()
                })
            })
        })

        act(() => {
            ReactDOM.render(
                <React.Suspense fallback="loading...">
                    <App />
                </React.Suspense>,
                rootEl
            )
        })
    })

    afterEach(() => {
        ReactDOM.unmountComponentAtNode(rootEl)
    })

    it("should subscribe and return current value", async () => {
        var a = document.getElementById("a")
        var b = document.getElementById("b")
        var c = document.getElementById("c")
        expect(a?.innerHTML).toBe(undefined)
        expect(b?.innerHTML).toBe(undefined)
        expect(c?.innerHTML).toBe(undefined)
        expect(rootEl.innerHTML).toBe("loading...")
        //由于a是behavior所以不会被订阅
        expect(state.a?.observers.length).toBe(0)
        await wait()
        var a = document.getElementById("a")
        var b = document.getElementById("b")
        var c = document.getElementById("c")
        expect(a?.innerHTML).toBe("1")
        expect(b?.innerHTML).toBe("2")
        expect(c?.innerHTML).toBe("promise value")
        expect(state.a?.observers.length).toBe(1)
        act(() => {
            state.a?.next(3)
        })
        await wait()
        var a = document.getElementById("a")
        expect(a?.innerHTML).toBe("3")
    })

    it("should unsubscribe to observables when unmount", () => {
        ReactDOM.unmountComponentAtNode(rootEl)
        expect(state.a?.observers.length).toBe(0)
    })
})

async function wait(ms = 500) {
    const p = new Promise(resolve => {
        setTimeout(resolve, ms)
    })
    return p
}
