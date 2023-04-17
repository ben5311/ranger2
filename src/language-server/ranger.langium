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
    name=(STRING|ID) ":" value=ValueOrPropertyReference ","?;

ValueOrPropertyReference:
     Value | PropertyReference;

Value:
     Objekt | List | Func | Literal;

PropertyReference:
    element=[Property:ID] ({infer PropertyReference.previous=current} "." element=[Property:ID])*;

List returns List:
    "["
        (values+=ValueOrPropertyReference ("," values+=ValueOrPropertyReference)* ","?)?
    "]";

Literal:
    Primitive | Num | Null;

Primitive:
    value=(STRING | BOOL | DATE);

FilePath:
    value=STRING;

Num:
    value=NUMBER;

Null:
    {infer Null} "null";

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Functions
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

Func:
    RandomFunc | MapFunc | CsvFunc;

RandomFunc:
    RandomOfRange | RandomOfList;     // TODO: Allow references for range and list
RandomOfRange:
    "random" "(" range=Range ")";
RandomOfList:
    "random" "(" list=(List|ListWithoutBrackets) ")";

MapFunc:
    MapToList | MapToObject;
MapToList:
    "map" "(" source=PropertyReference "=>" list=List ")";
MapToObject:
    "map" "(" source=PropertyReference "=>" object=MapObject ")";

CsvFunc:
    "csv" "(" filePath=FilePath (",""delimiter=" delimiter=STRING)? ("," noHeader?="noHeader")? ")";

Range:
    min=Num ".." max=Num;

ListWithoutBrackets returns List:
    (values+=ValueOrPropertyReference ("," values+=ValueOrPropertyReference)* ","?)?;

MapObject:
    "{" (pairs+=KeyValuePair)* "}";

KeyValuePair:
    key=Literal ":" value=ValueOrPropertyReference ","?;


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Interfaces
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

interface Entity extends Property {}
interface Property { name: string; value: ValueOrPropertyReference }
interface List { values: ValueOrPropertyReference[] }

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Terminals
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

terminal NUMBER returns number: /[+-]?[0-9]+(\.[0-9]+)?/;
terminal BOOL returns boolean: "true" | "false";
terminal DATE returns string: /"\d{4}-\d{2}-\d{2}"/;
terminal STRING: /"(\\.|[^"\\])*"|'(\\.|[^'\\])*?'/;
terminal ID: /[_a-zA-Z][\w_]*/;

hidden terminal WS: /\s+/;
hidden terminal ML_COMMENT: /\/\*[\s\S]*?\*\//;
hidden terminal SL_COMMENT: /\/\/[^\n\r]*/;
