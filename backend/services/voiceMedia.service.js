import { exec, execFile } from 'child_process';
import { randomUUID } from 'crypto';
import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import aiAssistantService from './aiAssistant.service.js';

function execFileAsync(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    execFile(command, args, { windowsHide: true, ...options }, (error, stdout, stderr) => {
      if (error) {
        error.stdout = stdout;
        error.stderr = stderr;
        reject(error);
        return;
      }
      resolve({ stdout, stderr });
    });
  });
}

function execAsync(command, options = {}) {
  return new Promise((resolve, reject) => {
    exec(command, { windowsHide: true, ...options }, (error, stdout, stderr) => {
      if (error) {
        error.stdout = stdout;
        error.stderr = stderr;
        reject(error);
        return;
      }
      resolve({ stdout, stderr });
    });
  });
}

async function fileExists(targetPath) {
  if (!targetPath) return false;
  try {
    await fs.access(targetPath);
    return true;
  } catch {
    return false;
  }
}

async function resolveWhisperRunner() {
  const configured = process.env.WHISPER_COMMAND || '';
  const appData = process.env.APPDATA || '';
  const localAppData = process.env.LOCALAPPDATA || '';
  const configuredPython = process.env.WHISPER_PYTHON || '';

  const pythonCandidates = [
    configuredPython,
    localAppData ? path.join(localAppData, 'Programs', 'Python', 'Python314', 'python.exe') : '',
    localAppData ? path.join(localAppData, 'Programs', 'Python', 'Python313', 'python.exe') : '',
    localAppData ? path.join(localAppData, 'Programs', 'Python', 'Python312', 'python.exe') : '',
  ].filter(Boolean);

  for (const candidate of pythonCandidates) {
    if (await fileExists(candidate)) {
      return {
        command: candidate,
        prefixArgs: ['-m', 'whisper'],
        display: `${candidate} -m whisper`,
      };
    }
  }

  const whisperCandidates = [
    configured,
    appData ? path.join(appData, 'Python', 'Python314', 'Scripts', 'whisper.exe') : '',
    appData ? path.join(appData, 'Python', 'Python313', 'Scripts', 'whisper.exe') : '',
    appData ? path.join(appData, 'Python', 'Python312', 'Scripts', 'whisper.exe') : '',
    localAppData ? path.join(localAppData, 'Programs', 'Python', 'Python314', 'Scripts', 'whisper.exe') : '',
    'whisper',
  ].filter(Boolean);

  for (const candidate of whisperCandidates) {
    if (candidate === 'whisper') {
      return { command: candidate, prefixArgs: [], display: candidate };
    }
    if (await fileExists(candidate)) {
      return { command: candidate, prefixArgs: [], display: candidate };
    }
  }

  return {
    command: configured || 'whisper',
    prefixArgs: [],
    display: configured || 'whisper',
  };
}

function escapePowerShellArg(value) {
  return String(value || '').replace(/'/g, "''");
}

function getAudioExtension(originalName = '') {
  const ext = path.extname(originalName).trim();
  if (!ext) return '.webm';
  return ext;
}

async function writeTempAudioFile(file) {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'arogya-voice-'));
  const audioPath = path.join(tempDir, `input${getAudioExtension(file?.originalname)}`);
  await fs.writeFile(audioPath, file.buffer);
  return { tempDir, audioPath };
}

async function cleanupTempDir(tempDir) {
  if (!tempDir) return;
  await fs.rm(tempDir, { recursive: true, force: true });
}

async function transcribeViaLocalService(file) {
  const sttUrl = process.env.WHISPER_SERVICE_URL || 'http://127.0.0.1:8765/transcribe';
  let response;
  try {
    response = await fetch(sttUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fileName: file?.originalname || 'audio.webm',
        audioBase64: file.buffer.toString('base64'),
        model: process.env.WHISPER_MODEL || 'base',
        language: process.env.WHISPER_LANGUAGE || 'Nepali',
      }),
    });
  } catch (error) {
    throw {
      status: 503,
      message: `Local Whisper service is unavailable at "${sttUrl}". Start backend/scripts/whisper_http_service.py and keep it running while using voice booking.`,
      cause: error,
    };
  }

  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    throw {
      status: response.status === 404 ? 503 : response.status,
      message: payload?.message || `Local Whisper service failed with status ${response.status}`,
    };
  }

  const payload = await response.json().catch(() => null);
  return String(payload?.text || '').trim();
}

