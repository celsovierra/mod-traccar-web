import React, { useState, useEffect } from 'react';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import { formatStoppedDuration } from './stoppedTimeUtils';

export default function StoppedTimeDisplay({ stoppedSince }) {
  const [, setTick] = useState(0);

  useEffect(() => {
    if (!stoppedSince) return;
    const interval = setInterval(() => {
      setTick((prev) => prev + 1);
    }, 30000); // Atualiza a cada 30 segundos automaticamente
    return () => clearInterval(interval);
  }, [stoppedSince]);

  if (!stoppedSince) return null;

  const diffMs = Math.max(0, Date.now() - stoppedSince);
  const totalMinutes = Math.floor(diffMs / 60000);
  const label = formatStoppedDuration(totalMinutes);

  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: '3px',
      marginTop: '0px',
      fontSize: '0.65rem',
      color: '#b78103',
      fontWeight: 700,
      backgroundColor: 'rgba(255, 152, 0, 0.15)',
      padding: '0px 4px',
      borderRadius: '4px',
      width: 'fit-content'
    }}>
      <AccessTimeIcon sx={{ fontSize: '10px' }} />
      {label}
    </span>
  );
}