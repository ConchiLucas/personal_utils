import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  UploadCloud,
  FileText,
  FileImage,
  FileCode,
  File as FileIcon,
  Trash2,
  Download,
  Copy,
  Check,
  Search,
  RefreshCw,
  HardDrive,
  Sparkles,
  Layers,
  Eye,
  Edit3
} from 'lucide-react';
import { api } from '../../api/client';
import { FileRecord } from '../../types';
import { FilePreviewModal } from './FilePreviewModal';

type CategoryFilter = 'all' | 'image' | 'doc' | 'json' | 'md' | 'code';

const formatBytes = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const formatDate = (dateStr: string): string => {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  return d.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
};

const getFileIcon = (ext: string, mime: string) => {
  const e = ext.toLowerCase();
  if (['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp', 'ico', 'bmp'].includes(e) || mime.startsWith('image/')) {
    return <FileImage className="w-4 h-4 text-emerald-400" />;
  }
  if (['json'].includes(e)) {
    return <FileCode className="w-4 h-4 text-amber-400" />;
  }
  if (['md', 'markdown'].includes(e)) {
    return <FileText className="w-4 h-4 text-blue-400" />;
  }
  if (['pdf', 'doc', 'docx', 'ppt', 'pptx', 'xls', 'xlsx', 'txt', 'csv'].includes(e)) {
    return <FileText className="w-4 h-4 text-purple-400" />;
  }
  if (['go', 'py', 'js', 'ts', 'tsx', 'jsx', 'yml', 'yaml', 'sh', 'sql', 'html', 'css', 'env', 'toml', 'xml', 'ini', 'rs', 'java', 'c', 'cpp'].includes(e)) {
    return <FileCode className="w-4 h-4 text-sky-400" />;
  }
  return <FileIcon className="w-4 h-4 text-zinc-400" />;
};

const matchesCategory = (file: FileRecord, cat: CategoryFilter): boolean => {
  if (cat === 'all') return true;
  const e = file.ext.toLowerCase();
  const m = file.mime_type.toLowerCase();

  switch (cat) {
    case 'image':
      return ['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp', 'ico', 'bmp'].includes(e) || m.startsWith('image/');
    case 'doc':
      // 微软家族 (word, ppt, excel) + PDF + TXT
      return ['pdf', 'doc', 'docx', 'ppt', 'pptx', 'xls', 'xlsx', 'txt', 'csv'].includes(e);
    case 'json':
      return e === 'json';
    case 'md':
      return ['md', 'markdown'].includes(e);
    case 'code':
      return ['go', 'py', 'js', 'ts', 'tsx', 'jsx', 'yml', 'yaml', 'sh', 'sql', 'html', 'css', 'env', 'toml', 'xml', 'ini', 'rs', 'java', 'c', 'cpp'].includes(e);
    default:
      return true;
  }
};

const isEditableType = (ext: string): boolean => {
  const e = ext.toLowerCase();
  return (
    ['json', 'md', 'markdown', 'txt'].includes(e) ||
    ['go', 'py', 'js', 'ts', 'tsx', 'jsx', 'yml', 'yaml', 'sh', 'sql', 'html', 'css', 'env', 'toml', 'xml', 'ini', 'rs', 'java', 'c', 'cpp'].includes(e)
  );
};

