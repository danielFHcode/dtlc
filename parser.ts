import { match, Parser, repeat, word } from "./parser-lib.ts";

type Expression =
    | {
        TYPE: "IDENTIFIER";
        name: string;
    }
    | {
        TYPE: "LAMBDA";
        argument: string;
        argumentType: Expression;
        result: Expression;
    }
    | {
        TYPE: "CALL";
        func: Expression;
        argument: Expression;
    };

const whitespace = repeat(match((char) => char.match(/\s/) !== null));

const identifierName = repeat(
    match((char) => char.match(/[^\s\\:.()]/) !== null),
    1,
)
    .flatMap(
        (chars) => Parser.value(chars.join("")),
    );

const identifier = identifierName
    .flatMap((name) =>
        Parser.value<Expression>({
            TYPE: "IDENTIFIER",
            name,
        })
    );

const lambda: Parser<Expression> = word("\\").flatMap((_) => whitespace)
    .flatMap(
        (_) =>
            identifierName.flatMap((argument) =>
                whitespace.flatMap((_) => word(":")).flatMap((_) => whitespace)
                    .flatMap((_) =>
                        expression.flatMap(
                            (argumentType) =>
                                whitespace.flatMap((_) => word(".")).flatMap((
                                    _,
                                ) => whitespace)
                                    .flatMap((_) =>
                                        expression.flatMap<Expression>(
                                            (result) =>
                                                Parser.value({
                                                    TYPE: "LAMBDA",
                                                    argument,
                                                    argumentType,
                                                    result,
                                                }),
                                        )
                                    ),
                        )
                    )
            ),
    );

const parens = word("(").flatMap((_) => whitespace)
    .flatMap((_) =>
        expression.flatMap(
            (value) =>
                whitespace.flatMap((_) => word(")")).flatMap((_) =>
                    Parser.value(value)
                ),
        )
    );

const unit = identifier.union(lambda).union(parens);

const call = unit.flatMap(
    (head) =>
        repeat(whitespace.flatMap((_) => unit)).flatMap(
            (tail) =>
                Parser.value(
                    tail.reduce<Expression>((func, argument) => ({
                        TYPE: "CALL",
                        func,
                        argument,
                    }), head),
                ),
        ),
);

const expression = call;
