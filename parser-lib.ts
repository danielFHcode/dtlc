export class Parser<T> {
    constructor(
        public readonly parse: (
            code: string,
            index: number,
        ) => { success: true; value: T; index: number } | {
            success: false;
            errors: { message: string; index: number }[];
        },
    ) {}
    flatMap<K>(fn: (value: T) => Parser<K>) {
        return new Parser<K>((code, index) => {
            const result = this.parse(code, index);
            if (!result.success) {
                return result;
            }
            return fn(result.value).parse(code, index);
        });
    }
    flatMapErrors(
        fn: (errors: { message: string; index: number }[]) => Parser<T>,
    ) {
        return new Parser<T>((code, index) => {
            const result = this.parse(code, index);
            if (result.success) {
                return result;
            }
            return fn(result.errors).parse(code, index);
        });
    }
    union(parser: Parser<T>) {
        return new Parser<T>((code, index) => {
            const left = this.parse(code, index);
            if (left.success) {
                return left;
            }
            const right = this.parse(code, index);
            if (right.success) {
                return right;
            }
            return {
                success: false,
                errors: left.errors.concat(right.errors),
            };
        });
    }
    static increment = new Parser<string>((code, index) => {
        const char = code.at(index);
        if (char === undefined) {
            return {
                success: false,
                errors: [{
                    message: "unexpected end-of-file",
                    index,
                }],
            };
        }
        return {
            success: true,
            value: char,
            index: index + 1,
        };
    });
    static value<T>(value: T) {
        return new Parser<T>((_, index) => ({ success: true, value, index }));
    }
    static error<T>(message: string) {
        return new Parser<T>((_, index) => ({
            success: false,
            errors: [{ message, index }],
        }));
    }
}
