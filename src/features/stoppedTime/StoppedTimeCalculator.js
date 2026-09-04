import { formatStoppedDuration } from './stoppedTimeUtils';

const storage = new Map();

export function getStoppedTimeStatus(deviceId, position) {
  if (!deviceId || !position) {
    return null;
  }

  const attributes = position.attributes || {};
  const ignition = attributes.ignition;

  // Se a ignição estiver ligada (true, 1, "true"), limpa o estado de parada imediatamente
  if (ignition === true || ignition === 1 || ignition === "true" || ignition === "1") {
    if (storage.has(deviceId)) {
      storage.delete(deviceId);
    }
    return null;
  }

  // Se a ignição estiver desligada (false, 0, "false")
  if (ignition === false || ignition === 0 || ignition === "false" || ignition === "0") {
    let record = storage.get(deviceId);
    
    // Define o timestamp base utilizando o fixTime do pacote fornecido pelo Traccar
    const packetTime = position.fixTime ? new Date(position.fixTime).getTime() : Date.now();

    if (!record || record.ignitionState !== false) {
      record = {
        stoppedSince: packetTime,
        ignitionState: false,
      };
      storage.set(deviceId, record);
    }

    const diffMs = Math.max(0, Date.now() - record.stoppedSince);
    const totalMinutes = Math.floor(diffMs / 60000);

    return {
      label: formatStoppedDuration(totalMinutes),
      stoppedSince: record.stoppedSince,
    };
  }

  return null;
}