import React, { useState } from 'react';
import { CommonSlot, MemberId, MEMBERS, PracticeSession, RoleId } from '../types';
import { formatDayOfWeek, formatShortDate, START_DATE_STR, END_DATE_STR } from '../utils/schedule';
import { Check } from 'lucide-react';

interface EditPracticeModalProps {
  isOpen: boolean;
  currentSession: PracticeSession;
  commonSlots: CommonSlot[];
  currentRole: RoleId;
  onSave: (session: PracticeSession) => void;
  onClose: () => void;
}

export const EditPracticeModal: React.FC<EditPracticeModalProps> = ({
  isOpen,
  currentSession,
  commonSlots,
  currentRole,
  onSave,
  onClose,
}) => {
  const [date, setDate] = useState(currentSession.date);
  const [startTime, setStartTime] = useState(currentSession.startTime);
  const [endTime, setEndTime] = useState(currentSession.endTime);
  const [location, setLocation] = useState(currentSession.location);
  const [locationDetail, setLocationDetail] = useState(currentSession.locationDetail || '');
  const [title, setTitle] = useState(currentSession.title);
  const [notes, setNotes] = useState(currentSession.notes);
  const [confirmedMembers, setConfirmedMembers] = useState<MemberId[]>(
    currentSession.confirmedMembers || ['nienchia', 'chiaoning', 'fuyi']
  );

  if (!isOpen) return null;

  const handleApplyCommonSlot = (slot: CommonSlot) => {
    setDate(slot.date);
    setStartTime(slot.startTime);
    setEndTime(slot.endTime);
  };

  const handleToggleMember = (mId: MemberId) => {
    if (confirmedMembers.includes(mId)) {
      setConfirmedMembers(confirmedMembers.filter((id) => id !== mId));
    } else {
      setConfirmedMembers([...confirmedMembers, mId]);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const updatedBy =
      currentRole !== 'guest' ? MEMBERS[currentRole as MemberId].name : '訪客';

    onSave({
      ...currentSession,
      date,
      startTime,
      endTime,
      location: location.trim() || '創價學會文化會館',
      locationDetail: locationDetail.trim(),
      title: title.trim() || '總會司儀排練',
      notes: notes.trim(),
      confirmedMembers,
      lastUpdatedBy: updatedBy,
      lastUpdatedAt: new Date().toISOString(),
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/40 backdrop-blur-xs">
      <div className="relative w-full max-w-lg max-h-[90vh] bg-white rounded-2xl shadow-xl border border-stone-200 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 bg-[#fbf9f5] border-b border-stone-200 flex items-center justify-between">
          <h2 className="text-base sm:text-lg font-bold text-stone-900">編輯下次練習時間</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-stone-400 hover:text-stone-700 text-base p-1 rounded"
          >
            ✕
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4 text-sm">
          {/* Common slots quick select if any */}
          {commonSlots.length > 0 && (
            <div className="p-3.5 bg-[#f7f4ee] rounded-xl border border-stone-200">
              <div className="text-sm font-bold text-stone-900 mb-2">
                共同空檔推薦 (點擊自動填入)：
              </div>
              <div className="flex flex-wrap gap-2 text-xs sm:text-sm">
                {commonSlots.slice(0, 4).map((cs) => (
                  <button
                    key={cs.id}
                    type="button"
                    onClick={() => handleApplyCommonSlot(cs)}
                    className="px-2.5 py-1.5 rounded-lg border border-stone-300 bg-white hover:bg-stone-50 font-mono font-medium text-stone-800 cursor-pointer shadow-2xs"
                  >
                    {formatShortDate(cs.date)} ({formatDayOfWeek(cs.date)}) {cs.startTime}-{cs.endTime}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Date & Time */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-stone-800 mb-1.5 font-semibold text-sm">日期</label>
              <input
                type="date"
                min={START_DATE_STR}
                max={END_DATE_STR}
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
                className="w-full px-3 py-2 text-sm sm:text-base font-mono rounded-lg border border-stone-300 focus:outline-none focus:ring-1 focus:ring-stone-800 bg-white"
              />
            </div>
            <div>
              <label className="block text-stone-800 mb-1.5 font-semibold text-sm">開始時間</label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                required
                className="w-full px-3 py-2 text-sm sm:text-base font-mono rounded-lg border border-stone-300 focus:outline-none focus:ring-1 focus:ring-stone-800 bg-white"
              />
            </div>
            <div>
              <label className="block text-stone-800 mb-1.5 font-semibold text-sm">結束時間</label>
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                required
                className="w-full px-3 py-2 text-sm sm:text-base font-mono rounded-lg border border-stone-300 focus:outline-none focus:ring-1 focus:ring-stone-800 bg-white"
              />
            </div>
          </div>

          {/* Title */}
          <div>
            <label className="block text-stone-800 mb-1.5 font-semibold text-sm">排練主題</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="例如：總會司儀排練"
              required
              className="w-full px-3.5 py-2 text-sm sm:text-base rounded-lg border border-stone-300 focus:outline-none focus:ring-1 focus:ring-stone-800 bg-white"
            />
          </div>

          {/* Location & Map info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-stone-800 mb-1.5 font-semibold text-sm">地點</label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="例如：創價學會文化會館"
                required
                className="w-full px-3.5 py-2 text-sm sm:text-base rounded-lg border border-stone-300 focus:outline-none focus:ring-1 focus:ring-stone-800 bg-white"
              />
            </div>
            <div>
              <label className="block text-stone-800 mb-1.5 font-semibold text-sm">詳細地址 / 室名</label>
              <input
                type="text"
                value={locationDetail}
                onChange={(e) => setLocationDetail(e.target.value)}
                placeholder="例如：大安區新生南路一段 160 號"
                className="w-full px-3.5 py-2 text-sm sm:text-base rounded-lg border border-stone-300 focus:outline-none focus:ring-1 focus:ring-stone-800 bg-white"
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-stone-800 mb-1.5 font-semibold text-sm">注意事項</label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="例如：馥伊星期一、四補習到 20:30..."
              className="w-full px-3.5 py-2 text-sm sm:text-base rounded-lg border border-stone-300 focus:outline-none focus:ring-1 focus:ring-stone-800 bg-white"
            />
          </div>

          {/* Attendance Checkbox */}
          <div>
            <label className="block text-stone-800 mb-1.5 font-semibold text-sm">出席成員</label>
            <div className="grid grid-cols-3 gap-2.5">
              {(['nienchia', 'chiaoning', 'fuyi'] as MemberId[]).map((mId) => {
                const m = MEMBERS[mId];
                const checked = confirmedMembers.includes(mId);
                return (
                  <button
                    key={mId}
                    type="button"
                    onClick={() => handleToggleMember(mId)}
                    className={`p-2.5 rounded-lg border text-left flex items-center justify-between cursor-pointer transition-colors ${
                      checked
                        ? 'bg-stone-100 border-stone-400 font-bold text-stone-900 shadow-2xs'
                        : 'bg-white border-stone-200 text-stone-400'
                    }`}
                  >
                    <span className="text-sm sm:text-base">{m.name}</span>
                    {checked && <Check className="w-4 h-4 text-stone-900 stroke-[2.5]" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Footer actions */}
          <div className="pt-3 border-t border-stone-200 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-stone-600 hover:bg-stone-100 rounded-lg cursor-pointer"
            >
              取消
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-sm font-bold text-white bg-stone-800 hover:bg-stone-700 rounded-lg cursor-pointer shadow-2xs"
            >
              儲存更新
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
