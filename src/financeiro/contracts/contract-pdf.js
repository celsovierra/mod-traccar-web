import jsPDF from 'jspdf';

const generateSafeId = () => Math.random().toString(36).slice(2) + Date.now().toString(36);

export async function generateContractPdf(options) {
  const signerName = options.signerName || '';
  const signerCpf = options.signerCpf || '';
  const signerEmail = options.signerEmail || '';
  const signerIp = options.signerIp || 'N/A';
  const signerWhatsapp = options.signerWhatsapp || options.signerPhone || '';
  const signatureDataUrl = options.signatureDataUrl || options.signatureData || '';
  const contractText = options.contractContent || options.contractText || '';
  const contractUuid = options.contractId || generateSafeId();
  const signedAtDate = options.signedAt ? new Date(options.signedAt) : new Date();
  const signDateFormatted = signedAtDate.toLocaleDateString('pt-BR');
  const signTimeFormatted = signedAtDate.toLocaleTimeString('pt-BR');
  const signDateTimeFull = signDateFormatted + ' as ' + signTimeFormatted;
  const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : 'Unknown';

  let device = 'Desconhecido';
  if (/Android/i.test(userAgent)) device = 'Android';
  else if (/iPhone|iPad/i.test(userAgent)) device = 'iOS';
  else if (/Windows/i.test(userAgent)) device = 'Windows';
  else if (/Mac/i.test(userAgent)) device = 'macOS';
  else if (/Linux/i.test(userAgent)) device = 'Linux';

  let browser = 'Desconhecido';
  if (/Chrome/i.test(userAgent) && !/Edg/i.test(userAgent)) browser = 'Google Chrome';
  else if (/Safari/i.test(userAgent) && !/Chrome/i.test(userAgent)) browser = 'Safari';
  else if (/Firefox/i.test(userAgent)) browser = 'Firefox';
  else if (/Edg/i.test(userAgent)) browser = 'Microsoft Edge';

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  const contentWidth = pageWidth - margin * 2;
  const footerY = pageHeight - 10;
  const maxContentY = footerY - 8;
  let currentY = margin;
  let pageNumber = 1;

  const addFooter = (pageNum) => {
    doc.setFontSize(6.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(120, 120, 120);
    doc.setDrawColor(200, 200, 200);
    doc.line(margin, footerY - 3, pageWidth - margin, footerY - 3);
    doc.text(contractUuid + ' | Documento assinado eletronicamente', margin, footerY);
    doc.text('Pagina ' + pageNum, pageWidth - margin, footerY, { align: 'right' });
    doc.setTextColor(0, 0, 0);
  };

  const addCornerSignature = () => {
    if (signatureDataUrl) {
      try { doc.addImage(signatureDataUrl, 'PNG', pageWidth - margin - 30, 8, 30, 15); } catch {}
    }
  };

  const addNewPage = () => {
    addFooter(pageNumber);
    pageNumber++;
    doc.addPage();
    currentY = margin;
    addCornerSignature();
  };

  const ensureSpace = (needed) => {
    if (currentY + needed > maxContentY) { addNewPage(); return true; }
    return false;
  };

  addCornerSignature();
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('CONTRATO DE PRESTACAO DE SERVICOS', pageWidth / 2, currentY + 10, { align: 'center' });
  currentY += 25;

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  const paragraphs = contractText.split(/\n+/);
  for (const p of paragraphs) {
    const t = p.trim();
    if (!t) { currentY += 3; continue; }
    const isHeading = /^(CLAUSULA|CONTRATAD[AO]:|CONTRATANTE:|IDENTIFICACAO|VEICULOS)/i.test(t);
    if (isHeading) {
      ensureSpace(8);
      doc.setFont('helvetica', 'bold');
      const lines = doc.splitTextToSize(t, contentWidth);
      for (const l of lines) { ensureSpace(5); doc.text(l, margin, currentY); currentY += 4.5; }
      currentY += 2;
      doc.setFont('helvetica', 'normal');
    } else {
      const lines = doc.splitTextToSize(t, contentWidth);
      for (const l of lines) { ensureSpace(5); doc.text(l, margin, currentY); currentY += 4.5; }
      currentY += 1;
    }
  }

  if (options.vehicles && options.vehicles.length > 0) {
    currentY += 6;
    ensureSpace(20);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('VEICULOS CADASTRADOS:', margin, currentY);
    currentY += 7;
    options.vehicles.forEach((v, i) => {
      ensureSpace(25);
      doc.setFontSize(9);
      doc.text('Veiculo ' + (i + 1) + ':', margin, currentY);
      currentY += 5;
      doc.setFont('helvetica', 'normal');
      doc.text('Tipo: ' + (v.vehicleType || 'N/A'), margin + 5, currentY);
      currentY += 5;
      doc.text('Modelo: ' + (v.vehicleModel || 'N/A'), margin + 5, currentY);
      currentY += 5;
      doc.text('Cor: ' + (v.vehicleColor || 'N/A'), margin + 5, currentY);
      currentY += 5;
      doc.text('Placa: ' + (v.vehiclePlate || 'N/A'), margin + 5, currentY);
      currentY += 8;
    });
  }

  currentY += 5;
  ensureSpace(60);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('Assinatura Digital', margin, currentY);
  currentY += 8;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text('Assinado por: ' + signerName, margin, currentY);
  currentY += 5;
  doc.text('Data: ' + signDateTimeFull, margin, currentY);
  currentY += 10;

  if (signatureDataUrl) {
    try {
      ensureSpace(50);
      const sigW = 70, sigH = 35;
      doc.addImage(signatureDataUrl, 'PNG', (pageWidth - sigW) / 2, currentY, sigW, sigH);
      currentY += sigH + 3;
      const lineW = 70;
      doc.setDrawColor(0, 0, 0);
      doc.line((pageWidth - lineW) / 2, currentY, (pageWidth + lineW) / 2, currentY);
      currentY += 5;
      doc.setFontSize(9);
      doc.text(signerName, pageWidth / 2, currentY, { align: 'center' });
      currentY += 5;
      if (signerCpf) {
        doc.text('CPF: ' + signerCpf, pageWidth / 2, currentY, { align: 'center' });
        currentY += 5;
      }
    } catch {}
  }

  addFooter(pageNumber);
  pageNumber++;
  doc.addPage();
  currentY = margin;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('Relatorio de Assinaturas', margin, currentY);
  currentY += 8;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(100, 100, 100);
  doc.text('Datas e horarios em America/Sao_Paulo', margin, currentY);
  currentY += 8;
  doc.setTextColor(0, 0, 0);
  doc.setDrawColor(200, 200, 200);
  doc.line(margin, currentY, pageWidth - margin, currentY);
  currentY += 8;

  const lv = (label, value) => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text(label + ':', margin, currentY);
    doc.setFont('helvetica', 'normal');
    doc.text(String(value), margin + 40, currentY);
    currentY += 6;
  };
  lv('Status', 'Assinado');
  lv('Documento', 'Contrato de Prestacao de Servicos');
  lv('Numero', contractUuid);
  lv('Data', signDateTimeFull);

  currentY += 4;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('Assinaturas', margin, currentY);
  currentY += 8;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text('Nome: ' + signerName, margin, currentY);
  currentY += 5;
  doc.text('CPF: ' + (signerCpf || 'N/A'), margin, currentY);
  currentY += 5;
  doc.text('WhatsApp: ' + (signerWhatsapp || 'N/A'), margin, currentY);
  currentY += 5;
  doc.text('E-mail: ' + (signerEmail || 'N/A'), margin, currentY);
  currentY += 5;
  doc.text('IP: ' + signerIp, margin, currentY);
  currentY += 5;
  doc.text('Dispositivo: ' + device + ' - ' + browser, margin, currentY);
  currentY += 8;

  if (signatureDataUrl) {
    try {
      const sigW = 40, sigH = 20;
      doc.addImage(signatureDataUrl, 'PNG', pageWidth - margin - sigW, currentY - 25, sigW, sigH);
    } catch {}
  }

  addFooter(pageNumber);
  return doc.output('datauristring');
}
