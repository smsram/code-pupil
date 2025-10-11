"use client";

import { useRef, useEffect, useState } from "react";

const RichTextEditor = ({ value, onChange, disabled = false, placeholder }) => {
  const editorRef = useRef(null);
  const [isMounted, setIsMounted] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(null);
  const [recentColors, setRecentColors] = useState([]);
  const [activeFormats, setActiveFormats] = useState({});

  const defaultColors = [
    "#ffffff", "#000000", "#e2e8f0", "#94a3b8", "#64748b",
    "#ef4444", "#f97316", "#f59e0b", "#eab308", "#84cc16",
    "#22c55e", "#06b6d4", "#3b82f6", "#8b5cf6", "#ec4899",
  ];

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (isMounted && editorRef.current && value !== editorRef.current.innerHTML) {
      editorRef.current.innerHTML = value || '';
    }
  }, [value, isMounted]);

  const checkActiveFormats = () => {
    if (!isMounted || !editorRef.current) return;
    
    try {
      const selection = window.getSelection();
      if (!selection.rangeCount) return;

      const formats = {
        bold: document.queryCommandState('bold'),
        italic: document.queryCommandState('italic'),
        underline: document.queryCommandState('underline'),
        insertUnorderedList: document.queryCommandState('insertUnorderedList'),
        insertOrderedList: document.queryCommandState('insertOrderedList'),
        justifyLeft: document.queryCommandState('justifyLeft'),
        justifyCenter: document.queryCommandState('justifyCenter'),
        justifyRight: document.queryCommandState('justifyRight'),
      };

      // Check current block format
      const currentBlock = document.queryCommandValue('formatBlock');
      formats.h1 = currentBlock === 'h1';
      formats.h2 = currentBlock === 'h2';
      formats.h3 = currentBlock === 'h3';
      formats.p = currentBlock === 'p' || currentBlock === 'div' || !currentBlock;
      formats.blockquote = currentBlock === 'blockquote';

      setActiveFormats(formats);
    } catch (e) {
      console.warn('Error checking formats:', e);
    }
  };

  const execCommand = (command, value = null) => {
    if (!isMounted || !editorRef.current) return;
    
    try {
      editorRef.current.focus();
      
      if (command === 'formatBlock') {
        const currentBlock = document.queryCommandValue('formatBlock');
        
        if (currentBlock === value) {
          document.execCommand('formatBlock', false, 'p');
        } else {
          document.execCommand('formatBlock', false, value);
        }
      } else {
        document.execCommand(command, false, value);
      }
      
      setTimeout(() => {
        updateContent();
        checkActiveFormats();
      }, 10);
      
    } catch (e) {
      console.warn('Command failed:', command, e);
    }
  };

  const updateContent = () => {
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
  };

  const handleInput = () => {
    updateContent();
    setTimeout(checkActiveFormats, 50);
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const text = e.clipboardData.getData('text/plain');
    if (text) {
      document.execCommand('insertText', false, text);
      updateContent();
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      const selection = window.getSelection();
      if (selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        const container = range.startContainer;
        let listItem = container.nodeType === 3 ? container.parentElement : container;
        
        while (listItem && listItem.tagName !== 'LI' && listItem !== editorRef.current) {
          listItem = listItem.parentElement;
        }
        
        if (listItem && listItem.tagName === 'LI' && listItem.textContent.trim() === '') {
          e.preventDefault();
          document.execCommand('outdent', false);
          document.execCommand('insertParagraph', false);
          updateContent();
          return;
        }
      }
    }

    if (e.key === 'Backspace') {
      const selection = window.getSelection();
      if (selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        
        if (range.startOffset === 0 && range.collapsed) {
          const container = range.startContainer;
          let listItem = container.nodeType === 3 ? container.parentElement : container;
          
          while (listItem && listItem.tagName !== 'LI' && listItem !== editorRef.current) {
            listItem = listItem.parentElement;
          }
          
          if (listItem && listItem.tagName === 'LI' && listItem.textContent.trim() === '') {
            e.preventDefault();
            document.execCommand('outdent', false);
            updateContent();
          }
        }
      }
    }
  };

  const handleSelectionChange = () => {
    const selection = window.getSelection();
    if (selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      if (editorRef.current && editorRef.current.contains(range.commonAncestorContainer)) {
        checkActiveFormats();
      }
    }
  };

  useEffect(() => {
    if (isMounted) {
      document.addEventListener('selectionchange', handleSelectionChange);
      return () => {
        document.removeEventListener('selectionchange', handleSelectionChange);
      };
    }
  }, [isMounted]);

  const applyColor = (color, type) => {
    editorRef.current?.focus();
    
    if (type === 'text') {
      execCommand('foreColor', color);
    } else {
      execCommand('backColor', color);
    }
    
    setRecentColors(prev => {
      const filtered = prev.filter(c => c !== color);
      return [color, ...filtered].slice(0, 8);
    });
    
    setShowColorPicker(null);
  };

  const toolbarSections = [
    {
      title: "Format",
      buttons: [
        { icon: "B", title: "Bold", command: "bold", kbd: "Ctrl+B", check: 'bold' },
        { icon: "I", title: "Italic", command: "italic", kbd: "Ctrl+I", check: 'italic' },
        { icon: "U", title: "Underline", command: "underline", kbd: "Ctrl+U", check: 'underline' },
      ],
    },
    {
      title: "Headings",
      buttons: [
        { icon: "H1", title: "Heading 1", command: "formatBlock", value: "h1", check: 'h1' },
        { icon: "H2", title: "Heading 2", command: "formatBlock", value: "h2", check: 'h2' },
        { icon: "H3", title: "Heading 3", command: "formatBlock", value: "h3", check: 'h3' },
        { icon: "P", title: "Paragraph", command: "formatBlock", value: "p", check: 'p' },
      ],
    },
    {
      title: "Align",
      buttons: [
        { icon: "⬅", title: "Left", command: "justifyLeft", check: 'justifyLeft' },
        { icon: "⬌", title: "Center", command: "justifyCenter", check: 'justifyCenter' },
        { icon: "➡", title: "Right", command: "justifyRight", check: 'justifyRight' },
      ],
    },
    {
      title: "Lists",
      buttons: [
        { icon: "•", title: "Bullet List", command: "insertUnorderedList", check: 'insertUnorderedList' },
        { icon: "1.", title: "Number List", command: "insertOrderedList", check: 'insertOrderedList' },
        { icon: "↹", title: "Indent", command: "indent" },
        { icon: "⇤", title: "Outdent", command: "outdent" },
      ],
    },
    {
      title: "Color",
      buttons: [
        { icon: "A", title: "Text Color", onClick: () => setShowColorPicker('text') },
        { icon: "■", title: "Highlight", onClick: () => setShowColorPicker('bg') },
      ],
    },
    {
      title: "Tools",
      buttons: [
        { icon: '"', title: "Quote", command: "formatBlock", value: "blockquote", check: 'blockquote' },
        { icon: "─", title: "Line", command: "insertHorizontalRule" },
        { icon: "✖", title: "Clear", command: "removeFormat" },
      ],
    },
  ];

  if (!isMounted) {
    return <div style={{ minHeight: "250px", background: "rgba(15, 23, 42, 0.5)", borderRadius: "12px" }} />;
  }

  return (
    <div
      style={{
        border: "1px solid rgba(71, 85, 105, 0.4)",
        borderRadius: "12px",
        background: "rgba(15, 23, 42, 0.5)",
        overflow: "hidden",
        position: "relative",
      }}
    >
      {/* ... (keep toolbar and color picker code same) ... */}
      {!disabled && (
        <div
          style={{
            padding: "0.75rem",
            background: "rgba(30, 41, 59, 0.5)",
            borderBottom: "1px solid rgba(71, 85, 105, 0.4)",
            display: "flex",
            gap: "1rem",
            flexWrap: "wrap",
            overflowX: "auto",
          }}
        >
          {toolbarSections.map((section, sIdx) => (
            <div key={sIdx} style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
              <div style={{ fontSize: "0.65rem", color: "#64748b", fontWeight: 600, textTransform: "uppercase" }}>
                {section.title}
              </div>
              <div style={{ display: "flex", gap: "0.25rem" }}>
                {section.buttons.map((btn, bIdx) => {
                  const isActive = btn.check && activeFormats[btn.check];
                  return (
                    <button
                      key={bIdx}
                      type="button"
                      onClick={() => {
                        if (btn.onClick) {
                          btn.onClick();
                        } else if (btn.value) {
                          execCommand(btn.command, btn.value);
                        } else {
                          execCommand(btn.command);
                        }
                      }}
                      title={btn.kbd ? `${btn.title} (${btn.kbd})` : btn.title}
                      style={{
                        padding: "0.5rem",
                        background: isActive 
                          ? "linear-gradient(135deg, #06b6d4, #0ea5e9)" 
                          : "rgba(71, 85, 105, 0.3)",
                        border: isActive 
                          ? "1px solid #06b6d4" 
                          : "1px solid rgba(71, 85, 105, 0.5)",
                        borderRadius: "6px",
                        color: isActive ? "#ffffff" : "#e2e8f0",
                        cursor: "pointer",
                        fontSize: "0.8rem",
                        fontWeight: isActive ? 700 : 600,
                        minWidth: "36px",
                        transition: "all 0.2s",
                        boxShadow: isActive ? "0 2px 8px rgba(6, 182, 212, 0.3)" : "none",
                      }}
                      onMouseEnter={(e) => {
                        if (!isActive) {
                          e.currentTarget.style.background = "rgba(6, 182, 212, 0.2)";
                          e.currentTarget.style.borderColor = "rgba(6, 182, 212, 0.6)";
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isActive) {
                          e.currentTarget.style.background = "rgba(71, 85, 105, 0.3)";
                          e.currentTarget.style.borderColor = "rgba(71, 85, 105, 0.5)";
                        }
                      }}
                    >
                      {btn.icon}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Color Picker - same as before */}
      {showColorPicker && (
        <div
          style={{
            position: "fixed",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            background: "rgba(30, 41, 59, 0.98)",
            border: "1px solid rgba(71, 85, 105, 0.6)",
            borderRadius: "12px",
            padding: "1rem",
            zIndex: 10000,
            boxShadow: "0 10px 40px rgba(0, 0, 0, 0.6)",
            minWidth: "280px",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
            <span style={{ color: "#e2e8f0", fontWeight: 600, fontSize: "0.9rem" }}>
              {showColorPicker === 'text' ? 'Text Color' : 'Highlight Color'}
            </span>
            <button
              onClick={() => setShowColorPicker(null)}
              style={{
                background: "none",
                border: "none",
                color: "#94a3b8",
                cursor: "pointer",
                fontSize: "1.2rem",
                padding: "0",
              }}
            >
              ✕
            </button>
          </div>

          {recentColors.length > 0 && (
            <>
              <div style={{ fontSize: "0.7rem", color: "#64748b", marginBottom: "0.5rem", fontWeight: 600 }}>
                RECENT
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "0.5rem", marginBottom: "1rem" }}>
                {recentColors.map((color, idx) => (
                  <button
                    key={idx}
                    onClick={() => applyColor(color, showColorPicker)}
                    style={{
                      width: "36px",
                      height: "36px",
                      borderRadius: "8px",
                      border: "2px solid rgba(71, 85, 105, 0.5)",
                      background: color,
                      cursor: "pointer",
                      transition: "transform 0.2s",
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.transform = "scale(1.1)"}
                    onMouseLeave={(e) => e.currentTarget.style.transform = "scale(1)"}
                  />
                ))}
              </div>
            </>
          )}

          <div style={{ fontSize: "0.7rem", color: "#64748b", marginBottom: "0.5rem", fontWeight: 600 }}>
            COLORS
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "0.5rem" }}>
            {defaultColors.map((color, idx) => (
              <button
                key={idx}
                onClick={() => applyColor(color, showColorPicker)}
                style={{
                  width: "36px",
                  height: "36px",
                  borderRadius: "8px",
                  border: "2px solid rgba(71, 85, 105, 0.5)",
                  background: color,
                  cursor: "pointer",
                  transition: "transform 0.2s",
                }}
                onMouseEnter={(e) => e.currentTarget.style.transform = "scale(1.1)"}
                onMouseLeave={(e) => e.currentTarget.style.transform = "scale(1)"}
              />
            ))}
          </div>
        </div>
      )}

      {/* Editor */}
      <div
        ref={editorRef}
        contentEditable={!disabled}
        onInput={handleInput}
        onPaste={handlePaste}
        onKeyDown={handleKeyDown}
        suppressContentEditableWarning
        data-placeholder={placeholder}
        style={{
          minHeight: "200px",
          maxHeight: "400px",
          overflowY: "auto",
          padding: "1rem",
          color: "#e2e8f0",
          fontSize: "0.95rem",
          lineHeight: "1.6",
          outline: "none",
          cursor: disabled ? "not-allowed" : "text",
          opacity: disabled ? 0.5 : 1,
        }}
      />

      {/* Fixed Styles with Higher Specificity */}
      <style jsx>{`
        div[contenteditable="true"]:empty:before {
          content: attr(data-placeholder);
          color: #64748b !important;
          pointer-events: none;
        }
        
        /* Lists with proper positioning */
        div[contenteditable="true"] ul,
        div[contenteditable="true"] ol {
          padding-left: 2rem !important;
          margin: 0.75rem 0 !important;
          list-style-position: outside !important;
        }
        
        div[contenteditable="true"] ul {
          list-style-type: disc !important;
        }
        
        div[contenteditable="true"] ol {
          list-style-type: decimal !important;
        }
        
        div[contenteditable="true"] li {
          margin: 0.35rem 0 !important;
          color: #e2e8f0 !important;
          display: list-item !important;
        }
        
        /* Headings with proper sizing */
        div[contenteditable="true"] h1 {
          font-size: 2rem !important;
          font-weight: 700 !important;
          margin: 1.5rem 0 0.75rem !important;
          color: #06b6d4 !important;
          line-height: 1.2 !important;
          display: block !important;
        }
        
        div[contenteditable="true"] h2 {
          font-size: 1.5rem !important;
          font-weight: 700 !important;
          margin: 1.25rem 0 0.5rem !important;
          color: #06b6d4 !important;
          line-height: 1.3 !important;
          display: block !important;
        }
        
        div[contenteditable="true"] h3 {
          font-size: 1.25rem !important;
          font-weight: 700 !important;
          margin: 1rem 0 0.5rem !important;
          color: #06b6d4 !important;
          line-height: 1.3 !important;
          display: block !important;
        }
        
        div[contenteditable="true"] p {
          margin: 0.5rem 0 !important;
          color: #e2e8f0 !important;
          font-size: 0.95rem !important;
          line-height: 1.6 !important;
        }
        
        div[contenteditable="true"] blockquote {
          border-left: 4px solid #06b6d4 !important;
          padding: 0.75rem 1rem !important;
          margin: 1rem 0 !important;
          font-style: italic !important;
          color: #94a3b8 !important;
          background: rgba(6, 182, 212, 0.05) !important;
          border-radius: 0 8px 8px 0 !important;
          display: block !important;
        }
        
        div[contenteditable="true"] hr {
          border: none !important;
          border-top: 2px solid #475569 !important;
          margin: 1.5rem 0 !important;
          display: block !important;
        }
        
        /* Text formatting */
        div[contenteditable="true"] strong,
        div[contenteditable="true"] b {
          font-weight: 700 !important;
          color: #f1f5f9 !important;
        }
        
        div[contenteditable="true"] em,
        div[contenteditable="true"] i {
          font-style: italic !important;
          color: #cbd5e1 !important;
        }
        
        div[contenteditable="true"] u {
          text-decoration: underline !important;
        }
      `}</style>
    </div>
  );
};

export default RichTextEditor;
