import { useEffect, useRef } from 'react';
import { useTheme } from '@mui/material';
import { makeStyles } from 'tss-react/mui';
import { createRoot } from 'react-dom/client';
import HubIcon from '@mui/icons-material/Hub';
import { map } from '../core/MapView';

const useStyles = makeStyles()((theme) => ({
  button: {
    '&&': {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: '#333',
    },
    '&&.active': {
      color: theme.palette.primary.main,
    },
  },
}));

const onClickRef = { current: () => {} };

const MapClusterToggle = ({ enabled, onClick }) => {
  const theme = useTheme();
  const { classes } = useStyles();
  onClickRef.current = onClick;

  const buttonRef = useRef(null);

  useEffect(() => {
    let container;
    let root;
    const control = {
      onAdd: () => {
        container = document.createElement('div');
        container.className = 'maplibregl-ctrl maplibregl-ctrl-group';
        const button = document.createElement('button');
        button.type = 'button';
        button.title = 'Agrupar/desagrupar veículos';
        button.className = `maplibregl-ctrl-icon ${classes.button}`;
        button.onclick = () => onClickRef.current();
        container.appendChild(button);
        root = createRoot(button);
        root.render(<HubIcon fontSize="small" />);
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

  useEffect(() => {
    buttonRef.current?.classList.toggle('active', enabled);
  }, [enabled]);

  return null;
};

export default MapClusterToggle;
