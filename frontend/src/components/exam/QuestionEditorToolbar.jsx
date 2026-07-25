import { useState, useRef } from 'react';
import {
  Bold, Italic, Underline, Strikethrough,
  AlignLeft, AlignCenter, AlignRight,
  Type, Palette, Languages, X, MousePointerClick, Check
} from 'lucide-react';

/**
 * QuestionEditorToolbar (GLOBAL / FLOATING / DUAL-MODE VERSION)
 * ------------------------------------------------------------------
 * Operates on whatever field is currently referenced by
 * `activeFieldRef.current` (kept up to date by CreateExamPage's
 * onFocusCapture handler — see CreateExamPage.jsx).
 *
 * Two field types are supported automatically, detected via
 * `el.isContentEditable`:
 *
 *  1. RICH fields (RichTextField / any contentEditable div) — e.g.
 *     Question Text, Exam Description, Passages. Formatting is
 *     applied with document.execCommand so it renders VISUALLY
 *     (real bold/italic/underline/ruby), not as raw HTML tags.
 *
 *  2. PLAIN fields (ordinary <input>/<textarea>) — e.g. Option A–D,
 *     Section Name, Example Question. Formatting is applied by
 *     wrapping the current selection with HTML tag strings directly
 *     in the field's text value (unchanged from before), since plain
 *     inputs can't render HTML.
 *
 * Nothing about your existing per-field onChange handlers changes in
 * either case — both paths dispatch a native `input` event so React
 * picks up the change through whatever onChange is already wired.
 */

/** Programmatically set a controlled <input>/<textarea>'s value so React notices. */
function setNativeValue(element, value) {
  const isTextarea = element.tagName === 'TEXTAREA';
  const proto = isTextarea ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype;
  const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
  if (setter) {
    setter.call(element, value);
  } else {
    element.value = value;
  }
  element.dispatchEvent(new Event('input', { bubbles: true }));
}

const escapeHtml = (str) =>
  String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function ToolbarButton({ onClick, title, disabled, children, className = '' }) {
  return (
    <div className="relative group">
      <button
        type="button"
        onMouseDown={(e) => e.preventDefault()} // keep the active field's focus/selection intact
        onClick={onClick}
        disabled={disabled}
        className={`w-8 h-8 flex items-center justify-center rounded-lg border transition-all ${
          disabled
            ? 'bg-white/[0.02] border-white/5 text-gray-700 cursor-not-allowed'
            : 'bg-white/5 border-white/10 text-gray-400 hover:text-white hover:bg-white/10 hover:border-white/20'
        } ${className}`}
      >
        {children}
      </button>
      {!disabled && (
        <span className="pointer-events-none absolute left-1/2 -translate-x-1/2 -top-8 whitespace-nowrap bg-[#0a0f1e] border border-white/10 text-[10px] text-gray-300 px-2 py-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity z-20">
          {title}
        </span>
      )}
    </div>
  );
}

