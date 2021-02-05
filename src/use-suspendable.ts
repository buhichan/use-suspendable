import * as React from "react"
import { useSubscription } from "use-subscription"

interface Subscription {
    unsubscribe(): void
}

interface Observable<T> {
    subscribe: (next?: (v: T) => void, error?: (error: any) => void) => Subscription
}

type ObservedValueOfWithoutDefaultValue<T> = T extends Observable<infer U2> ? U2 : T extends Promise<infer U1> ? U1 : never

export type ObservedValueTupleFromArrayWithoutDefaultValue<X> = X extends readonly (Observable<unknown> | Promise<unknown> | null | undefined)[]
    ? { [K in keyof X]: ObservedValueOfWithoutDefaultValue<X[K]> }
    : never

const mapValue = new WeakMap<
    object,
    {
        thenable: PromiseLike<void>
        isSync: boolean
        value: unknown
    }
>()
const EMPTY_VALUE = Symbol()
const JUST_RESOLVED = Promise.resolve()
export function useSuspendable<T extends (Observable<unknown> | Promise<unknown> | null | undefined)[]>(
    ...obs: T
): ObservedValueTupleFromArrayWithoutDefaultValue<T> {
    const shouldThrow: PromiseLike<unknown>[] = []
    for (const ob of obs) {
        if (!ob) {
            continue
        }
        let item = mapValue.get(ob)
        if (!item) {
            let syncValue: unknown = EMPTY_VALUE
            if (!(ob instanceof Promise)) {
                ob.subscribe(v => {
                    syncValue = v
                }).unsubscribe()
            }
            if (syncValue !== EMPTY_VALUE) {
                item = {
                    thenable: JUST_RESOLVED,
                    isSync: true,
                    value: syncValue,
                }
            } else {
                item = {
                    thenable: (ob instanceof Promise
                        ? ob
                        : new Promise((resolve, reject) => {
                              ob.subscribe(resolve, reject)
                          })
                    ).then(v => {
                        item && (item.value = v)
                    }),
                    isSync: false,
                    value: EMPTY_VALUE,
                }
            }
            mapValue.set(ob, item)
        }
        if (item.value === EMPTY_VALUE) {
            shouldThrow.push(item.thenable)
        }
    }
    if (shouldThrow.length > 0) {
        throw Promise.all(shouldThrow)
    }

    return useSubscription(
        React.useMemo(
            () => ({
                getCurrentValue: () => {
                    return obs.map(ob => (!ob ? undefined : mapValue.get(ob)?.value)) as ObservedValueTupleFromArrayWithoutDefaultValue<T>
                },
                subscribe: callback => {
                    const subs = [] as Subscription[]
                    obs.forEach((x, i) => {
                        if (x) {
                            if (!(x instanceof Promise)) {
                                if (mapValue.get(x)?.isSync) {
                                    let isSyncTriggered = true
                                    subs.push(
                                        x.subscribe(v => {
                                            if (isSyncTriggered) {
                                                isSyncTriggered = false
                                            } else {
                                                mapValue.set(x, {
                                                    thenable: JUST_RESOLVED,
                                                    isSync: true,
                                                    value: v,
                                                })
                                                callback()
                                            }
                                        })
                                    )
                                } else {
                                    subs.push(
                                        x.subscribe(v => {
                                            mapValue.set(x, {
                                                thenable: JUST_RESOLVED,
                                                isSync: false,
                                                value: v,
                                            })
                                            callback()
                                        })
                                    )
                                }
                            }
                        }
                    })
                    return () => {
                        subs.forEach(x => x.unsubscribe())
                    }
                },
            }),
            obs
        )
    )
}
