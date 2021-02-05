[![travis ci](https://travis-ci.com/buhichan/use-suspendable.svg?branch=master)](https://travis-ci.com/buhichan/use-suspendable)
[![codecov](https://codecov.io/gh/buhichan/use-suspendable/branch/master/graph/badge.svg)](https://codecov.io/gh/buhichan/use-suspendable)

# Intro

React use suspendable hook, suspendable means Promise, Observable, null or undefined.

Observable can be any observable that match the proposed observable API, like rxjs's Observable.

# Requirements

It requires Weakmap and Symbol to work.

# Notice

You **MUST** ensure Objest.is equality of the suspendables you pass between renders, or else this hook will treat them as changed and re-subscribe every time it's called.
For the same reason, you cannot create Promise or Observable under Suspense, it must be higher than Suspense in the component tree, like this:

- SomeContext1.Provider value={useMemo(()=>axios.get("/api"),[])}
    - SomeContext2.Provider value={useMemo(()=>require("rxjs").interval(1000),[])}
        - Suspense
            - const [response, interval] = useSuspendable(useContext(SomeContext1), useContext(SomeContext2))

Or you can use somekind of cache like react-cache to cache promise.

# Example

```tsx

function App(){
    return <SomeContext1.Provider value={useMemo(()=>axios.get("/api"),[])}>
        <SomeContext2.Provider value={useMemo(()=>require("rxjs").interval(1000),[])}>
            <React.Suspense fallback={"loading..."}>
                <Page />
            </React.Suspense>
        </SomeContext2.Provider>
    </SomeContext1.Provider>
}

function Page(){
    const [v1, v2, v3, v4] = useSuspendable(useContext(SomeContext1), useContext(SomeContext2), nullOrPromise, undefinedOrPromise)

    return <div>
        {v1}
        {v2}
        {v3}
        {v4}
    </div>
}
```