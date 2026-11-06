import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { getInitialState } from './src/utils/schedule.ts';
import { AppState, DiscussionPost, MemberId, PracticeSession, TimeSlot } from './src/types.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.resolve(__dirname, 'data');
const DATA_FILE = path.resolve(DATA_DIR, 'state.json');
const UPLOADS_DIR = path.resolve(DATA_DIR, 'uploads');

if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Ensure data file exists with initial state
function loadState(): AppState {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (fs.existsSync(DATA_FILE)) {
      const raw = fs.readFileSync(DATA_FILE, 'utf-8');
      if (raw.trim().startsWith('{')) {
        const parsed = JSON.parse(raw) as AppState;
        if (parsed && parsed.slots && parsed.practiceSession) {
          return parsed;
        }
      }
    }
  } catch (err) {
    console.error('Error reading state file:', err);
  }

  // Only create initial state if file doesn't exist
  if (!fs.existsSync(DATA_FILE)) {
    const initial = getInitialState();
    saveState(initial);
    return initial;
  }

  return getInitialState();
}

function saveState(state: AppState) {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    const tempFile = `${DATA_FILE}.tmp`;
    fs.writeFileSync(tempFile, JSON.stringify(state, null, 2), 'utf-8');
    fs.renameSync(tempFile, DATA_FILE);
  } catch (err) {
    console.error('Error saving state file:', err);
  }
}

let appState: AppState = loadState();
if (!appState.scripts) {
  appState.scripts = [];
}
if (!appState.posts) {
  appState.posts = [];
}

