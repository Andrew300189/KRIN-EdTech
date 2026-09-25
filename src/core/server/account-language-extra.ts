/**
 * Additional exact-match account-name terms. Keep these separate from substring
 * stems: inflected swear words are useful, but broad new stems can reject names.
 * Curated with reference to censor-text/profanity-list (Unlicense,
 * https://github.com/censor-text/profanity-list) and LDNOOBW/List-of-Dirty-
 * Naughty-Obscene-and-Otherwise-Bad-Words (CC BY 4.0,
 * https://github.com/LDNOOBW/List-of-Dirty-Naughty-Obscene-and-Otherwise-Bad-Words).
 * Selected, expanded with inflections/compounds, and limited to exact matches.
 */
export const EXTRA_FORBIDDEN_TERMS = {
  en: [
    "jackass", "smartass", "badass", "fatass", "shithead", "shitface", "shitbag", "shitshow", "bullshit", "horseshit",
    "batshit", "dipshit", "apeshit", "pisshead", "pissface", "pisspot", "pissbrain", "dickwad", "dickbag", "dickface",
    "dickweed", "dicknose", "cockhead", "cockwomble", "cocksucker", "cockbite", "cockface", "fuckwit", "fuckface", "fuckhead",
    "fuckboy", "fuckwad", "fuckup", "fuckery", "fuckable", "fucktard", "shitstain", "shitbird", "shitheel", "shitstorm",
    "craphead", "crapface", "crapbag", "crapola", "asshat", "asswipe", "assclown", "assmunch", "assbag", "assface",
    "asscrack", "arsewipe", "arseface", "arsehat", "arseclown", "butthead", "buttface", "butthole", "buttmunch", "buttlicker",
    "wankstain", "wankface", "wankshaft", "twatwaffle", "twatface", "twathead", "cuntface", "cuntbag", "cunty", "pussywhipped",
    "douche", "douchecanoe", "douchenozzle", "douchnozzle", "douchelord", "sleazebag", "scumbag", "dirtbag", "slimeball", "creepazoid",
    "numbnuts", "numbskull", "bonehead", "meathead", "airhead", "knucklehead", "blockhead", "shitforbrains", "pissflaps", "dickless",
    "bollockbrain", "bollockhead", "buggeroff", "gobshite", "gobshit", "feckoff", "fecker", "motherfreaker", "prickface", "prickhead",
  ],
  de: [
    "arschgesicht", "arschkopf", "arschkeks", "arschbratze", "arschgeige", "arschkriecher", "arschfresser", "arschlecker", "arschbacke", "arschhaare",
    "arschficker", "arschbombe", "arschkanone", "arschvogel", "arschpfeife", "arschgeselle", "arschleuchte", "arschlochkind", "arschlochgesicht", "arschfotze",
    "kackbratze", "kackbatzen", "kackgesicht", "kackkopf", "kackvogel", "kacklappen", "kackwurst", "kackspaten", "kackeimer", "kackfass",
    "scheisskerl", "scheisskopf", "scheisskind", "scheisshaufen", "scheissgesicht", "scheissvogel", "scheissdreck", "scheisshaus", "scheisslappen", "scheissbratze",
    "pisskopf", "pissgesicht", "pissnelke", "pissflitsche", "pissflasche", "pissbirne", "pisslappen", "pissvogel", "pisswurst", "pisskopp",
    "kotzbrocken", "kotzbeutel", "kotzkruecke", "kotzgesicht", "kotzkopf", "kotzlappen", "kotzvogel", "kotzeimer", "kotzwurst", "kotzkanone",
    "wichser", "wichsgriffel", "wichsfresse", "wichskopf", "wichslappen", "wichsbirne", "wichsgeige", "wichsvogel", "wichswurst", "wichskrueppel",
    "fickfehler", "fickgesicht", "fickkopf", "ficklappen", "fickvogel", "fickwurst", "fickbirne", "fickspaten", "fickschlitten", "fickfresse",
    "pimmelfresse", "pimmelkopf", "pimmelgesicht", "pimmelbirne", "pimmelvogel", "pimmellappen", "pimmelspaten", "pimmelwurst", "pimmelkopp", "pimmelprinz",
    "drecksack", "dreckskerl", "drecksgesicht", "dreckskind", "drecksvogel", "dreckslappen", "dreckschwein", "dreckswurst", "drecksfresse", "drecksbratze",
  ],
  pl: [
    "chuja", "chujach", "chujami", "chuje", "chujem", "chujom", "chujowi", "chujowaty", "chujowa", "chujowe",
    "chujowego", "chujowej", "chujowemu", "chujowo", "chujowy", "chujowych", "chujowym", "chujowymi", "chujów", "chujnia",
    "cipach", "cipami", "cipą", "cipie", "cipom", "cipy", "cipsko", "cipska", "cipskiem", "cipulko",
    "dupach", "dupami", "dupą", "dupę", "dupie", "dupom", "dupy", "dupek", "dupczyć", "dupogłowy",
    "jebana", "jebnięcie", "jebane", "jebanego", "jebanej", "jebanemu", "jebani", "jebaniec", "jebany", "jebanych",
    "jebanym", "jebanymi", "jebańca", "jebańcach", "jebańcami", "jebańcem", "jebańcom", "jebańców", "jebańcu", "jebańcy",
    "kurwiszon", "kurwiszona", "kurwiszony", "kurwiszonom", "kurwisko", "kurwiska", "kurwami", "kurwach", "kurwą", "kurwie",
    "pierdolony", "pierdolona", "pierdolone", "pierdoleni", "pierdolnięty", "pierdolnięta", "pierdolnięci", "pierdoła", "pierdolec", "pierdnięcie",
    "skurwysyn", "skurwysyna", "skurwysynu", "skurwysyny", "skurwysynem", "skurwiel", "skurwiela", "skurwiele", "skurwielu", "skurwieli",
    "pojeb", "pojeba", "pojebem", "pojeby", "pojebany", "pojebana", "pojebane", "pojebani", "zajebany", "zajebana",
  ],
  ru: [
    "блядки", "блядовать", "блядство", "блядина", "блядюга", "блядский", "блядская", "блядское", "блядские", "блядовала",
    "долбоёб", "долбоебина", "долбоёба", "долбоёбу", "долбоёбы", "долбоёбом", "долбоебка", "долбоебихи", "долбоебский", "долбоебизм",
    "ебало", "ебальник", "ебаный", "ебаная", "ебаное", "ебаные", "ебанутый", "ебанутая", "ебанутые", "ебанись",
    "заёбанный", "заебался", "заебала", "заебали", "заебешь", "заебёт", "заебете", "заебемся", "заебутся", "заебистый",
    "наебал", "наебала", "наебали", "наебались", "наебешь", "наебёт", "наебанный", "наебщица", "наебщик", "наебка",
    "охуеть", "охуенный", "охуенная", "охуенные", "охуительно", "охуевший", "охуевшая", "охуевшие", "охуел", "охуела",
    "пиздец", "пиздюк", "пиздюлина", "пиздануть", "пиздеть", "пиздёж", "пиздобол", "пиздоболка", "пиздато", "пиздатый",
    "распиздяй", "распиздяйка", "распиздяйство", "распиздяи", "распиздяям", "распиздяями", "распиздяйский", "распиздяйская", "распиздяйское", "распиздяйские",
    "съебаться", "съебался", "съебалась", "съебались", "съебывай", "съебывайте", "съебывать", "съебываешь", "съебываем", "съебываются",
    "уёбище", "уебок", "уебина", "уебаны", "уебан", "уебанка", "уебанский", "уебанская", "уебанское", "уебанские",
  ],
  uk: [
    "блядей", "блядина", "блядота", "блядство", "блядська", "блядів", "блядь", "блять", "блядуха", "блядисько",
    "найобувати", "найобують", "найобує", "найобщик", "найобщиця", "найопувати", "найопують", "найопує", "найопщик", "найопщиця",
    "напіздив", "напіздила", "напіздили", "нахуй", "нахуя", "нахєр", "нахєра", "наєбав", "наєбала", "наєбали",
    "наєбати", "наїбав", "наїбала", "наїбали", "наїбати", "пиздолиз", "пиздолизить", "пиздолизня", "пиздоти", "пиздуємо",
    "піздата", "піздати", "піздато", "пізданути", "піздець", "піздиш", "піздюка", "піздюку", "піздота", "піздотою",
    "піздюки", "піздюків", "пісюн", "пісюна", "пісюни", "пісюнів", "сучара", "сучарами", "сучарою", "сучий",
    "уйобина", "уйобище", "уйобок", "уйобство", "уїбати", "уїбатись", "уїбатися", "уїбаться", "хуйлопан", "хуйовий",
    "хуйово", "хуяльник", "хуєта", "хуями", "хуєвий", "хуєм", "хуєсос", "хуєсосити", "хуєсосний", "хуїв",
    "їбав", "їбала", "їбали", "їбальний", "їбальник", "їбальнику", "їбана", "їбанат", "їбанута", "їбанути",
    "їбанутий", "їбанутись", "їбанько", "їбатись", "їбатися", "їбе", "їбеш", "їблана", "їблани", "їблота",
  ],
} as const;
