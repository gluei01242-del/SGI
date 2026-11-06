import { AppState, CommonSlot, DiscussionPost, MemberId, PracticeSession, ScriptDocument, TimeSlot } from '../types';

export const START_DATE_STR = '2026-11-03';
export const CALENDAR_START_DATE = '2026-11-02'; // Starts on Monday (週一)
export const END_DATE_STR = '2026-12-13'; // Ends on Sunday (週日, 總會當天)
export const SGI_EVENT_DATE = '2026-12-13';
export const SGI_EVENT_TIME = '15:30';

export function getTodayString(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function isTodayDate(dateStr: string): boolean {
  return dateStr === getTodayString();
}

export function getDatesInRange(startDate = START_DATE_STR, endDate = END_DATE_STR): string[] {
  const dates: string[] = [];
  const curr = new Date(startDate);
  const end = new Date(endDate);

  while (curr <= end) {
    dates.push(curr.toISOString().split('T')[0]);
    curr.setDate(curr.getDate() + 1);
  }
  return dates;
}

export function formatDayOfWeek(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00');
  const days = ['週日', '週一', '週二', '週三', '週四', '週五', '週六'];
  return days[date.getDay()];
}

export function formatShortDate(dateStr: string): string {
  const [, month, day] = dateStr.split('-');
  return `${parseInt(month, 10)}/${parseInt(day, 10)}`;
}

export function isWeekend(dateStr: string): boolean {
  const date = new Date(dateStr + 'T00:00:00');
  const day = date.getDay();
  return day === 0 || day === 6;
}

export function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

export function minutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export interface Interval {
  start: number;
  end: number;
}

function intersectIntervals(listA: Interval[], listB: Interval[]): Interval[] {
  const result: Interval[] = [];
  let i = 0;
  let j = 0;

  while (i < listA.length && j < listB.length) {
    const a = listA[i];
    const b = listB[j];

    const maxStart = Math.max(a.start, b.start);
    const minEnd = Math.min(a.end, b.end);

    if (maxStart < minEnd) {
      result.push({ start: maxStart, end: minEnd });
    }

    if (a.end < b.end) {
      i++;
    } else {
      j++;
    }
  }

  return result;
}

export function calculateCommonSlots(
  slotsMap: Record<MemberId, TimeSlot[]>,
  requiredMembers: MemberId[] = ['nienchia', 'chiaoning', 'fuyi']
): CommonSlot[] {
  const allDates = getDatesInRange();
  const commonSlots: CommonSlot[] = [];

  for (const date of allDates) {
    const memberIntervals: Record<MemberId, Interval[]> = {
      nienchia: [],
      chiaoning: [],
      fuyi: [],
    };

    for (const member of requiredMembers) {
      const freeSlots = (slotsMap[member] || [])
        .filter((s) => s.date === date && s.status === 'free')
        .map((s) => ({
          start: timeToMinutes(s.startTime),
          end: timeToMinutes(s.endTime),
        }))
        .sort((a, b) => a.start - b.start);

      const merged: Interval[] = [];
      for (const inv of freeSlots) {
        if (!merged.length) {
          merged.push(inv);
        } else {
          const last = merged[merged.length - 1];
          if (inv.start <= last.end) {
            last.end = Math.max(last.end, inv.end);
          } else {
            merged.push(inv);
          }
        }
      }
      memberIntervals[member] = merged;
    }

    let common = memberIntervals[requiredMembers[0]] || [];
    for (let k = 1; k < requiredMembers.length; k++) {
      common = intersectIntervals(common, memberIntervals[requiredMembers[k]] || []);
    }

    for (const inv of common) {
      const durationMin = inv.end - inv.start;
      if (durationMin >= 30) {
        commonSlots.push({
          id: `${date}-${inv.start}-${inv.end}`,
          date,
          startTime: minutesToTime(inv.start),
          endTime: minutesToTime(inv.end),
          durationHours: Math.round((durationMin / 60) * 10) / 10,
          availableMembers: [...requiredMembers],
          isAllThree: requiredMembers.length === 3,
        });
      }
    }
  }

  return commonSlots.sort((a, b) => {
    if (a.date !== b.date) return a.date.localeCompare(b.date);
    return b.durationHours - a.durationHours;
  });
}

export function getInitialState(): AppState {
  const dates = getDatesInRange();
  const slots: Record<MemberId, TimeSlot[]> = {
    nienchia: [],
    chiaoning: [],
    fuyi: [],
  };

  // Only pre-seed Fu-Yi on Mondays and Thursdays
  dates.forEach((dateStr) => {
    const d = new Date(dateStr + 'T00:00:00');
    const day = d.getDay();

    if (day === 1 || day === 4) {
      slots.fuyi.push({
        id: `f-${dateStr}-cram`,
        memberId: 'fuyi',
        date: dateStr,
        startTime: '18:00',
        endTime: '20:30',
        status: 'busy',
        note: '補習到 20:30 (一、四無練習機會)',
      });
    }
  });

  const practiceSession: PracticeSession = {
    date: '2026-11-08',
    startTime: '14:00',
    endTime: '16:30',
    location: '創價學會文化會館',
    locationDetail: '台北市大安區新生南路一段 160 號',
    title: '總會司儀排練',
    agenda: ['司儀開場引言對詞', '大會流程串場銜接'],
    notes: '馥伊星期一、四補習到 20:30，一四無練習機會。',
    confirmedMembers: ['nienchia', 'chiaoning', 'fuyi'],
    lastUpdatedBy: '念嘉',
    lastUpdatedAt: new Date().toISOString(),
  };

  const posts: DiscussionPost[] = [];

  const scripts: ScriptDocument[] = [];

  return {
    slots,
    practiceSession,
    posts,
    scripts,
  };
}

export function generateGoogleCalendarUrl(session: PracticeSession): string {
  const cleanDate = session.date.replace(/-/g, '');
  const cleanStartTime = session.startTime.replace(/:/g, '') + '00';
  const cleanEndTime = session.endTime.replace(/:/g, '') + '00';

  const dates = `${cleanDate}T${cleanStartTime}/${cleanDate}T${cleanEndTime}`;
  const details = encodeURIComponent(`練習：${session.title}\n地點：${session.location}\n備註：${session.notes}`);
  const location = encodeURIComponent(`${session.location} ${session.locationDetail || ''}`);
  const text = encodeURIComponent(`【司儀排練】${session.title}`);

  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${text}&dates=${dates}&details=${details}&location=${location}`;
}
