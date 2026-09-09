const BASE_URL = 'https://api.smsmarket.com.br/webservice-rest';
const STORAGE_KEY = 'smsmarket_credentials';

const STATUS_MAP = {
  '-11': 'FALHA NO ENVIO',
  '-10': 'FALHA NO ENVIO',
  '-9': 'SEM COBERTURA',
  '-8': 'CONTEÃƒÅ¡DO BLOQUEADO',
  '-7': 'NÃƒÅ¡MERO SEM WHATSAPP',
  '-6': 'CANCELADA',
  '-5': 'LISTA NEGRA',
  '-4': 'NÃƒÅ¡MERO FIXO',
  '-3': 'NÃƒÅ¡MERO INVÃƒÂLIDO',
  '-2': 'FALHA DE ENTREGA',
  '-1': 'ENFILEIRADA',
  '0': 'ENVIADA',
  '1': 'ENTREGUE',
  '2': 'LIDA',
  '3': 'PREPARANDO',
  '4': 'RESPONDIDA',
  '6': 'PAUSADA',
  '7': 'EXPIRADA',
  '8': 'REJEITADA',
  '9': 'NÃƒÆ’O RECEBIDA',
};

export const getStatusInfo = (status) => {
  const code = String(status ?? '-1');
  const label = STATUS_MAP[code] || `STATUS ${code}`;

  const terminal = [
    '1', '2', '4', '7', '8', '9',
    '-2', '-3', '-4', '-5', '-6',
    '-7', '-8', '-9', '-10', '-11',
  ].includes(code);

  const error = [
    '7', '8', '9',
    '-2', '-3', '-4', '-5', '-6',
    '-7', '-8', '-9', '-10', '-11',
  ].includes(code);

  return {
    code,
    label,
    terminal,
    error,
  };
};

export const getStatusLabel = (status) => getStatusInfo(status).label;

export const getCredentials = () => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);

    if (!saved) {
      return { user: '', pass: '' };
    }

    const credentials = JSON.parse(saved);

    return {
      user: credentials?.user || '',
      pass: credentials?.pass || '',
    };
  } catch (error) {
    console.error('Erro ao ler credenciais SMSMarket:', error);
    return { user: '', pass: '' };
  }
};

const getAuthHeaders = () => {
  const { user, pass } = getCredentials();

  if (!user?.trim() || !pass?.trim()) {
    throw new Error('Configure o usuÃƒÂ¡rio e a senha da SMSMarket.');
  }

  return {
    Authorization: `Basic ${btoa(`${user.trim()}:${pass}`)}`,
    Accept: 'application/json',
  };
};

export const normalizeBrazilPhone = (phone) => {
  let digits = String(phone ?? '').replace(/\D/g, '');

  if (!digits) {
    throw new Error('Telefone nÃƒÂ£o informado.');
  }

  if (digits.startsWith('55') && (digits.length === 12 || digits.length === 13)) {
    digits = digits.slice(2);
  }

  if (digits.length !== 10 && digits.length !== 11) {
    throw new Error(
      'Telefone invÃƒÂ¡lido. Informe DDD + nÃƒÂºmero. Exemplo: 86999999999.'
    );
  }

  return digits;
};

const parseResponse = async (response) => {
  const text = await response.text();

  let json = {};

  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    json = { raw: text };
  }

  if (!response.ok) {
    const message =
      json?.message ||
      json?.error ||
      json?.description ||
      text ||
      `Erro na SMSMarket: ${response.status}`;

    throw new Error(message);
  }

  if (json?.success === false || json?.status === false) {
    throw new Error(
      json?.message ||
      json?.error ||
      json?.description ||
      'A SMSMarket recusou a solicitaÃƒÂ§ÃƒÂ£o.'
    );
  }

  return json;
};

const postForm = async (endpoint, data) => {
  const body = new URLSearchParams();

  Object.entries(data).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      body.append(key, String(value));
    }
  });

  const response = await fetch(`${BASE_URL}/${endpoint}`, {
    method: 'POST',
    headers: {
      ...getAuthHeaders(),
      'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
    },
    body: body.toString(),
  });

  return parseResponse(response);
};

