import crypto from 'crypto';

const DEFAULT_MEETING_BASE_URL = 'https://meet.jit.si';

const cleanRoomName = (value) => String(value || crypto.randomUUID())
  .trim()
  .replace(/[^a-zA-Z0-9-]/g, '-')
  .replace(/-+/g, '-')
  .replace(/^-|-$/g, '');

export function buildAppointmentMeetingLink(seed) {
  const baseUrl = String(process.env.MEETING_BASE_URL || DEFAULT_MEETING_BASE_URL).replace(/\/+$/, '');
  const roomName = `arogyanidhi-${cleanRoomName(seed)}`;

  try {
    return new URL(roomName, `${baseUrl}/`).toString();
  } catch {
    return `${DEFAULT_MEETING_BASE_URL}/${roomName}`;
  }
}
