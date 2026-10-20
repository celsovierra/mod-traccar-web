const fs = require('fs');
const file = 'C:/mod-traccar-web/src/common/components/StatusCard.jsx';
let content = fs.readFileSync(file, 'utf8');
const lines = content.split('\n');
let start = -1;
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('if (geoResponse.ok) {')) {
    start = i;
    break;
  }
}
if (start !== -1) {
  // Encontra o fim do bloco que foi cortado
  let end = start + 1;
  while (end < lines.length && !lines[end].includes('const handleOpenGeofences')) {
    end++;
  }
  
  // Substitui tudo ate o proximo bloco por um codigo correto
  const newBlock = [
    "        if (geoResponse.ok) {",
    "          const newGeofence = await geoResponse.json();",
    "          createdGeofenceId = newGeofence.id;",
    "          await fetch('/api/permissions', {",
    "            method: 'POST',",
    "            headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin',",
    "            body: JSON.stringify({ deviceId: Number(deviceId), geofenceId: createdGeofenceId }),",
    "          }).catch(() => {});",
    "          if (user?.id) {",
    "            await fetch('/api/permissions', {",
    "              method: 'POST',",
    "              headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin', ",
    "              body: JSON.stringify({ userId: Number(user.id), geofenceId: createdGeofenceId }),",
    "            }).catch(() => {});",
    "          }",
    "        }"
  ];
  lines.splice(start, end - start, ...newBlock);
  fs.writeFileSync(file, lines.join('\n'), 'utf8');
  console.log('SUCESSO! O erro da linha 974 foi corrigido.');
} else {
  console.log('ERRO: Nao encontrou o if (geoResponse.ok)');
}