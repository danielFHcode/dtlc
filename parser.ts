import { join, lazy, match, Parser, repeat, word } from "./parser-lib.ts";

export type Expression =
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
    }
    | {
        TYPE: "IN";
        statements: Statement[];
        value: Expression;
    };

const whitespace = repeat(match((char) => char.match(/\s/) !== null));

const identifierName = repeat(
    match((char) => char.match(/[^\s\\:.()]/) !== null),
    1,
)
    .flatMap(
        (chars) => Parser.value(chars.join("")),
    )
    .flatMap<string>(
        (name) =>
            name === "let"
                ? Parser.error("'let' is a reserved keyword")
                : name === "in"
                ? Parser.error("'in' is a reserved keyword")
                : Parser.value(name),
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

const inn: Parser<Expression> = join(lazy(() => statement), whitespace, 1)
    .flatMap(
        (statements) =>
            whitespace.flatMap((_) => word("in")).flatMap((_) => whitespace)
                .flatMap((_) =>
                    expression.flatMap(
                        (value) =>
                            Parser.value<Expression>({
                                TYPE: "IN",
                                statements,
                                value,
                            }),
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

const unit = identifier.union(lambda).union(inn).union(parens);

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

export const expression = call;

export type Statement = {
    TYPE: "LET";
    name: string;
    value: Expression;
};

const lett = word("let").flatMap((_) => whitespace).flatMap((_) =>
    identifierName.flatMap(
        (name) =>
            whitespace.flatMap((_) => word("=")).flatMap((_) => whitespace)
                .flatMap((_) =>
                    expression.flatMap(
                        (value) =>
                            Parser.value<Statement>({
                                TYPE: "LET",
                                name,
                                value,
                            }),
                    )
                ),
    )
);

export const statement = lett;