async function transcribeAudioFile(file) {
  if (!file?.buffer?.length) {
    throw { status: 400, message: 'Audio file is required' };
  }

  if ((process.env.WHISPER_SERVICE_ENABLED || 'true').toLowerCase() !== 'false') {
    return transcribeViaLocalService(file);
  }

  const whisperRunner = await resolveWhisperRunner();
  const whisperModel = process.env.WHISPER_MODEL || 'base';
  const whisperLanguage = process.env.WHISPER_LANGUAGE || 'Nepali';
  const whisperFfmpegDir = process.env.WHISPER_FFMPEG_DIR || '';

  let tempDir = null;

  try {
    const temp = await writeTempAudioFile(file);
    tempDir = temp.tempDir;

    const env = { ...process.env };
    if (whisperFfmpegDir) {
      env.PATH = `${whisperFfmpegDir}${path.delimiter}${env.PATH || ''}`;
    }
    env.PYTHONUTF8 = env.PYTHONUTF8 || '1';
    env.PYTHONIOENCODING = env.PYTHONIOENCODING || 'utf-8';
    const whisperArgs = [
      ...whisperRunner.prefixArgs,
      temp.audioPath,
      '--model',
      whisperModel,
      '--language',
      whisperLanguage,
      '--output_format',
      'txt',
      '--output_dir',
      tempDir,
    ];

    try {
      await execFileAsync(whisperRunner.command, whisperArgs, { env });
    } catch (error) {
      // Some Windows setups block direct child-process spawning from Node
      // even though the executable is present. Fall back to a shell command.
      if (error?.code !== 'ENOENT' && error?.code !== 'EPERM') {
        throw error;
      }

      const quotedCommand = `"${whisperRunner.command}"`;
      const quotedArgs = whisperArgs
        .map((arg) => `"${String(arg).replace(/"/g, '\\"')}"`)
        .join(' ');

      try {
        await execAsync(`${quotedCommand} ${quotedArgs}`, { env });
      } catch (shellError) {
        if (shellError?.code !== 'ENOENT' && shellError?.code !== 'EPERM') {
          throw shellError;
        }

        const powerShellExe =
          process.env.ComSpec?.includes('System32')
            ? 'C:\\WINDOWS\\System32\\WindowsPowerShell\\v1.0\\powershell.exe'
            : 'C:\\WINDOWS\\System32\\WindowsPowerShell\\v1.0\\powershell.exe';

        const powerShellCommand = [
          `$env:PATH='${escapePowerShellArg(env.PATH || '')}'`,
          `$env:PYTHONUTF8='${escapePowerShellArg(env.PYTHONUTF8 || '1')}'`,
          `$env:PYTHONIOENCODING='${escapePowerShellArg(env.PYTHONIOENCODING || 'utf-8')}'`,
          `& '${escapePowerShellArg(whisperRunner.command)}' ${whisperArgs.map((arg) => `'${escapePowerShellArg(arg)}'`).join(' ')}`,
        ].join('; ');

        await execFileAsync(
          powerShellExe,
          ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-Command', powerShellCommand],
          { env }
        );
      }
    }

    const transcriptPath = path.join(
      tempDir,
      `${path.basename(temp.audioPath, path.extname(temp.audioPath))}.txt`
    );
    const transcript = await fs.readFile(transcriptPath, 'utf8');
    return String(transcript || '').trim();
  } catch (error) {
    if (error?.code === 'ENOENT') {
      throw {
        status: 503,
        message: `Whisper command not found. Tried "${whisperRunner.display}". Start the local Whisper service, or verify that Python and Whisper are installed for the same user running the backend.`,
      };
    }
    if (error?.code === 'EPERM') {
      throw {
        status: 503,
        message: `Whisper could not be started because the Node process is blocked from spawning external executables on this machine. Tried "${whisperRunner.display}". Start the local Whisper service, or switch STT to an HTTP API.`,
      };
    }

    throw {
      status: 500,
      message: error?.stderr?.trim() || error?.message || 'Failed to transcribe audio',
    };
  } finally {
    await cleanupTempDir(tempDir);
  }
}

async function synthesizeSpeech(text) {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  const voiceId = process.env.ELEVENLABS_VOICE_ID;
  if (!apiKey || !voiceId || !text) return null;

  const modelId = process.env.ELEVENLABS_MODEL_ID || 'eleven_multilingual_v2';
  const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voiceId)}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'audio/mpeg',
      'xi-api-key': apiKey,
    },
    body: JSON.stringify({
      text,
      model_id: modelId,
      voice_settings: {
        stability: 0.45,
        similarity_boost: 0.8,
      },
    }),
  });

  if (!response.ok) {
    const details = await response.text();
    throw {
      status: 502,
      message: `TTS synthesis failed: ${details.slice(0, 240)}`,
    };
  }

  const audioBuffer = Buffer.from(await response.arrayBuffer());
  return {
    mimeType: 'audio/mpeg',
    audioBase64: audioBuffer.toString('base64'),
  };
}

export async function startBrowserVoiceSession(userId) {
  const sessionId = randomUUID();
  const initial = aiAssistantService.getInitialPrompt({
    channel: 'voice',
    sessionKey: `browser-voice:${sessionId}`,
  });
  const tts = await synthesizeSpeech(initial.reply).catch(() => null);

  return {
    sessionId,
    ...initial,
    speechText: initial.reply,
    audioBase64: tts?.audioBase64 || null,
    audioMimeType: tts?.mimeType || null,
  };
}

export async function processBrowserVoiceTurn(userId, sessionId, file) {
  const transcript = await transcribeAudioFile(file);
  if (!transcript) {
    return {
      transcript: '',
      reply: 'I could not hear anything clearly. Please try speaking again.',
      speechText: 'I could not hear anything clearly. Please try speaking again.',
      stage: 'listening',
      audioBase64: null,
      audioMimeType: null,
    };
  }

  const result = await aiAssistantService.processMessage(userId, transcript, {
    channel: 'voice',
    sessionKey: `browser-voice:${sessionId}`,
  });
  const tts = await synthesizeSpeech(result.reply).catch(() => null);

  return {
    transcript,
    ...result,
    speechText: result.reply,
    audioBase64: tts?.audioBase64 || null,
    audioMimeType: tts?.mimeType || null,
  };
}

export function endBrowserVoiceSession(sessionId) {
  aiAssistantService.resetSession(`browser-voice:${sessionId}`);
  return { sessionId, ended: true };
}
