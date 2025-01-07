class Ref<T> {
    constructor(public value: T) {}
}

class Parser<T> {
    constructor(public readonly parse: (code: string,index: Ref<number>) => {success: true, value: T}|{success: false, error: string}) {}
    // concat<K>(parser: )
}