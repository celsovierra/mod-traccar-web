const fs = require('fs');
const file = 'C:/mod-traccar-web/src/common/components/StatusCard.jsx';
const { execSync } = require('child_process');

// 1. Pega o codigo 100% funcional do GitHub (commit 972b403)
let content = execSync('git show 972b403:src/common/components/StatusCard.jsx', { encoding: 'utf8' });

// 2. Encontra a funcao de compartilhar e substitui por uma vazia
const start = content.indexOf('const handleShareWhatsapp = async () => {');
if (start !== -1) {
  // Acha o final da funcao (a proxima declaracao const)
  const end = content.indexOf('const handleRemove', start);
  
  if (end !== -1) {
    // Cria uma funcao simples, sem emojis e sem nada que possa quebrar
    const novaFuncao = `const handleShareWhatsapp = async () => {
    alert('Funcao de compartilhar sera criada depois.');
  };\n\n  `;
    
    // Substitui a funcao velha pela nova
    content = content.substring(0, start) + novaFuncao + content.substring(end);
    fs.writeFileSync(file, content, 'utf8');
    console.log('SUCESSO! O codigo foi restaurado do Git e o botao de compartilhar foi zerado.');
  } else {
    console.log('ERRO: Nao encontrou o fim da funcao.');
  }
} else {
  console.log('ERRO: Nao encontrou a funcao de compartilhar no Git.');
}
