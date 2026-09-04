export function formatStoppedDuration(totalMinutes) {
  if (totalMinutes < 1) return "Parado há 0 min";
  if (totalMinutes < 60) return `Parado há ${totalMinutes} min`;
  
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  
  if (hours < 24) {
    if (minutes === 0) return `Parado há ${hours}h`;
    return `Parado há ${hours}h ${minutes}min`;
  }
  
  const days = Math.floor(hours / 24);
  const remainHours = hours % 24;
  if (remainHours === 0) return `Parado há ${days}d`;
  return `Parado há ${days}d ${remainHours}h`;
}