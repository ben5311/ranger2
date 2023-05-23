grammar Ranger

entry Document:
    (imports+=Import)*
    (entities+=Entity)*;

Import:
    "from" filePath=AFilePath "import" entities+=EntityReference ("," entities+=EntityReference)* ","?;

Entity returns Entity:
    "Entity" name=ID value=Obj;

// "Object", "String", "Number", "Date" are reserved keywords :(
Obj:
    "{"
        (properties+=Property)*
    "}";

Property returns Property:
    name=(STRING|ID) ":" value=ValueOrPropertyReference ","?;

ValueOrPropertyReference:
     Value | PropertyReference;

Value returns Value:
     Obj | List | Func | Literal;

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
    AString | ABool | ANumber | AFilePath | ANull;

AString:
    value=STRING;

ABool:
    value=BOOL;

ANumber:
    value=NUMBER;

AFilePath:
    value=STRING;

ANull:
    {infer ANull} "null";

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Other data structures
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

Range:
    min=ANumber ".." max=ANumber;

ListWithoutBrackets returns List:
    (values+=ValueOrPropertyReference ("," values+=ValueOrPropertyReference)* ","?)?;

MapObject:
    "{" (pairs+=KeyValuePair)* "}";

KeyValuePair:
    key=Literal ":" value=ValueOrPropertyReference ","?;

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Functions
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

Func:
    RandomFunc | MapFunc | CsvFunc | SequenceFunc | UuidFunc | Regex;

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
    "csv" "(" filePath=AFilePath (",""delimiter=" delimiter=STRING)? ("," noHeader?="noHeader")? ")";

SequenceFunc:
    "sequence" "(" start=ANumber ")";

UuidFunc:
    {infer UuidFunc} "uuid" "(" ")";

Regex:
    value=REGEXLITERAL;

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Interfaces
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

interface Entity extends Property {}
interface Property { name: string; value: ValueOrPropertyReference }
interface List { values: ValueOrPropertyReference[] }
interface PropertyReference { element: @Property | @PropertyExtractor; previous?: PropertyReference }
interface PropertyExtractor { source: Value; name: string}
type Value = Obj | List | Func | Literal | PropertyExtractor

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Terminals
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

terminal NUMBER returns number: /[+-]?[0-9]+(\.[0-9]+)?/;
terminal BOOL returns boolean: "true" | "false";
terminal STRING: /"(\\.|[^"\\])*"|'(\\.|[^'\\])*?'/;
terminal REGEXLITERAL: /\/(\\.|[^/\\])+?\//;
terminal ID: /[_a-zA-Z][\w_]*/;

hidden terminal WS: /\s+/;
hidden terminal ML_COMMENT: /\/\*[\s\S]*?\*\//;
hidden terminal SL_COMMENT: /\/\/[^\n\r]*/;
