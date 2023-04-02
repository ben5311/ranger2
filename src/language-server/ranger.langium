grammar Ranger

entry Document:
    (entities+=Entity)*;

Entity:
    'Entity' name=ID '{'
        (properties+=Property)*
    '}';

Property:
    name=ID ':' value=Value ','?;

Value:
    Objekt | Literal;

Objekt:
    "{"
        (properties+=Property)*
    "}";

terminal Literal:
    (DATE | TIME | TIMESTAMP | STRING | NUMBER | BOOL | CHAR | DATE | NULL);

hidden terminal WS: /\s+/;
terminal ID: /[_a-zA-Z][\w_]*/;
terminal DATE returns Date: /"\d{4}-\d{2}-\d{2}"/;
terminal TIME: /"\d{2}:\d{2}(:\d{2}(\.\d{1,12})?)?"/;
terminal TIMESTAMP: DATE /[ T]/ TIME;
terminal STRING: /"(\\.|[^"\\])*"|'(\\.|[^'\\])*'/;
terminal NUMBER returns number: /[+-]?[0-9]+(\.[0-9]*)?/;
terminal BOOL returns boolean: "true" | "false";
terminal CHAR: /'[^']'/;
terminal NULL: "null";

hidden terminal ML_COMMENT: /\/\*[\s\S]*?\*\//;
hidden terminal SL_COMMENT: /\/\/[^\n\r]*/;
