export type Box = {
  id: string;
  floor: 1 | 2;
  position: { x: number; y: number }; // center, in image pixels
  width: number;
  height: number;
  fontSize: number;
  rotation: number;
  text: string;
  highlightColor: string | null;
};

export const IMG_W = 1536;
export const IMG_H = 1024;
export const FLOORS = {
  1: { x0: 768, w: 768 },
  2: { x0: 0, w: 768 },
} as const;

export function duplicateBox(source: Box, id: string): Box {
  return {
    ...source,
    id,
    position: { ...source.position },
  };
}

// [text, x, y, rotation]
const F1: [string, number, number, number][] = [
  ["בורגר ראנץ'", 495, 384, 0], ["מיני", 542, 380, 0], ["ריבר", 461, 432, 0], ["בובע", 609, 432, 0],
  ["פאדל בורגר", 615, 463, 0], ["תירס", 504, 463, 0], ["פיקנטי", 614, 498, 0], ["דיאנה בעיר", 465, 541, 0],
  ["בורגר קינג", 599, 534, 0], ["פיצה סנטור", 538, 566, 0], ["זגא", 582, 557, 0], ["בילבונג", 389, 503, 0],
  ["מנגו", 405, 578, 0], ["אלדו", 398, 660, 0], ["קיקו מילאנו", 398, 693, 0], ["מגה ספורט", 400, 718, 0],
  ["רוברטו", 426, 750, 0], ["ז'קי מקיאג'", 384, 798, 0], ["עונות מאמא", 392, 828, 0], ["אוריגינלס", 400, 852, 0],
  ["פולגת", 400, 876, 0], ["אינטימי", 404, 899, 0], ["נורת' פייס", 410, 924, 0], ["אמריקן איגל", 405, 971, 0],
  ["פוט לוקר", 405, 1036, 0], ["רובי רי", 268, 589, 0], ["טופ טן", 262, 631, 0], ["הודיס", 257, 684, 0],
  ["סטימצקי", 252, 719, 0], ["אדידס", 258, 768, 0], ["טוונטי פור סבן", 244, 914, 0], ["יוליה", 243, 977, 0],
  ["ברשקה", 245, 1036, 0], ["תמרה", 325, 620, 0], ["עולם הממתקים", 326, 676, 0], ["עמדת שירות", 326, 418, 0],
  ["פוקס הום", 142, 568, -25], ["מחסני חשמל", 117, 452, -25], ["רודלר", 233, 295, -60], ["פרטנר", 126, 233, -60],
  ["סקאלה", 148, 172, -60], ["לגו", 128, 300, -60], ["חולצת", 92, 293, -60], ["מאק", 263, 222, -60],
  ["פפילה", 241, 211, -60], ["גטפלון", 290, 238, -60], ["לחמים", 699, 134, -25], ["צ'ינג' צ'יינג'", 765, 135, -25],
  ["שוגיז", 590, 200, -25], ["מנגוליה", 625, 182, -25], ["ריאלטו", 441, 337, -25], ["סאקסוס", 377, 463, 0],
];
const F2: [string, number, number, number][] = [
  ["אופטיקה לוזון", 1192, 175, 0], ["אייץ' אנד אם", 1025, 207, 0], ["אייץ' אנד אם הום", 987, 427, 0],
  ["וינטאג' אוריג'נאלס", 1198, 368, 0], ["גינג'י", 1135, 420, 0], ["איסרפ", 1251, 428, 0], ["מיינסטרים", 1259, 456, 0],
  ["סבון של פעם", 1261, 480, 0], ["קייוי", 1276, 505, 0], ["פיקס", 1284, 532, 0], ["אי דיגיטל", 1277, 564, 0],
  ["פרופיל", 1275, 603, 0], ["ליווייס", 1272, 638, 0], ["פמינה", 1277, 680, 0], ["טאוס", 1280, 722, 0],
  ["סטרדיוס", 1293, 826, 0], ["פליינג טייגר", 1124, 826, 0], ["דנון", 1197, 837, 0], ["זארה", 1188, 994, 0],
  ["באת' אנד בודי", 1110, 569, 0], ["זארה טרוויז", 1103, 680, 0], ["נייק", 1066, 532, 0], ["פסטה בסטה", 1410, 364, 0],
  ["חייט", 1460, 356, 0], ["קפה קפה", 1470, 386, 0], ["קפה לנדוור", 1331, 386, 0], ["מקדונלדס", 1472, 416, 0],
  ["גו נודלס", 1364, 440, 0], ["בורגר בר", 1492, 456, 0], ["דלמונה", 1324, 503, 0], ["גאסק ביף", 1476, 501, 0],
  ["ניו דלי", 1424, 521, 0], ["מר גריל", 1368, 531, 0], ["דקטלון", 1257, 144, 0], ["לוק איט", 1650, 50, 0],
  ["סוויט טיים", 1409, 280, -60], ["טמברלנד", 1446, 280, -60], ["סטמוטולוג", 1293, 186, -60],
];

