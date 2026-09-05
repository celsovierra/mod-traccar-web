const BASE_URL = '/api-smsmarket';
const STORAGE_KEY = 'smsmarket_credentials';

const STATUS = {
  '-9': { label: 'SEM COBERTURA', terminal: true, error: true },
  '-8': { label: 'CONTEÃšDO BLOQUEADO', terminal: true, error: true },
  '-7': { label: 'NÃšMERO SEM WHATSAPP', terminal: true, error: true },
  '-6': { label: 'CANCELADA', terminal: true, error: true },
  '-5': { label: 'LISTA NEGRA', terminal: true, error: true },
  '-4': { label: 'NÃšMERO FIXO', terminal: true, error: true },
  '-3': { label: 'NÃšMERO INVÃLIDO', terminal: true, error: true },
  '-2': { label: 'FALHA DE ENTREGA', terminal: true, error: true },
  '-1': { label: 'ENFILEIRADA', terminal: false, error: false },
  '0': { label: 'ENVIADA', terminal: false, error: false },
  '1': { label: 'ENTREGUE', terminal: true, error: false },
  '2': { label: 'LIDA', terminal: true, error: false },
  '3': { label: 'PREPARANDO', terminal: false, error: false },
  '4': { label: 'RESPONDIDA', terminal: true, error: false },
  '6': { label: 'PAUSADA', terminal: false, error: false },
  '7': { label: 'EXPIRADA', terminal: true, error: true },
  '8': { label: 'REJEITADA', terminal: true, error: true },
  '9': { label: 'NÃƒO RECEBIDA', terminal: true, error: true },
};

export const getStatusInfo = (status) => {
  return (
    STATUS[String(status)] || {
      label: `STATUS ${status ?? 'DESCONHECIDO'}`,
      terminal: false,
      error: false,
    }
  );
};

export const getCredentials = () => {
  try {
    const value = localStorage.getItem(STORAGE_KEY);

    if (!value) {
      return {
        user: '',
        pass: '',
      };
    }

    const credentials = JSON.parse(value);

    return {
      user: credentials?.user || '',
      pass: credentials?.pass || '',
    };
  } catch (error) {
    console.error(
      'Erro ao ler credenciais da SMSMarket:',
      error
    );

    return {
      user: '',
      pass: '',
    };
  }
};

const getAuthHeaders = () => {
  const { user, pass } = getCredentials();

  if (!user || !pass) {
    throw new Error(
      'Configure o usuÃ¡rio e a senha da SMSMarket.'
    );
  }

  return {
    Authorization: `Basic ${btoa(`${user}:${pass}`)}`,
    Accept: 'application/json',
  };
};

export const normalizeBrazilPhone = (phone) => {
  let digits = String(phone ?? '').replace(/\D/g, '');

  if (!digits) {
    throw new Error('Telefone nÃ£o informado.');
  }

  /*
   * Se o nÃºmero vier com DDI 55,
   * remove o 55 antes de enviar.
   *
   * Exemplo:
   * 5586999999999
   * vira:
   * 86999999999
   */

  if (digits.startsWith('55') && digits.length >= 12) {
    digits = digits.slice(2);
  }

  if (digits.length !== 10 && digits.length !== 11) {
    throw new Error(
      'Telefone invÃ¡lido. Informe DDD + nÃºmero, por exemplo: 86999999999.'
    );
  }

  return digits;
};


/* ============================================================
   PROCESSAMENTO DA RESPOSTA
   ============================================================ */

const parseResponse = async (response) => {
  const raw = await response.text();

  let json = {};

  if (raw) {
    try {
      json = JSON.parse(raw);
    } catch {
      throw new Error(
        `A SMSMarket retornou uma resposta invÃ¡lida. HTTP ${response.status}: ${raw}`
      );
    }
  }

  if (!response.ok) {
    const description =
      json?.responseDescription ||
      json?.message ||
      json?.error ||
      raw ||
      `Erro HTTP ${response.status}.`;

    const error = new Error(
      `SMSMarket: ${description}`
    );

    error.httpStatus = response.status;
    error.response = json;

    throw error;
  }

  if (
    json?.success === false ||
    json?.success === 'false'
  ) {
    const error = new Error(
      `${
        json?.responseCode
          ? `[${json.responseCode}] `
          : ''
      }${
        json?.responseDescription ||
        json?.message ||
        'A SMSMarket recusou a operaÃ§Ã£o.'
      }`
    );

    error.responseCode =
      json?.responseCode || null;

    error.response = json;

    throw error;
  }

  return json;
};


/* ============================================================
   GET
   ============================================================ */

