// Deep Glitch Files — Upload episode to YouTube (OAuth + metadata from YOUTUBE.md)
// Usage: npx tsx canon/upload-youtube.ts <episode-dir> [--privacy=unlisted] [--video=EP-final-wrapped.mp4] [--replace=VIDEO_ID] [--no-rewrap]
import { config } from 'dotenv';
import { createReadStream, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';
import { google } from 'googleapis';
import { checkWrapStale, verifyCadence } from '../pipeline/src/lib/episode-gates.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, '..');
config({ path: resolve(REPO, '.env') });

const SCOPES = [
  'https://www.googleapis.com/auth/youtube.upload',
  'https://www.googleapis.com/auth/youtube',
];

const CLIENT_SECRET = resolve(
  REPO,
  process.env.YOUTUBE_CLIENT_SECRET || '.secrets/youtube-client_secret.json',
);
const TOKEN_PATH = resolve(
  REPO,
  process.env.YOUTUBE_TOKEN || '.secrets/youtube-token.json',
);

interface EpisodeMeta {
  title: string;
  description: string;
  tags: string[];
}

function parseYoutubeMd(path: string): EpisodeMeta {
  const md = readFileSync(path, 'utf-8');
  const titleMatch = md.match(/\|\s*A\s*⭐\s*\|\s*(.+?)\s*\|/);
  const descMatch = md.match(/## Description\s+```\n([\s\S]*?)```/);
  const tagsMatch = md.match(/## Tags\s+([\s\S]+?)(?:\n##|\n*$)/);
  if (!titleMatch || !descMatch) throw new Error(`Invalid YOUTUBE.md: ${path}`);

  const tags = tagsMatch
    ? tagsMatch[1].trim().split(/,\s*/).map(t => t.trim()).filter(Boolean)
    : [];

  return {
    title: titleMatch[1].trim(),
    description: descMatch[1].trim(),
    tags,
  };
}

function loadOAuthClient() {
  if (!existsSync(CLIENT_SECRET)) {
    throw new Error(`Missing OAuth client: ${CLIENT_SECRET}`);
  }
  const raw = JSON.parse(readFileSync(CLIENT_SECRET, 'utf-8'));
  const creds = raw.installed || raw.web;
  if (!creds) throw new Error('client_secret JSON must have installed or web credentials');
  return { clientId: creds.client_id, clientSecret: creds.client_secret };
}

async function authorize(): Promise<InstanceType<typeof google.auth.OAuth2>> {
  const { clientId, clientSecret } = loadOAuthClient();
  const port = 3456;
  const redirectUri = `http://127.0.0.1:${port}`;
  const oAuth2 = new google.auth.OAuth2(clientId, clientSecret, redirectUri);

  if (existsSync(TOKEN_PATH)) {
    const token = JSON.parse(readFileSync(TOKEN_PATH, 'utf-8'));
    oAuth2.setCredentials(token);
    try {
      const { credentials } = await oAuth2.refreshAccessToken();
      oAuth2.setCredentials(credentials);
      writeFileSync(TOKEN_PATH, JSON.stringify(credentials, null, 2));
      return oAuth2;
    } catch {
      console.log('  ⚠ saved token expired — re-auth required');
    }
  }

  const authUrl = oAuth2.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    prompt: 'consent',
  });

  console.log('\n🔐 Open in browser and authorize Deep Glitch Files channel:\n');
  console.log(authUrl);
  console.log('');

  try {
    execSync(`open "${authUrl}"`, { stdio: 'ignore' });
  } catch {
    /* headless — user opens manually */
  }

  const code = await new Promise<string>((resolvePromise, reject) => {
    const server = createServer((req, res) => {
      try {
        const url = new URL(req.url || '/', redirectUri);
        const code = url.searchParams.get('code');
        const err = url.searchParams.get('error');
        if (err) {
          res.writeHead(400, { 'Content-Type': 'text/html' });
          res.end(`<h1>Auth failed: ${err}</h1>`);
          reject(new Error(err));
          server.close();
          return;
        }
        if (!code) {
          res.writeHead(400);
          res.end('No code');
          return;
        }
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end('<h1>✅ Authorized — return to terminal</h1>');
        resolvePromise(code);
        server.close();
      } catch (e) {
        reject(e);
        server.close();
      }
    });
    server.listen(port, '127.0.0.1', () => {
      console.log(`  Waiting for OAuth callback on ${redirectUri} ...`);
    });
    server.on('error', reject);
    setTimeout(() => {
      server.close();
      reject(new Error('OAuth timeout (5 min)'));
    }, 5 * 60 * 1000);
  });

  const { tokens } = await oAuth2.getToken(code);
  oAuth2.setCredentials(tokens);
  writeFileSync(TOKEN_PATH, JSON.stringify(tokens, null, 2));
  console.log(`  ✅ Token saved → ${TOKEN_PATH}\n`);
  return oAuth2;
}

async function uploadVideo(
  auth: InstanceType<typeof google.auth.OAuth2>,
  videoPath: string,
  meta: EpisodeMeta,
  privacy: 'unlisted' | 'private' | 'public',
) {
  const youtube = google.youtube({ version: 'v3', auth });
  const sizeMb = (readFileSync(videoPath).length / 1024 / 1024).toFixed(1);
  console.log(`\n📤 Uploading ${videoPath} (${sizeMb} MB)...\n`);

  const res = await youtube.videos.insert({
    part: ['snippet', 'status'],
    requestBody: {
      snippet: {
        title: meta.title,
        description: meta.description,
        tags: meta.tags,
        categoryId: '27', // Education
        defaultLanguage: 'en',
      },
      status: {
        privacyStatus: privacy,
        selfDeclaredMadeForKids: false,
      },
    },
    media: { body: createReadStream(videoPath) },
  });

  const videoId = res.data.id;
  if (!videoId) throw new Error('Upload succeeded but no video ID returned');
  return videoId;
}

async function uploadThumbnail(
  auth: InstanceType<typeof google.auth.OAuth2>,
  videoId: string,
  thumbPath: string,
) {
  const youtube = google.youtube({ version: 'v3', auth });
  await youtube.thumbnails.set({
    videoId,
    media: { body: createReadStream(thumbPath) },
  });
}

async function deleteVideo(
  auth: InstanceType<typeof google.auth.OAuth2>,
  videoId: string,
) {
  const youtube = google.youtube({ version: 'v3', auth });
  await youtube.videos.delete({ id: videoId });
  console.log(`  🗑 Deleted old video ${videoId}`);
}

async function main() {
  const episodeDir = process.argv[2];
  const privacyArg = process.argv.find(a => a.startsWith('--privacy='));
  const privacy = (privacyArg?.split('=')[1] || 'unlisted') as 'unlisted' | 'private' | 'public';
  const replaceArg = process.argv.find(a => a.startsWith('--replace='));
  const replaceId = replaceArg?.split('=')[1];
  const noRewrap = process.argv.includes('--no-rewrap');

  if (!episodeDir) {
    console.error('Usage: npx tsx canon/upload-youtube.ts <episode-dir> [--privacy=unlisted] [--replace=ID] [--no-rewrap]');
    process.exit(1);
  }

  const ep = resolve(episodeDir);
  const videoArg = process.argv.find(a => a.startsWith('--video='));
  const videoName = videoArg?.split('=')[1] || 'EP-final-wrapped.mp4';
  let video = resolve(ep, videoName);
  const thumb = resolve(ep, 'thumbnail-A.png');
  const youtubeMd = resolve(ep, 'YOUTUBE.md');
  const body = resolve(ep, 'EP-final.mp4');

  // Auto re-wrap if stale (NEVER upload cached wrapped from old EP-final)
  if (videoName === 'EP-final-wrapped.mp4' && !noRewrap) {
    const wrap = checkWrapStale(ep);
    if (wrap.stale) {
      console.log('\n🔄 Wrap stale — rebuilding from EP-final.mp4:');
      wrap.reasons.forEach(r => console.log(`   • ${r}`));
      if (!existsSync(body)) {
        console.error('Cannot re-wrap: EP-final.mp4 missing');
        process.exit(1);
      }
      execSync(`npx tsx "${resolve(HERE, 'wrap-with-bumpers.ts')}" "${body}" --force`, {
        stdio: 'inherit',
        cwd: REPO,
      });
      video = wrap.wrappedPath;
    }
  }

  // Pre-flight cadence on body (5s grid episodes)
  if (existsSync(body)) {
    const cadence = verifyCadence(body, { windowSec: 30, minCuts: 4, maxGapSec: 8 });
    if (!cadence.ok) {
      console.error(`\n❌ Cadence gate failed on EP-final.mp4: ${cadence.reason}`);
      console.error('   Re-run assemble-final.ts before upload.');
      process.exit(1);
    }
    console.log(`\n✅ Cadence gate: ${cadence.cuts.length} cuts in first 30s`);
  }

  for (const [label, path] of [['Video', video], ['YOUTUBE.md', youtubeMd]] as const) {
    if (!existsSync(path)) {
      console.error(`Missing ${label}: ${path}`);
      process.exit(1);
    }
  }

  const meta = parseYoutubeMd(youtubeMd);
  console.log(`\n🎬 DGF YouTube Upload`);
  console.log(`   Title: ${meta.title}`);
  console.log(`   Privacy: ${privacy}`);
  console.log(`   Tags: ${meta.tags.length}`);

  const auth = await authorize();
  if (replaceId) await deleteVideo(auth, replaceId);
  const videoId = await uploadVideo(auth, video, meta, privacy);

  if (existsSync(thumb)) {
    console.log(`\n🖼 Thumbnail → ${thumb}`);
    await uploadThumbnail(auth, videoId, thumb);
  } else {
    console.log('\n  ⚠ thumbnail-A.png not found — skip thumb');
  }

  const url = `https://youtu.be/${videoId}`;
  const studio = `https://studio.youtube.com/video/${videoId}/edit`;
  console.log(`\n✅ UPLOAD_DONE`);
  console.log(`   Watch: ${url}`);
  console.log(`   Studio: ${studio}\n`);

  writeFileSync(resolve(ep, 'youtube-upload.json'), JSON.stringify({
    videoId,
    url,
    privacy,
    uploadedAt: new Date().toISOString(),
    title: meta.title,
    videoFile: videoName,
    sourceBody: 'EP-final.mp4',
  }, null, 2));
}

main().catch((e) => {
  console.error('\n❌', e.message || e);
  process.exit(1);
});
