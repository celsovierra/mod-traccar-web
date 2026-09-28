import { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { Box, Paper, Typography, TextField, Button, Radio, RadioGroup, FormControlLabel, Checkbox, CircularProgress, Card, CardContent, FormLabel } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import DescriptionIcon from '@mui/icons-material/Description';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import DirectionsCarIcon from '@mui/icons-material/DirectionsCar';
import TwoWheelerIcon from '@mui/icons-material/TwoWheeler';
import SignaturePad from './contracts/SignaturePad';
import { generateContractPdf } from './contracts/contract-pdf';

const TOTAL_STEPS = 10;

const SignContractPage = () => {
  const { token } = useParams();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [invite, setInvite] = useState(null);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [driveUrl, setDriveUrl] = useState(null);

  const [step, setStep] = useState(1);
  const [name, setName] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [email, setEmail] = useState('');
  const [cpf, setCpf] = useState('');
  const [address, setAddress] = useState('');
  const [houseNumber, setHouseNumber] = useState('');
  const [neighborhood, setNeighborhood] = useState('');
  const [city, setCity] = useState('');
  const [vehicles, setVehicles] = useState([{ vehicleType: 'carro', vehicleModel: '', vehicleColor: '', hasPlate: 'sim', vehiclePlate: '' }]);
  const [currentVehicleIndex, setCurrentVehicleIndex] = useState(0);
  const [addMoreVehicles, setAddMoreVehicles] = useState(false);
  const [signatureData, setSignatureData] = useState(null);
  const [hasSignature, setHasSignature] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [showSignatureError, setShowSignatureError] = useState(false);

  const signaturePadRef = useRef(null);

  useEffect(() => {
    if (!token) { setError('Link invalido'); setLoading(false); return; }
    fetch('/api-contratos/invites/by-token/' + token)
      .then((r) => r.json())
      .then((d) => {
        const data = d.data || null;
        if (!d.success || !data) { setError('Convite nao encontrado'); return; }
        if (data.status === 'signed') { setError('Este contrato ja foi assinado'); return; }
        if (new Date(data.expires_at) < new Date()) { setError('Este link expirou'); return; }
        setInvite(data);
      })
      .catch(() => setError('Erro ao carregar convite'))
      .finally(() => setLoading(false));
  }, [token]);

  const formatCpf = (v) => {
    const d = v.replace(/\D/g, '').slice(0, 11);
    if (d.length <= 3) return d;
    if (d.length <= 6) return d.slice(0, 3) + '.' + d.slice(3);
    if (d.length <= 9) return d.slice(0, 3) + '.' + d.slice(3, 6) + '.' + d.slice(6);
    return d.slice(0, 3) + '.' + d.slice(3, 6) + '.' + d.slice(6, 9) + '-' + d.slice(9);
  };

  const formatPhone = (v) => {
    const d = v.replace(/\D/g, '').slice(0, 11);
    if (d.length <= 2) return '(' + d;
    if (d.length <= 7) return '(' + d.slice(0, 2) + ') ' + d.slice(2);
    return '(' + d.slice(0, 2) + ') ' + d.slice(2, 7) + '-' + d.slice(7);
  };

  const fullWhats = () => '+55 ' + whatsapp;

  const processContract = () => {
    if (!invite?.template?.content) return 'Conteudo do contrato nao disponivel.';
    let content = invite.template.content;
    const vehiclesList = vehicles.map((v, i) =>
      (i + 1) + '. ' + (v.vehicleType === 'carro' ? 'Carro' : 'Moto') + ' - ' + v.vehicleModel + ' (' + v.vehicleColor + ')' + (v.hasPlate === 'sim' ? ' - Placa: ' + v.vehiclePlate : ' - Sem placa')
    ).join('\n');
    const replacements = {
      '{nome}': name, '{cpf}': cpf, '{cpf_cnpj}': cpf, '{email}': email, '{whatsapp}': fullWhats(),
      '{telefone}': fullWhats(), '{endereco}': address, '{numero}': houseNumber, '{bairro}': neighborhood,
      '{cidade}': city, '{cidade_uf}': city, '{cidade_assinatura}': city,
      '{data_atual}': new Date().toLocaleDateString('pt-BR'),
      '{veiculos}': vehiclesList,
    };
    Object.entries(replacements).forEach(([k, v]) => {
      content = content.split(k).join(v || '___');
    });
    return content;
  };

  const currentVehicle = vehicles[currentVehicleIndex];
  const updateCurrent = (field, value) => {
    setVehicles((prev) => prev.map((v, i) => i === currentVehicleIndex ? { ...v, [field]: value } : v));
  };

  const addVehicle = () => {
    setVehicles((prev) => [...prev, { vehicleType: 'carro', vehicleModel: '', vehicleColor: '', hasPlate: 'sim', vehiclePlate: '' }]);
    setCurrentVehicleIndex(vehicles.length);
    setAddMoreVehicles(false);
  };

  const removeVehicle = (i) => {
    if (vehicles.length <= 1) return;
    setVehicles((prev) => prev.filter((_, idx) => idx !== i));
    if (currentVehicleIndex >= vehicles.length - 1) setCurrentVehicleIndex(Math.max(0, vehicles.length - 2));
  };

  const canProceed = () => {
    if (step === 1) return name.trim().length >= 3;
    if (step === 2) return whatsapp.replace(/\D/g, '').length >= 10 && email.includes('@') && cpf.replace(/\D/g, '').length === 11;
    if (step === 4) return currentVehicle.vehicleType !== '';
    if (step === 5) return currentVehicle.vehicleModel.trim() !== '' && currentVehicle.vehicleColor.trim() !== '';
    if (step === 6) return currentVehicle.hasPlate === 'nao' || currentVehicle.vehiclePlate.trim() !== '';
    if (step === 9) return hasSignature;
    if (step === 10) return acceptTerms;
    return true;
  };

  const nextStep = () => {
    if (step === 7 && addMoreVehicles) { addVehicle(); setStep(4); return; }
    if (step < TOTAL_STEPS) setStep(step + 1);
  };
  const prevStep = () => { if (step > 1) setStep(step - 1); };

  const handleSubmit = async () => {
    if (!hasSignature) { setShowSignatureError(true); alert('Por favor, assine o contrato'); return; }
    if (!acceptTerms) { alert('Voce precisa aceitar os termos'); return; }
    setSubmitting(true);
    try {
      let clientIp = 'Nao registrado';
      try {
        const ipResp = await fetch('https://api.ipify.org?format=json');
        if (ipResp.ok) { const ipData = await ipResp.json(); clientIp = ipData.ip; }
      } catch {}
      const pdfBase64 = await generateContractPdf({
        contractContent: processContract(), signerName: name, signerEmail: email,
        signerCpf: cpf, signerPhone: fullWhats(), signerIp: clientIp,
        signatureData, vehicles, contractId: invite?.id, signedAt: new Date().toISOString(),
      });
      const resp = await fetch('/api-contratos/sign', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, name, whatsapp: fullWhats(), pdfBase64 }),
      });
      const data = await resp.json();
      if (!resp.ok || !data.success) throw new Error(data.error || 'Erro ao assinar');
      setDriveUrl(data.driveFileUrl);
      setSuccess(true);
    } catch (e) {
      alert(e.message || 'Erro ao enviar assinatura');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}><CircularProgress /></Box>;
  if (error) return (
    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', p: 2 }}>
      <Paper sx={{ p: 4, textAlign: 'center', maxWidth: 400 }}>
        <ErrorIcon sx={{ fontSize: 60, color: '#dc2626', mb: 2 }} />
        <Typography variant='h6' sx={{ fontWeight: 700, mb: 1 }}>Ops!</Typography>
        <Typography sx={{ color: '#64748b' }}>{error}</Typography>
      </Paper>
    </Box>
  );
  if (success) return (
    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', p: 2 }}>
      <Paper sx={{ p: 4, textAlign: 'center', maxWidth: 400 }}>
        <CheckCircleIcon sx={{ fontSize: 80, color: '#22c55e', mb: 2 }} />
        <Typography variant='h5' sx={{ fontWeight: 700, mb: 1 }}>Contrato Assinado!</Typography>
        <Typography sx={{ color: '#64748b', mb: 3 }}>Obrigado, {name}!</Typography>
        {driveUrl && (
          <Button variant='contained' startIcon={<DescriptionIcon />} href={driveUrl} target='_blank' sx={{ textTransform: 'none', fontWeight: 700, backgroundColor: '#2563eb' }}>
            Ver Contrato Assinado
          </Button>
        )}
      </Paper>
    </Box>
  );

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: '#f8fafc' }}>
      <Box sx={{ p: 2, maxWidth: 540, mx: 'auto', width: '100%' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#64748b', mb: 0.5 }}>
          <span>Etapa {step} de {TOTAL_STEPS}</span>
          <span>{Math.round((step / TOTAL_STEPS) * 100)}%</span>
        </Box>
        <Box sx={{ height: 4, backgroundColor: '#e2e8f0', borderRadius: 2, overflow: 'hidden' }}>
          <Box sx={{ height: '100%', width: ((step / TOTAL_STEPS) * 100) + '%', backgroundColor: '#2563eb', transition: 'width 0.3s' }} />
        </Box>
      </Box>

      <Box sx={{ flexGrow: 1, px: 2, py: 3, maxWidth: 540, mx: 'auto', width: '100%' }}>
        <Card elevation={0} sx={{ border: '1px solid #e2e8f0' }}>
          <CardContent sx={{ p: 3 }}>
            {step === 1 && (
              <Box>
                <Typography variant='h6' sx={{ fontWeight: 700, mb: 2 }}>Qual e o seu nome completo?</Typography>
                <TextField fullWidth value={name} onChange={(e) => setName(e.target.value)} placeholder='Digite seu nome completo' autoFocus />
              </Box>
            )}

            {step === 2 && (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Typography variant='h6' sx={{ fontWeight: 700 }}>Seus dados de contato</Typography>
                <Box>
                  <Typography sx={{ fontSize: '0.75rem', mb: 0.5 }}>WhatsApp *</Typography>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', px: 2, backgroundColor: '#f1f5f9', borderRadius: 1, fontWeight: 600, fontSize: '0.9rem' }}>+55</Box>
                    <TextField fullWidth value={whatsapp} onChange={(e) => setWhatsapp(formatPhone(e.target.value))} placeholder='(00) 00000-0000' />
                  </Box>
                </Box>
                <Box>
                  <Typography sx={{ fontSize: '0.75rem', mb: 0.5 }}>E-mail *</Typography>
                  <TextField fullWidth type='email' value={email} onChange={(e) => setEmail(e.target.value)} placeholder='seu@email.com' />
                </Box>
                <Box>
                  <Typography sx={{ fontSize: '0.75rem', mb: 0.5 }}>CPF *</Typography>
                  <TextField fullWidth value={cpf} onChange={(e) => setCpf(formatCpf(e.target.value))} placeholder='000.000.000-00' />
                </Box>
              </Box>
            )}

            {step === 3 && (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Typography variant='h6' sx={{ fontWeight: 700 }}>Endereco (opcional)</Typography>
                <Box sx={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 1 }}>
                  <TextField label='Rua/Avenida' value={address} onChange={(e) => setAddress(e.target.value)} />
                  <TextField label='No' value={houseNumber} onChange={(e) => setHouseNumber(e.target.value)} />
                </Box>
                <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1 }}>
                  <TextField label='Bairro' value={neighborhood} onChange={(e) => setNeighborhood(e.target.value)} />
                  <TextField label='Cidade' value={city} onChange={(e) => setCity(e.target.value)} />
                </Box>
              </Box>
            )}

            {step === 4 && (
              <Box>
                <Typography variant='h6' sx={{ fontWeight: 700, mb: 2 }}>{vehicles.length > 1 ? 'Veiculo ' + (currentVehicleIndex + 1) + ': ' : ''}Tipo de veiculo</Typography>
                <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                  <Paper onClick={() => updateCurrent('vehicleType', 'carro')} sx={{ p: 3, textAlign: 'center', cursor: 'pointer', border: '2px solid', borderColor: currentVehicle.vehicleType === 'carro' ? '#2563eb' : '#e2e8f0', backgroundColor: currentVehicle.vehicleType === 'carro' ? '#eff6ff' : 'transparent' }}>
                    <DirectionsCarIcon sx={{ fontSize: 40, mb: 1 }} />
                    <Typography sx={{ fontWeight: 600 }}>Carro</Typography>
                  </Paper>
                  <Paper onClick={() => updateCurrent('vehicleType', 'moto')} sx={{ p: 3, textAlign: 'center', cursor: 'pointer', border: '2px solid', borderColor: currentVehicle.vehicleType === 'moto' ? '#2563eb' : '#e2e8f0', backgroundColor: currentVehicle.vehicleType === 'moto' ? '#eff6ff' : 'transparent' }}>
                    <TwoWheelerIcon sx={{ fontSize: 40, mb: 1 }} />
                    <Typography sx={{ fontWeight: 600 }}>Moto</Typography>
                  </Paper>
                </Box>
              </Box>
            )}

            {step === 5 && (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Typography variant='h6' sx={{ fontWeight: 700 }}>Modelo e cor</Typography>
                <TextField label='Modelo *' value={currentVehicle.vehicleModel} onChange={(e) => updateCurrent('vehicleModel', e.target.value)} placeholder={currentVehicle.vehicleType === 'carro' ? 'Ex: Honda Civic' : 'Ex: Honda CG 160'} />
                <TextField label='Cor *' value={currentVehicle.vehicleColor} onChange={(e) => updateCurrent('vehicleColor', e.target.value)} placeholder='Ex: Preto, Branco...' />
              </Box>
            )}

            {step === 6 && (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Typography variant='h6' sx={{ fontWeight: 700 }}>Placa do veiculo</Typography>
                <RadioGroup value={currentVehicle.hasPlate} onChange={(e) => updateCurrent('hasPlate', e.target.value)}>
                  <FormControlLabel value='sim' control={<Radio />} label='Sim, possui placa' />
                  <FormControlLabel value='nao' control={<Radio />} label='Nao possui placa' />
                </RadioGroup>
                {currentVehicle.hasPlate === 'sim' && (
                  <TextField label='Placa *' value={currentVehicle.vehiclePlate} onChange={(e) => updateCurrent('vehiclePlate', e.target.value.toUpperCase())} placeholder='ABC1D23' inputProps={{ maxLength: 7 }} />
                )}
              </Box>
            )}

            {step === 7 && (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Typography variant='h6' sx={{ fontWeight: 700 }}>Mais veiculos?</Typography>
                {vehicles.map((v, i) => (
                  <Paper key={i} sx={{ p: 1.5, display: 'flex', alignItems: 'center', gap: 1, backgroundColor: '#f8fafc' }}>
                    {v.vehicleType === 'carro' ? <DirectionsCarIcon sx={{ fontSize: 18 }} /> : <TwoWheelerIcon sx={{ fontSize: 18 }} />}
                    <Typography sx={{ flexGrow: 1, fontSize: '0.9rem' }}>{v.vehicleModel} - {v.vehicleColor}</Typography>
                    {vehicles.length > 1 && <Button size='small' onClick={() => removeVehicle(i)} sx={{ minWidth: 0, color: '#dc2626' }}><DeleteIcon fontSize='small' /></Button>}
                  </Paper>
                ))}
                <FormControlLabel control={<Checkbox checked={addMoreVehicles} onChange={(e) => setAddMoreVehicles(e.target.checked)} />} label={<Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}><AddIcon sx={{ fontSize: 18 }} /> Adicionar outro veiculo</Box>} />
              </Box>
            )}

            {step === 8 && (
              <Box>
                <Typography variant='h6' sx={{ fontWeight: 700, mb: 2 }}>Revise o contrato</Typography>
                <Paper sx={{ p: 2, maxHeight: '55vh', overflowY: 'auto', backgroundColor: '#f8fafc', fontSize: '0.78rem', whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
                  {processContract()}
                </Paper>
              </Box>
            )}

            {step === 9 && (
              <Box>
                <Typography variant='h6' sx={{ fontWeight: 700, mb: 1 }}>Sua assinatura</Typography>
                <Typography sx={{ fontSize: '0.78rem', color: '#64748b', mb: 2 }}>Use o dedo ou mouse para assinar abaixo.</Typography>
                <SignaturePad ref={signaturePadRef} width={400} height={180} showError={showSignatureError} onSignatureChange={(data, has) => { setSignatureData(data); setHasSignature(has); if (has) setShowSignatureError(false); }} />
              </Box>
            )}

            {step === 10 && (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Typography variant='h6' sx={{ fontWeight: 700 }}>Confirme os dados</Typography>
                <Box sx={{ fontSize: '0.88rem' }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', p: 1, backgroundColor: '#f8fafc', mb: 0.5 }}><span>Nome:</span><strong>{name}</strong></Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', p: 1, backgroundColor: '#f8fafc', mb: 0.5 }}><span>WhatsApp:</span><strong>{whatsapp}</strong></Box>
                  {email && <Box sx={{ display: 'flex', justifyContent: 'space-between', p: 1, backgroundColor: '#f8fafc', mb: 0.5 }}><span>E-mail:</span><strong>{email}</strong></Box>}
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', p: 1, backgroundColor: '#f8fafc', mb: 0.5 }}><span>Veiculos:</span><strong>{vehicles.length}</strong></Box>
                </Box>
                <FormControlLabel control={<Checkbox checked={acceptTerms} onChange={(e) => setAcceptTerms(e.target.checked)} />} label='Li e concordo com todos os termos. Confirmo que as informacoes sao verdadeiras.' />
              </Box>
            )}
          </CardContent>
        </Card>
      </Box>

      <Box sx={{ p: 2, borderTop: '1px solid #e2e8f0', backgroundColor: '#fff', maxWidth: 540, mx: 'auto', width: '100%' }}>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button variant='outlined' startIcon={<ArrowBackIcon />} onClick={prevStep} disabled={step === 1} sx={{ flexGrow: 1, textTransform: 'none' }}>Voltar</Button>
          {step < TOTAL_STEPS ? (
            <Button variant='contained' endIcon={<ArrowForwardIcon />} onClick={nextStep} disabled={!canProceed()} sx={{ flexGrow: 1, textTransform: 'none', fontWeight: 700, backgroundColor: '#2563eb' }}>Proximo</Button>
          ) : (
            <Button variant='contained' onClick={handleSubmit} disabled={!canProceed() || submitting} startIcon={submitting ? <CircularProgress size={16} color='inherit' /> : <CheckCircleIcon />} sx={{ flexGrow: 1, textTransform: 'none', fontWeight: 700, backgroundColor: '#22c55e' }}>{submitting ? 'Enviando...' : 'Assinar'}</Button>
          )}
        </Box>
      </Box>
    </Box>
  );
};

export default SignContractPage;
