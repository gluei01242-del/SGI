import React, { useState } from 'react';
import { MemberId, MEMBERS, RoleId, ScriptDocument } from '../types';
import { Download, Upload, FileText, ExternalLink, Trash2, Plus, Clock, FileCheck, CheckCircle2 } from 'lucide-react';

interface ScriptDocumentsViewProps {
  scripts: ScriptDocument[];
  currentRole: RoleId;
  onAddScript: (scriptData: {
    version: string;
    title: string;
    fileName?: string;
    fileSize?: string;
    fileData?: string;
    mimeType?: string;
    cloudLink?: string;
    notes?: string;
    uploadedBy: string;
  }) => Promise<boolean | void>;
  onDeleteScript: (id: string) => void;
}

export const ScriptDocumentsView: React.FC<ScriptDocumentsViewProps> = ({
  scripts,
  currentRole,
  onAddScript,
  onDeleteScript,
}) => {
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [version, setVersion] = useState(`v${scripts.length + 1}.0`);
  const [title, setTitle] = useState('');
  const [cloudLink, setCloudLink] = useState('');
  const [notes, setNotes] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadSuccessMsg, setUploadSuccessMsg] = useState('');

  // Selected file
  const [selectedFile, setSelectedFile] = useState<{
    fileName: string;
    fileSize: string;
    fileData: string;
    mimeType: string;
  } | null>(null);

  const isCurrentMember = currentRole !== 'guest';
  const currentMember = isCurrentMember ? MEMBERS[currentRole as MemberId] : null;
  const latestScript = scripts.length > 0 ? scripts[0] : null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const sizeKb = Math.round(file.size / 1024);
    const sizeStr = sizeKb > 1024 ? `${(sizeKb / 1024).toFixed(1)} MB` : `${sizeKb} KB`;

    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      setSelectedFile({
        fileName: file.name,
        fileSize: sizeStr,
        fileData: base64,
        mimeType: file.type || 'application/octet-stream',
      });
      if (!title) {
        setTitle(file.name.replace(/\.[^/.]+$/, ''));
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile && !cloudLink.trim() && !title.trim()) return;

    setIsUploading(true);
    const uploader = currentMember ? currentMember.name : '訪客';

    try {
      await onAddScript({
        version: version.trim() || `v${scripts.length + 1}.0`,
        title: title.trim() || selectedFile?.fileName || '司儀稿最新版',
        fileName: selectedFile?.fileName,
        fileSize: selectedFile?.fileSize,
        fileData: selectedFile?.fileData,
        mimeType: selectedFile?.mimeType,
        cloudLink: cloudLink.trim(),
        notes: notes.trim(),
        uploadedBy: uploader,
      });

      setIsUploadOpen(false);
      setTitle('');
      setCloudLink('');
      setNotes('');
      setSelectedFile(null);
      setUploadSuccessMsg('司儀稿已成功儲存！');
      setTimeout(() => setUploadSuccessMsg(''), 3000);
    } catch {
      alert('上傳發生錯誤，請檢查檔案大小後再試一次！');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDownload = (script: ScriptDocument) => {
    // Direct endpoint download from server
    if (script.hasFile || script.fileData) {
      const downloadUrl = `/api/scripts/${script.id}/download`;
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = script.fileName || `${script.title}.docx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } else if (script.cloudLink) {
      window.open(script.cloudLink, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <div className="space-y-4">
      {/* Success notification */}
      {uploadSuccessMsg && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-xl text-sm font-medium flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{uploadSuccessMsg}</span>
        </div>
      )}

      {/* Latest Script Hero Card */}
      {latestScript ? (
        <div className="bg-white rounded-2xl border border-stone-200/90 p-4 sm:p-5 shadow-2xs space-y-3.5">
          <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-stone-100">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 rounded-md bg-stone-800 text-white text-xs sm:text-sm font-mono font-bold shadow-2xs">
                {latestScript.version} 最新版
              </span>
              <span className="text-xs sm:text-sm text-stone-600">
                上傳者：<strong className="text-stone-800">{latestScript.uploadedBy}</strong> ·{' '}
                {new Date(latestScript.uploadedAt).toLocaleDateString('zh-TW', {
                  month: 'numeric',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            </div>

            <button
              type="button"
              onClick={() => {
                setVersion(`v${scripts.length + 1}.0`);
                setIsUploadOpen(true);
              }}
              className="px-3 py-1.5 text-xs sm:text-sm rounded-lg border border-stone-300 bg-[#fbf9f5] hover:bg-stone-100 text-stone-800 font-semibold cursor-pointer shadow-2xs"
            >
              + 上傳新版本
            </button>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3.5">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <FileText className="w-6 h-6 text-stone-800 shrink-0" />
                <h3 className="text-lg sm:text-xl font-bold text-stone-900">{latestScript.title}</h3>
              </div>
              {latestScript.fileName && (
                <p className="text-xs sm:text-sm text-stone-600 font-mono pl-8">
                  檔案名稱：<strong className="text-stone-800">{latestScript.fileName}</strong> {latestScript.fileSize && `(${latestScript.fileSize})`}
                </p>
              )}
              {latestScript.notes && (
                <p className="text-xs sm:text-sm text-stone-700 pl-8 mt-1 leading-relaxed">
                  <strong className="text-stone-900 font-semibold">更新重點：</strong>
                  {latestScript.notes}
                </p>
              )}
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {(latestScript.hasFile || latestScript.fileData) && (
                <button
                  type="button"
                  onClick={() => handleDownload(latestScript)}
                  className="px-5 py-2.5 text-sm sm:text-base font-bold rounded-xl bg-stone-800 hover:bg-stone-700 text-white flex items-center gap-2 transition-colors cursor-pointer shadow-xs"
                >
                  <Download className="w-4 h-4" />
                  下載最新版司儀稿
                </button>
              )}

              {latestScript.cloudLink && (
                <a
                  href={latestScript.cloudLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2.5 text-sm font-semibold rounded-xl border border-stone-300 bg-white hover:bg-stone-50 text-stone-800 flex items-center gap-2 transition-colors"
                >
                  <ExternalLink className="w-4 h-4 text-stone-600" />
                  開啟雲端文件
                </a>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-stone-200 p-8 text-center space-y-3.5 shadow-2xs">
          <FileCheck className="w-10 h-10 text-stone-400 mx-auto" />
          <div>
            <h3 className="text-base sm:text-lg font-bold text-stone-900">目前尚未上傳司儀稿文件</h3>
            <p className="text-sm text-stone-600 mt-1">
              可上傳 Word、PDF 檔案或提供 Google 雲端文件連結，方便三人下載對詞
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setVersion('v1.0');
              setIsUploadOpen(true);
            }}
            className="px-5 py-2 text-sm font-bold rounded-xl bg-stone-800 hover:bg-stone-700 text-white inline-flex items-center gap-2 cursor-pointer shadow-xs"
          >
            <Upload className="w-4 h-4" />
            上傳最新版司儀稿
          </button>
        </div>
      )}

      {/* History Version List */}
      {scripts.length > 0 && (
        <div className="bg-white rounded-2xl border border-stone-200 p-4 sm:p-5 space-y-3 shadow-2xs">
          <div className="text-sm sm:text-base font-bold text-stone-800 pb-2 border-b border-stone-100 flex items-center justify-between">
            <span>歷史版本紀錄 ({scripts.length})</span>
            <span className="text-xs sm:text-sm text-stone-500 font-normal">可隨時下載先前版本對照</span>
          </div>

          <div className="space-y-2.5">
            {scripts.map((item, idx) => (
              <div
                key={item.id}
                className="p-3.5 rounded-xl border border-stone-200 bg-[#faf8f5] text-sm flex flex-col sm:flex-row sm:items-center justify-between gap-2.5"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-stone-900 bg-stone-200 px-2 py-0.5 rounded text-xs sm:text-sm">
                      {item.version}
                    </span>
                    <span className="font-bold text-stone-900 text-sm sm:text-base">{item.title}</span>
                    {idx === 0 && (
                      <span className="text-xs text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded font-bold border border-emerald-200">
                        最新
                      </span>
                    )}
                  </div>

                  <div className="text-xs sm:text-sm text-stone-600 mt-1 flex flex-wrap items-center gap-2">
                    <span>上傳：{item.uploadedBy}</span>
                    <span>·</span>
                    <span>
                      {new Date(item.uploadedAt).toLocaleDateString('zh-TW', {
                        month: 'numeric',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                    {item.fileName && (
                      <>
                        <span>·</span>
                        <span className="font-mono">{item.fileName}</span>
                      </>
                    )}
                  </div>

                  {item.notes && (
                    <div className="text-xs sm:text-sm text-stone-700 mt-1">備註：{item.notes}</div>
                  )}
                </div>

                <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                  {(item.hasFile || item.fileData) && (
                    <button
                      type="button"
                      onClick={() => handleDownload(item)}
                      className="px-3 py-1.5 text-xs sm:text-sm font-semibold rounded-lg border border-stone-300 bg-white hover:bg-stone-50 text-stone-800 flex items-center gap-1.5 cursor-pointer shadow-2xs"
                    >
                      <Download className="w-3.5 h-3.5" />
                      下載
                    </button>
                  )}

                  {item.cloudLink && (
                    <a
                      href={item.cloudLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 text-xs sm:text-sm font-medium rounded-lg border border-stone-300 bg-white hover:bg-stone-50 text-stone-800 flex items-center gap-1.5"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      開啟
                    </a>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      if (confirm('確定要刪除此版本司儀稿嗎？')) {
                        onDeleteScript(item.id);
                      }
                    }}
                    className="p-1.5 text-stone-400 hover:text-rose-600 rounded-lg cursor-pointer"
                    title="刪除"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Upload Script Modal */}
      {isUploadOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/40 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-stone-200 overflow-hidden">
            <div className="px-5 py-4 bg-[#fbf9f5] border-b border-stone-200 flex items-center justify-between">
              <h3 className="text-base font-bold text-stone-900">上傳 / 新增司儀稿文件</h3>
              <button
                type="button"
                disabled={isUploading}
                onClick={() => setIsUploadOpen(false)}
                className="text-stone-400 hover:text-stone-700 text-base p-1 rounded"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4 text-sm">
              {/* File upload input */}
              <div>
                <label className="block text-stone-800 font-semibold mb-1.5">
                  選擇文件檔案 (.docx, .pdf, .txt 等)
                </label>
                <input
                  type="file"
                  onChange={handleFileChange}
                  accept=".doc,.docx,.pdf,.txt,.odt,.pages"
                  disabled={isUploading}
                  className="w-full text-sm text-stone-700 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-stone-800 file:text-white hover:file:bg-stone-700 cursor-pointer"
                />
                {selectedFile && (
                  <p className="text-xs text-stone-600 font-mono mt-1.5">
                    已選取：{selectedFile.fileName} ({selectedFile.fileSize})
                  </p>
                )}
              </div>

              {/* Or Cloud Link */}
              <div>
                <label className="block text-stone-800 font-semibold mb-1.5">
                  或 Google Docs / 雲端連結 (選填)
                </label>
                <input
                  type="url"
                  value={cloudLink}
                  onChange={(e) => setCloudLink(e.target.value)}
                  placeholder="https://docs.google.com/document/..."
                  disabled={isUploading}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300 focus:outline-none focus:ring-1 focus:ring-stone-800 bg-white"
                />
              </div>

              {/* Version & Title */}
              <div className="grid grid-cols-3 gap-2.5">
                <div>
                  <label className="block text-stone-800 font-semibold mb-1.5">版本號</label>
                  <input
                    type="text"
                    value={version}
                    onChange={(e) => setVersion(e.target.value)}
                    placeholder="v1.0"
                    disabled={isUploading}
                    className="w-full px-3 py-2 text-sm font-mono rounded-lg border border-stone-300 focus:outline-none focus:ring-1 focus:ring-stone-800 bg-white"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-stone-800 font-semibold mb-1.5">文件名稱</label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="例如：總會司儀對詞稿_修訂版"
                    disabled={isUploading}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300 focus:outline-none focus:ring-1 focus:ring-stone-800 bg-white"
                  />
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-stone-800 font-semibold mb-1.5">修改重點備註 (選填)</label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="說明這次修改了哪些段落，方便大家對詞..."
                  disabled={isUploading}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300 focus:outline-none focus:ring-1 focus:ring-stone-800 bg-white"
                />
              </div>

              <div className="pt-3 border-t border-stone-200 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  disabled={isUploading}
                  onClick={() => setIsUploadOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-stone-600 hover:bg-stone-100 rounded-lg cursor-pointer disabled:opacity-50"
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={isUploading}
                  className="px-5 py-2 text-sm font-bold text-white bg-stone-800 hover:bg-stone-700 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 disabled:opacity-50 shadow-2xs"
                >
                  {isUploading ? '儲存中...' : '確認上傳'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
