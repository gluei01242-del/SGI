import React, { useState, useMemo } from 'react';
import { CommonSlot, MemberId, MEMBERS, RoleId, TimeSlot } from '../types';
import {
  calculateCommonSlots,
  formatDayOfWeek,
  formatShortDate,
  getDatesInRange,
  isWeekend,
  isTodayDate,
  getTodayString,
  CALENDAR_START_DATE,
  END_DATE_STR,
  SGI_EVENT_DATE,
} from '../utils/schedule';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface GanttScheduleViewProps {
  slots: Record<MemberId, TimeSlot[]>;
  currentRole: RoleId;
  onUpdateSlot: (slotData: {
    memberId: MemberId;
    date: string;
    startTime: string;
    endTime: string;
    status: 'free' | 'busy' | 'tentative';
    note?: string;
  }) => void;
  onBatchUpdateSlots?: (
    memberId: MemberId,
    slots: Array<{
      date: string;
      startTime: string;
      endTime: string;
      status: 'free' | 'busy' | 'tentative';
      note?: string;
    }>
  ) => void;
  onSetAsPractice: (slot: CommonSlot) => void;
}

export const GanttScheduleView: React.FC<GanttScheduleViewProps> = ({
  slots,
  currentRole,
  onUpdateSlot,
  onBatchUpdateSlots,
  onSetAsPractice,
}) => {
  // Calendar dates from Monday 11/02 to Sunday 12/13
  const allDates = useMemo(() => getDatesInRange(CALENDAR_START_DATE, END_DATE_STR), []);
  const commonSlots = useMemo(() => calculateCommonSlots(slots), [slots]);

  // Split into 7-day chunks (Each week strictly Monday -> Sunday)
  const weeks = useMemo(() => {
    const chunks: string[][] = [];
    for (let i = 0; i < allDates.length; i += 7) {
      chunks.push(allDates.slice(i, i + 7));
    }
    return chunks;
  }, [allDates]);

  // Automatically jump to the week that contains today
  const defaultWeekIndex = useMemo(() => {
    const today = getTodayString();
    const idx = weeks.findIndex((w) => w.includes(today));
    return idx >= 0 ? idx : 0;
  }, [weeks]);

  const [currentWeekIndex, setCurrentWeekIndex] = useState(defaultWeekIndex);

  // Quick edit modal
  const [editingSlotDate, setEditingSlotDate] = useState<string | null>(null);
  const [editStartTime, setEditStartTime] = useState('19:00');
  const [editEndTime, setEditEndTime] = useState('21:00');
  const [applyToAllWeekday, setApplyToAllWeekday] = useState(false);

  const displayedDates = weeks[currentWeekIndex] || weeks[0];

  const isCurrentMember = currentRole !== 'guest';
  const currentMemberId = currentRole as MemberId;

  const handleOpenSlotEditor = (dateStr: string) => {
    if (!isCurrentMember) return;
    setEditingSlotDate(dateStr);
    const existing = (slots[currentMemberId] || []).find((s) => s.date === dateStr && s.status === 'free');
    if (existing) {
      setEditStartTime(existing.startTime);
      setEditEndTime(existing.endTime);
    } else {
      setEditStartTime('19:00');
      setEditEndTime('21:00');
    }
    setApplyToAllWeekday(false);
  };

  const handleSaveSlot = (status: 'free' | 'busy') => {
    if (!editingSlotDate || !isCurrentMember) return;

    if (applyToAllWeekday) {
      const targetDay = new Date(editingSlotDate + 'T00:00:00').getDay();
      const batchSlots: Array<{
        date: string;
        startTime: string;
        endTime: string;
        status: 'free' | 'busy' | 'tentative';
      }> = [];

      allDates.forEach((d) => {
        if (new Date(d + 'T00:00:00').getDay() === targetDay) {
          batchSlots.push({
            date: d,
            startTime: editStartTime,
            endTime: editEndTime,
            status,
          });
        }
      });

      if (onBatchUpdateSlots) {
        onBatchUpdateSlots(currentMemberId, batchSlots);
      } else {
        batchSlots.forEach((slot) => onUpdateSlot({ memberId: currentMemberId, ...slot }));
      }
    } else {
      onUpdateSlot({
        memberId: currentMemberId,
        date: editingSlotDate,
        startTime: editStartTime,
        endTime: editEndTime,
        status,
      });
    }

    setEditingSlotDate(null);
  };

  return (
    <div className="space-y-4">
      {/* Fu-Yi notice */}
      <div className="px-4 py-3 rounded-xl bg-[#f7f4ee] border border-stone-200 text-xs sm:text-sm text-stone-800 flex items-center justify-between">
        <span>
          <strong className="font-semibold text-stone-900">排練提醒：</strong>馥伊星期一、四補習到 20:30，一四無練習機會。
        </span>
      </div>

      {/* Calculated Common Free Slots if any */}
      {commonSlots.length > 0 && (
        <div className="p-4 rounded-xl bg-white border border-stone-200 shadow-2xs">
          <div className="text-sm sm:text-base font-bold text-stone-900 mb-2.5">
            ★ 三人共同空檔 ({commonSlots.length} 個時段)
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 text-sm">
            {commonSlots.slice(0, 6).map((cs) => (
              <div
                key={cs.id}
                className="p-3 rounded-lg border border-stone-200 bg-[#faf8f5] flex items-center justify-between gap-2"
              >
                <div>
                  <div className="font-bold text-stone-900 font-mono text-sm sm:text-base">
                    {formatShortDate(cs.date)} ({formatDayOfWeek(cs.date)})
                  </div>
                  <div className="font-mono text-stone-700 text-xs sm:text-sm font-medium">
                    {cs.startTime} - {cs.endTime} ({cs.durationHours}h)
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => onSetAsPractice(cs)}
                  className="px-2.5 py-1.5 text-xs sm:text-sm font-bold bg-stone-800 text-white rounded-lg hover:bg-stone-700 cursor-pointer shadow-2xs"
                >
                  排定
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Gantt Chart Matrix */}
      <div className="bg-white rounded-xl border border-stone-200 overflow-hidden shadow-2xs">
        {/* Week navigation header */}
        <div className="px-3.5 py-3 bg-[#fbf9f5] border-b border-stone-200 flex items-center justify-between text-sm">
          <div className="flex items-center gap-1.5 font-mono">
            <button
              type="button"
              disabled={currentWeekIndex === 0}
              onClick={() => setCurrentWeekIndex((prev) => Math.max(0, prev - 1))}
              className="p-1.5 rounded-lg border border-stone-200 hover:bg-stone-100 disabled:opacity-30 cursor-pointer"
              title="上一週"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-2 font-bold text-stone-900 text-sm sm:text-base">
              第 {currentWeekIndex + 1} 週 ({formatShortDate(displayedDates[0])} ~ {formatShortDate(displayedDates[displayedDates.length - 1])})
            </span>
            <button
              type="button"
              disabled={currentWeekIndex === weeks.length - 1}
              onClick={() => setCurrentWeekIndex((prev) => Math.min(weeks.length - 1, prev + 1))}
              className="p-1.5 rounded-lg border border-stone-200 hover:bg-stone-100 disabled:opacity-30 cursor-pointer"
              title="下一週"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="text-stone-600 text-xs sm:text-sm font-medium">
            {isCurrentMember ? '點擊日期格子填寫空檔' : '訪客模式'}
          </div>
        </div>

        {/* Matrix */}
        <div className="overflow-x-auto">
          <div className="min-w-[720px]">
            {/* Header Dates: Starts Monday (週一) -> Sunday (週日) */}
            <div className="grid grid-cols-[140px_repeat(7,1fr)] border-b border-stone-200 bg-[#f7f5f0] text-center">
              <div className="p-3 border-r border-stone-200 text-left pl-4 text-stone-900 font-extrabold text-base">成員</div>
              {displayedDates.map((dateStr) => {
                const weekend = isWeekend(dateStr);
                const isGrand = dateStr === SGI_EVENT_DATE;
                const isToday = isTodayDate(dateStr);

                return (
                  <div
                    key={dateStr}
                    className={`p-2.5 border-r border-stone-200 last:border-r-0 relative transition-colors ${
                      isToday
                        ? 'bg-amber-100 border-amber-400 ring-2 ring-amber-400 font-extrabold'
                        : isGrand
                        ? 'bg-rose-50 text-rose-800'
                        : weekend
                        ? 'bg-stone-100/80'
                        : ''
                    }`}
                  >
                    <div className="font-mono flex items-center justify-center gap-1.5 text-base sm:text-lg font-extrabold text-stone-900">
                      <span>{formatShortDate(dateStr)}</span>
                      {isToday && (
                        <span className="px-2 py-0.5 rounded-full bg-amber-600 text-white text-xs font-black leading-tight shadow-2xs">
                          今日
                        </span>
                      )}
                    </div>
                    <div className={`text-sm sm:text-base font-bold mt-0.5 ${isToday ? 'text-amber-950 font-black' : 'text-stone-700'}`}>
                      {formatDayOfWeek(dateStr)}
                      {isGrand && <span className="block font-black text-rose-700">總會</span>}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Row 1: Common Overlaps */}
            <div className="grid grid-cols-[140px_repeat(7,1fr)] border-b border-stone-200 bg-[#faf8f3]">
              <div className="p-3 border-r border-stone-200 text-base font-extrabold text-stone-950 pl-4 flex items-center">
                ★ 共同空檔
              </div>
              {displayedDates.map((dateStr) => {
                const dayCommons = commonSlots.filter((c) => c.date === dateStr);
                const isToday = isTodayDate(dateStr);

                return (
                  <div
                    key={`c-${dateStr}`}
                    className={`p-2 border-r border-stone-200 last:border-r-0 min-h-[64px] flex flex-col justify-center ${
                      isToday ? 'bg-amber-50/80' : ''
                    }`}
                  >
                    {dayCommons.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => onSetAsPractice(c)}
                        className="py-1.5 px-1.5 rounded-lg bg-stone-900 text-white text-xs sm:text-sm font-mono font-bold text-center cursor-pointer hover:bg-stone-800 shadow-2xs"
                        title="點擊排定為練習時間"
                      >
                        {c.startTime}-{c.endTime}
                      </button>
                    ))}
                    {dayCommons.length === 0 && (
                      <span className="text-sm text-stone-300 text-center select-none font-bold">-</span>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Member Rows */}
            {(['nienchia', 'chiaoning', 'fuyi'] as MemberId[]).map((mId) => {
              const m = MEMBERS[mId];
              const isUserRow = currentRole === mId;

              return (
                <div
                  key={mId}
                  className={`grid grid-cols-[140px_repeat(7,1fr)] border-b border-stone-200 last:border-b-0 ${
                    isUserRow ? 'bg-amber-50/30' : 'bg-white'
                  }`}
                >
                  {/* Member Name */}
                  <div className="p-3 border-r border-stone-200 text-base pl-4 flex items-center justify-between">
                    <div>
                      <span className="font-extrabold text-stone-900 text-base sm:text-lg block">{m.name}</span>
                      <span className="text-xs sm:text-sm text-stone-600 font-medium">{m.roleTitle}</span>
                    </div>
                    {isUserRow && (
                      <span className="text-xs sm:text-sm font-bold bg-stone-200 text-stone-900 px-2 py-0.5 rounded-md mr-1 border border-stone-300">
                        您
                      </span>
                    )}
                  </div>

                  {/* Day Slots */}
                  {displayedDates.map((dateStr) => {
                    const memberDaySlots = (slots[mId] || []).filter((s) => s.date === dateStr);
                    const isToday = isTodayDate(dateStr);

                    return (
                      <div
                        key={`${mId}-${dateStr}`}
                        onClick={() => {
                          if (isUserRow) handleOpenSlotEditor(dateStr);
                        }}
                        className={`p-1.5 border-r border-stone-200 last:border-r-0 min-h-[68px] flex flex-col justify-center transition-colors ${
                          isToday ? 'bg-amber-50/60' : ''
                        } ${isUserRow ? 'hover:bg-amber-100/50 cursor-pointer' : ''}`}
                      >
                        {memberDaySlots.map((slot) => {
                          if (slot.status === 'busy') {
                            return (
                              <div
                                key={slot.id}
                                className="py-1.5 px-1 rounded-lg bg-stone-100 text-stone-600 text-xs sm:text-sm font-semibold text-center border border-stone-200"
                                title={slot.note || '忙碌'}
                              >
                                補習
                              </div>
                            );
                          }

                          return (
                            <div
                              key={slot.id}
                              className="py-1.5 px-1 rounded-lg bg-[#eae3d5] text-stone-950 text-xs sm:text-sm font-mono text-center font-bold border border-stone-400/80 shadow-2xs"
                            >
                              {slot.startTime}-{slot.endTime}
                            </div>
                          );
                        })}

                        {memberDaySlots.length === 0 && (
                          <div className="text-center">
                            {isUserRow ? (
                              <span className="inline-block px-2 py-1 text-xs sm:text-sm text-stone-600 font-bold hover:text-stone-900 rounded-md bg-stone-100/80 border border-dashed border-stone-300">
                                +填寫
                              </span>
                            ) : (
                              <span className="text-sm text-stone-300 select-none font-bold">-</span>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Clean Slot Editor Modal */}
      {editingSlotDate && isCurrentMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/40 backdrop-blur-xs">
          <div className="w-full max-w-sm bg-white rounded-2xl shadow-xl border border-stone-200 overflow-hidden">
            <div className="px-5 py-3.5 bg-[#fbf9f5] border-b border-stone-200 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-stone-900">
                  {MEMBERS[currentMemberId].name} 的有空時間
                </h3>
                <p className="text-sm text-stone-600 font-mono mt-0.5">
                  {editingSlotDate} ({formatDayOfWeek(editingSlotDate)})
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditingSlotDate(null)}
                className="text-stone-400 hover:text-stone-700 text-base p-1 rounded"
              >
                ✕
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-stone-700 mb-1.5">開始時間</label>
                <input
                  type="time"
                  value={editStartTime}
                  onChange={(e) => setEditStartTime(e.target.value)}
                  className="w-full px-3 py-2 text-base font-mono rounded-lg border border-stone-300 focus:outline-none focus:ring-1 focus:ring-stone-800"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-stone-700 mb-1.5">結束時間</label>
                <input
                  type="time"
                  value={editEndTime}
                  onChange={(e) => setEditEndTime(e.target.value)}
                  className="w-full px-3 py-2 text-base font-mono rounded-lg border border-stone-300 focus:outline-none focus:ring-1 focus:ring-stone-800"
                />
              </div>

              {/* Weekly batch checkbox */}
              <div className="pt-1">
                <label className="flex items-center gap-2.5 text-sm text-stone-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={applyToAllWeekday}
                    onChange={(e) => setApplyToAllWeekday(e.target.checked)}
                    className="w-4 h-4 rounded text-stone-800 focus:ring-stone-800"
                  />
                  <span>每週【{formatDayOfWeek(editingSlotDate)}】同時段套用</span>
                </label>
              </div>
            </div>

            <div className="px-5 py-3.5 bg-stone-50 border-t border-stone-200 flex items-center justify-between">
              <button
                type="button"
                onClick={() => handleSaveSlot('busy')}
                className="text-sm font-medium text-rose-700 hover:underline cursor-pointer"
              >
                設為沒空
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setEditingSlotDate(null)}
                  className="px-3.5 py-1.5 text-sm font-medium text-stone-600 hover:bg-stone-200/60 rounded-lg cursor-pointer"
                >
                  取消
                </button>
                <button
                  type="button"
                  onClick={() => handleSaveSlot('free')}
                  className="px-4 py-1.5 text-sm font-bold text-white bg-stone-800 hover:bg-stone-700 rounded-lg transition-colors cursor-pointer shadow-2xs"
                >
                  儲存有空
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
