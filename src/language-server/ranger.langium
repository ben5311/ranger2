grammar Ranger

entry Document:
    (entities+=Entity)*;

Entity returns Entity:
    "Entity" name=ID value=Objekt;

Objekt:
    "{"
        (properties+=Property)*
    "}";

Property returns Property:
    name=(STRING|ID) ":" value=(Value|PropertyReference) ","?;

Value:
     Objekt | List | Func | Literal | Num | Null;

PropertyReference:
    element=[Property:ID] ({infer PropertyReference.previous=current} "." element=[Property:ID])*;

List returns List:
    "["
        (values+=(Value|PropertyReference) ("," values+=(Value|PropertyReference))* ","?)?
    "]";

Literal:
    value=(STRING | BOOL | DATE);

Num:
    Float | Integer;
Float:
    value=FLOAT;
Integer:
    value=INTEGER;

Null:
    {infer Null} "null";

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Functions
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

Func:
    Random | MapFunc;

Random:
    "random" "(" (range=Range | list=ListWithoutBrackets)  ")";     // TODO: Allow references for range and list

Range:
    min=Num ".." max=Num;

ListWithoutBrackets returns List:
    (values+=(Value|PropertyReference) ("," values+=(Value|PropertyReference))* ","?)?;

MapFunc:
    "map" "(" ref=PropertyReference "=>" values=List ")";


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Interfaces
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

interface Entity extends Property {}
interface Property { name: string; value: Value | PropertyReference}
interface List { values: (Value|PropertyReference)[] }

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Terminals
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

terminal FLOAT returns number: /[+-]?[0-9]+\.[0-9]+/;
terminal INTEGER returns number: /[+-]?[0-9]+/;
terminal BOOL returns boolean: "true" | "false";
terminal DATE returns Date: /"\d{4}-\d{2}-\d{2}"/;
terminal STRING: /"(\\.|[^"\\])*"|'(\\.|[^'\\])*?'/;
terminal ID: /[_a-zA-Z][\w_]*/;

hidden terminal WS: /\s+/;
hidden terminal ML_COMMENT: /\/\*[\s\S]*?\*\//;
hidden terminal SL_COMMENT: /\/\/[^\n\r]*/;
