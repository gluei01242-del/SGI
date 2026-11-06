/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { AppState, CommonSlot, DiscussionPost, MemberId, MEMBERS, PostCategory, PracticeSession, RoleId, ScriptDocument, TimeSlot } from './types';
import { getInitialState, calculateCommonSlots } from './utils/schedule';
import { TopHeader, ActiveTab } from './components/TopHeader';
import { RoleSelectModal } from './components/RoleSelectModal';
import { PracticeHeroBanner } from './components/PracticeHeroBanner';
import { GanttScheduleView } from './components/GanttScheduleView';
import { EditPracticeModal } from './components/EditPracticeModal';
import { DiscussionBoard } from './components/DiscussionBoard';
import { ScriptDocumentsView } from './components/ScriptDocumentsView';

const LOCAL_STORAGE_ROLE_KEY = 'sgi_emcee_active_role';
const LOCAL_STORAGE_GUEST_NAME_KEY = 'sgi_emcee_guest_name';
const LOCAL_STORAGE_BACKUP_KEY = 'sgi_emcee_local_backup_v2';

function getSavedLocalState(): AppState {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_BACKUP_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.slots && parsed.practiceSession) {
        return parsed;
      }
    }
  } catch {}
  return getInitialState();
}

export default function App() {
  const [appState, setAppState] = useState<AppState>(getSavedLocalState);
  const [activeTab, setActiveTab] = useState<ActiveTab>('gantt');

  const [currentRole, setCurrentRole] = useState<RoleId>('nienchia');
  const [guestName, setGuestName] = useState<string>('');
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
  const [isEditPracticeOpen, setIsEditPracticeOpen] = useState(false);

  // Immediately mirror state to localStorage so data is NEVER lost
  useEffect(() => {
    try {
      localStorage.setItem(LOCAL_STORAGE_BACKUP_KEY, JSON.stringify(appState));
    } catch {}
  }, [appState]);

  useEffect(() => {
    const savedRole = localStorage.getItem(LOCAL_STORAGE_ROLE_KEY) as RoleId | null;
    const savedGuest = localStorage.getItem(LOCAL_STORAGE_GUEST_NAME_KEY) || '';

    if (savedRole) {
      setCurrentRole(savedRole);
      setGuestName(savedGuest);
    } else {
      setIsRoleModalOpen(true);
    }
  }, []);

  const fetchState = useCallback(async () => {
    try {
      const res = await fetch('/api/state');
      if (res.ok) {
        const serverData = (await res.json()) as AppState;
        if (serverData && serverData.slots && serverData.practiceSession) {
          // Check if local storage has custom slots/edits while server was cold-started empty
          const localState = getSavedLocalState();
          const localHasCustom =
            (localState.slots.nienchia && localState.slots.nienchia.length > 0) ||
            (localState.slots.chiaoning && localState.slots.chiaoning.length > 0) ||
            (localState.posts && localState.posts.length > 0) ||
            (localState.scripts && localState.scripts.length > 0);

          const serverIsEmpty =
            (!serverData.slots.nienchia || serverData.slots.nienchia.length === 0) &&
            (!serverData.slots.chiaoning || serverData.slots.chiaoning.length === 0) &&
            (!serverData.posts || serverData.posts.length === 0) &&
            (!serverData.scripts || serverData.scripts.length === 0);

          if (localHasCustom && serverIsEmpty) {
            // Restore server with local backup automatically
            fetch('/api/sync-state', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ state: localState }),
            }).catch(() => {});
            return;
          }

          setAppState((prev) => ({
            ...prev,
            ...serverData,
            scripts: serverData.scripts || prev.scripts || [],
            posts: serverData.posts || prev.posts || [],
          }));
        }
      }
    } catch {
      // local fallback preserved
    }
  }, []);

  useEffect(() => {
    fetchState();
    const interval = setInterval(() => {
      fetch('/api/state')
        .then((r) => r.ok && r.json())
        .then((data) => {
          if (data && data.slots) {
            setAppState((prev) => ({
              ...prev,
              ...data,
              scripts: data.scripts || prev.scripts || [],
              posts: data.posts || prev.posts || [],
            }));
          }
        })
        .catch(() => {});
    }, 5000);

    return () => clearInterval(interval);
  }, [fetchState]);

  const handleSelectRole = (role: RoleId, customGuestName?: string) => {
    setCurrentRole(role);
    localStorage.setItem(LOCAL_STORAGE_ROLE_KEY, role);

    if (role === 'guest' && customGuestName) {
      setGuestName(customGuestName);
      localStorage.setItem(LOCAL_STORAGE_GUEST_NAME_KEY, customGuestName);
    }

    setIsRoleModalOpen(false);
  };

  const handleUpdateSlot = async (slotData: {
    memberId: MemberId;
    date: string;
    startTime: string;
    endTime: string;
    status: 'free' | 'busy' | 'tentative';
    note?: string;
  }) => {
    setAppState((prev) => {
      const currentSlots = [...(prev.slots[slotData.memberId] || [])];
      const idx = currentSlots.findIndex(
        (s) =>
          s.date === slotData.date &&
          s.startTime === slotData.startTime &&
          s.endTime === slotData.endTime
      );

      if (idx >= 0) {
        if (slotData.status === 'busy') {
          currentSlots.splice(idx, 1);
        } else {
          currentSlots[idx] = { ...currentSlots[idx], ...slotData };
        }
      } else if (slotData.status !== 'busy') {
        currentSlots.push({
          id: `${slotData.memberId[0]}-${slotData.date}-${slotData.startTime.replace(':', '')}`,
          ...slotData,
        });
      }

      const updated = {
        ...prev,
        slots: {
          ...prev.slots,
          [slotData.memberId]: currentSlots,
        },
      };

      try {
        localStorage.setItem(LOCAL_STORAGE_BACKUP_KEY, JSON.stringify(updated));
      } catch {}

      return updated;
    });

    try {
      await fetch('/api/toggle-slot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(slotData),
      });
    } catch (e) {
      console.error(e);
    }
  };

  const handleBatchUpdateSlots = async (
    memberId: MemberId,
    slotsToUpdate: Array<{
      date: string;
      startTime: string;
      endTime: string;
      status: 'free' | 'busy' | 'tentative';
      note?: string;
    }>
  ) => {
    setAppState((prev) => {
      const currentSlots = [...(prev.slots[memberId] || [])];
      for (const slotData of slotsToUpdate) {
        const idx = currentSlots.findIndex(
          (s) =>
            s.date === slotData.date &&
            s.startTime === slotData.startTime &&
            s.endTime === slotData.endTime
        );

        if (idx >= 0) {
          if (slotData.status === 'busy') {
            currentSlots.splice(idx, 1);
          } else {
            currentSlots[idx] = { ...currentSlots[idx], ...slotData };
          }
        } else if (slotData.status !== 'busy') {
          currentSlots.push({
            id: `${memberId[0]}-${slotData.date}-${slotData.startTime.replace(':', '')}`,
            memberId,
            ...slotData,
          });
        }
      }

      const updated = {
        ...prev,
        slots: {
          ...prev.slots,
          [memberId]: currentSlots,
        },
      };

      try {
        localStorage.setItem(LOCAL_STORAGE_BACKUP_KEY, JSON.stringify(updated));
      } catch {}

      return updated;
    });

    try {
      await fetch('/api/batch-slots', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ memberId, slotsToUpdate }),
      });
    } catch (e) {
      console.error(e);
    }
  };

  const handleSavePractice = async (newSession: PracticeSession) => {
    setAppState((prev) => ({ ...prev, practiceSession: newSession }));

    try {
      await fetch('/api/practice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ practiceSession: newSession }),
      });
    } catch (e) {
      console.error(e);
    }
  };

  const handleToggleRsvp = async (memberId: MemberId, attending: boolean) => {
    setAppState((prev) => {
      const confirmed = new Set(prev.practiceSession.confirmedMembers || []);
      if (attending) confirmed.add(memberId);
      else confirmed.delete(memberId);
      return {
        ...prev,
        practiceSession: {
          ...prev.practiceSession,
          confirmedMembers: Array.from(confirmed),
        },
      };
    });

    try {
      await fetch('/api/practice/rsvp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ memberId, attending }),
      });
    } catch (e) {
      console.error(e);
    }
  };

  const commonSlots = useMemo(() => calculateCommonSlots(appState.slots), [appState.slots]);

  const handleSetCommonSlotAsPractice = (slot: CommonSlot) => {
    const updatedBy =
      currentRole !== 'guest' ? MEMBERS[currentRole as MemberId].name : '訪客';

    const newSession: PracticeSession = {
      ...appState.practiceSession,
      date: slot.date,
      startTime: slot.startTime,
      endTime: slot.endTime,
      lastUpdatedBy: updatedBy,
      lastUpdatedAt: new Date().toISOString(),
    };

    handleSavePractice(newSession);
    setActiveTab('practice');
  };

  // Comments
  const handleAddPost = async (postData: {
    authorRole: RoleId;
    authorName: string;
    category: PostCategory;
    title: string;
    content: string;
  }) => {
    const tempPost: DiscussionPost = {
      id: `temp-${Date.now()}`,
      ...postData,
      createdAt: new Date().toISOString(),
      pinned: false,
      likes: 0,
    };

    setAppState((prev) => ({
      ...prev,
      posts: [tempPost, ...prev.posts],
    }));

    try {
      const res = await fetch('/api/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(postData),
      });
      if (res.ok) {
        const data = await res.json();
        setAppState((prev) => ({ ...prev, posts: data.posts }));
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleLikePost = async (postId: string) => {
    setAppState((prev) => ({
      ...prev,
      posts: prev.posts.map((p) => (p.id === postId ? { ...p, likes: (p.likes || 0) + 1 } : p)),
    }));
    try {
      await fetch(`/api/comments/${postId}/like`, { method: 'POST' });
    } catch (e) {
      console.error(e);
    }
  };

  const handlePinPost = async (postId: string) => {
    setAppState((prev) => ({
      ...prev,
      posts: prev.posts.map((p) => (p.id === postId ? { ...p, pinned: !p.pinned } : p)),
    }));
    try {
      await fetch(`/api/comments/${postId}/pin`, { method: 'POST' });
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeletePost = async (postId: string) => {
    setAppState((prev) => {
      const updated = {
        ...prev,
        posts: prev.posts.filter((p) => p.id !== postId),
      };
      try {
        localStorage.setItem(LOCAL_STORAGE_BACKUP_KEY, JSON.stringify(updated));
      } catch {}
      return updated;
    });

    try {
      const res = await fetch(`/api/comments/${postId}`, { method: 'DELETE' });
      if (res.ok) {
        const data = await res.json();
        if (data.posts) {
          setAppState((prev) => ({ ...prev, posts: data.posts }));
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Scripts
  const handleAddScript = async (scriptData: {
    version: string;
    title: string;
    fileName?: string;
    fileSize?: string;
    fileData?: string;
    mimeType?: string;
    cloudLink?: string;
    notes?: string;
    uploadedBy: string;
  }) => {
    const tempScript: ScriptDocument = {
      id: `temp-${Date.now()}`,
      ...scriptData,
      uploadedAt: new Date().toISOString(),
    };

    setAppState((prev) => ({
      ...prev,
      scripts: [tempScript, ...(prev.scripts || [])],
    }));

    try {
      const res = await fetch('/api/scripts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(scriptData),
      });
      if (res.ok) {
        const data = await res.json();
        setAppState((prev) => ({ ...prev, scripts: data.scripts }));
        return true;
      }
    } catch {
      // Offline / GitHub Pages static host fallback: keep local state
    }
    return true;
  };

  const handleDeleteScript = async (id: string) => {
    setAppState((prev) => ({
      ...prev,
      scripts: (prev.scripts || []).filter((s) => s.id !== id),
    }));

    try {
      const res = await fetch(`/api/scripts/${id}`, { method: 'DELETE' });
      if (res.ok) {
        const data = await res.json();
        setAppState((prev) => ({ ...prev, scripts: data.scripts }));
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#fbf9f5] text-stone-800">
      {/* 1. Header */}
      <TopHeader
        activeTab={activeTab}
        onTabChange={setActiveTab}
        currentRole={currentRole}
        guestName={guestName}
        onOpenRoleModal={() => setIsRoleModalOpen(true)}
      />

      {/* 2. Main Content */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-3.5 sm:px-6 py-4 space-y-4">
        {/* Next practice & countdown banner */}
        <section aria-label="下次練習">
          <PracticeHeroBanner
            session={appState.practiceSession}
            currentRole={currentRole}
            onOpenEditModal={() => setIsEditPracticeOpen(true)}
            onToggleRsvp={handleToggleRsvp}
          />
        </section>

        {/* Tab 1: Gantt View */}
        {activeTab === 'gantt' && (
          <section aria-label="空檔甘特圖">
            <GanttScheduleView
              slots={appState.slots}
              currentRole={currentRole}
              onUpdateSlot={handleUpdateSlot}
              onBatchUpdateSlots={handleBatchUpdateSlots}
              onSetAsPractice={handleSetCommonSlotAsPractice}
            />
          </section>
        )}

        {/* Tab 2: Practice info */}
        {activeTab === 'practice' && (
          <section aria-label="練習排程" className="bg-white rounded-2xl border border-stone-200 p-5 sm:p-6 space-y-4 shadow-2xs">
            <div className="flex items-center justify-between">
              <h3 className="text-base sm:text-lg font-bold text-stone-900">下次練習詳細內容</h3>
              <button
                type="button"
                onClick={() => setIsEditPracticeOpen(true)}
                className="px-3.5 py-1.5 text-sm rounded-lg border border-stone-300 hover:bg-stone-50 font-semibold cursor-pointer shadow-2xs text-stone-800"
              >
                修改時間或地點
              </button>
            </div>

            <div className="space-y-2.5 text-sm sm:text-base text-stone-800">
              <div>
                <span className="text-stone-500 font-medium">主題：</span>
                <span className="font-bold text-stone-900">{appState.practiceSession.title}</span>
              </div>
              <div>
                <span className="text-stone-500 font-medium">時間：</span>
                <span className="font-mono font-semibold text-stone-900">{appState.practiceSession.date} {appState.practiceSession.startTime} - {appState.practiceSession.endTime}</span>
              </div>
              <div>
                <span className="text-stone-500 font-medium">地點：</span>
                <span className="font-semibold text-stone-900">{appState.practiceSession.location} {appState.practiceSession.locationDetail}</span>
              </div>
              {appState.practiceSession.notes && (
                <div>
                  <span className="text-stone-500 font-medium">備註：</span>
                  <span className="text-stone-800">{appState.practiceSession.notes}</span>
                </div>
              )}
            </div>

            {/* Members role summary */}
            <div className="grid grid-cols-3 gap-2.5 pt-3 border-t border-stone-100 text-center text-sm">
              {(['nienchia', 'chiaoning', 'fuyi'] as MemberId[]).map((mId) => {
                const m = MEMBERS[mId];
                return (
                  <div key={mId} className="p-3 rounded-xl bg-stone-50 border border-stone-200 shadow-2xs">
                    <div className="font-bold text-stone-900 text-sm sm:text-base">{m.name}</div>
                    <div className="text-xs text-stone-500 font-medium mt-0.5">{m.roleTitle}</div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Tab 3: Script Documents & Latest Download */}
        {activeTab === 'scripts' && (
          <section aria-label="司儀稿文件下載專區">
            <ScriptDocumentsView
              scripts={appState.scripts || []}
              currentRole={currentRole}
              onAddScript={handleAddScript}
              onDeleteScript={handleDeleteScript}
            />
          </section>
        )}

        {/* Tab 4: Discussion Board */}
        {activeTab === 'discussion' && (
          <section aria-label="留言板">
            <DiscussionBoard
              posts={appState.posts}
              currentRole={currentRole}
              guestName={guestName}
              onAddPost={handleAddPost}
              onLikePost={handleLikePost}
              onPinPost={handlePinPost}
              onDeletePost={handleDeletePost}
            />
          </section>
        )}
      </main>

      {/* Footer */}
      <footer className="mt-auto border-t border-stone-200/60 py-5 text-center text-xs sm:text-sm text-stone-500 font-medium">
        創價學會總會 司儀小組 · 12/13 15:30 登場
      </footer>

      {/* Role Selector Modal */}
      <RoleSelectModal
        isOpen={isRoleModalOpen}
        currentRole={currentRole}
        onSelectRole={handleSelectRole}
        onClose={() => setIsRoleModalOpen(false)}
      />

      {/* Edit Practice Session Modal */}
      <EditPracticeModal
        isOpen={isEditPracticeOpen}
        currentSession={appState.practiceSession}
        commonSlots={commonSlots}
        currentRole={currentRole}
        onSave={handleSavePractice}
        onClose={() => setIsEditPracticeOpen(false)}
      />
    </div>
  );
}
