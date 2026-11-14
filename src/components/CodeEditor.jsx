import React from 'react';

const CODE_LINES = [
  { num: 1, text: 'import pygame', tokens: [{ t: 'keyword', v: 'import' }, { t: 'plain', v: ' pygame' }] },
  { num: 2, text: 'import cv2', tokens: [{ t: 'keyword', v: 'import' }, { t: 'plain', v: ' cv2' }] },
  { num: 3, text: 'import numpy as np', tokens: [{ t: 'keyword', v: 'import' }, { t: 'plain', v: ' numpy ' }, { t: 'keyword', v: 'as' }, { t: 'plain', v: ' np' }] },
  { num: 4, text: 'import random', tokens: [{ t: 'keyword', v: 'import' }, { t: 'plain', v: ' random' }] },
  { num: 5, text: 'import math', tokens: [{ t: 'keyword', v: 'import' }, { t: 'plain', v: ' math' }] },
  { num: 6, text: '', tokens: [] },
  { num: 7, text: 'pygame.init()', tokens: [{ t: 'plain', v: 'pygame.' }, { t: 'func', v: 'init' }, { t: 'plain', v: '()' }] },
  { num: 8, text: 'W, H = 700, 800', tokens: [{ t: 'var', v: 'W' }, { t: 'plain', v: ', ' }, { t: 'var', v: 'H' }, { t: 'plain', v: ' = ' }, { t: 'num', v: '700' }, { t: 'plain', v: ', ' }, { t: 'num', v: '800' }] },
  { num: 9, text: 'screen = pygame.display.set_mode((W, H))', tokens: [{ t: 'var', v: 'screen' }, { t: 'plain', v: ' = pygame.display.' }, { t: 'func', v: 'set_mode' }, { t: 'plain', v: '((W, H))' }] },
  { num: 10, text: 'pygame.display.set_caption("coded by adri | Love in Code")', tokens: [{ t: 'plain', v: 'pygame.display.' }, { t: 'func', v: 'set_caption' }, { t: 'plain', v: '(' }, { t: 'str', v: '"coded by adri | Love in Code"' }, { t: 'plain', v: ')' }] },
  { num: 11, text: 'clock = pygame.time.Clock()', tokens: [{ t: 'var', v: 'clock' }, { t: 'plain', v: ' = pygame.time.' }, { t: 'func', v: 'Clock' }, { t: 'plain', v: '()' }] },
  { num: 12, text: '', tokens: [] },
  { num: 13, text: 'BG = (8, 5, 15)', tokens: [{ t: 'const', v: 'BG' }, { t: 'plain', v: ' = (' }, { t: 'num', v: '8' }, { t: 'plain', v: ', ' }, { t: 'num', v: '5' }, { t: 'plain', v: ', ' }, { t: 'num', v: '15' }, { t: 'plain', v: ')' }] },
  { num: 14, text: 'FPS = 60', tokens: [{ t: 'const', v: 'FPS' }, { t: 'plain', v: ' = ' }, { t: 'num', v: '60' }] },
  { num: 15, text: 'WAIT = 0', tokens: [{ t: 'const', v: 'WAIT' }, { t: 'plain', v: ' = ' }, { t: 'num', v: '0' }] },
  { num: 16, text: 'DRAW = 10', tokens: [{ t: 'const', v: 'DRAW' }, { t: 'plain', v: ' = ' }, { t: 'num', v: '10' }] },
  { num: 17, text: 'TEXT = 3', tokens: [{ t: 'const', v: 'TEXT' }, { t: 'plain', v: ' = ' }, { t: 'num', v: '3' }] },
  { num: 18, text: 'FINAL = 3', tokens: [{ t: 'const', v: 'FINAL' }, { t: 'plain', v: ' = ' }, { t: 'num', v: '3' }] },
  { num: 19, text: 'TEXT_OVERLAP = 1.5', tokens: [{ t: 'const', v: 'TEXT_OVERLAP' }, { t: 'plain', v: ' = ' }, { t: 'num', v: '1.5' }] },
  { num: 20, text: 'random.seed(42)', tokens: [{ t: 'plain', v: 'random.' }, { t: 'func', v: 'seed' }, { t: 'plain', v: '(' }, { t: 'num', v: '42' }, { t: 'plain', v: ')' }] },
  { num: 21, text: '', tokens: [] },
  { num: 22, text: 'IMAGE_PATH = "flow.jpg"', tokens: [{ t: 'const', v: 'IMAGE_PATH' }, { t: 'plain', v: ' = ' }, { t: 'str', v: '"flow.jpg"' }] },
  { num: 23, text: 'QUOTE = "Too Many Thoughts, Not Enough Vases."', tokens: [{ t: 'const', v: 'QUOTE' }, { t: 'plain', v: ' = ' }, { t: 'str', v: '"Too Many Thoughts, Not Enough Vases."' }] },
  { num: 24, text: '', tokens: [] },
  { num: 25, text: 'TWINKLES_PER_FRAME = 10', tokens: [{ t: 'const', v: 'TWINKLES_PER_FRAME' }, { t: 'plain', v: ' = ' }, { t: 'num', v: '10' }] },
  { num: 26, text: 'TWINKLE_LIFE = (20, 45)', tokens: [{ t: 'const', v: 'TWINKLE_LIFE' }, { t: 'plain', v: ' = (' }, { t: 'num', v: '20' }, { t: 'plain', v: ', ' }, { t: 'num', v: '45' }, { t: 'plain', v: ')' }] },
  { num: 27, text: '', tokens: [] },
  { num: 28, text: 'LUMA_THRESH = 100', tokens: [{ t: 'const', v: 'LUMA_THRESH' }, { t: 'plain', v: ' = ' }, { t: 'num', v: '100' }] },
  { num: 29, text: 'MIN_BLOB = 8', tokens: [{ t: 'const', v: 'MIN_BLOB' }, { t: 'plain', v: ' = ' }, { t: 'num', v: '8' }] },
  { num: 30, text: 'DENSITY = 0.85', tokens: [{ t: 'const', v: 'DENSITY' }, { t: 'plain', v: ' = ' }, { t: 'num', v: '0.85' }] },
  { num: 31, text: 'AUTO_CROP = True', tokens: [{ t: 'const', v: 'AUTO_CROP' }, { t: 'plain', v: ' = ' }, { t: 'keyword', v: 'True' }] },
  { num: 32, text: '', tokens: [] },
  { num: 33, text: 'DRAW_ORDER = "top"', tokens: [{ t: 'const', v: 'DRAW_ORDER' }, { t: 'plain', v: ' = ' }, { t: 'str', v: '"top"' }] },
  { num: 34, text: 'ORDER_JITTER = 0.15', tokens: [{ t: 'const', v: 'ORDER_JITTER' }, { t: 'plain', v: ' = ' }, { t: 'num', v: '0.15' }] },
  { num: 35, text: '', tokens: [] },
  { num: 36, text: 'GRADIENT = [', tokens: [{ t: 'const', v: 'GRADIENT' }, { t: 'plain', v: ' = [' }] },
  { num: 37, text: '    (255, 165, 205),', tokens: [{ t: 'plain', v: '    (' }, { t: 'num', v: '255' }, { t: 'plain', v: ', ' }, { t: 'num', v: '165' }, { t: 'plain', v: ', ' }, { t: 'num', v: '205' }, { t: 'plain', v: '),' }, { t: 'comment', v: '  # Rose Pink' }] },
  { num: 38, text: '    (255, 190, 225),', tokens: [{ t: 'plain', v: '    (' }, { t: 'num', v: '255' }, { t: 'plain', v: ', ' }, { t: 'num', v: '190' }, { t: 'plain', v: ', ' }, { t: 'num', v: '225' }, { t: 'plain', v: '),' }, { t: 'comment', v: '  # Blush' }] },
  { num: 39, text: '    (205, 165, 255),', tokens: [{ t: 'plain', v: '    (' }, { t: 'num', v: '205' }, { t: 'plain', v: ', ' }, { t: 'num', v: '165' }, { t: 'plain', v: ', ' }, { t: 'num', v: '255' }, { t: 'plain', v: '),' }, { t: 'comment', v: '  # Lavender' }] },
  { num: 40, text: '    (145, 210, 255),', tokens: [{ t: 'plain', v: '    (' }, { t: 'num', v: '145' }, { t: 'plain', v: ', ' }, { t: 'num', v: '210' }, { t: 'plain', v: ', ' }, { t: 'num', v: '255' }, { t: 'plain', v: '),' }, { t: 'comment', v: '  # Cyan' }] },
  { num: 41, text: ']', tokens: [{ t: 'plain', v: ']' }] },
  { num: 42, text: '', tokens: [] },
  { num: 43, text: 'img = cv2.imread(IMAGE_PATH)', tokens: [{ t: 'var', v: 'img' }, { t: 'plain', v: ' = cv2.' }, { t: 'func', v: 'imread' }, { t: 'plain', v: '(' }, { t: 'const', v: 'IMAGE_PATH' }, { t: 'plain', v: ')' }] },
  { num: 44, text: 'if img is None:', tokens: [{ t: 'keyword', v: 'if' }, { t: 'plain', v: ' img ' }, { t: 'keyword', v: 'is' }, { t: 'keyword', v: ' None' }, { t: 'plain', v: ':' }] },
  { num: 45, text: '    raise FileNotFoundError(f"Image {IMAGE_PATH} not found")', tokens: [{ t: 'plain', v: '    ' }, { t: 'keyword', v: 'raise' }, { t: 'func', v: ' FileNotFoundError' }, { t: 'plain', v: '(f' }, { t: 'str', v: '"Image {IMAGE_PATH} not found"' }, { t: 'plain', v: ')' }] },
  { num: 46, text: '', tokens: [] },
  { num: 47, text: 'def auto_crop(image):', tokens: [{ t: 'keyword', v: 'def' }, { t: 'func', v: ' auto_crop' }, { t: 'plain', v: '(image):' }] },
  { num: 48, text: '    g = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)', tokens: [{ t: 'plain', v: '    g = cv2.' }, { t: 'func', v: 'cvtColor' }, { t: 'plain', v: '(image, cv2.COLOR_BGR2GRAY)' }] },
  { num: 49, text: '    paper = (g > 200).astype(np.uint8)', tokens: [{ t: 'plain', v: '    paper = (g > ' }, { t: 'num', v: '200' }, { t: 'plain', v: ').' }, { t: 'func', v: 'astype' }, { t: 'plain', v: '(np.uint8)' }] },
  { num: 50, text: '    paper = cv2.morphologyEx(paper, cv2.MORPH_CLOSE, np.ones((5, 5)))', tokens: [{ t: 'plain', v: '    paper = cv2.' }, { t: 'func', v: 'morphologyEx' }, { t: 'plain', v: '(paper, cv2.MORPH_CLOSE, np.ones((5, 5)))' }] },
  { num: 51, text: '    n, labels, stats, _ = cv2.connectedComponentsWithStats(paper)', tokens: [{ t: 'plain', v: '    n, labels, stats, _ = cv2.' }, { t: 'func', v: 'connectedComponentsWithStats' }, { t: 'plain', v: '(paper)' }] },
  { num: 52, text: '    if n <= 1: return image', tokens: [{ t: 'plain', v: '    ' }, { t: 'keyword', v: 'if' }, { t: 'plain', v: ' n <= ' }, { t: 'num', v: '1' }, { t: 'plain', v: ': ' }, { t: 'keyword', v: 'return' }, { t: 'plain', v: ' image' }] },
  { num: 53, text: '    biggest = 1 + np.argmax(stats[1:, cv2.CC_STAT_AREA])', tokens: [{ t: 'plain', v: '    biggest = ' }, { t: 'num', v: '1' }, { t: 'plain', v: ' + np.' }, { t: 'func', v: 'argmax' }, { t: 'plain', v: '(stats[1:, cv2.CC_STAT_AREA])' }] },
  { num: 54, text: '    return image', tokens: [{ t: 'plain', v: '    ' }, { t: 'keyword', v: 'return' }, { t: 'plain', v: ' image' }] },
];