async function startServer() {
  const app = express();
  const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
  const isProd = process.env.NODE_ENV === 'production';

  app.use(express.json({ limit: '100mb' }));
  app.use(express.urlencoded({ extended: true, limit: '100mb' }));

  // API Routes
  app.get('/api/state', (_req, res) => {
    res.json(appState);
  });

  // Bulk update or replace slots for a member
  app.post('/api/member-slots', (req, res) => {
    const { memberId, slots } = req.body as { memberId: MemberId; slots: TimeSlot[] };
    if (!memberId || !['chiaoning', 'fuyi', 'nienchia'].includes(memberId)) {
      res.status(400).json({ error: 'Invalid member ID' });
      return;
    }

    appState.slots[memberId] = slots;
    saveState(appState);
    res.json({ success: true, slots: appState.slots[memberId] });
  });

  // Quick slot toggle or update
  app.post('/api/toggle-slot', (req, res) => {
    const { memberId, date, startTime, endTime, status, note } = req.body as {
      memberId: MemberId;
      date: string;
      startTime: string;
      endTime: string;
      status: 'free' | 'busy' | 'tentative';
      note?: string;
    };

    if (!memberId || !['chiaoning', 'fuyi', 'nienchia'].includes(memberId)) {
      res.status(400).json({ error: 'Invalid member ID' });
      return;
    }

    const currentSlots = appState.slots[memberId] || [];
    const existingIndex = currentSlots.findIndex(
      (s) => s.date === date && s.startTime === startTime && s.endTime === endTime
    );

    if (existingIndex >= 0) {
      if (status === 'busy') {
        // remove or mark as busy
        currentSlots.splice(existingIndex, 1);
      } else {
        currentSlots[existingIndex].status = status;
        if (note !== undefined) currentSlots[existingIndex].note = note;
      }
    } else if (status !== 'busy') {
      currentSlots.push({
        id: `${memberId[0]}-${date}-${startTime.replace(':', '')}`,
        memberId,
        date,
        startTime,
        endTime,
        status,
        note,
      });
    }

    appState.slots[memberId] = currentSlots;
    saveState(appState);
    res.json({ success: true, slots: currentSlots });
  });

  // Batch update slots (for weekday recurring or bulk updates)
  app.post('/api/batch-slots', (req, res) => {
    const { memberId, slotsToUpdate } = req.body as {
      memberId: MemberId;
      slotsToUpdate: Array<{
        date: string;
        startTime: string;
        endTime: string;
        status: 'free' | 'busy' | 'tentative';
        note?: string;
      }>;
    };

    if (!memberId || !['chiaoning', 'fuyi', 'nienchia'].includes(memberId) || !Array.isArray(slotsToUpdate)) {
      res.status(400).json({ error: 'Invalid payload' });
      return;
    }

    const currentSlots = [...(appState.slots[memberId] || [])];
    for (const slotData of slotsToUpdate) {
      const existingIndex = currentSlots.findIndex(
        (s) => s.date === slotData.date && s.startTime === slotData.startTime && s.endTime === slotData.endTime
      );

      if (existingIndex >= 0) {
        if (slotData.status === 'busy') {
          currentSlots.splice(existingIndex, 1);
        } else {
          currentSlots[existingIndex] = { ...currentSlots[existingIndex], ...slotData };
        }
      } else if (slotData.status !== 'busy') {
        currentSlots.push({
          id: `${memberId[0]}-${slotData.date}-${slotData.startTime.replace(':', '')}`,
          memberId,
          ...slotData,
        });
      }
    }

    appState.slots[memberId] = currentSlots;
    saveState(appState);
    res.json({ success: true, slots: currentSlots });
  });

  // Update Next Practice Session
  app.post('/api/practice', (req, res) => {
    const { practiceSession } = req.body as { practiceSession: PracticeSession };
    if (!practiceSession || !practiceSession.date) {
      res.status(400).json({ error: 'Invalid practice session data' });
      return;
    }

    practiceSession.lastUpdatedAt = new Date().toISOString();
    appState.practiceSession = practiceSession;
    saveState(appState);
    res.json({ success: true, practiceSession: appState.practiceSession });
  });

  // Practice RSVP
  app.post('/api/practice/rsvp', (req, res) => {
    const { memberId, attending } = req.body as { memberId: MemberId; attending: boolean };
    if (!memberId || !['chiaoning', 'fuyi', 'nienchia'].includes(memberId)) {
      res.status(400).json({ error: 'Invalid member ID' });
      return;
    }

    const set = new Set(appState.practiceSession.confirmedMembers || []);
    if (attending) {
      set.add(memberId);
    } else {
      set.delete(memberId);
    }
    appState.practiceSession.confirmedMembers = Array.from(set);
    appState.practiceSession.lastUpdatedAt = new Date().toISOString();
    saveState(appState);
    res.json({ success: true, confirmedMembers: appState.practiceSession.confirmedMembers });
  });

  // Add Comment / Discussion Post
  app.post('/api/comments', (req, res) => {
    const { authorRole, authorName, category, title, content } = req.body as {
      authorRole: 'chiaoning' | 'fuyi' | 'nienchia' | 'guest';
      authorName: string;
      category: 'agenda' | 'notes' | 'gear' | 'general';
      title: string;
      content: string;
    };

    if (!content || !content.trim()) {
      res.status(400).json({ error: 'Content is required' });
      return;
    }

    if (authorRole === 'guest' && (!authorName || !authorName.trim())) {
      res.status(400).json({ error: '訪客必須填寫署名' });
      return;
    }

    const newPost: DiscussionPost = {
      id: `post-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      authorRole,
      authorName: authorName.trim(),
      category: category || 'general',
      title: (title || '').trim(),
      content: content.trim(),
      createdAt: new Date().toISOString(),
      pinned: false,
      likes: 0,
    };

    appState.posts.unshift(newPost);
    saveState(appState);
    res.json({ success: true, post: newPost, posts: appState.posts });
  });

  // Like a post
  app.post('/api/comments/:id/like', (req, res) => {
    const { id } = req.params;
    const post = appState.posts.find((p) => p.id === id);
    if (!post) {
      res.status(404).json({ error: 'Post not found' });
      return;
    }
    post.likes = (post.likes || 0) + 1;
    saveState(appState);
    res.json({ success: true, likes: post.likes });
  });

  // Pin a post
  app.post('/api/comments/:id/pin', (req, res) => {
    const { id } = req.params;
    const post = appState.posts.find((p) => p.id === id);
    if (!post) {
      res.status(404).json({ error: 'Post not found' });
      return;
    }
    post.pinned = !post.pinned;
    saveState(appState);
    res.json({ success: true, pinned: post.pinned });
  });

  // Delete a post
  app.delete('/api/comments/:id', (req, res) => {
    const { id } = req.params;
    appState.posts = (appState.posts || []).filter((p) => p.id !== id);
    saveState(appState);
    res.json({ success: true, posts: appState.posts });
  });

  // Client state sync
  app.post('/api/sync-state', (req, res) => {
    const { state } = req.body as { state: AppState };
    if (state && state.slots && state.practiceSession) {
      appState = {
        ...appState,
        ...state,
        slots: {
          nienchia: state.slots.nienchia || appState.slots.nienchia || [],
          chiaoning: state.slots.chiaoning || appState.slots.chiaoning || [],
          fuyi: state.slots.fuyi || appState.slots.fuyi || [],
        },
        practiceSession: state.practiceSession || appState.practiceSession,
        posts: state.posts || appState.posts || [],
        scripts: state.scripts || appState.scripts || [],
      };
      saveState(appState);
      res.json({ success: true, state: appState });
      return;
    }
    res.status(400).json({ error: 'Invalid state data' });
  });

  // Upload or add script document
  app.post('/api/scripts', (req, res) => {
    try {
      const { version, title, fileName, fileSize, fileData, mimeType, cloudLink, notes, uploadedBy } =
        req.body;

      if (!title && !fileName && !cloudLink) {
        res.status(400).json({ error: '請提供講稿名稱或檔案' });
        return;
      }

      if (!appState.scripts) appState.scripts = [];

      const scriptId = `script-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      let hasFile = false;
      let storedFileName = fileName || '';

      if (fileData) {
        hasFile = true;
        const base64Data = fileData.includes('base64,')
          ? fileData.split('base64,')[1]
          : fileData;
        const fileBuffer = Buffer.from(base64Data, 'base64');
        const diskPath = path.resolve(UPLOADS_DIR, `${scriptId}.bin`);
        fs.writeFileSync(diskPath, fileBuffer);
      }

      const newScript = {
        id: scriptId,
        version: (version || `v${appState.scripts.length + 1}.0`).trim(),
        title: (title || fileName || '司儀稿').trim(),
        fileName: storedFileName,
        fileSize: fileSize || '',
        hasFile,
        mimeType: mimeType || 'application/octet-stream',
        cloudLink: (cloudLink || '').trim(),
        notes: (notes || '').trim(),
        uploadedBy: uploadedBy || '念嘉',
        uploadedAt: new Date().toISOString(),
      };

      appState.scripts.unshift(newScript);
      saveState(appState);
      res.json({ success: true, script: newScript, scripts: appState.scripts });
    } catch (err) {
      console.error('Failed to save script:', err);
      res.status(500).json({ error: '儲存檔案失敗，請稍後再試' });
    }
  });

  // Download script file endpoint
  app.get('/api/scripts/:id/download', (req, res) => {
    const { id } = req.params;
    const script = (appState.scripts || []).find((s) => s.id === id);
    if (!script) {
      res.status(404).send('找不到該司儀稿檔案');
      return;
    }

    const diskPath = path.resolve(UPLOADS_DIR, `${id}.bin`);
    const downloadName = script.fileName || `${script.title}.docx`;

    if (fs.existsSync(diskPath)) {
      res.download(diskPath, downloadName);
      return;
    }

    if (script.cloudLink) {
      res.redirect(script.cloudLink);
      return;
    }

    res.status(404).send('該司儀稿無可下載的檔案');
  });

  // Delete script
  app.delete('/api/scripts/:id', (req, res) => {
    const { id } = req.params;
    if (!appState.scripts) appState.scripts = [];
    appState.scripts = appState.scripts.filter((s) => s.id !== id);

    // Delete disk file if any
    try {
      const diskPath = path.resolve(UPLOADS_DIR, `${id}.bin`);
      if (fs.existsSync(diskPath)) {
        fs.unlinkSync(diskPath);
      }
    } catch (e) {
      console.warn('Could not remove file on delete:', e);
    }

    saveState(appState);
    res.json({ success: true, scripts: appState.scripts });
  });

  // Reset to sample state
  app.post('/api/reset-sample', (_req, res) => {
    appState = getInitialState();
    saveState(appState);
    res.json({ success: true, state: appState });
  });

  // Vite middleware in dev or static files in production
  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(`> Server ready at http://0.0.0.0:${port}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