const getRequest = async (
  endpoint,
  params = {}
) => {
  const query = new URLSearchParams();

  Object.entries(params).forEach(
    ([key, value]) => {
      if (
        value !== undefined &&
        value !== null &&
        value !== ''
      ) {
        query.set(
          key,
          String(value)
        );
      }
    }
  );

  const queryString = query.toString();

  const url =
    `${BASE_URL}/${endpoint}` +
    (
      queryString
        ? `?${queryString}`
        : ''
    );

  try {
    const response = await fetch(
      url,
      {
        method: 'GET',
        headers: getAuthHeaders(),
      }
    );

    return await parseResponse(response);
  } catch (error) {
    if (
      error?.httpStatus ||
      error?.response
    ) {
      throw error;
    }

    throw new Error(
      `NÃ£o foi possÃ­vel conectar Ã  SMSMarket. ${
        error?.message || ''
      }`.trim()
    );
  }
};


/* ============================================================
   POST FORM
   ============================================================ */

const postForm = async (
  endpoint,
  data = {}
) => {
  const body = new URLSearchParams();

  Object.entries(data).forEach(
    ([key, value]) => {
      if (
        value !== undefined &&
        value !== null &&
        value !== ''
      ) {
        body.set(
          key,
          String(value)
        );
      }
    }
  );

  try {
    const response = await fetch(
      `${BASE_URL}/${endpoint}`,
      {
        method: 'POST',

        headers: {
          ...getAuthHeaders(),

          'Content-Type':
            'application/x-www-form-urlencoded',
        },

        body,
      }
    );

    return await parseResponse(response);
  } catch (error) {
    if (
      error?.httpStatus ||
      error?.response
    ) {
      throw error;
    }

    throw new Error(
      `NÃ£o foi possÃ­vel conectar Ã  SMSMarket. ${
        error?.message || ''
      }`.trim()
    );
  }
};


/* ============================================================
   POST JSON
   ============================================================ */

const postJson = async (
  endpoint,
  data
) => {
  try {
    const response = await fetch(
      `${BASE_URL}/${endpoint}`,
      {
        method: 'POST',

        headers: {
          ...getAuthHeaders(),

          'Content-Type':
            'application/json',
        },

        body:
          JSON.stringify(data),
      }
    );

    return await parseResponse(response);
  } catch (error) {
    if (
      error?.httpStatus ||
      error?.response
    ) {
      throw error;
    }

    throw new Error(
      `NÃ£o foi possÃ­vel conectar Ã  SMSMarket. ${
        error?.message || ''
      }`.trim()
    );
  }
};


/* ============================================================
   EXTRAIR MENSAGEM
   ============================================================ */

const extractMessage = (json) => {
  if (!json) {
    return null;
  }

  if (
    Array.isArray(json.messages) &&
    json.messages.length > 0
  ) {
    return json.messages[0];
  }

  if (
    Array.isArray(json.data) &&
    json.data.length > 0
  ) {
    return json.data[0];
  }

  if (
    json.message &&
    typeof json.message === 'object'
  ) {
    return json.message;
  }

  if (
    json.data &&
    typeof json.data === 'object'
  ) {
    return json.data;
  }

  return json;
};


/* ============================================================
   EXTRAIR MENSAGENS
   ============================================================ */

const extractMessages = (json) => {
  if (
    Array.isArray(json?.messages)
  ) {
    return json.messages;
  }

  if (
    Array.isArray(json?.data)
  ) {
    return json.data;
  }

  if (
    json &&
    (
      json.id ||
      json.status ||
      json.campaign_id
    )
  ) {
    return [json];
  }

  return [];
};


/* ============================================================
   EXTRAIR ID
   ============================================================ */

const extractMessageId = (json) => {
  const message =
    extractMessage(json);

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


/* ============================================================
   EXTRAIR STATUS
   ============================================================ */

const extractMessageStatus = (
  json,
  fallback = '-1'
) => {
  const message =
    extractMessage(json);

  return String(
    message?.status ??
    json?.status ??
    fallback
  );
};


/* ============================================================
   EXTRAIR SALDO
   ============================================================ */

const readBalance = (json) => {
  const value =
    json?.sms ??
    json?.balance ??
    json?.saldo ??
    json?.data?.sms ??
    json?.data?.balance ??
    json?.data?.saldo;

  if (
    value === undefined ||
    value === null
  ) {
    return '0';
  }

  return value;
};


/* ============================================================
   CONSULTAR SALDO
   ============================================================ */

export const getBalance = async () => {
  const { user, pass } =
    getCredentials();

  if (!user || !pass) {
    return 'Configure login';
  }

  try {
    const json =
      await getRequest('balance');

    return readBalance(json);
  } catch (error) {
    console.error(
      'Erro ao consultar saldo SMSMarket:',
      error
    );

    return 'Erro API';
  }
};


/* ============================================================
   SALDO DETALHADO
   ============================================================ */

export const getBalanceDetails = async () => {
  const json =
    await getRequest('balance');

  const balance =
    readBalance(json);

  return {
    balance,

    sms:
      json?.sms ?? balance,

    raw:
      json,
  };
};


/* ============================================================
   SALVAR CREDENCIAIS
   ============================================================ */

export const saveCredentials = async (
  credentials
) => {
  if (
    !credentials?.user?.trim() ||
    !credentials?.pass?.trim()
  ) {
    throw new Error(
      'Informe o usuÃ¡rio e a senha da SMSMarket.'
    );
  }

  const newCredentials = {
    user:
      credentials.user.trim(),

    pass:
      credentials.pass,
  };

  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(
      newCredentials
    )
  );

  try {
    /*
     * Testa imediatamente a autenticaÃ§Ã£o
     * atravÃ©s do endpoint real de saldo.
     */

    const json =
      await getRequest('balance');

    return readBalance(json);
  } catch (error) {
    /*
     * Se usuÃ¡rio/senha forem invÃ¡lidos,
     * remove a credencial salva.
     */

    localStorage.removeItem(
      STORAGE_KEY
    );

    throw error;
  }
};