export function CodeEditor() {
  const tokenColors = {
    keyword: 'text-[#c586c0]', // VS Code purple keyword
    func: 'text-[#dcdcaa]',    // VS Code yellow function
    str: 'text-[#ce9178]',     // VS Code coral string
    num: 'text-[#b5cea8]',     // VS Code light green number
    const: 'text-[#4ec9b0]',   // Cyan / type constant
    var: 'text-[#9cdcfe]',     // Light blue variable
    comment: 'text-[#6a9955]', // Green comment
    plain: 'text-[#d4d4d4]',   // Neutral light grey
  };

  return (
    <div className="h-full w-full bg-[#0c0a14] border-r border-[#1a162b] flex flex-col font-mono-code text-[11px] leading-[19px] overflow-hidden select-text">
      {/* Editor Tab Bar */}
      <div className="flex items-center justify-between px-3 py-2 bg-[#090710] border-b border-[#181426] text-[#7d7796] select-none text-[11px]">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-[#ff5f56]/70 inline-block"></span>
          <span className="w-2.5 h-2.5 rounded-full bg-[#ffbd2e]/70 inline-block"></span>
          <span className="w-2.5 h-2.5 rounded-full bg-[#27c93f]/70 inline-block"></span>
          <div className="ml-2 flex items-center gap-1.5 px-2.5 py-1 bg-[#0c0a14] rounded-t text-[#c9c4db] border-t border-x border-[#1e1932]">
            <span className="text-[#4ec9b0] font-bold text-[10px]">PY</span>
            <span className="text-[11px] text-[#ded9ee]">coded.py</span>
          </div>
        </div>
        <div className="text-[10px] text-[#5c5675] tracking-wide">
          UTF-8
        </div>
      </div>

      {/* Code Area with Line Numbers */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden p-2 pt-3 custom-scrollbar">
        <div className="flex flex-col">
          {CODE_LINES.map((line) => (
            <div
              key={line.num}
              className="flex items-start hover:bg-[#151224]/50 rounded px-1 transition-colors group"
            >
              {/* Line Number */}
              <span className="w-7 shrink-0 text-right pr-3 text-[#453e5e] select-none font-light group-hover:text-[#6e6590]">
                {line.num}
              </span>

              {/* Code Content */}
              <span className="flex-1 whitespace-pre font-light">
                {line.tokens.map((token, idx) => (
                  <span key={idx} className={tokenColors[token.t] || 'text-[#d4d4d4]'}>
                    {token.v}
                  </span>
                ))}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Editor Status Bar */}
      <div className="px-3 py-1 bg-[#08060e] border-t border-[#161224] flex items-center justify-between text-[10px] text-[#554f6c] select-none">
        <div className="flex items-center gap-3">
          <span>Python 3.11</span>
          <span>Ln 24, Col 1</span>
        </div>
        <div>60 FPS</div>
      </div>
    </div>
  );
}
