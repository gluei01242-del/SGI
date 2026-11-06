import React, { useState } from 'react';
import { MemberId, MEMBERS, RoleId } from '../types';
import { Check } from 'lucide-react';

interface RoleSelectModalProps {
  isOpen: boolean;
  currentRole: RoleId | null;
  onSelectRole: (role: RoleId, guestName?: string) => void;
  onClose?: () => void;
}

export const RoleSelectModal: React.FC<RoleSelectModalProps> = ({
  isOpen,
  currentRole,
  onSelectRole,
  onClose,
}) => {
  const [selectedRole, setSelectedRole] = useState<RoleId>(currentRole || 'nienchia');
  const [guestNameInput, setGuestNameInput] = useState('');
  const [guestError, setGuestError] = useState('');

  if (!isOpen) return null;

  const handleConfirm = () => {
    if (selectedRole === 'guest') {
      if (!guestNameInput.trim()) {
        setGuestError('請輸入署名');
        return;
      }
      onSelectRole('guest', guestNameInput.trim());
    } else {
      onSelectRole(selectedRole);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/40 backdrop-blur-xs">
      <div className="relative w-full max-w-sm bg-[#faf8f5] rounded-2xl shadow-xl border border-stone-200 overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 bg-white border-b border-stone-200 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-stone-900">選擇您的角色</h2>
            <p className="text-sm text-stone-500 mt-0.5">選擇現在編輯資料的成員</p>
          </div>
          {onClose && currentRole && (
            <button
              type="button"
              onClick={onClose}
              className="text-stone-400 hover:text-stone-700 text-base p-1 rounded-md"
            >
              ✕
            </button>
          )}
        </div>

        {/* Member Options */}
        <div className="p-4 space-y-2.5">
          {(['nienchia', 'chiaoning', 'fuyi'] as MemberId[]).map((mId) => {
            const m = MEMBERS[mId];
            const isSelected = selectedRole === mId;

            return (
              <button
                key={mId}
                type="button"
                onClick={() => {
                  setSelectedRole(mId);
                  setGuestError('');
                }}
                className={`w-full flex items-center justify-between p-3.5 rounded-xl border text-left transition-colors cursor-pointer ${
                  isSelected
                    ? 'border-stone-800 bg-white ring-2 ring-stone-800 shadow-2xs'
                    : 'border-stone-200 hover:border-stone-300 bg-white'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-base ${m.avatarBg}`}
                  >
                    {m.name.slice(0, 1)}
                  </div>
                  <div>
                    <span className="font-bold text-stone-900 text-base">{m.name}</span>
                    <span className="text-sm text-stone-600 ml-2 font-medium">({m.roleTitle})</span>
                  </div>
                </div>

                <div className="flex items-center">
                  {isSelected ? (
                    <div className="w-5 h-5 rounded-full bg-stone-800 text-white flex items-center justify-center">
                      <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                    </div>
                  ) : (
                    <div className="w-5 h-5 rounded-full border border-stone-300" />
                  )}
                </div>
              </button>
            );
          })}

          {/* Guest */}
          <button
            type="button"
            onClick={() => setSelectedRole('guest')}
            className={`w-full flex items-center justify-between p-3.5 rounded-xl border text-left transition-colors cursor-pointer ${
              selectedRole === 'guest'
                ? 'border-stone-800 bg-white ring-2 ring-stone-800 shadow-2xs'
                : 'border-stone-200 hover:border-stone-300 bg-white'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-stone-200 text-stone-800 flex items-center justify-center font-bold text-base">
                訪
              </div>
              <div>
                <span className="font-bold text-stone-900 text-base">訪客</span>
                <span className="text-sm text-stone-600 ml-2 font-medium">(可留言應援)</span>
              </div>
            </div>

            <div className="flex items-center">
              {selectedRole === 'guest' ? (
                <div className="w-5 h-5 rounded-full bg-stone-800 text-white flex items-center justify-center">
                  <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                </div>
              ) : (
                <div className="w-5 h-5 rounded-full border border-stone-300" />
              )}
            </div>
          </button>

          {/* Guest input */}
          {selectedRole === 'guest' && (
            <div className="pt-2">
              <label className="block text-sm font-semibold text-stone-700 mb-1">
                訪客署名 <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={guestNameInput}
                onChange={(e) => {
                  setGuestNameInput(e.target.value);
                  if (e.target.value.trim()) setGuestError('');
                }}
                placeholder="例如：雅婷、小明..."
                className="w-full px-3.5 py-2 text-base rounded-lg border border-stone-300 focus:outline-none focus:ring-1 focus:ring-stone-800 bg-white"
                autoFocus
              />
              {guestError && <p className="text-xs sm:text-sm text-rose-600 mt-1">{guestError}</p>}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 bg-stone-100/60 border-t border-stone-200 flex items-center justify-end">
          <button
            type="button"
            onClick={handleConfirm}
            className="w-full sm:w-auto px-6 py-2.5 text-sm font-bold text-white bg-stone-800 hover:bg-stone-700 rounded-lg transition-colors cursor-pointer shadow-2xs"
          >
            確認進入
          </button>
        </div>
      </div>
    </div>
  );
};
