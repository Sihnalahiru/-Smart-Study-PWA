export type KanaScript = 'hiragana' | 'katakana';
export type KanaGroup = 'gojuon' | 'dakuten' | 'yoon' | 'extended';

export interface KanaChar {
  id: string;
  char: string;
  romaji: string;
  script: KanaScript;
  group: KanaGroup;
  row: string;
}

export interface MainKanjiItem {
  id: string;
  kanji: string;
  partNumber: number;
  onyomi: string;
  kunyomi: string;
  romaji: string;
  sinhala: string;
  exampleJp: string;
  exampleRomaji: string;
  exampleSinhala: string;
}

const HIRAGANA_GOJUON_RAW: [string, string, string][] = [
  ['あ', 'a', 'a-row'], ['い', 'i', 'a-row'], ['う', 'u', 'a-row'], ['え', 'e', 'a-row'], ['お', 'o', 'a-row'],
  ['か', 'ka', 'ka-row'], ['き', 'ki', 'ka-row'], ['く', 'ku', 'ka-row'], ['け', 'ke', 'ka-row'], ['こ', 'ko', 'ka-row'],
  ['さ', 'sa', 'sa-row'], ['し', 'shi', 'sa-row'], ['す', 'su', 'sa-row'], ['せ', 'se', 'sa-row'], ['そ', 'so', 'sa-row'],
  ['た', 'ta', 'ta-row'], ['ち', 'chi', 'ta-row'], ['つ', 'tsu', 'ta-row'], ['て', 'te', 'ta-row'], ['と', 'to', 'ta-row'],
  ['な', 'na', 'na-row'], ['に', 'ni', 'na-row'], ['ぬ', 'nu', 'na-row'], ['ね', 'ne', 'na-row'], ['の', 'no', 'na-row'],
  ['は', 'ha', 'ha-row'], ['ひ', 'hi', 'ha-row'], ['ふ', 'fu', 'ha-row'], ['へ', 'he', 'ha-row'], ['ほ', 'ho', 'ha-row'],
  ['ま', 'ma', 'ma-row'], ['み', 'mi', 'ma-row'], ['む', 'mu', 'ma-row'], ['め', 'me', 'ma-row'], ['も', 'mo', 'ma-row'],
  ['や', 'ya', 'ya-row'], ['ゆ', 'yu', 'ya-row'], ['よ', 'yo', 'ya-row'],
  ['ら', 'ra', 'ra-row'], ['り', 'ri', 'ra-row'], ['る', 'ru', 'ra-row'], ['れ', 're', 'ra-row'], ['ろ', 'ro', 'ra-row'],
  ['わ', 'wa', 'wa-row'], ['を', 'wo', 'wa-row'], ['ん', 'n', 'wa-row'],
];

const HIRAGANA_DAKUTEN_RAW: [string, string, string][] = [
  ['が', 'ga', 'ga-row'], ['ぎ', 'gi', 'ga-row'], ['ぐ', 'gu', 'ga-row'], ['げ', 'ge', 'ga-row'], ['ご', 'go', 'ga-row'],
  ['ざ', 'za', 'za-row'], ['じ', 'ji', 'za-row'], ['ず', 'zu', 'za-row'], ['ぜ', 'ze', 'za-row'], ['ぞ', 'zo', 'za-row'],
  ['だ', 'da', 'da-row'], ['ぢ', 'ji (di)', 'da-row'], ['づ', 'zu (du)', 'da-row'], ['で', 'de', 'da-row'], ['ど', 'do', 'da-row'],
  ['ば', 'ba', 'ba-row'], ['び', 'bi', 'ba-row'], ['ぶ', 'bu', 'ba-row'], ['べ', 'be', 'ba-row'], ['ぼ', 'bo', 'ba-row'],
  ['ぱ', 'pa', 'pa-row'], ['ぴ', 'pi', 'pa-row'], ['ぷ', 'pu', 'pa-row'], ['ぺ', 'pe', 'pa-row'], ['ぽ', 'po', 'pa-row'],
];

const HIRAGANA_YOON_RAW: [string, string, string][] = [
  ['きゃ', 'kya', 'kya-row'], ['きゅ', 'kyu', 'kya-row'], ['きょ', 'kyo', 'kya-row'],
  ['しゃ', 'sha', 'sha-row'], ['しゅ', 'shu', 'sha-row'], ['しょ', 'sho', 'sha-row'],
  ['ちゃ', 'cha', 'cha-row'], ['ちゅ', 'chu', 'cha-row'], ['ちょ', 'cho', 'cha-row'],
  ['にゃ', 'nya', 'nya-row'], ['にゅ', 'nyu', 'nya-row'], ['にょ', 'nyo', 'nya-row'],
  ['ひゃ', 'hya', 'hya-row'], ['ひゅ', 'hyu', 'hya-row'], ['ひょ', 'hyo', 'hya-row'],
  ['みゃ', 'mya', 'mya-row'], ['みゅ', 'myu', 'mya-row'], ['みょ', 'myo', 'mya-row'],
  ['りゃ', 'rya', 'rya-row'], ['りゅ', 'ryu', 'rya-row'], ['りょ', 'ryo', 'rya-row'],
  ['ぎゃ', 'gya', 'gya-row'], ['ぎゅ', 'gyu', 'gya-row'], ['ぎょ', 'gyo', 'gya-row'],
  ['じゃ', 'ja', 'ja-row'], ['じゅ', 'ju', 'ja-row'], ['じょ', 'jo', 'ja-row'],
  ['びゃ', 'bya', 'bya-row'], ['びゅ', 'byu', 'bya-row'], ['びょ', 'byo', 'bya-row'],
  ['ぴゃ', 'pya', 'pya-row'], ['ぴゅ', 'pyu', 'pya-row'], ['ぴょ', 'pyo', 'pya-row'],
];

