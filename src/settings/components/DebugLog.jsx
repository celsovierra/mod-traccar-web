import React, { useState, useEffect } from 'react';
import { Paper, Typography, Box, Button } from '@mui/material';

const DebugLog = () => {
  const [logs, setLogs] = useState([]);

  useEffect(() => {
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      const [url, options] = args;
      
      // Registra DELETE e POST
      if (url.includes('/api/permissions') && options?.method !== 'GET') {
        setLogs(prev => [...prev, `-> ${options?.method || 'GET'} ${url}`]);
        if (options?.body) setLogs(prev => [...prev, `   Body: ${options.body}`]);
      }
      
      // Registra quando a pagina carrega os dados (GET)
      if (url.includes('/api/notifications') && (!options || options.method === 'GET' || !options.method)) {
        setLogs(prev => [...prev, `-> GET Carregando lista (F5): ${url}`]);
      }

      try {
        const response = await originalFetch(...args);
        if (url.includes('/api/permissions') && options?.method !== 'GET') {
          if (response.ok) {
            setLogs(prev => [...prev, `<- OK (${response.status})`]);
          } else {
            setLogs(prev => [...prev, `<- ERRO (${response.status})`]);
          }
        }
        return response;
      } catch (err) {
        if (url.includes('/api/permissions') && options?.method !== 'GET') setLogs(prev => [...prev, `<- FALHA: ${err.message}`]);
        throw err;
      }
    };
    return () => { window.fetch = originalFetch; };
  }, []);

  const handleCopy = () => {
    navigator.clipboard.writeText(logs.join('\n'));
    alert('Log copiado!');
  };

  return (
    <Paper elevation={2} sx={{ p: 2, m: 2, minHeight: '150px', backgroundColor: '#1e1e1e', color: '#00ff00', fontFamily: 'monospace' }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
        <Typography variant="subtitle1" color="white">Console de Depuração (Provisório)</Typography>
        <Button size="small" variant="outlined" onClick={handleCopy} sx={{ color: '#00ff00', borderColor: '#00ff00' }}>Copiar Log</Button>
      </Box>
      <Box sx={{ height: '100px', overflowY: 'auto', fontSize: '12px' }}>
        {logs.length === 0 ? 'Aguardando ação...' : logs.map((log, i) => <div key={i}>{log}</div>)}
      </Box>
    </Paper>
  );
};

export default DebugLog;