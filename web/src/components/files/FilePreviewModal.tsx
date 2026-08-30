import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Download,
  Copy,
  Check,
  Save,
  Eye,
  Edit3,
  FileText,
  FileImage,
  RefreshCw,
  Sparkles,
  FileCode,
  File,
  ChevronDown,
  ChevronRight,
  ListTree,
  Code2
} from 'lucide-react';
import Prism from 'prismjs';
import 'prismjs/components/prism-go';
import 'prismjs/components/prism-python';
import 'prismjs/components/prism-javascript';
import 'prismjs/components/prism-typescript';
import 'prismjs/components/prism-jsx';
import 'prismjs/components/prism-tsx';
import 'prismjs/components/prism-json';
import 'prismjs/components/prism-yaml';
import 'prismjs/components/prism-bash';
import 'prismjs/components/prism-sql';
import 'prismjs/components/prism-markdown';
import 'prismjs/components/prism-css';
import 'prismjs/components/prism-docker';
import 'prismjs/components/prism-ini';
import 'prismjs/components/prism-toml';
import 'prismjs/components/prism-markup';

import { api } from '../../api/client';
import { FileRecord } from '../../types';

interface FilePreviewModalProps {
  file: FileRecord | null;
  onClose: () => void;
  onSaved: (updatedFile: FileRecord) => void;
}

const isEditableType = (ext: string): boolean => {
  const e = ext.toLowerCase();
  return (
    ['json', 'md', 'markdown', 'txt'].includes(e) ||
    ['go', 'py', 'js', 'ts', 'tsx', 'jsx', 'yml', 'yaml', 'sh', 'sql', 'html', 'css', 'env', 'toml', 'xml', 'ini', 'rs', 'java', 'c', 'cpp'].includes(e)
  );
};

const isImageType = (ext: string, mime: string): boolean => {
  const e = ext.toLowerCase();
  return ['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp', 'ico', 'bmp'].includes(e) || mime.startsWith('image/');
};

const isPdfType = (ext: string): boolean => {
  return ext.toLowerCase() === 'pdf';
};

const isOfficeType = (ext: string): boolean => {
  const e = ext.toLowerCase();
  return ['doc', 'docx', 'ppt', 'pptx', 'xls', 'xlsx'].includes(e);
};

const getPrismLang = (ext: string): string => {
  const e = ext.toLowerCase();
  switch (e) {
    case 'go': return 'go';
    case 'py': return 'python';
    case 'js': case 'jsx': return 'javascript';
    case 'ts': case 'tsx': return 'typescript';
    case 'json': return 'json';
    case 'yml': case 'yaml': return 'yaml';
    case 'sh': case 'bash': case 'zsh': return 'bash';
    case 'sql': return 'sql';
    case 'md': case 'markdown': return 'markdown';
    case 'html': case 'xml': case 'svg': return 'markup';
    case 'css': return 'css';
    case 'dockerfile': return 'docker';
    case 'ini': case 'conf': case 'env': return 'ini';
    case 'toml': return 'toml';
    default: return 'text';
  }
};

const highlightCode = (code: string, ext: string): string => {
  let processed = code;
  if (ext.toLowerCase() === 'json') {
    try {
      processed = JSON.stringify(JSON.parse(code), null, 2);
    } catch {}
  }

  const lang = getPrismLang(ext);
  const grammar = Prism.languages[lang];
  if (grammar) {
    try {
      return Prism.highlight(processed, grammar, lang);
    } catch {
      // fallback
    }
  }
  return processed.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
};

