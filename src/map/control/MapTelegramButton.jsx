import { useEffect, useRef, useState } from 'react';
import { useTheme } from '@mui/material';
import { makeStyles } from 'tss-react/mui';
import { createRoot } from 'react-dom/client';
import SendIcon from '@mui/icons-material/Send';
import { useSelector } from 'react-redux';
import { map } from '../core/MapView';
import TelegramLinkModal from '../../telegram/TelegramLinkModal';

const useStyles = makeStyles()(() => ({
  button: {
    '&&': {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: '#0088cc',
    },
  },
}));

const onClickRef = { current: () => {} };

const MapTelegramButton = () => {
  const theme = useTheme();
  const { classes } = useStyles();
  const [open, setOpen] = useState(false);
  const buttonRef = useRef(null);

  onClickRef.current = () => setOpen(true);

  useEffect(() => {
    let container;
    let root;
    const control = {
      onAdd: () => {
        container = document.createElement('div');
        container.className = 'maplibregl-ctrl maplibregl-ctrl-group';
        const button = document.createElement('button');
        button.type = 'button';
        button.title = 'Vincular Telegram';
        button.className = 'maplibregl-ctrl-icon ' + classes.button;
        button.onclick = () => onClickRef.current();
        container.appendChild(button);
        root = createRoot(button);
        root.render(<SendIcon fontSize="small" />);
        buttonRef.current = button;
        return container;
      },
      onRemove: () => {
        queueMicrotask(() => root.unmount());
        container.remove();
      },
    };
    map.addControl(control, theme.direction === 'rtl' ? 'top-left' : 'top-right');
    return () => map.removeControl(control);
  }, [theme.direction, classes.button]);

  return open ? <TelegramLinkModal onClose={() => setOpen(false)} /> : null;
};

export default MapTelegramButton;