const getRequest = async (endpoint, params = {}) => {
  const query = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      query.append(key, String(value));
    }
  });

  const url = query.toString()
    ? `${BASE_URL}/${endpoint}?${query.toString()}`
    : `${BASE_URL}/${endpoint}`;

  const response = await fetch(url, {
    method: 'GET',
    headers: getAuthHeaders(),
  });

  return parseResponse(response);
};

const extractBalance = (json) => {
  const value =
    json?.balance_1 ??
    json?.balance ??
    json?.credit ??
    json?.saldo ??
    json?.data?.balance_1 ??
    json?.data?.balance ??
    json?.data?.credit ??
    json?.data?.saldo ??
    json?.data ??
    0;

  return value;
};

const extractMessages = (json) => {
  if (Array.isArray(json)) return json;
  if (Array.isArray(json?.messages)) return json.messages;
  if (Array.isArray(json?.data)) return json.data;
  if (Array.isArray(json?.data?.messages)) return json.data.messages;
  if (Array.isArray(json?.response)) return json.response;

  return [];
};

const extractMessage = (json) => {
  const messages = extractMessages(json);

  if (messages.length > 0) {
    return messages[0];
  }

  if (json?.message && typeof json.message === 'object') {
    return json.message;
  }

  if (json?.data && !Array.isArray(json.data) && typeof json.data === 'object') {
    return json.data;
  }

  return json;
};

const extractMessageId = (json) => {
  const message = extractMessage(json);

  return (
    message?.id ??
    message?.mt_id ??
    message?.message_id ??
    json?.id ??
    json?.mt_id ??
    json?.message_id ??
    null
  );
};

const extractMessageStatus = (json, fallback = '-1') => {
  const message = extractMessage(json);

  return String(
    message?.status ??
    message?.status_id ??
    message?.message_status ??
    json?.status ??
    json?.status_id ??
    fallback
  );
};

export const getBalance = async () => {
  const json = await getRequest('balance');
  return extractBalance(json);
};

export const saveCredentials = async ({ user, pass }) => {
  if (!user?.trim() || !pass?.trim()) {
    throw new Error('Informe o usuÃƒÂ¡rio e a senha da SMSMarket.');
  }

  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      user: user.trim(),
      pass,
    })
  );

  return getBalance();
};

export const sendSms = async (phone, content, campaignId = null) => {
  const number = normalizeBrazilPhone(phone);
  const text = String(content ?? '').trim();

  if (!text) {
    throw new Error('Digite a mensagem antes de enviar.');
  }

  const data = {
    type: '2',
    country_code: '55',
    number,
    content: text,
  };

  if (campaignId) {
    data.campaign_id = String(campaignId);
  }

  const json = await postForm('send-single', data);
  const message = extractMessage(json);

  return {
    id: extractMessageId(json),
    campaignId: message?.campaign_id ?? json?.campaign_id ?? campaignId ?? null,
    responseCode: String(json?.responseCode ?? json?.response_code ?? '000'),
    status: extractMessageStatus(json, '-1'),
    carrier: message?.carrier_name ?? message?.carrier ?? null,
    response: json,
  };
};

export const getMessageStatus = async ({ id, campaignId } = {}) => {
  if (!id && !campaignId) {
    throw new Error('NÃƒÂ£o hÃƒÂ¡ identificador para consultar o status do SMS.');
  }

  const params = {
    timezone: '-03:00',
  };

  if (id) params.id = String(id);
  if (campaignId) params.campaign_id = String(campaignId);

  const json = await getRequest('mt_id', params);
  const messages = extractMessages(json);
  const message = messages[0] || extractMessage(json);

  if (!message) {
    throw new Error('A SMSMarket ainda nÃƒÂ£o retornou o status desta mensagem.');
  }

  const status = extractMessageStatus(message, '-1');

  return {
    id: message?.id ?? message?.mt_id ?? id ?? null,
    campaignId: message?.campaign_id ?? campaignId ?? null,
    status,
    statusInfo: getStatusInfo(status),
    carrier: message?.carrier_name ?? message?.carrier ?? null,
    date: message?.sent_date ?? message?.date ?? message?.schedule ?? null,
    response: json,
  };
};

export const statusPorId = async (id) => getMessageStatus({ id });

export const statusPorCampanha = async (campaignId) =>
  getMessageStatus({ campaignId });

