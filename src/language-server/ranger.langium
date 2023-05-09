grammar Ranger

entry Document:
    (imports+=Import)*
    (entities+=Entity)*;

Import:
    "from" filePath=FilePath "import" entities+=EntityReference ("," entities+=EntityReference)* ","?;

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

Value returns Value:
     Objekt | List | Func | Literal;

EntityReference returns PropertyReference:
    element=[Property:ID];

PropertyReference returns PropertyReference:
    element=[Property:ID]
    ({PropertyReference.previous=current} "." element=[Property:ID])*
    ({PropertyReference.previous=current} "." element=[PropertyExtractor:ID])*;

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
    RandomFunc | MapFunc | CsvFunc | SequenceFunc | UuidFunc;

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

SequenceFunc:
    "sequence" "(" start=Num ")";

UuidFunc:
    {infer UuidFunc} "uuid" "(" ")";

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
interface PropertyReference { element: @Property | @PropertyExtractor; previous?: PropertyReference }
interface PropertyExtractor { source: Value; name: string}
type Value = Objekt | List | Func | Literal | PropertyExtractor

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
