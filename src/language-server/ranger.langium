grammar Ranger

entry Document:
    (imports+=Import)*
    (entities+=Entity)*;

Import:
    "from" filePath=AFilePath "import" entities+=EntityReference ("," entities+=EntityReference)* ","?;

Entity returns Entity:
    "Entity" name=ID ":"? value=ObjValue;

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

ObjValue returns Value:
    Obj | CsvFunc;

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
    AString | ABool | ANumber | ADate | ATimestamp | AFilePath | ANull;

AString:
    value=STRING;

ABool:
    value=BOOL;

ANumber:
    value=NUMBER;

ADate:
    value=DATE;

ATimestamp:
    value=TIMESTAMP;

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
    RandomFunc | MapFunc | CsvFunc | SequenceFunc | UuidFunc | Regex | TodayFunc | NowFunc;

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

TodayFunc:
    {infer TodayFunc} "today" "(" ")";

NowFunc:
    {infer NowFunc} "now" "(" ")";

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
terminal DATE: /"\d{4}-\d{2}-\d{2}"/;
terminal TIMESTAMP: /"\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,3})?Z?"/;
terminal STRING: /"(\\.|[^"\\])*"|'(\\.|[^'\\])*?'/;
terminal REGEXLITERAL: /\/(\\.|[^/\\])+?\//;
terminal ID: /[_a-zA-Z][\w_]*/;

hidden terminal WS: /\s+/;
hidden terminal ML_COMMENT: /\/\*[\s\S]*?\*\//;
hidden terminal SL_COMMENT: /\/\/[^\n\r]*/;
