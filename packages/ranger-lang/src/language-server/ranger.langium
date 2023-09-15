grammar Ranger

entry Document:
    (imports+=Import)*
    (entities+=Entity)*;

Import:
    "from" filePath=AFilePath "import" entities+=EntityReference ("," entities+=EntityReference)* ","?;

Entity returns Entity:
    "Entity" name=ID ":"? value=ObjectValue;

ObjectValue returns Value:
    Objekt | CsvFunc;

Objekt:  // Object is a reserved keyword.
    "{"
        (properties+=Property)*
    "}";

Property returns Property:
    name=(STRING|ID) ":" value=Value ","?;

Value returns Value:
    Objekt | List | Literal | Func | PropertyReference | Transformer;

List returns List:
    "["
        (values+=Value ("," values+=Value)* ","?)?
    "]";

EntityReference returns PropertyReference:
    element=[Property:ID];

PropertyReference returns PropertyReference:
    element=[Property:ID] ({PropertyReference.previous=current} "." element=[Property:ID])*;

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Literals
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

Literal returns Literal:
    AString | ABoolean | ANumber | ADate | ATimestamp | ANull;

// "String", "Number" and "Date" cannot be used as type names because they are reserved keywords.
// Therefore, all literal types are prefixed with an "A" here.
AString:
    value=STRING;

ABoolean:
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
// Transformers
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

Transformable:
    Objekt | List | Func | Literal | PropertyReference;

Transformer:
    value=Transformable "|" type=TransformerType ({infer Transformer.previous=current} "|" type=TransformerType)*;

TransformerType returns string:
    "lower" | "upper"| "ascii" | "trim";

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Functions
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

Func:
    RandomFunc
    | WeightedFunc
    | MapFunc
    | CsvFunc
    | SequenceFunc
    | UuidFunc
    | Regex
    | TodayFunc
    | NowFunc
    | StringTemplate;

RandomFunc:
    RandomNumber | RandomDate | RandomTimestamp | RandomOfList | RandomNormal;
RandomNumber:
    "random" "(" NumberRange ")";     // TODO: Allow references for range and list
RandomDate:
    "random" "(" DateRange ")";
RandomTimestamp:
    "random" "(" TimestampRange ")";
RandomOfList:
    "random" "(" list=(List|ListWithoutBrackets) ")";
RandomNormal:
    "randomNormal" "(" NumberRange "," "mean=" mean=ANumber "," "std=" std=ANumber ")";

fragment NumberRange:
    min=ANumber ".." max=ANumber;
fragment DateRange:
    min=(ADate|TodayFunc)  ".." max=(ADate|TodayFunc);
fragment TimestampRange:
    min=(ATimestamp|NowFunc)  ".." max=(ATimestamp|NowFunc);

WeightedFunc:
    "weighted" "(" (values+=Value ":" weights+=ANumber ("," values+=Value ":" weights+=ANumber)* ","?)? ")";

MapFunc:
    MapToList | MapToDict;
MapToList:
    "map" "(" source=PropertyReference "=>" list=List ")";
MapToDict:
    "map" "(" source=PropertyReference "=>" dictionary=Dictionary ")";

CsvFunc:
    "csv" "(" filePath=AFilePath ("," "delimiter=" delimiter=STRING)? ("," noHeader?="noHeader")? ")";

SequenceFunc:
    "sequence" "(" start=ANumber ")";

UuidFunc:
    {infer UuidFunc} "uuid" "(" ")";

Regex:
    value=REGEXLITERAL;

TodayFunc:
    "today" ("." "minus" "(" minusDuration=Duration ")")? ("." "plus" "(" plusDuration=Duration ")")?;
NowFunc:
    "now"   ("." "minus" "(" minusDuration=Duration ")")? ("." "plus" "(" plusDuration=Duration ")")?;
Duration:
    ((days=Value "DAYS") | (months=Value "MONTHS") | (weeks=Value "WEEKS") | (years=Value "YEARS"))*;

StringTemplate:
    "f" template=STRING ("%" params=Dictionary)?;

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Other data structures
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

ListWithoutBrackets returns List:
    (values+=Value ("," values+=Value)* ","?)?;

Dictionary:
    "{" (pairs+=KeyValuePair)* "}";

KeyValuePair:
    key=Literal ":" value=Value ","?;

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Interfaces
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

interface Entity extends Property {}
interface Property { name: string; value: Value }
interface List { values: Value[] }
interface PropertyReference { element: @Property | @PropertyExtractor; previous?: PropertyReference }
interface PropertyExtractor { source: Value; name: string}
type Literal = AString | ABoolean | ANumber | ADate | ATimestamp | AFilePath | ANull
type Value = Objekt | List | Func | Literal | PropertyReference | PropertyExtractor | Transformer
type ValueOrProperty = Value | Property

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
