grammar Ranger

entry Document:
    (entities+=Entity)*;

Entity:
    "Entity" name=ID "{"
        (properties+=Property)*
    "}";

Property:
    name=ID ":" value=Value ","?;

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
    literal=(NULL | BOOL | DATE | TIME | NUMBER | CHAR | STRING);

hidden terminal WS: /\s+/;
terminal NULL: "null";
terminal BOOL returns boolean: "true" | "false";
terminal DATE returns Date: /"\d{4}-\d{2}-\d{2}"/;
terminal TIME: /"\d{2}:\d{2}(:\d{2}(\.\d{1,12})?)?"/;
terminal NUMBER returns number: /[+-]?[0-9]+(\.[0-9]*)?/;
terminal CHAR: /'[^']'/;
terminal STRING: /"(\\.|[^"\\])*"|'(\\.|[^'\\])*'/;
terminal ID: /[_a-zA-Z][\w_]*/;

hidden terminal ML_COMMENT: /\/\*[\s\S]*?\*\//;
hidden terminal SL_COMMENT: /\/\/[^\n\r]*/;
