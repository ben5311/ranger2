grammar Ranger

entry Document:
    (entities+=Entity | printStatements+=PrintStatement)*;

Entity infers Property:
    "Entity" name=ID value=Objekt;

Objekt:
    "{"
        (properties+=Property)*
    "}";

Property:
    name=(STRING|ID) ":" value=(Value|PropertyReference) ","?;

Value:
     Objekt | List | Literal | Null;

PropertyReference:
    element=[Property:ID] ({infer PropertyReference.previous=current} "." element=[Property:ID])*;

List:
    "["
        (values+=Value ("," values+=Value|PropertyReference)*)?     // TODO: PropertyReference in Lists not working yet
    "]";

Literal:
    literalValue=(STRING | NUMBER | BOOL | DATE);

Null:
    {infer Null} "null";

PrintStatement:
    "print" "(" propertyReference=PropertyReference ")";

terminal NUMBER returns number: /[+-]?[0-9]+(\.[0-9]*)?/;
terminal BOOL returns boolean: "true" | "false";
terminal DATE returns Date: /"\d{4}-\d{2}-\d{2}"/;
terminal STRING: /"(\\.|[^"\\])*"|'(\\.|[^'\\])*'/;
terminal ID: /[_a-zA-Z][\w_]*/;

hidden terminal WS: /\s+/;
hidden terminal ML_COMMENT: /\/\*[\s\S]*?\*\//;
hidden terminal SL_COMMENT: /\/\/[^\n\r]*/;
