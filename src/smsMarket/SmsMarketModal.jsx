import React, { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  Box,
  Typography,
  IconButton,
  Tabs,
  Tab,
  TextField,
  Button,
  Paper,
  Collapse,
  CircularProgress,
} from '@mui/material';

import CloseIcon from '@mui/icons-material/Close';
import SendIcon from '@mui/icons-material/Send';
import FlashOnIcon from '@mui/icons-material/FlashOn';
import EditIcon from '@mui/icons-material/Edit';
import Inventory2Icon from '@mui/icons-material/Inventory2';
import SmartphoneIcon from '@mui/icons-material/Smartphone';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import SettingsIcon from '@mui/icons-material/Settings';
import ScheduleIcon from '@mui/icons-material/Schedule';

import {
  getCredentials,
  saveCredentials,
  getBalance,
  sendSms,
} from './smsMarketService';


const SmsMarketModal = ({ device, onClose }) => {

  const [tabValue, setTabValue] = useState(0);

  const [message, setMessage] = useState('');

  const [balance, setBalance] = useState(null);

  const [showSettings, setShowSettings] = useState(false);

  const [creds, setCreds] = useState({
    user: '',
    pass: '',
  });

  const [reports, setReports] = useState([]);

  const [loadingBalance, setLoadingBalance] = useState(false);

  const [sending, setSending] = useState(false);

  const phone = device?.phone || '';


  /* ============================================================
     CARREGA CREDENCIAIS
     ============================================================ */

  useEffect(() => {

    try {

      const saved = getCredentials();

      if (saved) {

        setCreds({
          user: saved.user || '',
          pass: saved.pass || '',
        });

      }

    } catch (error) {

      console.error(
        'Erro ao carregar credenciais SMS Market:',
        error
      );

    }

  }, []);


  /* ============================================================
     ATUALIZA SALDO
     ============================================================ */

  const loadBalance = async () => {

    if (!creds?.user || !creds?.pass) {
      setBalance(null);
      return;
    }

    try {

      setLoadingBalance(true);

      const result = await getBalance();

      /*
       * A API pode retornar:
       *
       * {
       *   success: true,
       *   sms: "7289",
       *   whatsapp: "606"
       * }
       *
       * Para este módulo estamos mostrando
       * somente o saldo SMS.
       */

      if (typeof result === 'number') {

        setBalance(result);

      } else if (typeof result === 'string') {

        setBalance(result);

      } else if (result && result.sms !== undefined) {

        setBalance(result.sms);

      } else if (
        result &&
        result.balance !== undefined
      ) {

        setBalance(result.balance);

      } else {

        setBalance(0);

      }

    } catch (error) {

      console.error(
        'Erro ao consultar saldo SMS Market:',
        error
      );

      setBalance(null);

    } finally {

      setLoadingBalance(false);

    }

  };


  /* ============================================================
     CONSULTA SALDO AO ABRIR
     ============================================================ */

  useEffect(() => {

    if (creds?.user && creds?.pass) {
      loadBalance();
    }

  }, [creds?.user, creds?.pass]);


  /* ============================================================
     SALVAR CREDENCIAIS
     ============================================================ */

  const handleSaveCreds = async () => {

    if (!creds.user?.trim()) {

      alert('Informe o usuário do SMS Market.');

      return;
    }

    if (!creds.pass?.trim()) {

      alert('Informe a senha do SMS Market.');

      return;
    }

    try {

      setLoadingBalance(true);

      const result = await saveCredentials({
        user: creds.user.trim(),
        pass: creds.pass,
      });

      /*
       * O service pode retornar diretamente o saldo
       * ou o objeto completo da API.
       */

      if (typeof result === 'number') {

        setBalance(result);

      } else if (typeof result === 'string') {

        setBalance(result);

      } else if (result?.sms !== undefined) {

        setBalance(result.sms);

      } else if (result?.balance !== undefined) {

        setBalance(result.balance);

      } else {

        /*
         * Se saveCredentials apenas salvar e não
         * retornar saldo, fazemos uma consulta real.
         */

        await loadBalance();

      }

      setShowSettings(false);

      alert(
        'Credenciais salvas com sucesso.'
      );

    } catch (error) {

      console.error(
        'Erro ao salvar credenciais SMS Market:',
        error
      );

      alert(
        error?.message ||
        'Não foi possível validar as credenciais do SMS Market.'
      );

    } finally {

      setLoadingBalance(false);

    }

  };


  /* ============================================================
     NORMALIZA TELEFONE
     ============================================================ */

  const normalizePhone = (value) => {

    if (!value) {
      return '';
    }

    return String(value).replace(/\D/g, '');

  };


  /* ============================================================
     TEXTO DO STATUS
     ============================================================ */

  const getStatusLabel = (status) => {

    switch (String(status)) {

      case '-9':
        return 'BLOQUEADO';

      case '-8':
        return 'BLOQUEADO';

      case '-7':
        return 'SEM WHATSAPP';

      case '-6':
        return 'CANCELADA';

      case '-5':
        return 'LISTA NEGRA';

      case '-4':
        return 'NÚMERO FIXO';

      case '-3':
        return 'NÚMERO INVÁLIDO';

      case '-2':
        return 'FALHA';

      case '-1':
        return 'ENFILEIRADA';

      case '0':
        return 'ENVIADA';

      case '1':
        return 'ENTREGUE';

      case '2':
        return 'LIDA';

      case '3':
        return 'PREPARANDO';

      case '4':
        return 'RECEBIDA';

      case '6':
        return 'PAUSADA';

      case '7':
        return 'EXPIRADA';

      case '8':
        return 'REJEITADA';

      case '9':
        return 'NÃO RECEBIDA';

      default:
        return status || 'AGUARDANDO';

    }

  };


  /* ============================================================
     ENVIO
     ============================================================ */

  const handleSend = async (type) => {

    /*
     * Verifica credenciais
     */

    if (
      !creds?.user?.trim() ||
      !creds?.pass?.trim()
    ) {

      alert(
        'Configure o usuário e a senha do SMS Market na engrenagem.'
      );

      setShowSettings(true);

      return;

    }


    /*
     * Verifica telefone
     */

    const normalizedPhone = normalizePhone(phone);

    if (!normalizedPhone) {

      alert(
        'Veículo sem número de telefone cadastrado.'
      );

      return;

    }


    /*
     * Verifica mensagem
     */

    if (!message.trim()) {

      alert(
        'Digite uma mensagem ou comando antes de enviar.'
      );

      return;

    }


    try {

      setSending(true);


      /*
       * Envia para o service.
       *
       * O service é responsável por conversar
       * diretamente com a API SMSMarket.
       */

      const res = await sendSms(
        normalizedPhone,
        message.trim()
      );


      /*
       * ID retornado pela SMSMarket.
       *
       * Esse ID será utilizado depois para
       * consultar o status real da mensagem.
       */

      const messageId =
        res?.id ||
        res?.messageId ||
        null;


      /*
       * Status inicial correto.
       *
       * A SMSMarket primeiro aceita/enfileira.
       * Não podemos chamar de ENTREGUE ainda.
       */

      const responseCode =
        res?.responseCode || '000';

      const initialStatus =
        responseCode === '000'
          ? 'ENFILEIRADA'
          : 'ACEITA';


      const report = {

        id: Date.now(),

        smsMarketId: messageId,

        responseCode,

        status: initialStatus,

        type,

        time:
          new Date().toLocaleTimeString('pt-BR'),

        text:
          message.trim(),

        phone:
          normalizedPhone,

        deviceName:
          device?.name || 'Veículo',

        response:
          res,

      };


      /*
       * Coloca no início do relatório
       */

      setReports((prev) => [
        report,
        ...prev,
      ]);


      /*
       * Limpa mensagem
       */

      setMessage('');


      /*
       * Atualiza saldo real depois do envio
       */

      await loadBalance();


      /*
       * Não mostramos "entregue".
       *
       * Apenas informamos que a API aceitou.
       */

      if (responseCode === '000') {

        alert(
          messageId
            ? `Mensagem aceita pela SMSMarket.\nID: ${messageId}\nAguardando status de entrega.`
            : 'Mensagem aceita pela SMSMarket e colocada na fila.'
        );

      } else {

        alert(
          res?.responseDescription ||
          'A SMSMarket retornou uma resposta inesperada.'
        );

      }

    } catch (error) {

      console.error(
        'Erro ao enviar SMS:',
        error
      );


      /*
       * Registra falha no relatório
       */

      setReports((prev) => [

        {
          id: Date.now(),

          smsMarketId: null,

          responseCode:
            error?.responseCode || null,

          status: 'FALHA',

          type,

          time:
            new Date().toLocaleTimeString('pt-BR'),

          text:
            message.trim(),

          phone:
            normalizedPhone,

          deviceName:
            device?.name || 'Veículo',

          error:
            error?.message ||
            'Erro desconhecido',

        },

        ...prev,

      ]);


      alert(
        error?.message ||
        'Erro ao enviar mensagem pelo SMS Market.'
      );

    } finally {

      setSending(false);

    }

  };


  /* ============================================================
     STATUS VISUAL
     ============================================================ */

  const isSuccessStatus = (status) => {

    return [
      'ENTREGUE',
      'LIDA',
      'ENVIADA',
    ].includes(status);

  };


  const isPendingStatus = (status) => {

    return [
      'ENFILEIRADA',
      'ACEITA',
      'AGUARDANDO',
      'PREPARANDO',
      'PAUSADA',
    ].includes(status);

  };


  /* ============================================================
     SALDO PARA EXIBIÇÃO
     ============================================================ */

  const displayBalance =
    balance === null ||
    balance === undefined ||
    balance === ''
      ? '--'
      : balance;


  /* ============================================================
     RENDER
     ============================================================ */

  return (

    <Dialog
      open={true}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: '16px',
          p: {
            xs: 1,
            sm: 2,
          },
          m: {
            xs: 1,
            sm: 2,
          },
          maxHeight: '90vh',
        },
      }}
    >

      {/* ======================================================
          CABEÇALHO
          ====================================================== */}

      <Box
        display="flex"
        justifyContent="space-between"
        alignItems="center"
        px={1}
        pt={1}
      >

        <Box
          display="flex"
          alignItems="center"
          gap={1}
        >

          <FlashOnIcon color="primary" />

          <Typography
            variant="h6"
            fontWeight="bold"
            color="#1976d2"
            sx={{
              fontSize: {
                xs: '16px',
                sm: '20px',
              },
            }}
          >
            SMS MARKET
          </Typography>

        </Box>


        <Box
          display="flex"
          alignItems="center"
          gap={1}
        >

          {/* SALDO */}

          <Paper
            variant="outlined"
            sx={{
              px: 1.5,
              py: 0.3,
              bgcolor: '#e3f2fd',
              borderColor: '#90caf9',
              borderRadius: '8px',
              minWidth: '75px',
              textAlign: 'center',
            }}
          >

            <Typography
              variant="body2"
              color={
                balance === null
                  ? 'error'
                  : 'primary'
              }
              fontWeight="bold"
            >

              {loadingBalance ? (
                <CircularProgress
                  size={14}
                  thickness={5}
                />
              ) : (
                `SMS: ${displayBalance}`
              )}

            </Typography>

          </Paper>


          {/* CONFIGURAÇÕES */}

          <IconButton
            onClick={() =>
              setShowSettings(!showSettings)
            }
            size="small"
            color="primary"
          >

            <SettingsIcon />

          </IconButton>


          {/* FECHAR */}

          <IconButton
            onClick={onClose}
            size="small"
          >

            <CloseIcon />

          </IconButton>

        </Box>

      </Box>


      {/* ======================================================
          CONFIGURAÇÕES
          ====================================================== */}

      <Collapse in={showSettings}>

        <Box
          p={2}
          mb={2}
          bgcolor="#f1f8e9"
          borderRadius="8px"
          border="1px solid #c8e6c9"
        >

          <Typography
            variant="subtitle2"
            fontWeight="bold"
            color="success.dark"
            mb={1}
          >
            Configurar Credenciais SMS Market
          </Typography>


          <TextField
            size="small"
            fullWidth
            label="Usuário / Login"
            value={creds.user}
            onChange={(e) =>
              setCreds({
                ...creds,
                user: e.target.value,
              })
            }
            sx={{
              mb: 1,
              bgcolor: '#fff',
            }}
          />


          <TextField
            size="small"
            fullWidth
            type="password"
            label="Senha"
            value={creds.pass}
            onChange={(e) =>
              setCreds({
                ...creds,
                pass: e.target.value,
              })
            }
            sx={{
              mb: 1,
              bgcolor: '#fff',
            }}
          />


          <Button
            variant="contained"
            size="small"
            color="success"
            onClick={handleSaveCreds}
            disabled={loadingBalance}
            fullWidth
          >

            {loadingBalance
              ? 'VALIDANDO...'
              : 'SALVAR CREDENCIAIS'}

          </Button>

        </Box>

      </Collapse>


      {/* ======================================================
          ABAS
          ====================================================== */}

      <Tabs
        value={tabValue}
        onChange={(e, value) =>
          setTabValue(value)
        }
        variant="fullWidth"
        sx={{
          borderBottom: 1,
          borderColor: 'divider',
          px: 1,
          pt: 1,

          '& .MuiTab-root': {
            textTransform: 'none',
            fontWeight: 'bold',
            fontSize: {
              xs: '11px',
              sm: '13px',
            },
            minWidth: 'auto',
            px: 1,
          },
        }}
      >

        <Tab
          icon={<EditIcon />}
          label="Personalizado"
          iconPosition="top"
        />

        <Tab
          icon={<FlashOnIcon />}
          label="Cmd Pronto"
          iconPosition="top"
        />

        <Tab
          icon={<Inventory2Icon />}
          label="Grupo"
          iconPosition="top"
        />

        <Tab
          icon={<SmartphoneIcon />}
          label="SMS Avulso"
          iconPosition="top"
        />

      </Tabs>


      {/* ======================================================
          CONTEÚDO
          ====================================================== */}

      <DialogContent
        sx={{
          px: {
            xs: 1,
            sm: 2,
          },
          py: 2,
        }}
      >

        {/* TELEFONE */}

        <Box
          mb={2}
          p={1.5}
          bgcolor="#f8f9fa"
          borderRadius="8px"
          border="1px solid #e0e0e0"
          display="flex"
          justifyContent="space-between"
          alignItems="center"
        >

          <Typography
            variant="body2"
            color="textSecondary"
            fontWeight="medium"
          >
            Tel:{' '}
            {phone || 'Não cadastrado'}
          </Typography>


          <Typography
            variant="caption"
            fontWeight="bold"
            color={
              phone
                ? 'primary.main'
                : 'error.main'
            }
          >

            {phone
              ? 'Disponível'
              : 'Cadastre no veículo'}

          </Typography>

        </Box>


        {/* MENSAGEM */}

        <TextField
          fullWidth
          multiline
          rows={3}
          placeholder="Digite o comando ou mensagem..."
          value={message}
          onChange={(e) =>
            setMessage(e.target.value)
          }
          variant="outlined"
          disabled={sending}
          sx={{
            mb: 2,
            bgcolor: '#f8f9fa',
          }}
        />


        {/* BOTÕES */}

        <Box
          display="flex"
          gap={1.5}
          mb={3}
        >

          <Button
            variant="contained"
            startIcon={
              sending
                ? (
                  <CircularProgress
                    size={18}
                    color="inherit"
                  />
                )
                : <SendIcon />
            }
            onClick={() =>
              handleSend('GPRS')
            }
            disabled={sending}
            fullWidth
            sx={{
              py: 1.2,
              fontWeight: 'bold',
              fontSize: {
                xs: '12px',
                sm: '14px',
              },
              bgcolor: '#90caf9',
              color: '#fff',
              '&:hover': {
                bgcolor: '#64b5f6',
              },
            }}
          >

            GPRS

          </Button>


          <Button
            variant="contained"
            startIcon={
              sending
                ? (
                  <CircularProgress
                    size={18}
                    color="inherit"
                  />
                )
                : <SendIcon />
            }
            onClick={() =>
              handleSend('SMS')
            }
            disabled={sending}
            fullWidth
            sx={{
              py: 1.2,
              fontWeight: 'bold',
              fontSize: {
                xs: '12px',
                sm: '14px',
              },
              bgcolor: '#ffe0b2',
              color: '#e65100',
              '&:hover': {
                bgcolor: '#ffe0b2',
              },
            }}
          >

            SMS

          </Button>

        </Box>


        {/* ====================================================
            RELATÓRIO
            ==================================================== */}

        <Box
          display="flex"
          justifyContent="space-between"
          alignItems="center"
          mb={1}
        >

          <Box
            display="flex"
            alignItems="center"
            gap={1}
          >

            <Typography
              variant="subtitle2"
              fontWeight="bold"
              color="#1976d2"
            >
              RELATÓRIO
            </Typography>


            <Paper
              sx={{
                px: 1,
                py: 0.1,
                bgcolor: '#1976d2',
                color: '#fff',
                fontSize: '11px',
                borderRadius: '10px',
                fontWeight: 'bold',
              }}
            >

              {reports.length}

            </Paper>

          </Box>


          <Typography
            variant="caption"
            color="error"
            sx={{
              cursor: 'pointer',
              fontWeight: 'bold',
            }}
            onClick={() =>
              setReports([])
            }
          >

            LIMPAR

          </Typography>

        </Box>


        {/* ====================================================
            LISTA DE RELATÓRIOS
            ==================================================== */}

        <Box
          display="flex"
          flexDirection="column"
          gap={1.5}
        >

          {reports.map((rep) => {

            const success =
              isSuccessStatus(
                rep.status
              );

            const pending =
              isPendingStatus(
                rep.status
              );


            return (

              <Paper
                key={rep.id}
                variant="outlined"
                sx={{
                  p: 2,
                  borderRadius: '12px',

                  borderColor:
                    success
                      ? '#a5d6a7'
                      : pending
                        ? '#90caf9'
                        : '#ef9a9a',

                  bgcolor:
                    success
                      ? '#f1f8e9'
                      : pending
                        ? '#e3f2fd'
                        : '#ffebee',
                }}
              >

                {/* CABEÇALHO DO RELATÓRIO */}

                <Box
                  display="flex"
                  justifyContent="space-between"
                  alignItems="center"
                  mb={0.5}
                >

                  <Box
                    display="flex"
                    alignItems="center"
                    gap={1}
                  >

                    {success ? (

                      <CheckCircleIcon
                        color="success"
                        fontSize="small"
                      />

                    ) : pending ? (

                      <ScheduleIcon
                        color="primary"
                        fontSize="small"
                      />

                    ) : (

                      <ErrorIcon
                        color="error"
                        fontSize="small"
                      />

                    )}


                    <Typography
                      variant="body2"
                      fontWeight="bold"
                      color={
                        success
                          ? 'success.main'
                          : pending
                            ? 'primary.main'
                            : 'error.main'
                      }
                    >

                      {rep.status}

                    </Typography>


                    <Typography
                      variant="caption"
                      bgcolor="#e0e0e0"
                      px={1}
                      py={0.2}
                      borderRadius="4px"
                      fontWeight="bold"
                    >

                      {rep.type}

                    </Typography>

                  </Box>


                  <Typography
                    variant="caption"
                    color="textSecondary"
                  >

                    {rep.time}

                  </Typography>

                </Box>


                {/* MENSAGEM */}

                <Typography
                  variant="body2"
                  fontFamily="monospace"
                  fontWeight="bold"
                >

                  {rep.text}

                </Typography>


                {/* VEÍCULO */}

                <Typography
                  variant="caption"
                  color="textSecondary"
                  display="flex"
                  alignItems="center"
                  gap={0.5}
                  mt={0.5}
                >

                  🚗 {rep.deviceName} ({rep.phone})

                </Typography>


                {/* ID SMSMARKET */}

                {rep.smsMarketId && (

                  <Typography
                    variant="caption"
                    color="textSecondary"
                    display="block"
                    mt={0.5}
                  >

                    ID SMSMarket: {rep.smsMarketId}

                  </Typography>

                )}


                {/* CÓDIGO DE RESPOSTA */}

                {rep.responseCode && (

                  <Typography
                    variant="caption"
                    color="textSecondary"
                    display="block"
                    mt={0.3}
                  >

                    Código: {rep.responseCode}

                  </Typography>

                )}


                {/* ERRO */}

                {rep.error && (

                  <Typography
                    variant="caption"
                    color="error"
                    display="block"
                    mt={0.5}
                  >

                    {rep.error}

                  </Typography>

                )}

              </Paper>

            );

          })}

        </Box>

      </DialogContent>

    </Dialog>

  );

};


export default SmsMarketModal;