/* ============================================================
   TESTAR CONEXÃƒO
   ============================================================ */

export const testConnection = async () => {
  try {
    const json =
      await getRequest('balance');

    return {
      connected: true,

      balance:
        readBalance(json),

      raw:
        json,
    };
  } catch (error) {
    return {
      connected: false,

      balance: null,

      error:
        error?.message ||
        'NÃ£o foi possÃ­vel conectar Ã  SMSMarket.',
    };
  }
};


/* ============================================================
   ENVIO DE SMS
   ============================================================ */

export const sendSms = async (
  phone,
  content,
  campaignId = null
) => {
  const number =
    normalizeBrazilPhone(phone);

  const text =
    String(content ?? '').trim();

  if (!text) {
    throw new Error(
      'Digite a mensagem antes de enviar.'
    );
  }

  /*
   * SMSMarket
   *
   * type=2 = SMS
   *
   * country_code=55
   *
   * number = nÃºmero sem o DDI 55
   */

  const data = {
    type: '2',

    country_code: '55',

    number,

    content: text,
  };

  if (
    campaignId !== undefined &&
    campaignId !== null &&
    String(campaignId).trim() !== ''
  ) {
    data.campaign_id =
      String(campaignId).trim();
  }

  /*
   * Endpoint:
   *
   * POST /send-single
   *
   * Basic Authentication
   *
   * application/x-www-form-urlencoded
   */

  const json =
    await postForm(
      'send-single',
      data
    );

  const message =
    extractMessage(json);

  const id =
    extractMessageId(json);

  const status =
    extractMessageStatus(
      json,
      '-1'
    );

  const responseCode =
    json?.responseCode ??
    json?.response_code ??
    null;

  return {
    id,

    campaignId:
      message?.campaign_id ??
      json?.campaign_id ??
      campaignId ??
      null,

    status,

    statusInfo:
      getStatusInfo(status),

    carrier:
      message?.carrier_name ??
      message?.carrier ??
      json?.carrier_name ??
      json?.carrier ??
      '',

    responseCode,

    accepted:
      responseCode === null ||
      String(responseCode) === '000',

    raw:
      json,
  };
};


/* ============================================================
   CONSULTAR STATUS POR ID
   ============================================================ */

export const getMessageStatus = async ({
  id,
  campaignId,
}) => {
  if (
    !id &&
    !campaignId
  ) {
    throw new Error(
      'NÃ£o hÃ¡ identificador para consultar o status do SMS.'
    );
  }

  const params = {
    timezone: '-03:00',
  };

  if (id) {
    params.id =
      String(id);
  } else {
    params.campaign_id =
      String(campaignId);
  }

  const json =
    await getRequest(
      'mt_id',
      params
    );

  const messages =
    extractMessages(json);

  const message =
    messages[0];

  if (!message) {
    throw new Error(
      'A SMSMarket ainda nÃ£o retornou o status desta mensagem.'
    );
  }

  const status =
    String(
      message.status ?? '-1'
    );

  return {
    id:
      message.id ??
      id ??
      null,

    campaignId:
      message.campaign_id ??
      campaignId ??
      null,

    status,

    statusInfo:
      getStatusInfo(status),

    carrier:
      message.carrier_name ??
      message.carrier ??
      '',

    sentDate:
      message.sent_date ??
      message.date ??
      message.schedule ??
      '',

    raw:
      json,
  };
};


/* ============================================================
   STATUS POR CAMPANHA
   ============================================================ */