// Hand-aligned placements for the user's text-free, two-level mall map.
// Floor 2 is on the left; Floor 1 is on the right. Image pixels are 1536x1024.
// These are editable suggestions, not a verified architectural store directory.
export function seedBoxes(): Box[] {
  return [
  { id: "f1-0", floor: 1, position: { x: 1202, y: 417 }, width: 58, height: 18, fontSize: 11, rotation: 0, text: "בורגר ראנץ'", highlightColor: null },
  { id: "f1-1", floor: 1, position: { x: 1271, y: 385 }, width: 35, height: 18, fontSize: 11, rotation: 0, text: "מיני", highlightColor: null },
  { id: "f1-2", floor: 1, position: { x: 1208, y: 444 }, width: 35, height: 18, fontSize: 10, rotation: -50, text: "ריבר", highlightColor: null },
  { id: "f1-3", floor: 1, position: { x: 1347, y: 405 }, width: 37, height: 18, fontSize: 11, rotation: 0, text: "בובע", highlightColor: null },
  { id: "f1-4", floor: 1, position: { x: 1363, y: 449 }, width: 57, height: 18, fontSize: 10, rotation: -65, text: "פאדל בורגר", highlightColor: null },
  { id: "f1-5", floor: 1, position: { x: 1234, y: 385 }, width: 35, height: 18, fontSize: 10, rotation: 0, text: "תירס", highlightColor: null },
  { id: "f1-6", floor: 1, position: { x: 1336, y: 514 }, width: 47, height: 18, fontSize: 10, rotation: -50, text: "פיקנטי", highlightColor: null },
  { id: "f1-7", floor: 1, position: { x: 1228, y: 513 }, width: 64, height: 16, fontSize: 9, rotation: -45, text: "דיאנה בעיר", highlightColor: null },
  { id: "f1-8", floor: 1, position: { x: 1324, y: 479 }, width: 64, height: 18, fontSize: 10, rotation: -58, text: "בורגר קינג", highlightColor: null },
  { id: "f1-9", floor: 1, position: { x: 1257, y: 546 }, width: 58, height: 16, fontSize: 9, rotation: 0, text: "פיצה סנטור", highlightColor: null },
  { id: "f1-10", floor: 1, position: { x: 1280, y: 512 }, width: 29, height: 18, fontSize: 10, rotation: 0, text: "זגא", highlightColor: null },
  { id: "f1-11", floor: 1, position: { x: 1136, y: 467 }, width: 53, height: 18, fontSize: 10, rotation: 0, text: "בילבונג", highlightColor: null },
  { id: "f1-12", floor: 1, position: { x: 1154, y: 546 }, width: 37, height: 18, fontSize: 11, rotation: 0, text: "מנגו", highlightColor: null },
  { id: "f1-13", floor: 1, position: { x: 1152, y: 626 }, width: 35, height: 18, fontSize: 10, rotation: 0, text: "אלדו", highlightColor: null },
  { id: "f1-14", floor: 1, position: { x: 1152, y: 658 }, width: 71, height: 16, fontSize: 9, rotation: 0, text: "קיקו מילאנו", highlightColor: null },
  { id: "f1-15", floor: 1, position: { x: 1152, y: 685 }, width: 60, height: 16, fontSize: 9, rotation: 0, text: "מגה ספורט", highlightColor: null },
  { id: "f1-16", floor: 1, position: { x: 1177, y: 716 }, width: 43, height: 16, fontSize: 9, rotation: 0, text: "רוברטו", highlightColor: null },
  { id: "f1-17", floor: 1, position: { x: 1155, y: 759 }, width: 70, height: 16, fontSize: 9, rotation: 0, text: "ז'קי מקיאג'", highlightColor: null },
  { id: "f1-18", floor: 1, position: { x: 1157, y: 782 }, width: 66, height: 16, fontSize: 9, rotation: 0, text: "עונות מאמא", highlightColor: null },
  { id: "f1-19", floor: 1, position: { x: 1152, y: 808 }, width: 60, height: 16, fontSize: 9, rotation: 0, text: "אוריגינלס", highlightColor: null },
  { id: "f1-20", floor: 1, position: { x: 1151, y: 832 }, width: 38, height: 16, fontSize: 9, rotation: 0, text: "פולגת", highlightColor: null },
  { id: "f1-21", floor: 1, position: { x: 1153, y: 857 }, width: 49, height: 16, fontSize: 9, rotation: 0, text: "אינטימי", highlightColor: null },
  { id: "f1-22", floor: 1, position: { x: 1153, y: 886 }, width: 66, height: 16, fontSize: 9, rotation: 0, text: "נורת' פייס", highlightColor: null },
  { id: "f1-23", floor: 1, position: { x: 1155, y: 915 }, width: 71, height: 16, fontSize: 9, rotation: 0, text: "אמריקן איגל", highlightColor: null },
  { id: "f1-24", floor: 1, position: { x: 1154, y: 972 }, width: 60, height: 18, fontSize: 10, rotation: 0, text: "פוט לוקר", highlightColor: null },
  { id: "f1-25", floor: 1, position: { x: 1015, y: 577 }, width: 49, height: 16, fontSize: 9, rotation: 0, text: "רובי רי", highlightColor: null },
  { id: "f1-26", floor: 1, position: { x: 1012, y: 611 }, width: 47, height: 18, fontSize: 10, rotation: 0, text: "טופ טן", highlightColor: null },
  { id: "f1-27", floor: 1, position: { x: 1013, y: 651 }, width: 41, height: 18, fontSize: 10, rotation: 0, text: "הודיס", highlightColor: null },
  { id: "f1-28", floor: 1, position: { x: 1013, y: 677 }, width: 53, height: 18, fontSize: 10, rotation: 0, text: "סטימצקי", highlightColor: null },
  { id: "f1-29", floor: 1, position: { x: 1000, y: 715 }, width: 41, height: 18, fontSize: 10, rotation: 0, text: "אדידס", highlightColor: null },
  { id: "f1-30", floor: 1, position: { x: 1010, y: 875 }, width: 73, height: 16, fontSize: 9, rotation: 0, text: "טוונטי פור סבן", highlightColor: null },
  { id: "f1-31", floor: 1, position: { x: 1013, y: 929 }, width: 41, height: 18, fontSize: 10, rotation: 0, text: "יוליה", highlightColor: null },
  { id: "f1-32", floor: 1, position: { x: 1010, y: 972 }, width: 41, height: 18, fontSize: 10, rotation: 0, text: "ברשקה", highlightColor: null },
  { id: "f1-33", floor: 1, position: { x: 1082, y: 590 }, width: 32, height: 16, fontSize: 9, rotation: -90, text: "תמרה", highlightColor: null },
  { id: "f1-34", floor: 1, position: { x: 1080, y: 658 }, width: 62, height: 16, fontSize: 8, rotation: -90, text: "עולם הממתקים", highlightColor: null },
  { id: "f1-35", floor: 1, position: { x: 1081, y: 445 }, width: 66, height: 16, fontSize: 9, rotation: -90, text: "עמדת שירות", highlightColor: null },
  { id: "f1-36", floor: 1, position: { x: 903, y: 540 }, width: 70, height: 18, fontSize: 12, rotation: -28, text: "פוקס הום", highlightColor: null },
  { id: "f1-37", floor: 1, position: { x: 874, y: 471 }, width: 78, height: 18, fontSize: 11, rotation: -28, text: "מחסני חשמל", highlightColor: null },
  { id: "f1-38", floor: 1, position: { x: 930, y: 220 }, width: 38, height: 16, fontSize: 9, rotation: -58, text: "רודלר", highlightColor: null },
  { id: "f1-39", floor: 1, position: { x: 853, y: 176 }, width: 41, height: 18, fontSize: 10, rotation: -60, text: "פרטנר", highlightColor: null },
  { id: "f1-40", floor: 1, position: { x: 884, y: 194 }, width: 41, height: 18, fontSize: 10, rotation: -60, text: "סקאלה", highlightColor: null },
  { id: "f1-41", floor: 1, position: { x: 863, y: 316 }, width: 29, height: 18, fontSize: 10, rotation: -60, text: "לגו", highlightColor: null },
  { id: "f1-42", floor: 1, position: { x: 918, y: 325 }, width: 41, height: 18, fontSize: 10, rotation: -60, text: "חולצת", highlightColor: null },
  { id: "f1-43", floor: 1, position: { x: 1015, y: 274 }, width: 29, height: 18, fontSize: 10, rotation: -60, text: "מאק", highlightColor: null },
  { id: "f1-44", floor: 1, position: { x: 992, y: 266 }, width: 41, height: 18, fontSize: 10, rotation: -60, text: "פפילה", highlightColor: null },
  { id: "f1-45", floor: 1, position: { x: 1039, y: 290 }, width: 47, height: 18, fontSize: 10, rotation: -60, text: "גטפלון", highlightColor: null },
  { id: "f1-46", floor: 1, position: { x: 1445, y: 117 }, width: 41, height: 18, fontSize: 10, rotation: -34, text: "לחמים", highlightColor: null },
  { id: "f1-47", floor: 1, position: { x: 1488, y: 240 }, width: 63, height: 16, fontSize: 9, rotation: -35, text: "צ'ינג' צ'יינג'", highlightColor: null },
  { id: "f1-48", floor: 1, position: { x: 1332, y: 170 }, width: 41, height: 18, fontSize: 10, rotation: -60, text: "שוגיז", highlightColor: null },
  { id: "f1-49", floor: 1, position: { x: 1379, y: 157 }, width: 49, height: 16, fontSize: 9, rotation: -60, text: "מנגוליה", highlightColor: null },
  { id: "f1-50", floor: 1, position: { x: 1187, y: 336 }, width: 47, height: 18, fontSize: 10, rotation: -32, text: "ריאלטו", highlightColor: null },
  { id: "f1-51", floor: 1, position: { x: 1120, y: 432 }, width: 43, height: 16, fontSize: 9, rotation: -90, text: "סאקסוס", highlightColor: null },
  { id: "f2-0", floor: 2, position: { x: 324, y: 234 }, width: 72, height: 18, fontSize: 10, rotation: -87, text: "אופטיקה לוזון", highlightColor: null },
  { id: "f2-1", floor: 2, position: { x: 172, y: 264 }, width: 99, height: 18, fontSize: 12, rotation: 0, text: "אייץ' אנד אם", highlightColor: null },
  { id: "f2-2", floor: 2, position: { x: 145, y: 448 }, width: 117, height: 18, fontSize: 11, rotation: 0, text: "אייץ' אנד אם הום", highlightColor: null },
  { id: "f2-3", floor: 2, position: { x: 448, y: 371 }, width: 70, height: 16, fontSize: 9, rotation: -60, text: "וינטאג' אוריג'נאלס", highlightColor: null },
  { id: "f2-4", floor: 2, position: { x: 315, y: 422 }, width: 43, height: 16, fontSize: 9, rotation: 0, text: "גינג'י", highlightColor: null },
  { id: "f2-5", floor: 2, position: { x: 366, y: 461 }, width: 38, height: 16, fontSize: 9, rotation: 0, text: "איסרפ", highlightColor: null },
  { id: "f2-6", floor: 2, position: { x: 366, y: 486 }, width: 60, height: 16, fontSize: 9, rotation: 0, text: "מיינסטרים", highlightColor: null },
  { id: "f2-7", floor: 2, position: { x: 365, y: 510 }, width: 71, height: 16, fontSize: 9, rotation: 0, text: "סבון של פעם", highlightColor: null },
  { id: "f2-8", floor: 2, position: { x: 370, y: 527 }, width: 41, height: 18, fontSize: 10, rotation: 0, text: "קייוי", highlightColor: null },
  { id: "f2-9", floor: 2, position: { x: 370, y: 554 }, width: 35, height: 18, fontSize: 10, rotation: 0, text: "פיקס", highlightColor: null },
  { id: "f2-10", floor: 2, position: { x: 374, y: 576 }, width: 60, height: 16, fontSize: 9, rotation: 0, text: "אי דיגיטל", highlightColor: null },
  { id: "f2-11", floor: 2, position: { x: 378, y: 606 }, width: 47, height: 18, fontSize: 10, rotation: 0, text: "פרופיל", highlightColor: null },
  { id: "f2-12", floor: 2, position: { x: 380, y: 639 }, width: 53, height: 18, fontSize: 10, rotation: 0, text: "ליווייס", highlightColor: null },
  { id: "f2-13", floor: 2, position: { x: 380, y: 665 }, width: 41, height: 18, fontSize: 10, rotation: 0, text: "פמינה", highlightColor: null },
  { id: "f2-14", floor: 2, position: { x: 390, y: 692 }, width: 35, height: 18, fontSize: 10, rotation: 0, text: "טאוס", highlightColor: null },
  { id: "f2-15", floor: 2, position: { x: 385, y: 787 }, width: 58, height: 18, fontSize: 11, rotation: 0, text: "סטרדיוס", highlightColor: null },
  { id: "f2-16", floor: 2, position: { x: 245, y: 789 }, width: 60, height: 16, fontSize: 9, rotation: 0, text: "פליינג טייגר", highlightColor: null },
  { id: "f2-17", floor: 2, position: { x: 316, y: 784 }, width: 32, height: 16, fontSize: 9, rotation: 0, text: "דנון", highlightColor: null },
  { id: "f2-18", floor: 2, position: { x: 309, y: 936 }, width: 40, height: 18, fontSize: 12, rotation: 0, text: "זארה", highlightColor: null },
  { id: "f2-19", floor: 2, position: { x: 235, y: 572 }, width: 65, height: 16, fontSize: 9, rotation: 0, text: "באת' אנד בודי", highlightColor: null },
  { id: "f2-20", floor: 2, position: { x: 237, y: 666 }, width: 78, height: 18, fontSize: 10, rotation: 0, text: "זארה טרוויז", highlightColor: null },
  { id: "f2-21", floor: 2, position: { x: 157, y: 533 }, width: 40, height: 18, fontSize: 12, rotation: -26, text: "נייק", highlightColor: null },
  { id: "f2-22", floor: 2, position: { x: 477, y: 390 }, width: 62, height: 18, fontSize: 10, rotation: 0, text: "פסטה בסטה", highlightColor: null },
  { id: "f2-23", floor: 2, position: { x: 538, y: 388 }, width: 35, height: 18, fontSize: 10, rotation: 0, text: "חייט", highlightColor: null },
  { id: "f2-24", floor: 2, position: { x: 535, y: 413 }, width: 49, height: 18, fontSize: 10, rotation: 0, text: "קפה קפה", highlightColor: null },
  { id: "f2-25", floor: 2, position: { x: 412, y: 433 }, width: 56, height: 16, fontSize: 9, rotation: -70, text: "קפה לנדוור", highlightColor: null },
  { id: "f2-26", floor: 2, position: { x: 556, y: 451 }, width: 55, height: 16, fontSize: 9, rotation: 0, text: "מקדונלדס", highlightColor: null },
  { id: "f2-27", floor: 2, position: { x: 465, y: 467 }, width: 53, height: 16, fontSize: 9, rotation: -88, text: "גו נודלס", highlightColor: null },
  { id: "f2-28", floor: 2, position: { x: 556, y: 497 }, width: 53, height: 16, fontSize: 9, rotation: -55, text: "בורגר בר", highlightColor: null },
  { id: "f2-29", floor: 2, position: { x: 420, y: 515 }, width: 43, height: 16, fontSize: 9, rotation: -50, text: "דלמונה", highlightColor: null },
  { id: "f2-30", floor: 2, position: { x: 552, y: 547 }, width: 55, height: 16, fontSize: 9, rotation: -50, text: "גאסק ביף", highlightColor: null },
  { id: "f2-31", floor: 2, position: { x: 491, y: 540 }, width: 49, height: 16, fontSize: 9, rotation: 0, text: "ניו דלי", highlightColor: null },
  { id: "f2-32", floor: 2, position: { x: 449, y: 556 }, width: 49, height: 16, fontSize: 9, rotation: -50, text: "מר גריל", highlightColor: null },
  { id: "f2-33", floor: 2, position: { x: 624, y: 133 }, width: 47, height: 18, fontSize: 10, rotation: 0, text: "דקטלון", highlightColor: null },
  { id: "f2-34", floor: 2, position: { x: 699, y: 145 }, width: 57, height: 18, fontSize: 11, rotation: 0, text: "לוק איט", highlightColor: null },
  { id: "f2-35", floor: 2, position: { x: 483, y: 306 }, width: 65, height: 16, fontSize: 9, rotation: -52, text: "סוויט טיים", highlightColor: null },
  { id: "f2-36", floor: 2, position: { x: 537, y: 317 }, width: 49, height: 16, fontSize: 9, rotation: -51, text: "טמברלנד", highlightColor: null },
  { id: "f2-37", floor: 2, position: { x: 395, y: 254 }, width: 60, height: 16, fontSize: 9, rotation: -60, text: "סטמוטולוג", highlightColor: null },
  ].map((box) => ({ ...box, fontSize: Math.round(box.fontSize * 1.15 * 10) / 10 }));
}
