import React, { useState, useEffect } from 'react';
import { MemberId, MEMBERS, PracticeSession, RoleId } from '../types';
import {
  formatDayOfWeek,
  generateGoogleCalendarUrl,
  SGI_EVENT_DATE,
  SGI_EVENT_TIME,
} from '../utils/schedule';
import {
  Calendar,
  Clock,
  MapPin,
  CheckCircle2,
  CalendarPlus,
  Edit3,
  ExternalLink,
} from 'lucide-react';

interface PracticeHeroBannerProps {
  session: PracticeSession;
  currentRole: RoleId;
  onOpenEditModal: () => void;
  onToggleRsvp: (memberId: MemberId, attending: boolean) => void;
}

export const PracticeHeroBanner: React.FC<PracticeHeroBannerProps> = ({
  session,
  currentRole,
  onOpenEditModal,
  onToggleRsvp,
}) => {
  const [practiceCountdown, setPracticeCountdown] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
    isPast: false,
  });

  const [eventCountdown, setEventCountdown] = useState({
    days: 0,
    hours: 0,
  });

  useEffect(() => {
    function update() {
      const now = new Date().getTime();

      // Practice
      const targetP = new Date(`${session.date}T${session.startTime}:00`).getTime();
      const diffP = targetP - now;
      if (diffP <= 0) {
        setPracticeCountdown({ days: 0, hours: 0, minutes: 0, seconds: 0, isPast: true });
      } else {
        const days = Math.floor(diffP / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diffP % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((diffP % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diffP % (1000 * 60)) / 1000);
        setPracticeCountdown({ days, hours, minutes, seconds, isPast: false });
      }

      // 12/13 15:30 Event
      const targetE = new Date(`${SGI_EVENT_DATE}T${SGI_EVENT_TIME}:00`).getTime();
      const diffE = targetE - now;
      if (diffE > 0) {
        const days = Math.floor(diffE / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diffE % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        setEventCountdown({ days, hours });
      }
    }

    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [session.date, session.startTime]);

  const isCurrentMember = currentRole !== 'guest';
  const currentMemberId = currentRole as MemberId;
  const isConfirmed = isCurrentMember && session.confirmedMembers.includes(currentMemberId);

  return (
    <div className="bg-[#f5f2eb] rounded-2xl border border-stone-300 p-4 sm:p-6 text-stone-800 shadow-2xs">
      {/* 12/13 SGI Target strip */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 pb-3.5 mb-3.5 border-b border-stone-200 text-base sm:text-lg">
        <span className="font-extrabold text-stone-900">
          創價學會總會：12/13 (日) 15:30
        </span>
        <span className="font-mono text-stone-800 bg-white/90 px-3.5 py-1 rounded-lg border border-stone-300 text-sm sm:text-base font-bold shadow-2xs">
          倒數 {eventCountdown.days} 天 {eventCountdown.hours} 小時
        </span>
      </div>

      {/* Main Practice Info */}
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="text-sm sm:text-base font-extrabold px-3 py-1 rounded-lg bg-stone-900 text-white shadow-2xs">
              下次練習
            </span>
            <span className="text-xl sm:text-2xl font-black text-stone-950 font-mono tracking-tight">
              {session.date} ({formatDayOfWeek(session.date)}) {session.startTime} - {session.endTime}
            </span>
          </div>

          <div className="flex items-center gap-2.5 text-sm sm:text-base">
            <button
              type="button"
              onClick={onOpenEditModal}
              className="px-3.5 py-2 rounded-xl border border-stone-300 bg-white hover:bg-stone-50 font-bold text-stone-900 cursor-pointer shadow-2xs"
            >
              編輯時間
            </button>
            <a
              href={generateGoogleCalendarUrl(session)}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3.5 py-2 rounded-xl border border-stone-300 bg-white hover:bg-stone-50 font-bold text-stone-900 shadow-2xs"
            >
              加到日曆
            </a>
          </div>
        </div>

        {/* Location with Google Map link */}
        <div className="flex items-center justify-between text-base sm:text-lg text-stone-800 bg-white/95 p-3.5 rounded-xl border border-stone-300">
          <div className="flex items-center gap-2.5">
            <MapPin className="w-5 h-5 text-stone-700 shrink-0" />
            <span className="font-extrabold text-stone-950">{session.location}</span>
            {session.locationDetail && (
              <span className="text-stone-600 font-medium hidden sm:inline">({session.locationDetail})</span>
            )}
          </div>
          <a
            href={`https://maps.google.com/?q=${encodeURIComponent(
              session.location + ' ' + (session.locationDetail || '')
            )}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-stone-900 hover:text-stone-950 font-bold text-sm sm:text-base flex items-center gap-1 underline shrink-0"
          >
            開啟地圖 <ExternalLink className="w-4 h-4" />
          </a>
        </div>

        {/* Attendance Strip */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1 text-base">
          <div className="flex items-center gap-2.5">
            <span className="text-stone-700 font-bold">出席名單：</span>
            {(['nienchia', 'chiaoning', 'fuyi'] as MemberId[]).map((mId) => {
              const m = MEMBERS[mId];
              const confirmed = session.confirmedMembers.includes(mId);
              return (
                <span
                  key={mId}
                  className={`px-3 py-1.5 rounded-xl text-sm sm:text-base ${
                    confirmed
                      ? 'bg-stone-200 text-stone-950 font-extrabold border border-stone-400/80 shadow-2xs'
                      : 'bg-white/70 text-stone-400 line-through'
                  }`}
                >
                  {m.name} {confirmed ? '✓' : ''}
                </span>
              );
            })}
          </div>

          {isCurrentMember && (
            <button
              type="button"
              onClick={() => onToggleRsvp(currentMemberId, !isConfirmed)}
              className="text-sm sm:text-base font-bold text-stone-800 hover:text-stone-950 underline cursor-pointer"
            >
              {isConfirmed ? '改為請假' : '點此確認出席'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
