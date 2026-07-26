import { useRef, useEffect, useState } from 'react';

/**
 * RichTextField
 * ------------------------------------------------------------------
 * A lightweight WYSIWYG replacement for <textarea>/<input> — text
 * formatted via the toolbar (Bold/Italic/Underline/Furigana/etc.)
 * renders VISUALLY inside the box instead of showing raw HTML tags
 * like <strong>bold</strong>.
 *
 * It's a plain contentEditable div under the hood, so it plugs into
 * the exact same "value is an HTML string" data model your fields
 * already use (activeItem.text, meta.description, activeItem.explanation)
 * — no changes needed anywhere else in your save/autosave/publish flow.
 *
 * It also plugs directly into the global QuestionEditorToolbar: when
 * this field is focused, `el.isContentEditable` is true, and the
 * toolbar automatically switches to using document.execCommand
 * (rich formatting) instead of raw string wrapping (plain fields).
 *
 * USAGE (drop-in replacement for a <textarea>):
 *
 *   <RichTextField
 *     value={meta.description}
 *     onChange={(html) => setMeta(p => ({ ...p, description: html }))}
 *     placeholder="Describe the exam structure..."
 *     fieldLabel="Exam Description"
 *     minHeightClass="min-h-[84px]"
 *   />
 */
export default function RichTextField({
  value,
  onChange,
  placeholder = '',
  fieldLabel,
  className = '',
  minHeightClass = 'min-h-[52px]',
}) {
  const ref = useRef(null);
  const [isFocused, setIsFocused] = useState(false);

  // Sync external value -> DOM only while NOT focused, so we never
  // fight the browser's own caret position while the user is typing.
  useEffect(() => {
    if (!ref.current || isFocused) return;
    const html = value || '';
    if (ref.current.innerHTML !== html) {
      ref.current.innerHTML = html;
    }
  }, [value, isFocused]);

  // Make Enter produce <br> instead of nested <div>/<p> soup, so the
  // stored HTML stays simple and predictable.
  useEffect(() => {
    try {
      document.execCommand('defaultParagraphSeparator', false, 'br');
    } catch {
      // no-op: unsupported in some browsers, harmless to skip
    }
  }, []);

  const handleInput = () => {
    if (ref.current) onChange(ref.current.innerHTML);
  };

  const isEmpty = !value || value.replace(/<br\s*\/?>/gi, '').replace(/&nbsp;/gi, '').trim() === '';

  return (
    <div className="relative">
      <div
        ref={ref}
        contentEditable
        suppressContentEditableWarning
        data-field-label={fieldLabel || placeholder || 'Rich text field'}
        onInput={handleInput}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        className={`${minHeightClass} whitespace-pre-wrap break-words outline-none ${className}`}
      />
      {isEmpty && (
        <div className="absolute inset-0 px-4 py-3 text-sm text-gray-600 pointer-events-none select-none">
          {placeholder}
        </div>
      )}
    </div>
  );
}
