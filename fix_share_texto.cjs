const fs = require('fs');
const file = 'C:/mod-traccar-web/src/common/components/StatusCard.jsx';
let content = fs.readFileSync(file, 'utf8');

const funcaoNova = `const handleShareWhatsapp = async () => {
    const pos = position || {};
    const isOnline = device?.status === 'online';
    const isIgnitionOn = Boolean(pos?.attributes?.ignition ?? pos?.attributes?.acc ?? false);
    
    const msg = [
      '*RELATORIO DE MONITORAMENTO*',
      '',
      '*Veiculo:* ' + (device?.name || 'Veiculo'),
      '*Status:* ' + (isOnline ? 'Online' : 'Offline'),
      'Ignicao: ' + (isIgnitionOn ? 'Ligada' : 'Desligada'),
      'Bloqueio: ' + (isBlocked ? 'Bloqueado' : 'Desbloqueado'),
      '',
      '*Placa:* ' + (device?.attributes?.plate || 'SEM PLACA'),
      '*Velocidade:* ' + (pos.speed ? (pos.speed * 1.85).toFixed(2) : '0.00') + ' km/h',
      '*Tempo:* ' + (stoppedStatus ? 'Parado' : 'Em movimento'),
      '',
      '*Localizacao no Mapa:*',
      (pos.latitude && pos.longitude ? 'https://www.google.com/maps?q=' + pos.latitude + ',' + pos.longitude : 'Sem localizacao'),
    ].join('\\n');
    
    window.location.href = 'whatsapp://send?text=' + encodeURIComponent(msg);
  };`;

const start = content.indexOf('const handleShareWhatsapp = async () => {');
const end = content.indexOf('const handleRemove', start);

if (start !== -1 && end !== -1) {
  content = content.substring(0, start) + funcaoNova + '\n\n  ' + content.substring(end);
  fs.writeFileSync(file, content, 'utf8');
  console.log('SUCESSO! O botao de compartilhar foi criado com texto limpo e negrito.');
} else {
  console.log('ERRO: Nao encontrou o botao para substituir.');
}