export const FileManager: React.FC = () => {
  const [files, setFiles] = useState<FileRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<CategoryFilter>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  // Preview & Edit Modal
  const [previewFile, setPreviewFile] = useState<FileRecord | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const showToast = (text: string) => {
    setToastMessage(text);
    setTimeout(() => setToastMessage(null), 2000);
  };

  const loadFiles = useCallback(async () => {
    setLoading(true);
    try {
      const list = await api.getFiles();
      setFiles(list);
    } catch (err: any) {
      console.error('Failed to load files:', err);
      showToast(`加载文件列表失败: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadFiles();
  }, [loadFiles]);

  const handleUpload = async (fileList: FileList | File[]) => {
    const validFiles = Array.from(fileList);
    if (validFiles.length === 0) return;

    setUploading(true);
    try {
      const uploaded = await api.uploadFiles(validFiles);
      showToast(`🎉 成功上传 ${uploaded.length} 个文件至 MinIO！`);
      loadFiles();
    } catch (err: any) {
      showToast(`上传失败: ${err.message}`);
    } finally {
      setUploading(false);
    }
  };

  // Drag & Drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleUpload(e.dataTransfer.files);
    }
  };

  // Clipboard Paste Support
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      if (e.clipboardData?.files && e.clipboardData.files.length > 0) {
        handleUpload(e.clipboardData.files);
      }
    };
    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, []);

  const handleDelete = async (id: number, name: string) => {
    if (!window.confirm(`确定要从 MinIO 和数据库中永久删除文件 "${name}" 吗？`)) {
      return;
    }
    setDeletingId(id);
    try {
      await api.deleteFile(id);
      showToast(`文件 "${name}" 已删除`);
      setFiles((prev) => prev.filter((f) => f.id !== id));
    } catch (err: any) {
      showToast(`删除失败: ${err.message}`);
    } finally {
      setDeletingId(null);
    }
  };

  const handleCopyLink = async (id: string, text: string) => {
    const fullUrl = text.startsWith('http') ? text : `${window.location.origin}${text}`;
    await navigator.clipboard.writeText(fullUrl);
    setCopiedId(id);
    showToast('下载/预览直链已复制到剪贴板');
    setTimeout(() => setCopiedId(null), 1800);
  };

  // Filtered files
  const filteredFiles = files.filter((f) => {
    const matchesSearch =
      !searchKeyword ||
      f.file_name.toLowerCase().includes(searchKeyword.toLowerCase()) ||
      f.ext.toLowerCase().includes(searchKeyword.toLowerCase()) ||
      f.object_key.toLowerCase().includes(searchKeyword.toLowerCase());
    const matchesCat = matchesCategory(f, selectedCategory);
    return matchesSearch && matchesCat;
  });

  const totalBytes = files.reduce((acc, f) => acc + (f.file_size || 0), 0);

  return (
    <div className="flex-1 flex flex-col bg-[#09090b] text-[#f4f4f5] overflow-hidden select-none h-full">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-16 right-8 z-50 px-4 py-2 rounded-xl text-xs font-medium bg-[#1c1c22] text-white border border-emerald-500/40 shadow-2xl flex items-center gap-2 animate-in fade-in duration-150">
          <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Hidden File Input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={(e) => {
          if (e.target.files) handleUpload(e.target.files);
        }}
        multiple
        className="hidden"
      />

      {/* Top Banner & Header */}
      <div className="px-6 py-4 border-b border-[#27272a] bg-gradient-to-r from-[#0e0e12] via-[#121217] to-[#0e0e12] shrink-0">
        <div className="max-w-[1920px] mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-600/10 border border-blue-500/20 flex items-center justify-center text-blue-400 font-bold shadow-sm">
              📁
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-bold text-white tracking-tight">文件管理与 MinIO 对象存储</h1>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono">
                  MinIO S3
                </span>
              </div>
              <p className="text-xs text-zinc-400 mt-0.5">
                支持图片、微软 Office/PDF/TXT 文档、JSON、Markdown 与代码配置的拖拽上传、在线预览与修改保存
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Storage Stats */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#18181b] border border-[#27272a] text-xs font-mono">
              <HardDrive className="w-3.5 h-3.5 text-zinc-400" />
              <span className="text-zinc-400">已存:</span>
              <span className="text-white font-bold">{files.length} 个文件</span>
              <span className="text-zinc-600">|</span>
              <span className="text-blue-400 font-bold">{formatBytes(totalBytes)}</span>
            </div>

            <button
              onClick={loadFiles}
              disabled={loading}
              className="p-2 rounded-xl bg-[#18181b] hover:bg-[#27272a] text-zinc-400 hover:text-white border border-[#27272a] transition-all"
              title="刷新列表"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-blue-400' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6 max-w-[1920px] mx-auto w-full">
        
        {/* Drag & Drop Upload Zone */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`relative border-2 border-dashed rounded-2xl p-6 transition-all cursor-pointer flex flex-col items-center justify-center text-center group ${
            isDragging
              ? 'border-blue-500 bg-blue-500/10 scale-[1.008] shadow-2xl shadow-blue-500/20'
              : 'border-[#27272a] hover:border-blue-500/50 bg-[#121215]/80 hover:bg-[#15151a]'
          }`}
        >
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${
            isDragging ? 'bg-blue-500 text-white animate-bounce' : 'bg-[#1c1c22] text-blue-400 group-hover:scale-110'
          }`}>
            <UploadCloud className="w-6 h-6" />
          </div>

          <div className="mt-3">
            <div className="text-sm font-bold text-white">
              {isDragging ? '释放鼠标，立即上传文件至 MinIO' : '将文件拖动到此处，即可直接上传'}
            </div>
            <div className="text-xs text-zinc-400 mt-1 flex items-center justify-center gap-2">
              <span>或点击选择文件</span>
              <span>·</span>
              <span>支持截图直接粘贴 (Ctrl/Cmd+V)</span>
              <span>·</span>
              <span>自动归档至 <code className="text-purple-300 font-mono">personal-files</code> 存储桶</span>
            </div>
          </div>

          {uploading && (
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm rounded-2xl flex items-center justify-center gap-2 text-xs font-bold text-blue-400">
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span>正在传输并持久化至 MinIO...</span>
            </div>
          )}
        </div>

        {/* Filter Toolbar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
          {/* Category Tabs: 全部, 图片, 文档, JSON, Markdown, 代码/配置 */}
          <div className="flex items-center gap-1 overflow-x-auto w-full sm:w-auto p-1 rounded-xl bg-[#121215] border border-[#27272a]">
            {[
              { key: 'all', label: '全部', icon: Layers },
              { key: 'image', label: '图片', icon: FileImage },
              { key: 'doc', label: '文档 (Office/PDF/TXT)', icon: FileText },
              { key: 'json', label: 'JSON', icon: FileCode },
              { key: 'md', label: 'Markdown', icon: FileText },
              { key: 'code', label: '代码/配置', icon: FileCode },
            ].map((tab) => {
              const Icon = tab.icon;
              const isSelected = selectedCategory === tab.key;
              return (
                <button
                  key={tab.key}
                  onClick={() => setSelectedCategory(tab.key as CategoryFilter)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all shrink-0 ${
                    isSelected
                      ? 'bg-blue-600/20 text-blue-400 border border-blue-500/40 shadow-sm'
                      : 'text-zinc-400 hover:text-white hover:bg-[#18181b]'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Search Box */}
          <div className="relative w-full sm:w-72">
            <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              placeholder="搜索文件名、格式或 Key..."
              className="w-full h-8 pl-8 pr-3 rounded-xl bg-[#18181b] border border-[#27272a] text-xs text-white placeholder:text-zinc-500 outline-none focus:border-blue-500 transition-all font-mono"
            />
          </div>
        </div>

        {/* File List Table */}
        <div className="bg-[#121215] border border-[#27272a] rounded-2xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-[#27272a] bg-[#16161b]/80 text-zinc-400 font-medium">
                  <th className="py-3 px-4 w-12 text-center">#</th>
                  <th className="py-3 px-4">文件名</th>
                  <th className="py-3 px-4">文件大小</th>
                  <th className="py-3 px-4">MinIO 存储路径 / Key</th>
                  <th className="py-3 px-4">上传/修改时间</th>
                  <th className="py-3 px-4 text-right">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#27272a]/60">
                {loading && files.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-zinc-500">
                      <RefreshCw className="w-5 h-5 animate-spin mx-auto text-blue-400 mb-2" />
                      正在加载文件列表...
                    </td>
                  </tr>
                ) : filteredFiles.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-zinc-500">
                      <UploadCloud className="w-8 h-8 mx-auto text-zinc-600 mb-2 opacity-50" />
                      暂无符合条件的文件，直接拖拽文件到上方即可上传！
                    </td>
                  </tr>
                ) : (
                  filteredFiles.map((file, idx) => {
                    const isEditable = isEditableType(file.ext);
                    return (
                      <tr
                        key={file.id}
                        className="hover:bg-[#18181b]/50 transition-colors group cursor-pointer"
                        onClick={() => setPreviewFile(file)}
                      >
                        <td className="py-3 px-4 text-center font-mono text-zinc-500 text-[11px]">
                          {idx + 1}
                        </td>

                        {/* File Name */}
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="p-2 rounded-lg bg-[#18181b] border border-[#27272a] shrink-0">
                              {getFileIcon(file.ext, file.mime_type)}
                            </div>
                            <div className="min-w-0">
                              <div className="font-bold text-white truncate max-w-[280px] sm:max-w-md group-hover:text-blue-400 transition-colors" title={file.file_name}>
                                {file.file_name}
                              </div>
                              <div className="flex items-center gap-2 text-[10px] text-zinc-500 font-mono mt-0.5">
                                <span className="uppercase px-1 py-0.2 rounded bg-[#18181b] border border-[#27272a] text-purple-400 font-bold">
                                  {file.ext || 'FILE'}
                                </span>
                                {isEditable && (
                                  <span className="text-[9px] px-1 py-0.2 rounded bg-sky-500/10 text-sky-400 border border-sky-500/20">
                                    支持编辑
                                  </span>
                                )}
                                <span className="truncate max-w-[150px]">{file.mime_type}</span>
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* File Size */}
                        <td className="py-3 px-4 font-mono text-zinc-300 font-semibold text-[11px] whitespace-nowrap">
                          {formatBytes(file.file_size)}
                        </td>

                        {/* MinIO Path / Key */}
                        <td className="py-3 px-4 font-mono text-zinc-400 text-[11px]">
                          <div className="flex items-center gap-1.5">
                            <span className="px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-400 border border-purple-500/20 text-[10px]">
                              {file.bucket}
                            </span>
                            <span className="truncate max-w-[200px] text-zinc-500" title={file.object_key}>
                              /{file.object_key}
                            </span>
                          </div>
                        </td>

                        {/* Upload Time */}
                        <td className="py-3 px-4 font-mono text-zinc-400 text-[11px] whitespace-nowrap">
                          {formatDate(file.updated_at || file.created_at)}
                        </td>

                        {/* Actions */}
                        <td className="py-3 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Preview / Edit Button */}
                            <button
                              onClick={() => setPreviewFile(file)}
                              className={`px-2.5 py-1 rounded-lg border text-xs font-medium transition-all flex items-center gap-1 ${
                                isEditable
                                  ? 'bg-sky-600/10 hover:bg-sky-600/20 text-sky-400 border-sky-500/30'
                                  : 'bg-purple-600/10 hover:bg-purple-600/20 text-purple-400 border-purple-500/30'
                              }`}
                              title={isEditable ? '在线编辑与预览' : '在线预览'}
                            >
                              {isEditable ? <Edit3 className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                              <span>{isEditable ? '编辑 / 预览' : '预览'}</span>
                            </button>

                            {/* Copy Link */}
                            <button
                              onClick={() => handleCopyLink(`link-${file.id}`, file.url)}
                              className="p-1.5 rounded-lg bg-[#18181b] hover:bg-[#27272a] text-zinc-400 hover:text-white border border-[#27272a] transition-all"
                              title="复制下载/预览直链"
                            >
                              {copiedId === `link-${file.id}` ? (
                                <Check className="w-3.5 h-3.5 text-emerald-400" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>

                            {/* Download */}
                            <a
                              href={file.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              download={file.file_name}
                              className="p-1.5 rounded-lg bg-[#18181b] hover:bg-[#27272a] text-zinc-400 hover:text-white border border-[#27272a] transition-all flex items-center gap-1"
                              title="下载原文件"
                            >
                              <Download className="w-3.5 h-3.5" />
                            </a>

                            {/* Delete */}
                            <button
                              onClick={() => handleDelete(file.id, file.file_name)}
                              disabled={deletingId === file.id}
                              className="p-1.5 rounded-lg bg-rose-600/10 hover:bg-rose-600/20 text-rose-400 border border-rose-500/30 transition-all disabled:opacity-50"
                              title="从 MinIO 与数据库删除"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      {/* File Preview & Edit Modal */}
      {previewFile && (
        <FilePreviewModal
          file={previewFile}
          onClose={() => setPreviewFile(null)}
          onSaved={(updated) => {
            setFiles((prev) =>
              prev.map((f) => (f.id === updated.id ? { ...f, ...updated } : f))
            );
            setPreviewFile(updated);
          }}
        />
      )}
    </div>
  );
};