export default function QuestionEditorToolbar({ activeFieldRef, activeFieldLabel, className = '' }) {
  const [showFuriganaModal, setShowFuriganaModal] = useState(false);
  const [kanjiText, setKanjiText] = useState('');
  const [readingText, setReadingText] = useState('');
  const [showSizeMenu, setShowSizeMenu] = useState(false);
  const colorInputRef = useRef(null);

  const FONT_SIZES = [12, 14, 16, 18, 20, 24, 28, 32];
  const hasActiveField = !!activeFieldRef?.current;

  const getField = () => activeFieldRef?.current || null;
  const isRich = (el) => !!el?.isContentEditable;

  const setCursor = (el, start, end) => {
    requestAnimationFrame(() => {
      el.focus();
      try {
        el.setSelectionRange(start, end);
      } catch {
        // some input types don't support selection ranges — ignore
      }
    });
  };

  // ============================================================
  // PLAIN-FIELD helpers (input/textarea) — raw string HTML wrapping
  // ============================================================
  const wrapSelectionPlain = (el, before, after, placeholder = '') => {
    const start = el.selectionStart ?? el.value.length;
    const end = el.selectionEnd ?? el.value.length;
    const current = el.value ?? '';
    const selected = current.substring(start, end) || placeholder;
    const newValue = current.substring(0, start) + before + selected + after + current.substring(end);
    setNativeValue(el, newValue);
    setCursor(el, start + before.length, start + before.length + selected.length);
  };

  const insertAtCursorPlain = (el, text, caretOffset = null) => {
    const start = el.selectionStart ?? el.value.length;
    const end = el.selectionEnd ?? el.value.length;
    const current = el.value ?? '';
    const newValue = current.substring(0, start) + text + current.substring(end);
    setNativeValue(el, newValue);
    const pos = caretOffset !== null ? start + caretOffset : start + text.length;
    setCursor(el, pos, pos);
  };

  // ============================================================
  // RICH-FIELD helpers (contentEditable) — execCommand, renders visually
  // ============================================================
  const withRichFocus = (el, fn) => {
    el.focus();
    fn();
    // execCommand already fires 'input' in modern browsers, but dispatch
    // explicitly too so RichTextField's onInput always stays in sync.
    el.dispatchEvent(new Event('input', { bubbles: true }));
  };

  const execRich = (el, command) => withRichFocus(el, () => document.execCommand(command));

  const insertHtmlRich = (el, html) => withRichFocus(el, () => document.execCommand('insertHTML', false, html));

  const wrapSelectionRich = (el, before, after, placeholder = '') => {
    const selText = window.getSelection()?.toString() || '';
    const content = selText ? escapeHtml(selText) : placeholder;
    insertHtmlRich(el, `${before}${content}${after}`);
  };

  // ============================================================
  // Unified dispatch: pick the right implementation for the active field
  // ============================================================
  const applyTagFormat = (before, after, placeholder) => {
    const el = getField();
    if (!el) return;
    if (isRich(el)) wrapSelectionRich(el, before, after, placeholder);
    else wrapSelectionPlain(el, before, after, placeholder);
  };

  const applyInsert = (text, caretOffset = null) => {
    const el = getField();
    if (!el) return;
    if (isRich(el)) insertHtmlRich(el, text);
    else insertAtCursorPlain(el, text, caretOffset);
  };

  // ============================================================
  // Text formatting tools
  // ============================================================
  const handleBold = () => {
    const el = getField();
    if (!el) return;
    if (isRich(el)) execRich(el, 'bold');
    else wrapSelectionPlain(el, '<strong>', '</strong>', 'bold text');
  };

  const handleItalic = () => {
    const el = getField();
    if (!el) return;
    if (isRich(el)) execRich(el, 'italic');
    else wrapSelectionPlain(el, '<em>', '</em>', 'italic text');
  };

  const handleUnderline = () => {
    const el = getField();
    if (!el) return;
    if (isRich(el)) execRich(el, 'underline');
    else wrapSelectionPlain(el, '<u>', '</u>', 'underlined text');
  };

  const handleStrikethrough = () => {
    const el = getField();
    if (!el) return;
    if (isRich(el)) execRich(el, 'strikeThrough');
    else wrapSelectionPlain(el, '<s>', '</s>', 'strikethrough text');
  };

  const handleAlign = (alignment) => {
    const el = getField();
    if (!el) return;
    if (isRich(el)) {
      const cmd = alignment === 'left' ? 'justifyLeft' : alignment === 'center' ? 'justifyCenter' : 'justifyRight';
      execRich(el, cmd);
    } else {
      wrapSelectionPlain(el, `<div style="text-align:${alignment}">`, '</div>', 'text');
    }
  };

  const handleFontSize = (px) => {
    applyTagFormat(`<span style="font-size:${px}px">`, '</span>', 'text');
    setShowSizeMenu(false);
  };

  const handleFontColor = (e) => {
    const hex = e.target.value;
    const el = getField();
    if (!el) return;
    if (isRich(el)) withRichFocus(el, () => document.execCommand('foreColor', false, hex));
    else wrapSelectionPlain(el, `<span style="color:${hex}">`, '</span>', 'text');
  };

  // ============================================================
  // JLPT / Exam custom single-click insert tools
  // ============================================================
  const handleInsertBlank = () => applyInsert('___');
  const handleInsertStarBlank = () => applyInsert('____ ★ ____');
  const handleInsertBrackets = () => applyInsert('(   )', 1); // plain-field caret lands inside the parens

  const handleInsertFurigana = () => {
    if (!kanjiText.trim()) return;
    const reading = readingText.trim();
    const rubyHtml = reading
      ? `<ruby>${escapeHtml(kanjiText.trim())}<rt>${escapeHtml(reading)}</rt></ruby>`
      : `<ruby>${escapeHtml(kanjiText.trim())}<rt></rt></ruby>`;
    applyInsert(rubyHtml);
    setKanjiText('');
    setReadingText('');
    setShowFuriganaModal(false);
  };

  return (
    <div className={`relative ${className}`}>
      <div className="flex flex-wrap items-center gap-1.5 p-2.5 bg-[#0a0f1e]/90 border border-white/10 rounded-2xl shadow-lg shadow-black/20 backdrop-blur-xl">
        {/* --- Text formatting --- */}
        <ToolbarButton title="Bold" onClick={handleBold} disabled={!hasActiveField}>
          <Bold size={14} />
        </ToolbarButton>
        <ToolbarButton title="Italic" onClick={handleItalic} disabled={!hasActiveField}>
          <Italic size={14} />
        </ToolbarButton>
        <ToolbarButton title="Underline" onClick={handleUnderline} disabled={!hasActiveField}>
          <Underline size={14} />
        </ToolbarButton>
        <ToolbarButton title="Strikethrough" onClick={handleStrikethrough} disabled={!hasActiveField}>
          <Strikethrough size={14} />
        </ToolbarButton>

        <div className="w-px h-6 bg-white/10 mx-1" />

        {/* --- Alignment --- */}
        <ToolbarButton title="Align Left" onClick={() => handleAlign('left')} disabled={!hasActiveField}>
          <AlignLeft size={14} />
        </ToolbarButton>
        <ToolbarButton title="Align Center" onClick={() => handleAlign('center')} disabled={!hasActiveField}>
          <AlignCenter size={14} />
        </ToolbarButton>
        <ToolbarButton title="Align Right" onClick={() => handleAlign('right')} disabled={!hasActiveField}>
          <AlignRight size={14} />
        </ToolbarButton>

        <div className="w-px h-6 bg-white/10 mx-1" />

        {/* --- Font size (FIXED: vertical list, one option per line) --- */}
        <div className="relative">
          <ToolbarButton title="Font Size" onClick={() => setShowSizeMenu(s => !s)} disabled={!hasActiveField}>
            <Type size={14} />
          </ToolbarButton>
          {showSizeMenu && hasActiveField && (
            <>
              {/* click-outside overlay */}
              <div className="fixed inset-0 z-20" onClick={() => setShowSizeMenu(false)} />
              <div className="absolute top-9 left-0 w-32 bg-[#0a0f1e] border border-white/10 rounded-xl py-1.5 z-30 shadow-xl flex flex-col max-h-64 overflow-y-auto">
                {FONT_SIZES.map(px => (
                  <button
                    key={px}
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => handleFontSize(px)}
                    className="w-full text-left px-3 py-2 text-xs text-gray-300 hover:bg-blue-500/20 hover:text-blue-400 transition-colors"
                  >
                    {px}px
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {/* --- Font color --- */}
        <ToolbarButton title="Font Color" onClick={() => colorInputRef.current?.click()} disabled={!hasActiveField}>
          <Palette size={14} />
        </ToolbarButton>
        <input
          ref={colorInputRef}
          type="color"
          className="hidden"
          onChange={handleFontColor}
          defaultValue="#3b82f6"
        />

        <div className="w-px h-6 bg-white/10 mx-1" />

        {/* --- JLPT / Exam insert tools --- */}
        <ToolbarButton title="Insert Blank Line (___)" onClick={handleInsertBlank} disabled={!hasActiveField} className="w-auto px-2 text-[11px] font-bold">
          ___
        </ToolbarButton>
        <ToolbarButton title="Insert Star Blank (____ ★ ____) — sentence ordering" onClick={handleInsertStarBlank} disabled={!hasActiveField} className="w-auto px-2 text-[11px] font-bold">
          ★
        </ToolbarButton>
        <ToolbarButton title="Insert Spaced Brackets (   )" onClick={handleInsertBrackets} disabled={!hasActiveField} className="w-auto px-2 text-[11px] font-bold">
          ( )
        </ToolbarButton>
        <ToolbarButton title="Insert Furigana / Ruby Text" onClick={() => setShowFuriganaModal(true)} disabled={!hasActiveField}>
          <Languages size={14} />
        </ToolbarButton>

        {/* --- Active field indicator --- */}
        <div className="ml-auto flex items-center gap-1.5 pl-2">
          {hasActiveField && (
            <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[9px] font-bold uppercase tracking-wider">
              <Check size={10} /> WYSIWYG
            </span>
          )}
          <MousePointerClick size={12} className={hasActiveField ? 'text-blue-400' : 'text-gray-600'} />
          <span className={`text-[10px] font-mono uppercase tracking-wider truncate max-w-[160px] ${hasActiveField ? 'text-blue-400' : 'text-gray-600'}`}>
            {hasActiveField ? (activeFieldLabel || 'Text field') : 'Click a text field'}
          </span>
        </div>
      </div>

      {/* --- Furigana modal --- */}
      {showFuriganaModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="bg-[#0a0f1e] border border-white/10 rounded-2xl p-6 max-w-sm w-full">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-white">Add Furigana Reading</h3>
              <button onClick={() => setShowFuriganaModal(false)} className="text-gray-500 hover:text-white">
                <X size={16} />
              </button>
            </div>

            <div className="flex flex-col gap-3">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block mb-1">
                  Kanji / Base Text
                </label>
                <input
                  type="text"
                  value={kanjiText}
                  onChange={(e) => setKanjiText(e.target.value)}
                  placeholder="例: 漢字"
                  className="w-full bg-slate-950/50 border border-white/10 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500/50"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block mb-1">
                  Furigana Reading
                </label>
                <input
                  type="text"
                  value={readingText}
                  onChange={(e) => setReadingText(e.target.value)}
                  placeholder="例: かんじ"
                  className="w-full bg-slate-950/50 border border-white/10 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500/50"
                />
              </div>

              {kanjiText && (
                <div className="bg-white/5 border border-white/10 rounded-xl p-3 text-center">
                  <span className="text-[10px] text-gray-500 block mb-1">Preview</span>
                  <ruby className="text-white text-lg">
                    {kanjiText}
                    <rt className="text-[10px] text-blue-400">{readingText}</rt>
                  </ruby>
                </div>
              )}

              <p className="text-[10px] text-gray-500">
                Will be inserted into: <span className="text-blue-400">{activeFieldLabel || 'the last focused text field'}</span>
              </p>
            </div>

            <div className="flex gap-3 justify-end mt-5">
              <button
                onClick={() => setShowFuriganaModal(false)}
                className="px-4 py-2 rounded-xl text-sm text-gray-400 hover:text-white bg-white/5 border border-white/10"
              >
                Cancel
              </button>
              <button
                onClick={handleInsertFurigana}
                disabled={!kanjiText.trim() || !hasActiveField}
                className="px-4 py-2 rounded-xl text-sm font-medium bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Insert
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
