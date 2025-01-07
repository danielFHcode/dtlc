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
            return fn(result.value).parse(code, result.index);
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
            const right = parser.parse(code, index);
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
        return new Parser<T>((_, index) => ({
            success: true,
            value,
            index,
        }));
    }
    static error<T>(message: string) {
        return new Parser<T>((_, index) => ({
            success: false,
            errors: [{ message, index }],
        }));
    }
    static fail<T>() {
        return new Parser<T>(() => ({ success: false, errors: [] }));
    }
}

export const match = (check: (char: string) => boolean) =>
    Parser.increment.flatMap<string>((char) =>
        check(char)
            ? Parser.value(char)
            : Parser.error(`unexpected character: '${char}'`)
    );
export const word = (word: string) =>
    Array.from(word).reduce(
        (left, right) =>
            left
                .flatMap(() => match((char) => char === right))
                .flatMap(() => Parser.value(null)),
        Parser.value(null),
    ).flatMap(() => Parser.value(word));

export const repeat = <T>(parser: Parser<T>, minTimes = 0): Parser<T[]> =>
    parser.flatMap((value) =>
        repeat(parser, minTimes - 1).flatMap(
            (values) => Parser.value([value, ...values]),
        )
    ).union(minTimes > 0 ? Parser.fail() : Parser.value([]));
export const join = <T, S>(
    parser: Parser<T>,
    separator: Parser<S>,
    minTimes = 0,
): Parser<T[]> =>
    parser.flatMap((value) =>
        separator.flatMap((_) =>
            join(parser, separator, minTimes - 1).flatMap(
                (values) => Parser.value([value, ...values]),
            )
        )
    ).union(minTimes > 0 ? Parser.fail() : Parser.value([]));

export const lazy = <T>(get: () => Parser<T>) =>
    Parser.value(null).flatMap((_) => get());
