import React, { useState, useEffect } from 'react';
import { MemberId, MEMBERS, RoleId } from '../types';
import { Share2, Check, Type } from 'lucide-react';

export type ActiveTab = 'gantt' | 'practice' | 'scripts' | 'discussion';
export type FontSizeLevel = 'standard' | 'large';

interface TopHeaderProps {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  currentRole: RoleId;
  guestName: string;
  onOpenRoleModal: () => void;
}

export const TopHeader: React.FC<TopHeaderProps> = ({
  activeTab,
  onTabChange,
  currentRole,
  guestName,
  onOpenRoleModal,
}) => {
  const currentMember = currentRole !== 'guest' ? MEMBERS[currentRole as MemberId] : null;
  const [copied, setCopied] = useState(false);
  const [fontSize, setFontSize] = useState<FontSizeLevel>(() => {
    const saved = localStorage.getItem('sgi_font_size');
    return saved === 'large' ? 'large' : 'standard';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-font-size', fontSize);
    localStorage.setItem('sgi_font_size', fontSize);
  }, [fontSize]);

  const cycleFontSize = () => {
    setFontSize((prev) => (prev === 'standard' ? 'large' : 'standard'));
  };

  const getFontSizeLabel = () => {
    return fontSize === 'large' ? '字體: 20(大)' : '字體: 16(適中)';
  };

  const handleShare = async () => {
    const shareUrl = window.location.href;
    const shareData = {
      title: '創價總會司儀排程與講稿',
      text: '創價學會總會 司儀小組排練時間與最新司儀稿，請點擊連結填寫空檔或查看：',
      url: shareUrl,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
        return;
      } catch {
        // Fallback to clipboard
      }
    }

    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Fallback prompt
      window.prompt('請複製以下分享網址：', shareUrl);
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-[#fbf9f5]/95 backdrop-blur-md border-b border-stone-300 shadow-2xs">
      <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between gap-2.5">
        {/* Title */}
        <div className="flex items-center gap-2 shrink-0">
          <span className="font-extrabold text-stone-900 text-lg sm:text-xl tracking-tight">
            創價總會司儀排程
          </span>
        </div>

        {/* Desktop Tabs */}
        <nav className="hidden sm:flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => onTabChange('gantt')}
            className={`px-4 py-2 text-base font-semibold rounded-xl transition-colors cursor-pointer ${
              activeTab === 'gantt'
                ? 'bg-stone-300/80 text-stone-950 shadow-2xs'
                : 'text-stone-700 hover:text-stone-950 hover:bg-stone-200/60'
            }`}
          >
            空檔甘特圖
          </button>
          <button
            type="button"
            onClick={() => onTabChange('practice')}
            className={`px-4 py-2 text-base font-semibold rounded-xl transition-colors cursor-pointer ${
              activeTab === 'practice'
                ? 'bg-stone-300/80 text-stone-950 shadow-2xs'
                : 'text-stone-700 hover:text-stone-950 hover:bg-stone-200/60'
            }`}
          >
            下次練習
          </button>
          <button
            type="button"
            onClick={() => onTabChange('scripts')}
            className={`px-4 py-2 text-base font-semibold rounded-xl transition-colors cursor-pointer ${
              activeTab === 'scripts'
                ? 'bg-stone-300/80 text-stone-950 shadow-2xs'
                : 'text-stone-700 hover:text-stone-950 hover:bg-stone-200/60'
            }`}
          >
            司儀稿文件
          </button>
          <button
            type="button"
            onClick={() => onTabChange('discussion')}
            className={`px-4 py-2 text-base font-semibold rounded-xl transition-colors cursor-pointer ${
              activeTab === 'discussion'
                ? 'bg-stone-300/80 text-stone-950 shadow-2xs'
                : 'text-stone-700 hover:text-stone-950 hover:bg-stone-200/60'
            }`}
          >
            留言板
          </button>
        </nav>

        {/* Actions: Font-size switcher, Share & Switch role */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Quick font-size toggle */}
          <button
            type="button"
            onClick={cycleFontSize}
            className="flex items-center gap-1 px-2.5 py-1.5 text-xs sm:text-sm font-bold rounded-lg border border-stone-300 bg-amber-50/80 hover:bg-amber-100/80 text-amber-950 transition-colors cursor-pointer shadow-2xs"
            title="點擊切換字體大小（適中 / 大 / 特大）"
          >
            <Type className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-800" />
            <span>{getFontSizeLabel()}</span>
          </button>

          <button
            type="button"
            onClick={handleShare}
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg border border-stone-300 bg-white hover:bg-stone-50 transition-colors text-stone-800 cursor-pointer shadow-2xs font-medium"
            title="複製網址傳給其他人"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 text-emerald-600" />
                <span className="text-emerald-700 font-bold">已複製</span>
              </>
            ) : (
              <>
                <Share2 className="w-4 h-4 text-stone-600" />
                <span>分享</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={onOpenRoleModal}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm sm:text-base rounded-lg border border-stone-300 bg-white hover:bg-stone-50 transition-colors text-stone-900 cursor-pointer shadow-2xs"
            title="點擊切換角色"
          >
            <span className="font-bold">
              {currentMember ? `${currentMember.name}` : (guestName || '訪客')}
            </span>
            <span className="text-stone-600 text-xs sm:text-sm bg-stone-100 font-medium px-1.5 py-0.5 rounded">
              {currentMember ? currentMember.roleTitle : '切換'}
            </span>
          </button>
        </div>
      </div>

      {/* Mobile nav bar */}
      <div className="sm:hidden grid grid-cols-4 border-t border-stone-200 px-2 py-2 bg-[#fbf9f5] text-center gap-1.5">
        <button
          type="button"
          onClick={() => onTabChange('gantt')}
          className={`py-2 text-base rounded-xl transition-colors ${
            activeTab === 'gantt' ? 'bg-stone-300 text-stone-950 font-bold shadow-2xs' : 'text-stone-700 font-semibold'
          }`}
        >
          甘特圖
        </button>
        <button
          type="button"
          onClick={() => onTabChange('practice')}
          className={`py-2 text-base rounded-xl transition-colors ${
            activeTab === 'practice' ? 'bg-stone-300 text-stone-950 font-bold shadow-2xs' : 'text-stone-700 font-semibold'
          }`}
        >
          下次練習
        </button>
        <button
          type="button"
          onClick={() => onTabChange('scripts')}
          className={`py-2 text-base rounded-xl transition-colors ${
            activeTab === 'scripts' ? 'bg-stone-300 text-stone-950 font-bold shadow-2xs' : 'text-stone-700 font-semibold'
          }`}
        >
          司儀稿
        </button>
        <button
          type="button"
          onClick={() => onTabChange('discussion')}
          className={`py-2 text-base rounded-xl transition-colors ${
            activeTab === 'discussion' ? 'bg-stone-300 text-stone-950 font-bold shadow-2xs' : 'text-stone-700 font-semibold'
          }`}
        >
          留言板
        </button>
      </div>
    </header>
  );
};
