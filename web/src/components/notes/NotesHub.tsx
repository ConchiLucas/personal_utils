import React, { useState, useEffect } from 'react';
import { 
  Copy, 
  Check, 
  Pin, 
  Clock, 
  BookOpen,
  Bot
} from 'lucide-react';
import { Note } from '../../types';
import { api } from '../../api/client';

export const NotesHub: React.FC = () => {
  const [notes, setNotes] = useState<Note[]>([]);
  const [selectedNoteId, setSelectedNoteId] = useState<number | null>(null);
  const [copiedAll, setCopiedAll] = useState(false);
  const [copiedSnippetIdx, setCopiedSnippetIdx] = useState<number | null>(null);

  const loadNotes = async () => {
    try {
      const data = await api.getNotes();
      setNotes(data);
      if (data.length > 0 && selectedNoteId === null) {
        setSelectedNoteId(data[0].id);
      }
    } catch (err) {
      console.error('Failed to load notes:', err);
    }
  };

  useEffect(() => {
    loadNotes();
  }, []);

  const currentNote = notes.find((n) => n.id === selectedNoteId) || notes[0];

  const handleCopyAll = () => {
    if (!currentNote) return;
    navigator.clipboard.writeText(currentNote.content);
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 2000);
  };

  const handleCopySnippet = (code: string, idx: number) => {
    navigator.clipboard.writeText(code);
    setCopiedSnippetIdx(idx);
    setTimeout(() => setCopiedSnippetIdx(null), 1500);
  };

  // Helper to parse inline Markdown (bold, code, br) cleanly
  const renderInline = (text: string): React.ReactNode => {
    if (!text) return text;

    // Split by <br> or <br/>
    const brParts = text.split(/<br\s*\/?>/gi);
    if (brParts.length > 1) {
      return brParts.map((part, pIdx) => (
        <React.Fragment key={pIdx}>
          {pIdx > 0 && <br />}
          {renderInline(part)}
        </React.Fragment>
      ));
    }

    // Tokenize bold **...** and inline `...`
    const regex = /(\*\*[^*]+\*\*|`[^`]+`)/g;
    const parts = text.split(regex);

    return parts.map((part, idx) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return (
          <strong key={idx} className="text-white font-semibold">
            {part.slice(2, -2)}
          </strong>
        );
      }
      if (part.startsWith('`') && part.endsWith('`')) {
        return (
          <code
            key={idx}
            className="px-1.5 py-0.5 mx-0.5 rounded bg-[#27272a] text-blue-400 font-mono text-[11px] border border-[#3f3f46]/40 select-all"
          >
            {part.slice(1, -1)}
          </code>
        );
      }
      return part;
    });
  };

  // Helper to render Markdown cleanly across full screen width
  const renderMarkdown = (content: string) => {
    if (!content) return null;

    const lines = content.split('\n');
    const elements: React.ReactNode[] = [];
    let inCodeBlock = false;
    let codeLanguage = '';
    let codeBuffer: string[] = [];
    let codeBlockIdx = 0;
    let inTable = false;
    let tableBuffer: string[] = [];

    const flushTable = (key: string) => {
      if (tableBuffer.length === 0) return null;
      const rows = tableBuffer.map((r) => r.trim()).filter((r) => r.startsWith('|'));
      tableBuffer = [];
      inTable = false;

      if (rows.length === 0) return null;
      const headerRow = rows[0].split('|').map((c) => c.trim()).filter(Boolean);
      const dataRows = rows.slice(2).map((r) => r.split('|').map((c) => c.trim()).filter(Boolean));

      return (
        <div key={key} className="my-5 w-full overflow-x-auto border border-[#27272a] rounded-xl shadow-sm bg-[#09090b]">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-[#18181b] border-b border-[#27272a] text-[#f4f4f5]">
                {headerRow.map((th, i) => (
                  <th key={i} className="py-3 px-4 font-semibold whitespace-nowrap bg-[#121215]">
                    {renderInline(th)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#27272a]/60 text-[12px] text-[#d4d4d8]">
              {dataRows.map((tr, rIdx) => (
                <tr key={rIdx} className="hover:bg-[#18181b]/50 transition-colors">
                  {tr.map((td, cIdx) => (
                    <td key={cIdx} className="py-3 px-4 align-top leading-relaxed">
                      {renderInline(td)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    };

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Code Block Start / End
      if (line.trim().startsWith('```')) {
        if (inCodeBlock) {
          const codeString = codeBuffer.join('\n');
          const currentIdx = codeBlockIdx++;
          elements.push(
            <div key={`code-${i}`} className="my-5 w-full rounded-xl border border-[#27272a] bg-[#050507] overflow-hidden shadow-sm">
              <div className="flex items-center justify-between px-4 py-2 bg-[#121215] border-b border-[#27272a] text-[11px] text-[#71717a] font-mono select-none">
                <span className="font-semibold text-[#a1a1aa]">{codeLanguage || 'code'}</span>
                <button
                  onClick={() => handleCopySnippet(codeString, currentIdx)}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#1c1c20] hover:bg-[#27272a] text-[#e4e4e7] hover:text-white transition-colors border border-[#27272a]"
                >
                  {copiedSnippetIdx === currentIdx ? (
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <Copy className="w-3.5 h-3.5 text-blue-400" />
                  )}
                  <span>{copiedSnippetIdx === currentIdx ? '已复制代码' : '复制代码'}</span>
                </button>
              </div>
              <pre className="p-4 sm:p-5 font-mono text-xs text-[#e4e4e7] overflow-x-auto leading-relaxed">
                <code>{codeString}</code>
              </pre>
            </div>
          );
          codeBuffer = [];
          inCodeBlock = false;
          continue;
        } else {
          inCodeBlock = true;
          codeLanguage = line.trim().replace('```', '');
          continue;
        }
      }

      if (inCodeBlock) {
        codeBuffer.push(line);
        continue;
      }

      // Tables
      if (line.trim().startsWith('|')) {
        inTable = true;
        tableBuffer.push(line);
        continue;
      } else if (inTable) {
        elements.push(flushTable(`table-${i}`));
      }

      // Headings
      if (line.startsWith('# ')) {
        elements.push(
          <h1 key={i} className="text-xl sm:text-2xl font-bold text-white mt-8 mb-4 tracking-tight">
            {renderInline(line.replace('# ', ''))}
          </h1>
        );
        continue;
      }
      if (line.startsWith('## ')) {
        elements.push(
          <h2 key={i} className="text-base sm:text-lg font-semibold text-white mt-7 mb-3 tracking-tight pb-1.5 border-b border-[#27272a]">
            {renderInline(line.replace('## ', ''))}
          </h2>
        );
        continue;
      }
      if (line.startsWith('### ')) {
        elements.push(
          <h3 key={i} className="text-sm sm:text-base font-semibold text-blue-400 mt-5 mb-2">
            {renderInline(line.replace('### ', ''))}
          </h3>
        );
        continue;
      }

      // Divider
      if (line.trim() === '---') {
        elements.push(<hr key={i} className="my-6 border-[#27272a]" />);
        continue;
      }

      // Blockquotes / Tips
      if (line.startsWith('> ')) {
        elements.push(
          <blockquote key={i} className="my-3 pl-4 border-l-2 border-blue-500 bg-blue-500/5 py-2 pr-4 text-xs sm:text-sm text-[#d4d4d8] rounded-r-lg leading-relaxed">
            {renderInline(line.replace('> ', ''))}
          </blockquote>
        );
        continue;
      }

      // Bullet lists
      if (line.trim().startsWith('* ') || line.trim().startsWith('- ')) {
        elements.push(
          <li key={i} className="text-xs sm:text-sm text-[#d4d4d8] leading-relaxed ml-5 list-disc my-1.5">
            {renderInline(line.replace(/^[\s-*]+/, ''))}
          </li>
        );
        continue;
      }

      // Empty line
      if (!line.trim()) {
        elements.push(<div key={i} className="h-2" />);
        continue;
      }

      // Normal paragraph
      elements.push(
        <p key={i} className="text-xs sm:text-sm text-[#d4d4d8] leading-relaxed my-2">
          {renderInline(line)}
        </p>
      );
    }

    if (inTable) {
      elements.push(flushTable('table-end'));
    }

    return elements;
  };

  return (
    <div className="flex-1 flex overflow-hidden bg-[#09090b] w-full">
      {/* Left Note List Panel */}
      <aside className="w-80 border-r border-[#27272a] flex flex-col shrink-0 h-[calc(100vh-3.5rem)] select-none">
        {/* Note Cards List */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
          {notes.length === 0 ? (
            <div className="py-12 text-center text-xs text-[#71717a]">
              暂无笔记内容
            </div>
          ) : (
            notes.map((note) => {
              const isSelected = (currentNote?.id ?? 0) === note.id;
              const excerpt = note.content.replace(/[#*`|\n]/g, ' ').slice(0, 70);

              return (
                <div
                  key={note.id}
                  onClick={() => setSelectedNoteId(note.id)}
                  className={`p-3 rounded-xl cursor-pointer border transition-all ${
                    isSelected
                      ? 'bg-[#18181b] border-blue-500/40 text-white shadow-md'
                      : 'border-[#27272a]/50 text-[#a1a1aa] hover:bg-[#18181b]/50 hover:border-[#27272a]'
                  }`}
                >
                  <div className="flex items-start justify-between gap-1.5 mb-1">
                    <h4 className="text-xs font-semibold truncate flex items-center gap-1.5 text-[#f4f4f5]">
                      {note.is_pinned && <Pin className="w-3 h-3 text-amber-400 shrink-0" />}
                      <span>{note.title}</span>
                    </h4>
                  </div>

                  <p className="text-[11px] text-[#71717a] line-clamp-2 leading-relaxed mb-2 font-mono">
                    {excerpt}...
                  </p>

                  <div className="flex items-center justify-between text-[10px] text-[#52525b]">
                    <span className="px-1.5 py-0.5 rounded bg-[#27272a] text-blue-400 font-medium">
                      {note.category}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-2.5 h-2.5" />
                      {note.updated_at ? note.updated_at.slice(0, 10) : '刚刚'}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer info */}
        <div className="p-3 border-t border-[#27272a] text-[11px] text-[#71717a] flex items-center justify-between bg-[#09090b]">
          <span className="flex items-center gap-1">
            <Bot className="w-3 h-3 text-blue-400" /> AI 自动同步写入
          </span>
          <span className="font-mono text-[10px]">{notes.length} 篇笔记</span>
        </div>
      </aside>

      {/* Right Note Detail / Reader Panel (Full Width) */}
      <main className="flex-1 flex flex-col min-w-0 bg-[#09090b] overflow-hidden w-full relative">
        {currentNote ? (
          <>
            {/* Floating Copy Full Content Button */}
            <div className="absolute top-4 right-6 sm:right-10 z-20">
              <button
                onClick={handleCopyAll}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#18181b]/95 hover:bg-[#27272a] text-[#f4f4f5] text-xs font-medium border border-[#27272a] hover:border-[#3f3f46] transition-all shadow-xl backdrop-blur-md shrink-0"
              >
                {copiedAll ? (
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <Copy className="w-3.5 h-3.5 text-blue-400" />
                )}
                <span>{copiedAll ? '已复制 Markdown' : '复制整篇内容'}</span>
              </button>
            </div>

            {/* Note Content Reader - Full Screen Width */}
            <div className="flex-1 overflow-y-auto px-6 sm:px-10 py-6 w-full min-w-0">
              <div className="w-full max-w-full">
                {renderMarkdown(currentNote.content)}
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-[#71717a]">
            <BookOpen className="w-8 h-8 mb-2 opacity-40" />
            <p className="text-xs">请在左侧选择笔记</p>
          </div>
        )}
      </main>
    </div>
  );
};
