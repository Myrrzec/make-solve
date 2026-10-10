/**
 * Names of the OLL shapes as the Kubik TV video «57 OLL формул с объяснениями»
 * calls them (youtube.com/watch?v=hIVfbIvBUt8). Each entry keeps the formula
 * as it is described in the video; tests map it onto the sheet numbering, so
 * a name can never be attached to the wrong case silently.
 */
export interface OllName {
  group: string;
  name: string;
  /** The formula as shown in the video. */
  alg: string;
  /** Second in the video where the formula is shown. */
  at: number;
}

export const OLL_NAMES: OllName[] = [
  { group: 'Т-шки', name: 'Т-шка с точкой', alg: "F R U R' U' F'", at: 90 },
  { group: 'Т-шки', name: 'Т-шка через фронт', alg: "R U R' U' R' F R F'", at: 105 },
  { group: 'Крестовые', name: 'рыбка', alg: "R U R' U R U2 R'", at: 124 },
  { group: 'Крестовые', name: 'антирыбка', alg: "R U2 R' U' R U' R'", at: 146 },
  { group: 'Крестовые', name: 'вертолёт (глаза плюс уши)', alg: "R U2 R' U' R U R' U' R U' R'", at: 173 },
  { group: 'Крестовые', name: 'глаза', alg: "R2 D R' U2 R D' R' U2 R'", at: 203 },
  { group: 'Крестовые', name: 'двойные глаза', alg: "R U2 R2 U' R2 U' R2 U2 R", at: 239 },
  { group: 'Крестовые', name: 'уши', alg: "r U R' U' r' F R F'", at: 263 },
  { group: 'Крестовые', name: 'восьмёрка', alg: "F' r U R' U' r' F R", at: 289 },
  { group: 'Угловые', name: 'буква Н', alg: "R U R' U' M' U R U' r'", at: 319 },
  { group: 'Угловые', name: 'змей', alg: "r U R' U' r' R U R U' R'", at: 343 },
  { group: 'Угловые', name: 'снежинка', alg: "M U R U R' U' M2 U R U' r'", at: 373 },
  { group: 'Точечные', name: 'точка в коридоре', alg: "R U2 R2 F R F' U2 R' F R F'", at: 409 },
  { group: 'Точечные', name: 'точка с блоком', alg: "F R U R' U' F' f R U R' U' f'", at: 440 },
  { group: 'Точечные', name: 'стрелка', alg: "f R U R' U' f' U F R U R' U' F'", at: 466 },
  { group: 'Точечные', name: 'стрелка вторая', alg: "f R U R' U' f' U' F R U R' U' F'", at: 492 },
  { group: 'Точечные', name: 'Микки Маус с бородой', alg: "R U2 R2 F R F' U2 M' U R U' r'", at: 518 },
  { group: 'Точечные', name: 'Микки Маус с бакенбардами', alg: "M U R U R' U' M' R' F R F'", at: 561 },
  { group: 'Точечные', name: 'диагональ', alg: "R U R' U R' F R F' U2 R' F R F'", at: 589 },
  { group: 'Палки', name: 'палка', alg: "F U R U' R' U R U' R' F'", at: 619 },
  { group: 'Палки', name: 'палка в коридоре', alg: "R U2 R2 U' R U' R' U2 F R F'", at: 638 },
  { group: 'Палки', name: 'палка с двойными глазами', alg: "r U r' U R U' R' U R U' R' r U' r'", at: 669 },
  { group: 'Палки', name: 'палка глаза уши', alg: "R' F' U' F U' R U R' U R", at: 705 },
  { group: 'Г-шки', name: 'буква Г', alg: "r U r' R U R' U' r U' r'", at: 738 },
  { group: 'Г-шки', name: 'крышка', alg: "r' U' r R' U' R U r' U r", at: 769 },
  { group: 'Г-шки', name: 'гошка', alg: "F U R U' R2 F' R U R U' R'", at: 800 },
  { group: 'Г-шки', name: 'гошка вторая', alg: "R' F R U R' F' R F U' F'", at: 830 },
  { group: 'Скобки', name: 'скобка с блоком', alg: "R' U' R' F R F' U R", at: 863 },
  { group: 'Скобки', name: 'скобка без блоков', alg: "F R U R' U' R' F' r U R U' r'", at: 889 },
  { group: 'Пропеллеры', name: 'пропеллер', alg: "R' F R U R' U' F' U R", at: 920 },
  { group: 'Пропеллеры', name: 'пропеллер второй', alg: "R U R' F' U' F U R U2 R'", at: 940 },
  { group: 'Квадраты', name: 'передний квадрат', alg: "r U2 R' U' R U' r'", at: 968 },
  { group: 'Квадраты', name: 'задний квадрат', alg: "r' U2 R U R' U r", at: 991 },
  { group: 'Галстуки', name: 'галстук с блоками', alg: "F R U' R' U' R U R' F'", at: 1015 },
  { group: 'Галстуки', name: 'галстук без блоков', alg: "R U2 R2 F R F' R U2 R'", at: 1045 },
  { group: 'М-ки', name: 'М-ка с блоком', alg: "R U R' U R U' R' U' R' F R F'", at: 1087 },
  { group: 'М-ки', name: 'М-ка, блок спереди', alg: "L' U' L U' L' U L U L F' L' F", at: 1113 },
  { group: 'Игрики', name: 'игрек', alg: "R U R' U' R' F R2 U R' U' F'", at: 1145 },
  { group: 'Игрики', name: 'игрек второй', alg: "R U R' U R' F R F' R U2 R'", at: 1175 },
  { group: 'Молнии', name: 'молния с блоком', alg: "r U R' U R U2 r'", at: 1203 },
  { group: 'Молнии', name: 'молния, блок сбоку', alg: "R U2 R' U2 R' F R F'", at: 1229 },
  { group: 'Молнии', name: 'молния без блоков', alg: "F R U R' U' F' U F R U R' U' F'", at: 1253 },
  { group: 'Молнии', name: 'молния через фронт', alg: "r U R' U R' F R F' R U2 r'", at: 1283 },
  { group: 'Ь знак', name: 'мягкий знак', alg: "F U R U' R' F'", at: 1317 },
  { group: 'Ь знак', name: 'мягкий знак второй', alg: "R' U' F U R U' R' F' R", at: 1335 },
  { group: 'Ь знак', name: 'мягкий знак третий', alg: "R' U' F' U F R", at: 1357 },
  { group: 'Ь знак', name: 'мягкий знак четвёртый', alg: "R U B' U' R' U R B R'", at: 1381 },
  { group: 'Петухи', name: 'петух', alg: "R U R' U R U2 R' F R U R' U' F'", at: 1415 },
  { group: 'Петухи', name: 'петух с изменённой рыбкой', alg: "R' U' R U' R' U2 R F R U R' U' F'", at: 1438 },
  { group: 'Петухи', name: 'петух с пиф-пафом', alg: "R U R' U' R U' R' F' U' F R U R'", at: 1467 },
  { group: 'Петухи', name: 'петух с блоком', alg: "F R' F R2 U' R' U' R U R' F2", at: 1490 },
  { group: 'Стелсы', name: 'стелс', alg: "F R U R' U' R U R' U' F'", at: 1531 },
  { group: 'Стелсы', name: 'стелс с мягким знаком', alg: "F U R U' R' F' R U R' U R U2 R'", at: 1553 },
  { group: 'Стелсы', name: 'стелс тройка и двойка', alg: "r U' r2 U r2 U r2 U' r", at: 1577 },
  { group: 'Стелсы', name: 'стелс двойка и тройка', alg: "r' U r2 U' r2 U' r2 U r'", at: 1609 },
  { group: 'Стелсы', name: 'стелс тройка и один', alg: "r U R' U R U' R' U R U2 r'", at: 1649 },
  { group: 'Стелсы', name: 'стелс последний', alg: "r' U' R U' R' U R U' R' U2 r", at: 1683 },
];