export const getCampaignStatus = async (
  campaignId
) => {
  if (!campaignId) {
    throw new Error(
      'campaign_id nÃ£o informado.'
    );
  }

  const json =
    await getRequest(
      'mt_id',
      {
        campaign_id:
          String(campaignId),

        timezone:
          '-03:00',
      }
    );

  const messages =
    extractMessages(json);

  return {
    messages:
      messages.map(
        (message) => {
          const status =
            String(
              message.status ??
              '-1'
            );

          return {
            id:
              message.id ??
              null,

            campaignId:
              message.campaign_id ??
              campaignId,

            status,

            statusInfo:
              getStatusInfo(status),

            carrier:
              message.carrier_name ??
              message.carrier ??
              '',

            sentDate:
              message.sent_date ??
              message.date ??
              message.schedule ??
              '',

            raw:
              message,
          };
        }
      ),

    raw:
      json,
  };
};


/* ============================================================
   STATUS POR PERÃODO
   ============================================================ */

export const getMessagesByPeriod = async (
  startDate,
  endDate,
  type = null,
  status = null
) => {
  if (!startDate) {
    throw new Error(
      'Data inicial nÃ£o informada.'
    );
  }

  if (!endDate) {
    throw new Error(
      'Data final nÃ£o informada.'
    );
  }

  const params = {
    start_date: startDate,

    end_date: endDate,

    timezone: '-03:00',
  };

  if (
    type !== null &&
    type !== undefined &&
    type !== ''
  ) {
    params.type =
      type;
  }

  if (
    status !== null &&
    status !== undefined &&
    status !== ''
  ) {
    params.status =
      Array.isArray(status)
        ? status.join(',')
        : status;
  }

  return getRequest(
    'mt_date',
    params
  );
};


/* ============================================================
   COMPATIBILIDADE COM NOMES ANTIGOS
   ============================================================ */

export const statusPorId = (
  id
) => {
  return getMessageStatus({
    id,
  });
};


export const statusPorCampanha = (
  campaignId
) => {
  return getCampaignStatus(
    campaignId
  );
};


export const statusPorPeriodo = (
  dataInicial,
  dataFinal,
  tipo = null,
  status = null
) => {
  return getMessagesByPeriod(
    dataInicial,
    dataFinal,
    tipo,
    status
  );
};


/* ============================================================
   NOVAS MENSAGENS RECEBIDAS
   ============================================================ */

export const novasMensagens = async () => {
  return getRequest(
    'mo_new',
    {
      type: '5',

      timezone:
        '-03:00',
    }
  );
};


/* ============================================================
   MENSAGENS RECEBIDAS POR PERÃODO
   ============================================================ */

export const mensagensPorPeriodo = async (
  dataInicial,
  dataFinal,
  campaignId = null
) => {
  if (!dataInicial) {
    throw new Error(
      'Data inicial nÃ£o informada.'
    );
  }

  if (!dataFinal) {
    throw new Error(
      'Data final nÃ£o informada.'
    );
  }

  const params = {
    start_date:
      dataInicial,

    end_date:
      dataFinal,

    type:
      '5',

    timezone:
      '-03:00',
  };

  if (campaignId) {
    params.campaign_id =
      campaignId;
  }

  return getRequest(
    'mo',
    params
  );
};


/* ============================================================
   ENVIO EM LOTE
   ============================================================ */

export const sendMultiple = async (
  messages,
  type = 2
) => {
  if (!Array.isArray(messages)) {
    throw new Error(
      'As mensagens precisam ser um array.'
    );
  }

  if (messages.length === 0) {
    throw new Error(
      'O lote nÃ£o possui mensagens.'
    );
  }

  if (messages.length > 5000) {
    throw new Error(
      'A SMSMarket permite no mÃ¡ximo 5000 mensagens por lote.'
    );
  }

  const preparedMessages =
    messages.map(
      (message) => {
        if (!message?.number) {
          throw new Error(
            'Uma das mensagens do lote nÃ£o possui telefone.'
          );
        }

        if (!message?.content) {
          throw new Error(
            'Uma das mensagens do lote nÃ£o possui conteÃºdo.'
          );
        }

        return {
          ...message,

          number:
            normalizeBrazilPhone(
              message.number
            ),
        };
      }
    );

  return postJson(
    'send-multiple',
    {
      defaultValues: {
        type:
          Number(type),

        country_code:
          55,
      },

      messages:
        preparedMessages,
    }
  );
};


/* ============================================================
   ENVIO DE SMS EM LOTE
   ============================================================ */

export const sendSmsMultiple = (
  messages
) => {
  return sendMultiple(
    messages,
    2
  );
};


/* ============================================================
   LABEL DO STATUS
   ============================================================ */

export const getStatusLabel = (
  status
) => {
  return getStatusInfo(
    status
  ).label;
};


/* ============================================================
   CONSTANTES
   ============================================================ */

export const SMSMARKET_BASE_URL =
  BASE_URL;

export const SMSMARKET_STORAGE_KEY =
  STORAGE_KEY;