const KATAKANA_GOJUON_RAW: [string, string, string][] = [
  ['ア', 'a', 'a-row'], ['イ', 'i', 'a-row'], ['ウ', 'u', 'a-row'], ['エ', 'e', 'a-row'], ['オ', 'o', 'a-row'],
  ['カ', 'ka', 'ka-row'], ['キ', 'ki', 'ka-row'], ['ク', 'ku', 'ka-row'], ['ケ', 'ke', 'ka-row'], ['コ', 'ko', 'ka-row'],
  ['サ', 'sa', 'sa-row'], ['シ', 'shi', 'sa-row'], ['ス', 'su', 'sa-row'], ['セ', 'se', 'sa-row'], ['ソ', 'so', 'sa-row'],
  ['タ', 'ta', 'ta-row'], ['チ', 'chi', 'ta-row'], ['ツ', 'tsu', 'ta-row'], ['テ', 'te', 'ta-row'], ['ト', 'to', 'ta-row'],
  ['ナ', 'na', 'na-row'], ['ニ', 'ni', 'na-row'], ['ヌ', 'nu', 'na-row'], ['ネ', 'ne', 'na-row'], ['ノ', 'no', 'na-row'],
  ['ハ', 'ha', 'ha-row'], ['ヒ', 'hi', 'ha-row'], ['フ', 'fu', 'ha-row'], ['ヘ', 'he', 'ha-row'], ['ホ', 'ho', 'ha-row'],
  ['マ', 'ma', 'ma-row'], ['ミ', 'mi', 'ma-row'], ['ム', 'mu', 'ma-row'], ['メ', 'me', 'ma-row'], ['モ', 'mo', 'ma-row'],
  ['ヤ', 'ya', 'ya-row'], ['ユ', 'yu', 'ya-row'], ['ヨ', 'yo', 'ya-row'],
  ['ラ', 'ra', 'ra-row'], ['リ', 'ri', 'ra-row'], ['ル', 'ru', 'ra-row'], ['レ', 're', 'ra-row'], ['ロ', 'ro', 'ra-row'],
  ['ワ', 'wa', 'wa-row'], ['ヲ', 'wo', 'wa-row'], ['ン', 'n', 'wa-row'],
];

const KATAKANA_DAKUTEN_RAW: [string, string, string][] = [
  ['ガ', 'ga', 'ga-row'], ['ギ', 'gi', 'ga-row'], ['グ', 'gu', 'ga-row'], ['ゲ', 'ge', 'ga-row'], ['ゴ', 'go', 'ga-row'],
  ['ザ', 'za', 'za-row'], ['ジ', 'ji', 'za-row'], ['ズ', 'zu', 'za-row'], ['ゼ', 'ze', 'za-row'], ['ゾ', 'zo', 'za-row'],
  ['ダ', 'da', 'da-row'], ['ヂ', 'ji (di)', 'da-row'], ['ヅ', 'zu (du)', 'da-row'], ['デ', 'de', 'da-row'], ['ド', 'do', 'da-row'],
  ['バ', 'ba', 'ba-row'], ['ビ', 'bi', 'ba-row'], ['ブ', 'bu', 'ba-row'], ['ベ', 'be', 'ba-row'], ['ボ', 'bo', 'ba-row'],
  ['パ', 'pa', 'pa-row'], ['ピ', 'pi', 'pa-row'], ['プ', 'pu', 'pa-row'], ['ペ', 'pe', 'pa-row'], ['ポ', 'po', 'pa-row'],
];

const KATAKANA_YOON_RAW: [string, string, string][] = [
  ['キャ', 'kya', 'kya-row'], ['キュ', 'kyu', 'kya-row'], ['キョ', 'kyo', 'kya-row'],
  ['シャ', 'sha', 'sha-row'], ['シュ', 'shu', 'sha-row'], ['ショ', 'sho', 'sha-row'],
  ['チャ', 'cha', 'cha-row'], ['チュ', 'chu', 'cha-row'], ['チョ', 'cho', 'cha-row'],
  ['ニャ', 'nya', 'nya-row'], ['ニュ', 'nyu', 'nya-row'], ['ニョ', 'nyo', 'nya-row'],
  ['ヒャ', 'hya', 'hya-row'], ['ヒュ', 'hyu', 'hya-row'], ['ヒョ', 'hyo', 'hya-row'],
  ['ミャ', 'mya', 'mya-row'], ['ミュ', 'myu', 'mya-row'], ['ミョ', 'myo', 'mya-row'],
  ['リャ', 'rya', 'rya-row'], ['リュ', 'ryu', 'rya-row'], ['リョ', 'ryo', 'rya-row'],
  ['ギャ', 'gya', 'gya-row'], ['ギュ', 'gyu', 'gya-row'], ['ギョ', 'gyo', 'gya-row'],
  ['ジャ', 'ja', 'ja-row'], ['ジュ', 'ju', 'ja-row'], ['ジョ', 'jo', 'ja-row'],
  ['ビャ', 'bya', 'bya-row'], ['ビュ', 'byu', 'bya-row'], ['ビョ', 'byo', 'bya-row'],
  ['ピャ', 'pya', 'pya-row'], ['ピュ', 'pyu', 'pya-row'], ['ピョ', 'pyo', 'pya-row'],
];

const KATAKANA_EXTENDED_RAW: [string, string, string][] = [
  ['ティ', 'ti', 'logistics-ext'],
  ['ディ', 'di', 'logistics-ext'],
  ['ファ', 'fa', 'logistics-ext'],
  ['フィ', 'fi', 'logistics-ext'],
  ['フェ', 'fe', 'logistics-ext'],
  ['フォ', 'fo', 'logistics-ext'],
  ['ウィ', 'wi', 'logistics-ext'],
  ['ウェ', 'we', 'logistics-ext'],
  ['ウォ', 'wo', 'logistics-ext'],
  ['チェ', 'che', 'logistics-ext'],
  ['ジェ', 'je', 'logistics-ext'],
];

function mapKana(
  list: [string, string, string][],
  script: KanaScript,
  group: KanaGroup,
): KanaChar[] {
  return list.map(([char, romaji, row], idx) => ({
    id: `${script}-${group}-${idx}-${romaji.replace(/[^a-z0-9]/gi, '')}`,
    char,
    romaji,
    script,
    group,
    row,
  }));
}

export const HIRAGANA_CHARS: KanaChar[] = [
  ...mapKana(HIRAGANA_GOJUON_RAW, 'hiragana', 'gojuon'),
  ...mapKana(HIRAGANA_DAKUTEN_RAW, 'hiragana', 'dakuten'),
  ...mapKana(HIRAGANA_YOON_RAW, 'hiragana', 'yoon'),
];

export const KATAKANA_CHARS: KanaChar[] = [
  ...mapKana(KATAKANA_GOJUON_RAW, 'katakana', 'gojuon'),
  ...mapKana(KATAKANA_DAKUTEN_RAW, 'katakana', 'dakuten'),
  ...mapKana(KATAKANA_YOON_RAW, 'katakana', 'yoon'),
  ...mapKana(KATAKANA_EXTENDED_RAW, 'katakana', 'extended'),
];

export const ALL_KANA_CHARS: KanaChar[] = [
  ...HIRAGANA_CHARS,
  ...KATAKANA_CHARS,
];

export const DAILY_ALPHABET_SESSIONS_TARGET = 2;