// ==========================================
// 1. Hierarchical Interactive JSON Tree Node
// ==========================================
const JsonTreeNode: React.FC<{
  keyName?: string;
  value: any;
  depth?: number;
}> = ({ keyName, value, depth = 0 }) => {
  const [collapsed, setCollapsed] = useState<boolean>(depth > 2); // Auto fold deep levels

  const isObject = value !== null && typeof value === 'object' && !Array.isArray(value);
  const isArray = Array.isArray(value);

  if (isArray) {
    return (
      <div className="font-mono text-xs leading-relaxed py-0.5">
        <div className="flex items-center gap-1.5 hover:bg-[#18181b]/70 rounded px-1.5 py-0.5 transition-colors group">
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="w-4 h-4 rounded hover:bg-[#27272a] flex items-center justify-center text-zinc-500 hover:text-white transition-colors"
          >
            {collapsed ? <ChevronRight className="w-3 h-3 text-purple-400" /> : <ChevronDown className="w-3 h-3 text-purple-400" />}
          </button>
          {keyName !== undefined && (
            <span className="text-blue-400 font-semibold tracking-wide">"{keyName}": </span>
          )}
          <span className="text-zinc-500 font-bold">[</span>
          {collapsed ? (
            <span
              onClick={() => setCollapsed(false)}
              className="text-zinc-400 hover:text-white text-[11px] cursor-pointer bg-[#18181b] px-2 py-0.5 rounded border border-[#27272a] transition-all font-mono"
            >
              {value.length} 项 ... ]
            </span>
          ) : (
            <span className="text-zinc-500 text-[10px] font-sans">({value.length} 个元素)</span>
          )}
        </div>

        {!collapsed && (
          <div className="ml-5 pl-3 border-l-2 border-zinc-800/80 hover:border-purple-500/40 transition-colors space-y-0.5 my-0.5">
            {value.map((item: any, idx: number) => (
              <JsonTreeNode key={idx} keyName={String(idx)} value={item} depth={depth + 1} />
            ))}
            <div className="text-zinc-500 font-bold ml-1">]</div>
          </div>
        )}
      </div>
    );
  }

  if (isObject) {
    const keys = Object.keys(value);
    return (
      <div className="font-mono text-xs leading-relaxed py-0.5">
        <div className="flex items-center gap-1.5 hover:bg-[#18181b]/70 rounded px-1.5 py-0.5 transition-colors group">
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="w-4 h-4 rounded hover:bg-[#27272a] flex items-center justify-center text-zinc-500 hover:text-white transition-colors"
          >
            {collapsed ? <ChevronRight className="w-3 h-3 text-blue-400" /> : <ChevronDown className="w-3 h-3 text-blue-400" />}
          </button>
          {keyName !== undefined && (
            <span className="text-blue-400 font-semibold tracking-wide">"{keyName}": </span>
          )}
          <span className="text-zinc-500 font-bold">{'{'}</span>
          {collapsed ? (
            <span
              onClick={() => setCollapsed(false)}
              className="text-zinc-400 hover:text-white text-[11px] cursor-pointer bg-[#18181b] px-2 py-0.5 rounded border border-[#27272a] transition-all font-mono"
            >
              {keys.length} keys ... {'}'}
            </span>
          ) : (
            <span className="text-zinc-500 text-[10px] font-sans">({keys.length} 属性)</span>
          )}
        </div>

        {!collapsed && (
          <div className="ml-5 pl-3 border-l-2 border-zinc-800/80 hover:border-blue-500/40 transition-colors space-y-0.5 my-0.5">
            {keys.map((k) => (
              <JsonTreeNode key={k} keyName={k} value={value[k]} depth={depth + 1} />
            ))}
            <div className="text-zinc-500 font-bold ml-1">{'}'}</div>
          </div>
        )}
      </div>
    );
  }

  // Primitive Values
  const renderPrimitive = () => {
    if (typeof value === 'string') {
      return <span className="text-emerald-400 break-all">"{value}"</span>;
    }
    if (typeof value === 'number') {
      return <span className="text-amber-400 font-bold">{value}</span>;
    }
    if (typeof value === 'boolean') {
      return <span className="text-purple-400 font-bold">{value ? 'true' : 'false'}</span>;
    }
    if (value === null) {
      return <span className="text-rose-400 italic font-bold">null</span>;
    }
    return <span className="text-zinc-300">{String(value)}</span>;
  };

  return (
    <div className="flex items-start gap-1.5 hover:bg-[#18181b]/70 rounded px-1.5 py-0.5 font-mono text-xs ml-5 transition-colors">
      {keyName !== undefined && (
        <span className="text-blue-300/90 font-medium shrink-0">"{keyName}": </span>
      )}
      {renderPrimitive()}
    </div>
  );
};

