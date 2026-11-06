export type MemberId = 'nienchia' | 'chiaoning' | 'fuyi';
export type RoleId = MemberId | 'guest';

export interface MemberProfile {
  id: MemberId;
  name: string;
  roleTitle: string; // 司儀 or 司儀保母
  avatarBg: string;
  textColor: string;
  borderColor: string;
  badgeBg: string;
  dotColor: string;
}

export const MEMBERS: Record<MemberId, MemberProfile> = {
  nienchia: {
    id: 'nienchia',
    name: '念嘉',
    roleTitle: '司儀保母',
    avatarBg: 'bg-amber-100 text-amber-900',
    textColor: 'text-amber-900',
    borderColor: 'border-amber-300',
    badgeBg: 'bg-amber-100/80 text-amber-900',
    dotColor: '#d97706',
  },
  chiaoning: {
    id: 'chiaoning',
    name: '巧甯',
    roleTitle: '司儀',
    avatarBg: 'bg-rose-100 text-rose-900',
    textColor: 'text-rose-900',
    borderColor: 'border-rose-300',
    badgeBg: 'bg-rose-100/80 text-rose-900',
    dotColor: '#e11d48',
  },
  fuyi: {
    id: 'fuyi',
    name: '馥伊',
    roleTitle: '司儀',
    avatarBg: 'bg-sky-100 text-sky-900',
    textColor: 'text-sky-900',
    borderColor: 'border-sky-300',
    badgeBg: 'bg-sky-100/80 text-sky-900',
    dotColor: '#0284c7',
  },
};

export type SlotStatus = 'free' | 'busy' | 'tentative';

export interface TimeSlot {
  id: string;
  memberId: MemberId;
  date: string; // YYYY-MM-DD
  startTime: string; // "19:00"
  endTime: string; // "21:30"
  status: SlotStatus;
  note?: string;
}

export interface PracticeSession {
  date: string;
  startTime: string;
  endTime: string;
  location: string;
  locationDetail?: string;
  title: string;
  agenda: string[];
  notes: string;
  confirmedMembers: MemberId[];
  lastUpdatedBy: string;
  lastUpdatedAt: string;
}

export interface ScriptDocument {
  id: string;
  version: string;
  title: string;
  fileName?: string;
  fileSize?: string;
  fileData?: string; // base64 or text
  hasFile?: boolean;
  filePath?: string;
  mimeType?: string;
  cloudLink?: string; // Google Doc / Drive URL
  notes?: string;
  uploadedBy: string;
  uploadedAt: string;
}

export type PostCategory = 'agenda' | 'notes' | 'gear' | 'general';

export interface DiscussionPost {
  id: string;
  authorRole: RoleId;
  authorName: string;
  category: PostCategory;
  title: string;
  content: string;
  createdAt: string;
  pinned: boolean;
  likes: number;
}

export interface CommonSlot {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  durationHours: number;
  availableMembers: MemberId[];
  isAllThree: boolean;
}

export interface AppState {
  slots: Record<MemberId, TimeSlot[]>;
  practiceSession: PracticeSession;
  posts: DiscussionPost[];
  scripts?: ScriptDocument[];
}