// 84 Essential Main Kanji extracted across Parts 1-6 of the 123-page SSW Logistics Textbook
export const SSW_MAIN_KANJI: MainKanjiItem[] = [
  {id: 'k-01', kanji: '倉', partNumber: 1, onyomi: 'ソウ', kunyomi: 'くら', romaji: 'sō / kura', sinhala: 'ගබඩාව / අටුව', exampleJp: '{倉庫|そうこ}に{荷物|にもつ}を{入|い}れる', exampleRomaji: 'Sōko ni nimotsu o ireru', exampleSinhala: 'ගබඩාවට භාණ්ඩ ඇතුළත් කරයි'},
  {id: 'k-02', kanji: '庫', partNumber: 1, onyomi: 'コ・ク', kunyomi: 'くら', romaji: 'ko / kura', sinhala: 'ගබඩා කුටිය', exampleJp: '{営業|えいぎょう}{倉庫|そうこ}と{冷蔵|れいぞう}{倉庫|そうこ}', exampleRomaji: 'Eigyō sōko to reizō sōko', exampleSinhala: 'වාණිජ ගබඩාව හා ශීත ගබඩාව'},
  {id: 'k-03', kanji: '保', partNumber: 1, onyomi: 'ホ', kunyomi: 'たも(つ)', romaji: 'ho / tamotsu', sinhala: 'ආරක්ෂා කිරීම / ගබඩා තැබීම', exampleJp: '{品質|ひんしつ}を{保|たも}って{保管|ほかん}する', exampleRomaji: 'Hinshitsu o tamotte hokan suru', exampleSinhala: 'ගුණාත්මකභාවය රැකගෙන ගබඩා කරයි'},
  {id: 'k-04', kanji: '管', partNumber: 1, onyomi: 'カン', kunyomi: 'くだ', romaji: 'kan', sinhala: 'පාලනය / කළමනාකරණය', exampleJp: '{温度|おんど}{管理|かんり}と{在庫|ざいこ}{管理|かんり}', exampleRomaji: 'Ondo kanri to zaiko kanri', exampleSinhala: 'උෂ්ණත්ව පාලනය සහ තොග කළමනාකරණය'},
  {id: 'k-05', kanji: '荷', partNumber: 1, onyomi: 'カ', kunyomi: 'に', romaji: 'ka / ni', sinhala: 'බර / භාණ්ඩ', exampleJp: '{荷役|にやく}{作業|さぎょう}の{基本|きほん}', exampleRomaji: 'Niyaku sagyō no kihon', exampleSinhala: 'භාණ්ඩ හැසිරවීමේ මූලික කරුණු'},
  {id: 'k-06', kanji: '物', partNumber: 1, onyomi: 'ブツ・モツ', kunyomi: 'もの', romaji: 'butsu / mono', sinhala: 'ද්‍රව්‍ය / භාණ්ඩ', exampleJp: '{物流|ぶつりゅう}{現場|げんば}の{貨物|かもつ}', exampleRomaji: 'Butsuryū genba no kamotsu', exampleSinhala: 'ලොජිස්ටික් වැඩබිමේ භාණ්ඩ'},
  {id: 'k-07', kanji: '冷', partNumber: 1, onyomi: 'レイ', kunyomi: 'つめ(たい)・ひ(える)', romaji: 'rei / tsumetai', sinhala: 'සිසිල් / ශීත', exampleJp: '{冷蔵|れいぞう}・{冷凍|れいとう}{温度帯|おんどたい}', exampleRomaji: 'Reizō / reitō ondotai', exampleSinhala: 'ශීතකරණ හා අධිශීත උෂ්ණත්ව කලාප'},
  {id: 'k-08', kanji: '温', partNumber: 1, onyomi: 'オン', kunyomi: 'あたた(かい)', romaji: 'on / atatakai', sinhala: 'උෂ්ණත්වය / උණුසුම්', exampleJp: '{常温|じょうおん}・{定温|ていおん}{保管|ほかん}', exampleRomaji: 'Jōon / teion hokan', exampleSinhala: 'සාමාන්‍ය හා ස්ථාවර උෂ්ණත්ව ගබඩා'},
  {id: 'k-09', kanji: '床', partNumber: 1, onyomi: 'ショウ', kunyomi: 'ゆか・とこ', romaji: 'shō / yuka', sinhala: 'බිම / තට්ටුව', exampleJp: '{床耐荷重|ゆかたいかじゅう}を確認する', exampleRomaji: 'Yuka taikajū o kakunin suru', exampleSinhala: 'බිමේ බර දරාගැනීමේ ධාරිතාව පරීක්ෂා කරයි'},
  {id: 'k-10', kanji: '壁', partNumber: 1, onyomi: 'ヘキ', kunyomi: 'かべ', romaji: 'heki / kabe', sinhala: 'බිත්තිය', exampleJp: '{防熱|ぼうねつ}{壁|かべ}・{耐火|たいか}{壁|かべ}', exampleRomaji: 'Bōnetsu-kabe / taika-kabe', exampleSinhala: 'තාප පරිවාරක බිත්ති සහ ගිනි ප්‍රතිරෝධී බිත්ති'},
  {id: 'k-11', kanji: '設', partNumber: 1, onyomi: 'セツ', kunyomi: 'もう(ける)', romaji: 'setsu', sinhala: 'ස්ථාපනය / පහසුකම', exampleJp: '{消防用|しょうぼうよう}{設備|せつび}の{点検|てんけん}', exampleRomaji: 'Shōbōyō setsubi no tenken', exampleSinhala: 'ගිනි නිවීමේ උපකරණ පරීක්ෂාව'},
  {id: 'k-12', kanji: '備', partNumber: 1, onyomi: 'ビ', kunyomi: 'そな(える)', romaji: 'bi / sonaeru', sinhala: 'උපකරණ / සූදානම් කිරීම', exampleJp: '{搬送|はんそう}{設備|せつび}を{備|そな}える', exampleRomaji: 'Hansō setsubi o sonaeru', exampleSinhala: 'ප්‍රවාහන පහසුකම් සූදානම් කරයි'},
  {id: 'k-13', kanji: '運', partNumber: 1, onyomi: 'ウン', kunyomi: 'はこ(ぶ)', romaji: 'un / hakobu', sinhala: 'ප්‍රවාහනය / රැගෙන යාම', exampleJp: 'フォークリフトを{運転|うんてん}する', exampleRomaji: 'Fōkurifuto o unten suru', exampleSinhala: 'Forklift එක පදවයි'},
  {id: 'k-14', kanji: '搬', partNumber: 1, onyomi: 'ハン', kunyomi: '—', romaji: 'han', sinhala: 'ඇදගෙන යාම / ප්‍රවාහනය', exampleJp: '{垂直|すいちょく}{搬送機|はんそうき}で{運|はこ}ぶ', exampleRomaji: 'Suichoku hansōki de hakobu', exampleSinhala: 'සිරස් වාහක යන්ත්‍රයෙන් ගෙන යයි'},
  {id: 'k-15', kanji: '車', partNumber: 1, onyomi: 'シャ', kunyomi: 'くるま', romaji: 'sha / kuruma', sinhala: 'වාහනය / කරත්තය', exampleJp: '{台車|だいしゃ}・ウイング{車|しゃ}', exampleRomaji: 'Daisha / uingu-sha', exampleSinhala: 'තල්ලු කරත්තය සහ Wing ට්‍රක් රථය'},
  {id: 'k-16', kanji: '計', partNumber: 1, onyomi: 'ケイ', kunyomi: 'はか(る)', romaji: 'kei / hakaru', sinhala: 'මැනීම / ගණනය', exampleJp: '{自動|じどう}{採寸|さいすん}{計量機|けいりょうき}', exampleRomaji: 'Jidō saisun keiryōki', exampleSinhala: 'ස්වයංක්‍රීය මිනුම් හා බර කිරන යන්ත්‍රය'},
  {id: 'k-17', kanji: '量', partNumber: 1, onyomi: 'リョウ', kunyomi: 'はか(る)', romaji: 'ryō / hakaru', sinhala: 'ප්‍රමාණය / බර', exampleJp: '{重量|じゅうりょう}と{数量|すうりょう}を{計|はか}る', exampleRomaji: 'Jūryō to sūryō o hakaru', exampleSinhala: 'බර සහ ප්‍රමාණය මනියි'},
  {id: 'k-18', kanji: '資', partNumber: 1, onyomi: 'シ', kunyomi: '—', romaji: 'shi', sinhala: 'සුදුසුකම / සම්පත්', exampleJp: '{無資格|むしかく}{運転|うんてん}{禁止|きんし}', exampleRomaji: 'Mushikaku unten kinshi', exampleSinhala: 'බලපත්‍ර නොමැතිව රිය පැදවීම තහනම්'},
  {id: 'k-19', kanji: '格', partNumber: 1, onyomi: 'カク', kunyomi: '—', romaji: 'kaku', sinhala: 'ප්‍රමිතිය / සුදුසුකම', exampleJp: '{資格|しかく}と{規格|きかく}を{守|まも}る', exampleRomaji: 'Shikaku to kikaku o mamoru', exampleSinhala: 'සුදුසුකම් හා ප්‍රමිතීන් ආරක්ෂා කරයි'},
  {id: 'k-20', kanji: '業', partNumber: 2, onyomi: 'ギョウ', kunyomi: 'わざ', romaji: 'gyō', sinhala: 'රැකියාව / මෙහෙයුම', exampleJp: '{業務|ぎょうむ}と{作業|さぎょう}{手順|てじゅん}', exampleRomaji: 'Gyōmu to sagyō tejun', exampleSinhala: 'රාජකාරි හා වැඩ පියවර'},
  {id: 'k-21', kanji: '料', partNumber: 2, onyomi: 'リョウ', kunyomi: '—', romaji: 'ryō', sinhala: 'ගාස්තුව / අමුද්‍රව්‍ය', exampleJp: '{保管料|ほかんりょう}と{荷役料|にやくりょう}', exampleRomaji: 'Hokan-ryō to niyaku-ryō', exampleSinhala: 'ගබඩා ගාස්තුව හා හැසිරවීමේ ගාස්තුව'},
  {id: 'k-22', kanji: '金', partNumber: 2, onyomi: 'キン・コン', kunyomi: 'かね', romaji: 'kin / kane', sinhala: 'මුදල් / ලෝහ', exampleJp: '{倉庫|そうこ}{料金|りょうきん}の{計算|けいさん}', exampleRomaji: 'Sōko ryōkin no keisan', exampleSinhala: 'ගබඩා ගාස්තු ගණනය'},
  {id: 'k-23', kanji: '義', partNumber: 2, onyomi: 'ギ', kunyomi: '—', romaji: 'gi', sinhala: 'වගකීම / යුතුකම', exampleJp: '{善管注意義務|ぜんかんちゅういぎむ}', exampleRomaji: 'Zenkan chūi gimu', exampleSinhala: 'සාධාරණ ආරක්ෂාව සැපයීමේ වගකීම'},
  {id: 'k-24', kanji: '秘', partNumber: 2, onyomi: 'ヒ', kunyomi: 'ひ(める)', romaji: 'hi / himeru', sinhala: 'රහස්‍ය', exampleJp: '{守秘|しゅひ}{義務|ぎむ}を{厳守|げんしゅ}する', exampleRomaji: 'Shuhi gimu o genshu suru', exampleSinhala: 'රහස්‍යභාවය තරයේ ආරක්ෂා කරයි'},
  {id: 'k-25', kanji: '品', partNumber: 2, onyomi: 'ヒン', kunyomi: 'しな', romaji: 'hin / shina', sinhala: 'භාණ්ඩය / ගුණාත්මකභාවය', exampleJp: '{商品|しょうひん}の{品質|ひんしつ}{管理|かんり}', exampleRomaji: 'Shōhin no hinshitsu kanri', exampleSinhala: 'භාණ්ඩවල ගුණාත්මකභාවය පාලනය'},
  {id: 'k-26', kanji: '質', partNumber: 2, onyomi: 'シツ・シチ', kunyomi: '—', romaji: 'shitsu', sinhala: 'ගුණාත්මකභාවය / ස්වභාවය', exampleJp: '{変質|へんしつ}や{漏出|ろうしゅつ}を防ぐ', exampleRomaji: 'Henshitsu ya rōshutsu o fusegu', exampleSinhala: 'නරක් වීම හා කාන්දු වීම වළක්වයි'},
  {id: 'k-27', kanji: '在', partNumber: 2, onyomi: 'ザイ', kunyomi: 'あ(る)', romaji: 'zai', sinhala: 'පැවතීම / තොගය', exampleJp: '{在庫|ざいこ}{数量|すうりょう}の{確認|かくにん}', exampleRomaji: 'Zaiko sūryō no kakunin', exampleSinhala: 'තොග ප්‍රමාණය තහවුරු කිරීම'},
  {id: 'k-28', kanji: '棚', partNumber: 2, onyomi: 'ホウ', kunyomi: 'たな', romaji: 'tana', sinhala: 'රාක්කය / තොග ගණනය', exampleJp: '{定期|ていき}{棚卸|たなおろし}と{循環|じゅんかん}{棚卸|たなおろし}', exampleRomaji: 'Teiki tanaoroshi to junkan tanaoroshi', exampleSinhala: 'නියමිත තොග ගණනය හා චක්‍රීය ගණනය'},
  {id: 'k-29', kanji: '廃', partNumber: 2, onyomi: 'ハイ', kunyomi: 'すた(れる)', romaji: 'hai', sinhala: 'ඉවතලෑම / අපද්‍රව්‍ය', exampleJp: '{産業|さんぎょう}{廃棄物|はいきぶつ}の{分別|ぶんべつ}', exampleRomaji: 'Sangyō haikibutsu no bunbetsu', exampleSinhala: 'කාර්මික අපද්‍රව්‍ය වෙන් කිරීම'},
  {id: 'k-30', kanji: '防', partNumber: 2, onyomi: 'ボウ', kunyomi: 'ふせ(ぐ)', romaji: 'bō / fusegu', sinhala: 'වැළැක්වීම / ආරක්ෂාව', exampleJp: '{防犯|ぼうはん}・{防災|ぼうさい}{対策|たいさく}', exampleRomaji: 'Bōhan / bōsai taisaku', exampleSinhala: 'සොරකම් හා ආපදා වැළැක්වීමේ පියවර'},
  {id: 'k-31', kanji: '災', partNumber: 2, onyomi: 'サイ', kunyomi: 'わざわ(い)', romaji: 'sai', sinhala: 'ආපදාව / විපත', exampleJp: '{労働|ろうどう}{災害|さいがい}・{水害|すいがい}', exampleRomaji: 'Rōdō saigai / suigai', exampleSinhala: 'වැඩබිමේ අනතුරු සහ ගංවතුර ආපදා'},
  {id: 'k-32', kanji: '火', partNumber: 2, onyomi: 'カ', kunyomi: 'ひ', romaji: 'ka / hi', sinhala: 'ගින්න', exampleJp: '{火気|かき}{厳禁|げんきん}・{火災|かさい}{予防|よぼう}', exampleRomaji: 'Kaki genkin / kasai yobō', exampleSinhala: 'ගිනි දැල්වීම තහනම් / ගිනි වැළැක්වීම'},
  {id: 'k-33', kanji: '震', partNumber: 2, onyomi: 'シン', kunyomi: 'ふる(える)', romaji: 'shin', sinhala: 'භූමිකම්පාව / කම්පනය', exampleJp: '{地震|じしん}{発生時|はっせいじ}の{避難|ひなん}', exampleRomaji: 'Jishin hassei-ji no hinan', exampleSinhala: 'භූමිකම්පාවකදී ආරක්ෂිතව ඉවත් වීම'},
  {id: 'k-34', kanji: '服', partNumber: 3, onyomi: 'フク', kunyomi: '—', romaji: 'fuku', sinhala: 'ඇඳුම', exampleJp: '{作業服|さぎょうふく}を{正|ただ}しく{着|き}る', exampleRomaji: 'Sagyōfuku o tadashiku kiru', exampleSinhala: 'වැඩ ඇඳුම නිවැරදිව අඳියි'},
  {id: 'k-35', kanji: '着', partNumber: 3, onyomi: 'チャク', kunyomi: 'き(る)・つ(く)', romaji: 'chaku / kiru / tsuku', sinhala: 'ඇඳීම / ළඟා වීම', exampleJp: 'ヘルメットと{安全靴|あんぜんぐつ}を{着用|ちゃくよう}', exampleRomaji: 'Herumetto to anzengutsu o chakuyō', exampleSinhala: 'හිස්වැසුම සහ ආරක්ෂක සපත්තු පැළඳීම'},
  {id: 'k-36', kanji: '靴', partNumber: 3, onyomi: 'カ', kunyomi: 'くつ', romaji: 'kutsu', sinhala: 'සපත්තු', exampleJp: '{先芯|さきしん}{入|い}りの{安全靴|あんぜんぐつ}', exampleRomaji: 'Sakishin-iri no anzengutsu', exampleSinhala: 'වානේ තුඩ සහිත ආරක්ෂක සපත්තු'},
  {id: 'k-37', kanji: '帳', partNumber: 3, onyomi: 'チョウ', kunyomi: '—', romaji: 'chō', sinhala: 'ලේඛනය / පොත', exampleJp: '{入出庫|にゅうしゅっこ}{帳票|ちょうひょう}を{確認|かくにん}', exampleRomaji: 'Nyūshukko chōhyō o kakunin', exampleSinhala: 'ඇතුළු/පිට කිරීමේ ලේඛන පරීක්ෂාව'},
  {id: 'k-38', kanji: '票', partNumber: 3, onyomi: 'ヒョウ', kunyomi: '—', romaji: 'hyō', sinhala: 'පත්‍රිකාව / වවුචරය', exampleJp: '{作業|さぎょう}{指示書|しじしょ}・{伝票|でんぴょう}', exampleRomaji: 'Sagyō shijisho / denpyō', exampleSinhala: 'වැඩ උපදෙස් පත්‍රිකාව හා ඉන්වොයිසිය'},
  {id: 'k-39', kanji: '単', partNumber: 3, onyomi: 'タン', kunyomi: 'ひと(え)', romaji: 'tan', sinhala: 'ඒකකය / තනි', exampleJp: '{単位|たんい}{換算|かんさん}と{単面|たんめん}パレット', exampleRomaji: 'Tan\'i kansan to tanmen paretto', exampleSinhala: 'ඒකක පරිවර්තනය හා තනි පැති පැලට්'},
  {id: 'k-40', kanji: '位', partNumber: 3, onyomi: 'イ', kunyomi: 'くらい', romaji: 'i / kurai', sinhala: 'මට්ටම / ස්ථානය', exampleJp: '{重|おも}さや{長|なが}さの{単位|たんい}', exampleRomaji: 'Omosa ya nagasa no tan\'i', exampleSinhala: 'බර සහ දිග මැනීමේ ඒකක'},
  {id: 'k-41', kanji: '長', partNumber: 3, onyomi: 'チョウ', kunyomi: 'なが(い)', romaji: 'chō / nagai', sinhala: 'දිග / ප්‍රධානියා', exampleJp: '{長|なが}さ・{隊長|たいちょう}', exampleRomaji: 'Nagasa / taichō', exampleSinhala: 'දිග සහ කණ්ඩායම් නායකයා'},
  {id: 'k-42', kanji: '重', partNumber: 3, onyomi: 'ジュウ・チョウ', kunyomi: 'おも(い)・かさ(ねる)', romaji: 'jū / omoi', sinhala: 'බර / අධික', exampleJp: '{重量|じゅうりょう}制限と{重大|じゅうだい}{事故|じこ}', exampleRomaji: 'Jūryō seigen to jūdai jiko', exampleSinhala: 'බර සීමාව සහ බරපතල අනතුර'},
  {id: 'k-43', kanji: '数', partNumber: 3, onyomi: 'スウ', kunyomi: 'かず・かぞ(える)', romaji: 'sū / kazu', sinhala: 'සංඛ්‍යාව / ගණන් කිරීම', exampleJp: '{数量|すうりょう}と{助数詞|じょすうし}', exampleRomaji: 'Sūryō to josūshi', exampleSinhala: 'ප්‍රමාණය සහ ජපන් ගණන් කිරීමේ ඒකක'},
  {id: 'k-44', kanji: '入', partNumber: 4, onyomi: 'ニュウ', kunyomi: 'い(れる)・はい(る)', romaji: 'nyū / ireru / hairu', sinhala: 'ඇතුළත් වීම / Inbound', exampleJp: '{入庫|にゅうこ}{作業|さぎょう}と{倉入|くらい}れ', exampleRomaji: 'Nyūko sagyō to kuraire', exampleSinhala: 'ගබඩාවට භාණ්ඩ ගැනීමේ වැඩ'},
  {id: 'k-45', kanji: '出', partNumber: 4, onyomi: 'シュツ', kunyomi: 'で(る)・だ(す)', romaji: 'shutsu / deru / dasu', sinhala: 'පිටවීම / Outbound', exampleJp: '{出庫|しゅっこ}{検品|けんぴん}を{行|おこな}う', exampleRomaji: 'Shukko kenpin o okonau', exampleSinhala: 'පිට කිරීමේ පරීක්ෂාව සිදු කරයි'},
  {id: 'k-46', kanji: '検', partNumber: 4, onyomi: 'ケン', kunyomi: '—', romaji: 'ken', sinhala: 'පරීක්ෂාව / විමර්ශනය', exampleJp: '{検品|けんぴん}と{検針機|けんしんき}', exampleRomaji: 'Kenpin to kenshinki', exampleSinhala: 'භාණ්ඩ පරීක්ෂාව හා ඉඳිකටු පරීක්ෂක යන්ත්‍රය'},
  {id: 'k-47', kanji: '照', partNumber: 4, onyomi: 'ショウ', kunyomi: 'て(らす)', romaji: 'shō', sinhala: 'ගැළපීම / ආලෝකය', exampleJp: '{伝票|でんぴょう}と{現物|げんぶつ}の{照合|しょうごう}', exampleRomaji: 'Denpyō to genbutsu no shōgō', exampleSinhala: 'බිල්පත සහ සැබෑ භාණ්ඩ සැසඳීම'},
  {id: 'k-48', kanji: '合', partNumber: 4, onyomi: 'ゴウ・ガッ', kunyomi: 'あ(う)', romaji: 'gō / au', sinhala: 'එකතු වීම / ගැළපීම', exampleJp: '8つの{照合|しょうごう}{項目|こうもく}', exampleRomaji: 'Yatsu no shōgō kōmoku', exampleSinhala: 'පරීක්ෂා කළ යුතු අයිතම 8'},
  {id: 'k-49', kanji: '包', partNumber: 4, onyomi: 'ホウ', kunyomi: 'つつ(む)', romaji: 'hō / tsutsumu', sinhala: 'ඇසුරුම් කිරීම', exampleJp: '{包装|ほうそう}{単位|たんい}の6{段階|だんかい}', exampleRomaji: 'Hōsō tan\'i no roku-dankai', exampleSinhala: 'ඇසුරුම් ඒකක අදියර 6'},
  {id: 'k-50', kanji: '装', partNumber: 4, onyomi: 'ソウ・ショウ', kunyomi: 'よそお(う)', romaji: 'sō', sinhala: 'ඇසුරුම / සැරසීම', exampleJp: '{外装|がいそう}{梱包|こんぽう}と{内装|ないそう}', exampleRomaji: 'Gaisō konpō to naisō', exampleSinhala: 'පිටත ඇසුරුම සහ ඇතුළත ඇසුරුම'},
  {id: 'k-51', kanji: '積', partNumber: 4, onyomi: 'セキ', kunyomi: 'つ(む)', romaji: 'seki / tsumu', sinhala: 'ගොඩගැසීම / පැටවීම', exampleJp: '{積段数|つみだんすう}{制限|せいげん}・{横積|よこづ}み{禁止|きんし}', exampleRomaji: 'Tsumidansū seigen / yokozumi kinshi', exampleSinhala: 'තට්ටු ගණන සීමාව / හරහට තැබීම තහනම්'},
  {id: 'k-52', kanji: '卸', partNumber: 4, onyomi: 'シャ', kunyomi: 'おろ(す)', romaji: 'orosu', sinhala: 'බෑම / Unloading', exampleJp: '{荷卸|にお}ろしと{積卸|つみおろ}し', exampleRomaji: 'Nioroshi to tsumioroshi', exampleSinhala: 'බඩු බෑම සහ පැටවීම-බෑම'},
  {id: 'k-53', kanji: '欠', partNumber: 4, onyomi: 'ケツ', kunyomi: 'か(ける)', romaji: 'ketsu / kakeru', sinhala: 'හිඟය / අඩුව', exampleJp: '{欠品|けっぴん}や{欠損|けっそん}を{報告|ほうこく}', exampleRomaji: 'Keppin ya kesson o hōkoku', exampleSinhala: 'තොග හිඟය හෝ හානිය වාර්තා කිරීම'},
  {id: 'k-54', kanji: '残', partNumber: 4, onyomi: 'ザン', kunyomi: 'のこ(る)', romaji: 'zan / nokoru', sinhala: 'ඉතිරි වීම', exampleJp: '{残貨|ざんか}{防止|ぼうし}の3つの{心得|こころえ}', exampleRomaji: 'Zanka bōshi no mittsu no kokoroe', exampleSinhala: 'භාණ්ඩ මගහැරීම වැළැක්වීමේ කරුණු 3'},
  {id: 'k-55', kanji: '流', partNumber: 4, onyomi: 'リュウ', kunyomi: 'なが(れる)', romaji: 'ryū / nagareru', sinhala: 'ගලනය / බෙදාහැරීම', exampleJp: '{流通|りゅうつう}{加工|かこう}の17{業務|ぎょうむ}', exampleRomaji: 'Ryūtsū kakō no jūnana-gyōmu', exampleSinhala: 'බෙදාහැරීමේ සැකසුම් කාර්යයන් 17'},
  {id: 'k-56', kanji: '工', partNumber: 4, onyomi: 'コウ・ク', kunyomi: '—', romaji: 'kō', sinhala: 'සැකසුම / ඉංජිනේරු', exampleJp: '{加工|かこう}と{作業|さぎょう}{工程|こうてい}', exampleRomaji: 'Kakō to sagyō kōtei', exampleSinhala: 'සැකසුම් සහ වැඩ ක්‍රියාවලි'},
  {id: 'k-57', kanji: '壊', partNumber: 4, onyomi: 'カイ', kunyomi: 'こわ(す)・こわ(れる)', romaji: 'kai / kowareru', sinhala: 'බිඳෙනසුලු / කැඩෙන', exampleJp: '{壊|こわ}れもの{注意|ちゅうい}のケアマーク', exampleRomaji: 'Kowaremono chūi no keamāku', exampleSinhala: 'බිඳෙනසුලු භාණ්ඩ ලකුණ'},
  {id: 'k-58', kanji: '濡', partNumber: 4, onyomi: 'ジュ', kunyomi: 'ぬ(れる)', romaji: 'nureru', sinhala: 'තෙත් වීම', exampleJp: '{水濡|みずぬ}れ{防止|ぼうし}（{傘|かさ}マーク）', exampleRomaji: 'Mizunure bōshi (kasa māku)', exampleSinhala: 'තෙත් වීමෙන් වළක්වන්න (කුඩ ලකුණ)'},
  {id: 'k-59', kanji: '禁', partNumber: 4, onyomi: 'キン', kunyomi: '—', romaji: 'kin', sinhala: 'තහනම්', exampleJp: '{厳禁|げんきん}・{立入|たちいり}{禁止|きんし}', exampleRomaji: 'Genkin / tachiiri kinshi', exampleSinhala: 'දැඩි ලෙස තහනම් / ඇතුළුවීම තහනම්'},
  {id: 'k-60', kanji: '止', partNumber: 4, onyomi: 'シ', kunyomi: 'と(まる)・と(める)', romaji: 'shi / tomaru / tomeru', sinhala: 'නැවතීම / නැවැත්වීම', exampleJp: '{非常|ひじょう}{停止|ていし}スイッチ', exampleRomaji: 'Hijō teishi suitchi', exampleSinhala: 'හදිසි නැවතුම් බොත්තම'},
  {id: 'k-61', kanji: '直', partNumber: 4, onyomi: 'チョク・ジキ', kunyomi: 'なお(す)・ただ(ちに)', romaji: 'choku / naosu', sinhala: 'කෙළින්ම / නිවැරදි කිරීම', exampleJp: '{直射|ちょくしゃ}{日光|にっこう}を{避|さ}ける', exampleRomaji: 'Chokusha nikkō o sakeru', exampleSinhala: 'සෘජු හිරු එළියෙන් වළකින්න'},
  {id: 'k-62', kanji: '安', partNumber: 5, onyomi: 'アン', kunyomi: 'やす(い)', romaji: 'an', sinhala: 'ආරක්ෂිත / සුවපහසු', exampleJp: '{安全|あんぜん}{第一|だいいち}の{職場|しょくば}', exampleRomaji: 'Anzen daiichi no shokuba', exampleSinhala: 'ආරක්ෂාව ප්‍රථමයෙන් සලකන වැඩබිම'},
  {id: 'k-63', kanji: '全', partNumber: 5, onyomi: 'ゼン', kunyomi: 'すべ(て)・まった(く)', romaji: 'zen / subete', sinhala: 'සම්පූර්ණ / ආරක්ෂාව', exampleJp: '{安全|あんぜん}{柵|さく}と{全|ぜん}11{種|しゅ}', exampleRomaji: 'Anzen-saku to zen jūisshu', exampleSinhala: 'ආරක්ෂක වැට සහ සියලුම වර්ග 11'},
  {id: 'k-64', kanji: '危', partNumber: 5, onyomi: 'キ', kunyomi: 'あぶ(ない)', romaji: 'ki / abunai', sinhala: 'අනතුරුදායක', exampleJp: '{危険|きけん}{予知|よち}{訓練|くんれん}（KYT）', exampleRomaji: 'Kiken yochi kunren (KYT)', exampleSinhala: 'අනතුරු පූර්ව-හඳුනාගැනීමේ පුහුණුව'},
  {id: 'k-65', kanji: '険', partNumber: 5, onyomi: 'ケン', kunyomi: 'けわ(しい)', romaji: 'ken', sinhala: 'අවදානම්', exampleJp: '{危険物|きけんぶつ}の{取扱|とりあつかい}6{原則|げんそく}', exampleRomaji: 'Kikenbutsu no toriatsukai roku-gensoku', exampleSinhala: 'අනතුරුදායක ද්‍රව්‍ය හැසිරවීමේ මූලධර්ම 6'},
  {id: 'k-66', kanji: '労', partNumber: 5, onyomi: 'ロウ', kunyomi: '—', romaji: 'rō', sinhala: 'ශ්‍රමය / වැඩ', exampleJp: '{労働|ろうどう}{時間|じかん}と{休憩|きゅうけい}', exampleRomaji: 'Rōdō jikan to kyūkei', exampleSinhala: 'වැඩ කරන පැය ගණන හා විවේකය'},
  {id: 'k-67', kanji: '働', partNumber: 5, onyomi: 'ドウ', kunyomi: 'はたら(く)', romaji: 'dō / hataraku', sinhala: 'වැඩ කිරීම', exampleJp: '1{日|にち}8{時間|じかん}{以内|いない}で{働|はたら}く', exampleRomaji: 'Ichinichi hachi-jikan inai de hataraku', exampleSinhala: 'දිනකට පැය 8කට නොඅඩුව වැඩ කරයි'},
  {id: 'k-68', kanji: '休', partNumber: 5, onyomi: 'キュウ', kunyomi: 'やす(む)', romaji: 'kyū / yasumu', sinhala: 'විවේකය', exampleJp: '{体調|たいちょう}{不良時|ふりょうじ}は{部屋|へや}で{休|やす}む', exampleRomaji: 'Taichō furyō-ji wa heya de yasumu', exampleSinhala: 'අසනීප වූ විට කාමරයේ විවේක ගනී'},
  {id: 'k-69', kanji: '健', partNumber: 5, onyomi: 'ケン', kunyomi: 'すこ(やか)', romaji: 'ken', sinhala: 'සෞඛ්‍ය සම්පන්න', exampleJp: '{健康|けんこう}{診断|しんだん}を{受|う}ける', exampleRomaji: 'Kenkō shindan o ukeru', exampleSinhala: 'වෛද්‍ය පරීක්ෂණයට භාජනය වේ'},
  {id: 'k-70', kanji: '熱', partNumber: 5, onyomi: 'ネツ', kunyomi: 'あつ(い)', romaji: 'netsu / atsui', sinhala: 'තාපය / උණුසුම', exampleJp: '{熱中症|ねっちゅうしょう}の{予防|よぼう}と{塩分|えんぶん}', exampleRomaji: 'Netchūshō no yobō to enbun', exampleSinhala: 'තාප ආඝාතය වැළැක්වීම හා ලුණු/ජලය'},
  {id: 'k-71', kanji: '転', partNumber: 5, onyomi: 'テン', kunyomi: 'ころ(ぶ)', romaji: 'ten / korobu', sinhala: 'පෙරළීම / ඇද වැටීම', exampleJp: '{転倒|てんとう}{災害|さいがい}を{防|ふせ}ぐ', exampleRomaji: 'Tentō saigai o fusegu', exampleSinhala: 'ලිස්සා ඇද වැටීම් අනතුරු වළක්වයි'},
  {id: 'k-72', kanji: '落', partNumber: 5, onyomi: 'ラク', kunyomi: 'お(ちる)', romaji: 'raku / ochiru', sinhala: 'වැටීම (උසින්)', exampleJp: '{墜落|ついらく}・{転落|てんらく}の{防止|ぼうし}', exampleRomaji: 'Tsuiraku / tenraku no bōshi', exampleSinhala: 'උසින් ඇද වැටීම් වැළැක්වීම'},
  {id: 'k-73', kanji: '指', partNumber: 5, onyomi: 'シ', kunyomi: 'ゆび・さ(す)', romaji: 'shi / yubi / sasu', sinhala: 'ඇඟිල්ල / පෙන්වීම', exampleJp: '{指差|しさ}し{呼称|こしょう}でミス{削減|さくげん}', exampleRomaji: 'Shisa koshō de misu sakugen', exampleSinhala: 'ඇඟිල්ල දිගුකර හඬ නඟා පවසා වැරදි අඩුකිරීම'},
  {id: 'k-74', kanji: '整', partNumber: 5, onyomi: 'セイ', kunyomi: 'ととの(える)', romaji: 'sei / totonoeru', sinhala: 'පිළිවෙළ කිරීම', exampleJp: '{整理|せいり}・{整頓|せいとん}・{清潔|せいけつ}', exampleRomaji: 'Seiri / seiton / seiketsu', exampleSinhala: 'වෙන්කිරීම, පිළිවෙළ සහ පිරිසිදු පැවැත්ම (5S)'},
  {id: 'k-75', kanji: '毒', partNumber: 5, onyomi: 'ドク', kunyomi: '—', romaji: 'doku', sinhala: 'විෂ', exampleJp: '{急性|きゅうせい}{毒性|どくせい}（ドクロマーク）', exampleRomaji: 'Kyūsei dokusei (dokuro māku)', exampleSinhala: 'තියුණු විෂ ද්‍රව්‍ය (හිස්කබල ලකුණ)'},
  {id: 'k-76', kanji: '燃', partNumber: 5, onyomi: 'ネン', kunyomi: 'も(える)', romaji: 'nen / moeru', sinhala: 'දැවීම / ගිනිගැනීම', exampleJp: '{可燃性|かねんせい}・{引火性|いんかせい}の{炎|ほのお}', exampleRomaji: 'Kanensei / inkasei no honō', exampleSinhala: 'දැවෙනසුලු / ගිනිගන්නාසුලු'},
  {id: 'k-77', kanji: '環', partNumber: 5, onyomi: 'カン', kunyomi: '—', romaji: 'kan', sinhala: 'පරිසරය / වළල්ල', exampleJp: '{水性|すいせい}{環境|かんきょう}{有害性|ゆうがいせい}', exampleRomaji: 'Suisei kankyō yūgaisei', exampleSinhala: 'ජලජ පරිසරයට හානිකර'},
  {id: 'k-78', kanji: '点', partNumber: 6, onyomi: 'テン', kunyomi: '—', romaji: 'ten', sinhala: 'ලක්ෂ්‍යය / පරීක්ෂාව', exampleJp: '{始業前|しぎょうまえ}{点検|てんけん}を{毎日|まいにち}{行|おこな}う', exampleRomaji: 'Shigyōmae tenken o mainichi okonau', exampleSinhala: 'වැඩ ආරම්භයට පෙර දිනපතා පරීක්ෂාව'},
  {id: 'k-79', kanji: '走', partNumber: 6, onyomi: 'ソウ', kunyomi: 'はし(る)', romaji: 'sō / hashiru', sinhala: 'ධාවනය / දිවීම', exampleJp: '{走行|そうこう}{時|じ}の{制限|せいげん}{速度|そくど}8km/h', exampleRomaji: 'Sōkō-ji no seigen sokudo 8km/h', exampleSinhala: 'ධාවනයේදී වේග සීමාව පැ.කි.මී 8'},
  {id: 'k-80', kanji: '後', partNumber: 6, onyomi: 'ゴ・コウ', kunyomi: 'うし(ろ)・あと', romaji: 'go / ushiro', sinhala: 'පසුපස / පසුව', exampleJp: 'リーチ型は{原則|げんそく}{後進|こうしん}する', exampleRomaji: 'Rīchi-gata wa gensoku kōshin suru', exampleSinhala: 'Reach වර්ගය සාමාන්‍යයෙන් පසුපසට යයි'},
  {id: 'k-81', kanji: '速', partNumber: 6, onyomi: 'ソク', kunyomi: 'はや(い)', romaji: 'soku / hayai', sinhala: 'වේගය', exampleJp: '{減速|げんそく}して{徐行|じょこう}する', exampleRomaji: 'Gensoku shite jokō suru', exampleSinhala: 'වේගය අඩු කර සෙමින් ගමන් කරයි'},
  {id: 'k-82', kanji: '急', partNumber: 6, onyomi: 'キュウ', kunyomi: 'いそ(ぐ)', romaji: 'kyū / isogu', sinhala: 'හදිසි / ක්ෂණික', exampleJp: '{急発進|きゅうはっしん}・{急|きゅう}ブレーキ{禁止|きんし}', exampleRomaji: 'Kyūhasshin / kyū-burēki kinshi', exampleSinhala: 'එක්වර පණගැන්වීම හා හදිසි තිරිංග තහනම්'},
  {id: 'k-83', kanji: '駐', partNumber: 6, onyomi: 'チュウ', kunyomi: '—', romaji: 'chū', sinhala: 'නවතා තැබීම (Parking)', exampleJp: '{駐車|ちゅうしゃ}の5{原則|げんそく}を{守|まも}る', exampleRomaji: 'Chūsha no go-gensoku o mamoru', exampleSinhala: 'නවතා තැබීමේ මූලධර්ම 5 පිළිපදී'},
  {id: 'k-84', kanji: '坂', partNumber: 6, onyomi: 'ハン', kunyomi: 'さか', romaji: 'saka', sinhala: 'බෑවුම / කන්ද', exampleJp: '{坂道|さかみち}は{垂直|すいちょく}に{上|のぼ}り{下|くだ}り', exampleRomaji: 'Sakamichi wa suichoku ni nobori-kudari', exampleSinhala: 'බෑවුම්වල සෘජුවම ඉහළ-පහළ යාම'},
];