// JSON Tree Container with Global Controls
const JsonTreeViewer: React.FC<{ jsonString: string }> = ({ jsonString }) => {
  const parsedData = useMemo(() => {
    try {
      return JSON.parse(jsonString);
    } catch {
      return null;
    }
  }, [jsonString]);

  if (!parsedData) {
    return (
      <div className="p-8 text-center text-rose-400 text-xs font-mono">
        ❌ JSON 解析失败，格式存在语法错误。
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto p-6 bg-[#09090b] text-zinc-300 select-text font-mono text-xs">
      <JsonTreeNode value={parsedData} depth={0} />
    </div>
  );
};

// ==========================================
// 2. Syntax-Highlighted Code Viewer with Visual Indentation Guides
// ==========================================
const HighlightedCodeViewer: React.FC<{ code: string; ext: string }> = ({ code, ext }) => {
  const formattedCode = useMemo(() => {
    if (ext.toLowerCase() === 'json') {
      try {
        return JSON.stringify(JSON.parse(code), null, 2);
      } catch {
        return code;
      }
    }
    return code;
  }, [code, ext]);

  const highlighted = highlightCode(formattedCode, ext);
  const lines = highlighted.split('\n');

  return (
    <div className="flex-1 overflow-auto bg-[#09090b] flex font-mono text-xs select-text">
      {/* Line Numbers */}
      <div className="w-12 bg-[#0d0d10] border-r border-[#27272a] py-6 text-right pr-3 select-none text-zinc-600 space-y-0 shrink-0">
        {lines.map((_, idx) => (
          <div key={idx} className="h-5 flex items-center justify-end text-[11px]">
            {idx + 1}
          </div>
        ))}
      </div>

      {/* Code Lines with Visual Indentation Guides */}
      <div className="flex-1 p-6 overflow-x-auto text-zinc-200">
        {lines.map((lineHtml, idx) => {
          // Count leading spaces to render visual indentation lines
          const plainLine = formattedCode.split('\n')[idx] || '';
          const matchSpaces = plainLine.match(/^( +)/);
          const spaceCount = matchSpaces ? matchSpaces[1].length : 0;
          const indentLevels = Math.floor(spaceCount / 2);

          return (
            <div
              key={idx}
              className="h-5 flex items-center whitespace-pre hover:bg-[#18181b]/50 transition-colors relative"
            >
              {/* Indent Guide Lines */}
              {Array.from({ length: indentLevels }).map((_, iIdx) => (
                <span
                  key={iIdx}
                  className="absolute h-full border-l border-zinc-800/80 pointer-events-none"
                  style={{ left: `${iIdx * 16}px` }}
                />
              ))}

              <span
                dangerouslySetInnerHTML={{ __html: lineHtml || '&nbsp;' }}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ==========================================
// 3. Markdown Renderer with Embedded Syntax Highlighting
// ==========================================
const SimpleMarkdownViewer: React.FC<{ content: string }> = ({ content }) => {
  const renderLines = () => {
    const lines = content.split('\n');
    const elements: React.ReactNode[] = [];
    let inCodeBlock = false;
    let codeBlockLang = '';
    let codeBlockLines: string[] = [];
    let tableLines: string[] = [];

    const flushTable = (key: number) => {
      if (tableLines.length === 0) return null;
      const rows = tableLines.map((row) =>
        row
          .split('|')
          .map((cell) => cell.trim())
          .filter((cell, idx, arr) => (idx !== 0 && idx !== arr.length - 1) || cell !== '')
      );
      tableLines = [];
      if (rows.length === 0) return null;

      const headerRow = rows[0];
      const dataRows = rows.slice(1).filter((r) => !r.every((c) => c.replace(/[-: ]/g, '') === ''));

      return (
        <div key={`table-${key}`} className="my-4 overflow-x-auto rounded-xl border border-[#27272a] shadow-sm">
          <table className="w-full text-left text-xs border-collapse bg-[#121215]">
            <thead>
              <tr className="bg-[#18181b] border-b border-[#27272a] text-zinc-300 font-bold">
                {headerRow.map((cell, cIdx) => (
                  <th key={cIdx} className="p-3 border-r border-[#27272a]/50 last:border-0">
                    {cell}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#27272a]/60">
              {dataRows.map((row, rIdx) => (
                <tr key={rIdx} className="hover:bg-[#18181b]/40 transition-colors">
                  {row.map((cell, cIdx) => (
                    <td key={cIdx} className="p-2.5 border-r border-[#27272a]/30 last:border-0 text-zinc-300 font-mono text-[11px]">
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    };

    lines.forEach((line, idx) => {
      // Code Block Detection
      if (line.trim().startsWith('```')) {
        if (inCodeBlock) {
          const rawCode = codeBlockLines.join('\n');
          const highlightedCode = highlightCode(rawCode, codeBlockLang || 'bash');

          elements.push(
            <div key={`code-${idx}`} className="my-3.5 rounded-xl bg-[#0d0d10] border border-[#27272a] overflow-hidden shadow-md">
              <div className="px-4 py-1.5 bg-[#16161b] border-b border-[#27272a] text-[10px] font-mono text-zinc-400 flex items-center justify-between">
                <span className="text-purple-400 font-bold uppercase">{codeBlockLang || 'code'}</span>
                <span className="text-zinc-600">{codeBlockLines.length} 行</span>
              </div>
              <pre
                className="p-4 text-xs font-mono overflow-x-auto leading-relaxed text-zinc-200"
                dangerouslySetInnerHTML={{ __html: highlightedCode }}
              />
            </div>
          );
          inCodeBlock = false;
          codeBlockLines = [];
          codeBlockLang = '';
        } else {
          inCodeBlock = true;
          codeBlockLang = line.trim().slice(3).trim();
          codeBlockLines = [];
        }
        return;
      }

      if (inCodeBlock) {
        codeBlockLines.push(line);
        return;
      }

      // Table Detection
      if (line.trim().startsWith('|') && line.trim().endsWith('|')) {
        tableLines.push(line);
        return;
      } else if (tableLines.length > 0) {
        const tableElem = flushTable(idx);
        if (tableElem) elements.push(tableElem);
      }

      // Headings
      if (line.startsWith('# ')) {
        elements.push(
          <h1 key={idx} className="text-lg font-bold text-white mt-6 mb-3 pb-2 border-b border-[#27272a] flex items-center gap-2">
            <span className="text-purple-400">#</span> {line.replace(/^#\s+/, '')}
          </h1>
        );
        return;
      }
      if (line.startsWith('## ')) {
        elements.push(
          <h2 key={idx} className="text-sm font-bold text-white mt-5 mb-2 flex items-center gap-2">
            <span className="text-blue-400">##</span> {line.replace(/^##\s+/, '')}
          </h2>
        );
        return;
      }
      if (line.startsWith('### ')) {
        elements.push(
          <h3 key={idx} className="text-xs font-bold text-zinc-200 mt-4 mb-1.5 flex items-center gap-1.5">
            <span className="text-emerald-400">###</span> {line.replace(/^###\s+/, '')}
          </h3>
        );
        return;
      }

      // Horizontal Rule
      if (line.trim() === '---' || line.trim() === '***') {
        elements.push(<hr key={idx} className="my-4 border-[#27272a]" />);
        return;
      }

      // Blockquote
      if (line.startsWith('> ')) {
        elements.push(
          <div key={idx} className="my-2.5 pl-3.5 py-1.5 border-l-2 border-purple-500 bg-purple-500/5 rounded-r-lg text-xs text-zinc-300 italic">
            {line.replace(/^>\s+/, '')}
          </div>
        );
        return;
      }

      // Checklist item
      if (/^-\s+\[([ xX])\]\s+/.test(line)) {
        const checked = /^-\s+\[[xX]\]/.test(line);
        const text = line.replace(/^-\s+\[([ xX])\]\s+/, '');
        elements.push(
          <div key={idx} className="flex items-center gap-2 text-xs py-0.5 text-zinc-300">
            <input type="checkbox" checked={checked} readOnly className="rounded border-zinc-700 text-purple-500 focus:ring-0 bg-[#18181b]" />
            <span className={checked ? 'line-through text-zinc-500' : ''}>{text}</span>
          </div>
        );
        return;
      }

      // Unordered list
      if (line.startsWith('- ') || line.startsWith('* ')) {
        elements.push(
          <div key={idx} className="flex items-start gap-2 text-xs py-0.5 text-zinc-300 ml-2">
            <span className="text-purple-400 font-bold mt-0.5">•</span>
            <span>{line.replace(/^[-*]\s+/, '')}</span>
          </div>
        );
        return;
      }

      // Empty line
      if (!line.trim()) {
        elements.push(<div key={idx} className="h-2" />);
        return;
      }

      // Paragraph
      elements.push(
        <p key={idx} className="text-xs text-zinc-300 leading-relaxed my-1">
          {line}
        </p>
      );
    });

    if (tableLines.length > 0) {
      const tableElem = flushTable(lines.length);
      if (tableElem) elements.push(tableElem);
    }

    return elements;
  };

  return <div className="space-y-1">{renderLines()}</div>;
};

// ==========================================
// Main File Preview Modal
// ==========================================
export const FilePreviewModal: React.FC<FilePreviewModalProps> = ({
  file,
  onClose,
  onSaved,
}) => {
  const [content, setContent] = useState<string>('');
  const [originalContent, setOriginalContent] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  // View Modes: 'tree' (for JSON), 'preview' (formatted), 'edit' (editor)
  const [viewMode, setViewMode] = useState<'tree' | 'preview' | 'edit'>('preview');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (text: string) => {
    setToastMessage(text);
    setTimeout(() => setToastMessage(null), 2000);
  };

  useEffect(() => {
    if (!file) return;

    if (isEditableType(file.ext)) {
      setLoading(true);
      api
        .getFileContent(file.id)
        .then((res) => {
          let initialContent = res.content;
          if (file.ext.toLowerCase() === 'json') {
            try {
              initialContent = JSON.stringify(JSON.parse(res.content), null, 2);
            } catch {}
            setViewMode('tree'); // Default JSON to tree view!
          } else {
            setViewMode('preview');
          }

          setContent(initialContent);
          setOriginalContent(initialContent);
        })
        .catch((err) => {
          showToast(`获取文件内容失败: ${err.message}`);
        })
        .finally(() => {
          setLoading(false);
        });
    }
  }, [file]);

  if (!file) return null;

  const handleSave = async () => {
    setSaving(true);
    try {
      const updated = await api.updateFileContent(file.id, content);
      setOriginalContent(content);
      showToast('🎉 文件已成功保存并实时同步至 MinIO！');
      onSaved(updated);
    } catch (err: any) {
      showToast(`保存失败: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleCopyLink = async () => {
    const fullUrl = file.url.startsWith('http') ? file.url : `${window.location.origin}${file.url}`;
    await navigator.clipboard.writeText(fullUrl);
    setCopied(true);
    showToast('直链已复制');
    setTimeout(() => setCopied(false), 1800);
  };

  const handleFormatJSON = () => {
    try {
      const parsed = JSON.parse(content);
      setContent(JSON.stringify(parsed, null, 2));
      showToast('JSON 格式化成功');
    } catch (e) {
      showToast('JSON 解析失败，请检查语法');
    }
  };

  const isEditable = isEditableType(file.ext);
  const isImage = isImageType(file.ext, file.mime_type);
  const isPdf = isPdfType(file.ext);
  const isOffice = isOfficeType(file.ext);
  const isMarkdown = file.ext.toLowerCase() === 'md' || file.ext.toLowerCase() === 'markdown';
  const isJSON = file.ext.toLowerCase() === 'json';
  const hasUnsavedChanges = content !== originalContent;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 select-none animate-in fade-in duration-150">
      {/* Toast */}
      {toastMessage && (
        <div className="fixed top-6 right-8 z-50 px-4 py-2 rounded-xl text-xs font-medium bg-[#1c1c22] text-white border border-emerald-500/40 shadow-2xl flex items-center gap-2 animate-in fade-in duration-150">
          <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      <div className="w-full max-w-5xl h-[88vh] bg-[#121215] border border-[#27272a] rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Modal Header */}
        <div className="px-6 py-3.5 border-b border-[#27272a] bg-[#16161b] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2 rounded-lg bg-[#18181b] border border-[#27272a] text-blue-400 shrink-0">
              {isImage ? <FileImage className="w-4 h-4 text-emerald-400" /> : isEditable ? <FileCode className="w-4 h-4 text-sky-400" /> : <FileText className="w-4 h-4 text-purple-400" />}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-white truncate max-w-md">{file.file_name}</h3>
                {hasUnsavedChanges && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/30 font-mono">
                    未保存
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 text-[10px] font-mono text-zinc-500 mt-0.5">
                <span className="uppercase text-purple-400 font-bold">{file.ext}</span>
                <span>·</span>
                <span className="text-zinc-400 uppercase">{getPrismLang(file.ext)} 语法高亮</span>
                <span>·</span>
                <span>{file.bucket}/{file.object_key}</span>
              </div>
            </div>
          </div>

          {/* Header Action Buttons */}
          <div className="flex items-center gap-2">
            {/* JSON Dedicated View Modes: Tree vs Code vs Edit */}
            {isJSON && (
              <div className="flex items-center p-0.5 rounded-lg bg-[#18181b] border border-[#27272a] text-xs">
                <button
                  onClick={() => setViewMode('tree')}
                  className={`px-2.5 py-1 rounded-md transition-all flex items-center gap-1 ${
                    viewMode === 'tree' ? 'bg-[#27272a] text-white font-medium shadow-sm' : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                  title="树形层级折叠展开视图"
                >
                  <ListTree className="w-3.5 h-3.5 text-blue-400" />
                  <span>树形层级</span>
                </button>
                <button
                  onClick={() => setViewMode('preview')}
                  className={`px-2.5 py-1 rounded-md transition-all flex items-center gap-1 ${
                    viewMode === 'preview' ? 'bg-[#27272a] text-white font-medium shadow-sm' : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                  title="代码高亮与缩进参考线视图"
                >
                  <Code2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>代码高亮</span>
                </button>
                <button
                  onClick={() => setViewMode('edit')}
                  className={`px-2.5 py-1 rounded-md transition-all flex items-center gap-1 ${
                    viewMode === 'edit' ? 'bg-[#27272a] text-white font-medium shadow-sm' : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                  title="在线修改 JSON 源码"
                >
                  <Edit3 className="w-3.5 h-3.5 text-purple-400" />
                  <span>在线编辑</span>
                </button>
              </div>
            )}

            {/* Markdown View Modes: Render vs Edit */}
            {isMarkdown && (
              <div className="flex items-center p-0.5 rounded-lg bg-[#18181b] border border-[#27272a] text-xs">
                <button
                  onClick={() => setViewMode('preview')}
                  className={`px-2.5 py-1 rounded-md transition-all flex items-center gap-1 ${
                    viewMode === 'preview' ? 'bg-[#27272a] text-white font-medium shadow-sm' : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  <Eye className="w-3 h-3 text-purple-400" />
                  <span>渲染预览</span>
                </button>
                <button
                  onClick={() => setViewMode('edit')}
                  className={`px-2.5 py-1 rounded-md transition-all flex items-center gap-1 ${
                    viewMode === 'edit' ? 'bg-[#27272a] text-white font-medium shadow-sm' : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  <Edit3 className="w-3 h-3 text-blue-400" />
                  <span>编辑源码</span>
                </button>
              </div>
            )}

            {/* Other Code/Config View Modes: Preview vs Edit */}
            {isEditable && !isJSON && !isMarkdown && (
              <div className="flex items-center p-0.5 rounded-lg bg-[#18181b] border border-[#27272a] text-xs">
                <button
                  onClick={() => setViewMode('preview')}
                  className={`px-2.5 py-1 rounded-md transition-all flex items-center gap-1 ${
                    viewMode === 'preview' ? 'bg-[#27272a] text-white font-medium shadow-sm' : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  <Eye className="w-3 h-3 text-purple-400" />
                  <span>高亮预览</span>
                </button>
                <button
                  onClick={() => setViewMode('edit')}
                  className={`px-2.5 py-1 rounded-md transition-all flex items-center gap-1 ${
                    viewMode === 'edit' ? 'bg-[#27272a] text-white font-medium shadow-sm' : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  <Edit3 className="w-3 h-3 text-blue-400" />
                  <span>在线编辑</span>
                </button>
              </div>
            )}

            {/* JSON Beautify */}
            {isJSON && (
              <button
                onClick={handleFormatJSON}
                className="px-2.5 py-1 rounded-lg bg-[#18181b] hover:bg-[#27272a] text-zinc-300 text-xs font-mono border border-[#27272a] transition-all"
                title="格式化缩进 JSON"
              >
                格式化缩进
              </button>
            )}

            {/* Save Button for Editable Files */}
            {isEditable && (
              <button
                onClick={handleSave}
                disabled={saving || !hasUnsavedChanges}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium flex items-center gap-1.5 transition-all ${
                  hasUnsavedChanges
                    ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-500/20'
                    : 'bg-[#18181b] text-zinc-500 border border-[#27272a] cursor-not-allowed'
                }`}
              >
                {saving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                <span>{saving ? '保存中...' : '保存至 MinIO'}</span>
              </button>
            )}

            {/* Copy Link */}
            <button
              onClick={handleCopyLink}
              className="p-1.5 rounded-xl bg-[#18181b] hover:bg-[#27272a] text-zinc-400 hover:text-white border border-[#27272a] transition-all"
              title="复制直链"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            </button>

            {/* Download */}
            <a
              href={file.url}
              target="_blank"
              rel="noopener noreferrer"
              download={file.file_name}
              className="p-1.5 rounded-xl bg-[#18181b] hover:bg-[#27272a] text-blue-400 hover:text-white border border-[#27272a] transition-all"
              title="下载原文件"
            >
              <Download className="w-4 h-4" />
            </a>

            {/* Close */}
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl bg-[#18181b] hover:bg-[#27272a] text-zinc-400 hover:text-white border border-[#27272a] transition-all ml-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Modal Body / Viewer Content */}
        <div className="flex-1 overflow-hidden bg-[#09090b] relative flex flex-col">
          {loading ? (
            <div className="flex-1 flex items-center justify-center text-xs text-zinc-500 gap-2">
              <RefreshCw className="w-5 h-5 animate-spin text-blue-400" />
              <span>正在从 MinIO 读取文件内容...</span>
            </div>
          ) : isImage ? (
            /* Image Preview */
            <div className="flex-1 flex items-center justify-center p-6 overflow-auto bg-[#0a0a0d]">
              <img
                src={file.url}
                alt={file.file_name}
                className="max-h-full max-w-full object-contain rounded-lg shadow-2xl border border-[#27272a]"
              />
            </div>
          ) : isPdf ? (
            /* PDF Preview */
            <div className="flex-1 w-full h-full bg-[#18181b]">
              <iframe
                src={file.url}
                title={file.file_name}
                className="w-full h-full border-0"
              />
            </div>
          ) : isOffice ? (
            /* Office Documents (Word / Excel / PPT) Preview */
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
                <File className="w-8 h-8" />
              </div>
              <div className="max-w-md">
                <h4 className="text-base font-bold text-white">{file.file_name}</h4>
                <p className="text-xs text-zinc-400 mt-1">
                  微软 Office 文档 ({file.ext.toUpperCase()}) 已安全持久化存储在 MinIO。你可以直接下载原文件查看。
                </p>
              </div>
              <div className="flex items-center gap-3 pt-2">
                <a
                  href={file.url}
                  download={file.file_name}
                  className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-medium flex items-center gap-2 shadow-lg shadow-purple-500/20 transition-all"
                >
                  <Download className="w-4 h-4" />
                  <span>下载原文件</span>
                </a>
              </div>
            </div>
          ) : isJSON && viewMode === 'tree' ? (
            /* 1. Hierarchical Interactive JSON Tree */
            <JsonTreeViewer jsonString={content} />
          ) : isMarkdown && viewMode === 'preview' ? (
            /* 2. Rich Formatted Markdown Preview */
            <div className="flex-1 overflow-y-auto p-8 max-w-none text-zinc-200">
              <SimpleMarkdownViewer content={content} />
            </div>
          ) : isEditable && viewMode === 'preview' ? (
            /* 3. Syntax-Highlighted Code/JSON with Line Numbers & Visual Indent Guides */
            <HighlightedCodeViewer code={content} ext={file.ext} />
          ) : isEditable && viewMode === 'edit' ? (
            /* 4. Full Code / JSON / Text Editor with Line Numbers */
            <div className="flex-1 flex overflow-hidden">
              <div className="w-12 bg-[#0d0d10] border-r border-[#27272a] py-6 text-right pr-3 select-none font-mono text-xs text-zinc-600 space-y-0 shrink-0">
                {content.split('\n').map((_, idx) => (
                  <div key={idx} className="h-5 flex items-center justify-end text-[11px]">
                    {idx + 1}
                  </div>
                ))}
              </div>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="请输入文件内容..."
                className="flex-1 bg-[#09090b] text-[#f4f4f5] font-mono text-xs p-6 outline-none resize-none leading-relaxed selection:bg-blue-500/30 selection:text-white"
                spellCheck={false}
              />
            </div>
          ) : (
            /* Fallback Viewer */
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-3">
              <FileText className="w-12 h-12 text-zinc-600" />
              <div className="text-sm font-bold text-white">{file.file_name}</div>
              <p className="text-xs text-zinc-400">该格式暂不支持直接内联预览，请点击下载查看。</p>
              <a
                href={file.url}
                download={file.file_name}
                className="px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-medium flex items-center gap-1.5"
              >
                <Download className="w-4 h-4" />
                <span>下载文件</span>
              </a>
            </div>
          )}
        </div>

        {/* Modal Footer / Status Bar */}
        <div className="px-6 py-2.5 border-t border-[#27272a] bg-[#16161b] flex items-center justify-between text-[11px] font-mono text-zinc-500 shrink-0">
          <div className="flex items-center gap-3">
            <span>语言: <strong className="text-blue-400 uppercase">{getPrismLang(file.ext)}</strong></span>
            <span>大小: <strong className="text-zinc-300">{(file.file_size / 1024).toFixed(2)} KB</strong></span>
            {isEditable && (
              <span>行数: <strong className="text-zinc-300">{content.split('\n').length} 行</strong></span>
            )}
            {isEditable && (
              <span>字符数: <strong className="text-zinc-300">{content.length}</strong></span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {isEditable && hasUnsavedChanges && (
              <span className="text-amber-400 font-sans text-xs">⚠️ 有未保存的修改</span>
            )}
            <button
              onClick={onClose}
              className="px-3 py-1 rounded-lg bg-[#27272a] hover:bg-[#3f3f46] text-white text-xs font-medium transition-all"
            >
              关闭
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
