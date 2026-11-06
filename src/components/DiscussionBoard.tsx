import React, { useState } from 'react';
import { DiscussionPost, MemberId, MEMBERS, PostCategory, RoleId } from '../types';
import { Heart, Pin, Send, Trash2 } from 'lucide-react';

interface DiscussionBoardProps {
  posts: DiscussionPost[];
  currentRole: RoleId;
  guestName: string;
  onAddPost: (postData: {
    authorRole: RoleId;
    authorName: string;
    category: PostCategory;
    title: string;
    content: string;
  }) => void;
  onLikePost: (postId: string) => void;
  onPinPost: (postId: string) => void;
  onDeletePost: (postId: string) => void;
}

const CATEGORY_NAMES: Record<PostCategory, string> = {
  agenda: '講稿串場',
  notes: '注意事項',
  gear: '走位台風',
  general: '留言應援',
};

export const DiscussionBoard: React.FC<DiscussionBoardProps> = ({
  posts,
  currentRole,
  guestName,
  onAddPost,
  onLikePost,
  onPinPost,
  onDeletePost,
}) => {
  const [selectedFilter, setSelectedFilter] = useState<PostCategory | 'all'>('all');

  const [formCategory, setFormCategory] = useState<PostCategory>('notes');
  const [formContent, setFormContent] = useState('');
  const [formGuestName, setFormGuestName] = useState(guestName);
  const [errorMsg, setErrorMsg] = useState('');

  const isGuest = currentRole === 'guest';
  const currentMember = !isGuest ? MEMBERS[currentRole as MemberId] : null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!formContent.trim()) {
      setErrorMsg('請輸入留言內容');
      return;
    }

    let authorName = '';
    if (isGuest) {
      if (!formGuestName.trim()) {
        setErrorMsg('訪客請填寫署名');
        return;
      }
      authorName = formGuestName.trim();
    } else if (currentMember) {
      authorName = currentMember.name;
    }

    onAddPost({
      authorRole: currentRole,
      authorName,
      category: formCategory,
      title: '',
      content: formContent.trim(),
    });

    setFormContent('');
  };

  const filteredPosts = posts.filter((p) => {
    if (selectedFilter === 'all') return true;
    return p.category === selectedFilter;
  });

  return (
    <div className="space-y-4">
      {/* Input Box */}
      <div className="bg-white rounded-2xl border border-stone-200 p-4 sm:p-5 space-y-3.5 shadow-2xs">
        <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-stone-700">
          <span className="font-medium">
            目前發言：
            <strong className="text-stone-900 font-bold ml-1">{currentMember ? `${currentMember.name} (${currentMember.roleTitle})` : '訪客'}</strong>
          </span>

          <div className="flex items-center gap-2">
            <span className="text-stone-600 font-medium">分類：</span>
            <select
              value={formCategory}
              onChange={(e) => setFormCategory(e.target.value as PostCategory)}
              className="px-2.5 py-1.5 text-sm rounded-lg border border-stone-300 bg-white font-medium text-stone-800 focus:outline-none focus:ring-1 focus:ring-stone-800"
            >
              <option value="notes">注意事項</option>
              <option value="agenda">講稿串場</option>
              <option value="gear">走位台風</option>
              <option value="general">留言應援</option>
            </select>
          </div>
        </div>

        {isGuest && (
          <div>
            <input
              type="text"
              value={formGuestName}
              onChange={(e) => setFormGuestName(e.target.value)}
              placeholder="* 請輸入您的署名（必填）"
              className="w-full px-3.5 py-2 text-sm rounded-lg border border-stone-300 focus:outline-none focus:ring-1 focus:ring-stone-800 bg-white"
            />
          </div>
        )}

        <div>
          <textarea
            rows={2}
            value={formContent}
            onChange={(e) => setFormContent(e.target.value)}
            placeholder="留話、討論重點或注意事項..."
            className="w-full px-3.5 py-2.5 text-sm sm:text-base rounded-lg border border-stone-300 focus:outline-none focus:ring-1 focus:ring-stone-800 bg-white"
          />
        </div>

        {errorMsg && <p className="text-xs sm:text-sm text-rose-600 font-medium">{errorMsg}</p>}

        <div className="flex justify-end">
          <button
            type="button"
            onClick={handleSubmit}
            className="px-5 py-2 text-sm font-bold text-white bg-stone-800 hover:bg-stone-700 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
          >
            <Send className="w-3.5 h-3.5" />
            送出留言
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center gap-1.5 text-sm">
        <button
          type="button"
          onClick={() => setSelectedFilter('all')}
          className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
            selectedFilter === 'all'
              ? 'bg-stone-800 text-white font-bold shadow-2xs'
              : 'text-stone-700 bg-white/70 border border-stone-200 hover:bg-stone-100 font-medium'
          }`}
        >
          全部 ({posts.length})
        </button>
        {(Object.keys(CATEGORY_NAMES) as PostCategory[]).map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => setSelectedFilter(cat)}
            className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
              selectedFilter === cat
                ? 'bg-stone-800 text-white font-bold shadow-2xs'
                : 'text-stone-700 bg-white/70 border border-stone-200 hover:bg-stone-100 font-medium'
            }`}
          >
            {CATEGORY_NAMES[cat]}
          </button>
        ))}
      </div>

      {/* Post List */}
      <div className="space-y-3">
        {filteredPosts.map((post) => {
          const isGuestPost = post.authorRole === 'guest';
          const member = !isGuestPost ? MEMBERS[post.authorRole as MemberId] : null;

          return (
            <div
              key={post.id}
              className={`p-4 sm:p-5 rounded-2xl border bg-white text-sm shadow-2xs ${
                post.pinned ? 'border-amber-300 bg-[#faf8f3]' : 'border-stone-200'
              }`}
            >
              <div className="flex items-center justify-between pb-2.5 border-b border-stone-100 text-stone-500">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-stone-900 text-sm sm:text-base">{post.authorName}</span>
                  {member ? (
                    <span className="text-xs text-stone-500 font-normal">({member.roleTitle})</span>
                  ) : (
                    <span className="text-xs text-stone-500 font-normal">(訪客)</span>
                  )}
                  <span className="text-xs text-stone-400">
                    {new Date(post.createdAt).toLocaleDateString('zh-TW', {
                      month: 'numeric',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-stone-100 text-stone-700">
                    {CATEGORY_NAMES[post.category]}
                  </span>
                  {post.pinned && <span className="text-xs text-amber-800 font-bold bg-amber-100/80 px-1.5 py-0.5 rounded">置頂</span>}
                </div>
              </div>

              <p className="pt-3 text-stone-800 text-sm sm:text-base whitespace-pre-wrap leading-relaxed">
                {post.content}
              </p>

              <div className="flex items-center justify-between pt-2.5 mt-3 border-t border-stone-100 text-stone-500 text-xs sm:text-sm">
                <div className="flex items-center gap-4">
                  <button
                    type="button"
                    onClick={() => onLikePost(post.id)}
                    className="flex items-center gap-1.5 hover:text-rose-600 cursor-pointer font-medium"
                  >
                    <Heart className={`w-4 h-4 ${post.likes > 0 ? 'fill-rose-500 text-rose-500' : ''}`} />
                    <span>{post.likes || 0}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => onPinPost(post.id)}
                    className="hover:text-stone-800 cursor-pointer font-medium"
                  >
                    {post.pinned ? '取消置頂' : '置頂'}
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => onDeletePost(post.id)}
                  className="p-1 hover:text-rose-600 rounded cursor-pointer"
                  title="刪除留言"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
