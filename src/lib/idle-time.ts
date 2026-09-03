import React from 'react';

const TOW_SPEED_KMH = 15;
const MOVING_SPEED_KNOTS = 0.5;
const OBSERVATION_GAP_MS = 10 * 60 * 1000;
const MAX_DURATION_MS = 30 * 24 * 60 * 60 * 1000;
const TZ = "-03:00";

const stateMap = new Map();

export function parseTraccarTime(value) {
  if (!value) return NaN;
  let s = String(value).trim();
  if (!/(Z|[+-]\d{2}:?\d{2})$/i.test(s)) s = s.replace(" ", "T") + TZ;
  const t = new Date(s).getTime();
  return Number.isFinite(t) ? t : NaN;
}

export function isMoving(position) {
  if (!position) return false;
  const a = position.attributes || {};
  const kmh = (position.speed || 0) * 1.852;
  const ign = a.ignition !== undefined ? a.ignition : a.acc;
  if (typeof ign === "boolean") return ign === true ? true : kmh >= TOW_SPEED_KMH;
  if (typeof a.motion === "boolean") return a.motion === true;
  return (position.speed || 0) > MOVING_SPEED_KNOTS;
}

function candidateFromTraccar(position, now, lastMotionSeen) {
  const a = position.attributes || {};
  const raw = a.lastStoppedTime ?? a.lastMotionChange ?? null;
  if (!raw) return null;
  const t = parseTraccarTime(String(raw));
  if (!Number.isFinite(t)) return null;
  if (lastMotionSeen !== null && lastMotionSeen > t) return null;
  const fix = parseTraccarTime(position.fixTime) || now;
  if (fix - t > OBSERVATION_GAP_MS) return null;
  if (now - t > MAX_DURATION_MS) return null;
  return t;
}

export function getStoppedDuration(deviceId, position) {
  if (!position) return null;
  const now = Date.now();
  const fix = parseTraccarTime(position.fixTime) || now;
  const moving = isMoving(position);

  const prev = stateMap.get(deviceId) || { stopStart: null, lastMotionSeen: null, lastSeen: null };
  const next = { ...prev, lastSeen: fix };

  if (moving) {
    next.lastMotionSeen = fix;
    next.stopStart = null;
    stateMap.set(deviceId, next);
    return null;
  }

  const gap = prev.lastSeen !== null && fix - prev.lastSeen > OBSERVATION_GAP_MS;
  if (next.stopStart === null || gap) {
    next.stopStart = candidateFromTraccar(position, now, next.lastMotionSeen) ?? fix;
  }
  if (next.lastMotionSeen !== null && next.stopStart < next.lastMotionSeen) {
    next.stopStart = next.lastMotionSeen;
  }

  stateMap.set(deviceId, next);
  const duration = now - next.stopStart;
  return duration < 0 || duration > MAX_DURATION_MS ? 0 : duration;
}

export function formatDuration(ms) {
  const min = Math.floor(ms / 60000), h = Math.floor(min / 60), d = Math.floor(h / 24);
  if (d > 0) return `${d}d ${h % 24}h ${min % 60}min`;
  if (h > 0) return `${h}h ${min % 60}min`;
  return `${min}min`;
}

export function useIdleTick(intervalMs = 30000) {
  const [tick, setTick] = React.useState(0);
  React.useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return tick;
}
