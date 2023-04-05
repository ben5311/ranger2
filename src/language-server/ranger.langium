grammar Ranger

entry Document:
    (entities+=Entity)*;

Entity:
    "Entity" name=ID "{"
        (properties+=Property)*
    "}";

Property:
    name=(STRING|ID) ":" value=Value ","?;

Value:
     Objekt | List | Literal;

Objekt:
    "{"
        (properties+=Property)*
    "}";

List:
    "["
        (values+=Value ("," values+=Value)*)?
    "]";

Literal:
    literalValue=(STRING | NUMBER | BOOL | DATE | Null);

Null:
    {infer Null} "null";


terminal NUMBER returns number: /[+-]?[0-9]+(\.[0-9]*)?/;
terminal BOOL returns boolean: "true" | "false";
terminal DATE returns Date: /"\d{4}-\d{2}-\d{2}"/;
terminal STRING: /"(\\.|[^"\\])*"|'(\\.|[^'\\])*'/;
terminal ID: /[_a-zA-Z][\w_]*/;

hidden terminal WS: /\s+/;
hidden terminal ML_COMMENT: /\/\*[\s\S]*?\*\//;
hidden terminal SL_COMMENT: /\/\/[^\n\r]*/;
