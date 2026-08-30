import {
  Snackbar,
  Alert,
  Button,
  Link,
  Dialog,
  DialogContent,
  DialogContentText,
  DialogActions,
  Typography,
} from '@mui/material';
import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { usePrevious } from '../../reactHelper';
import { errorsActions } from '../../store';
import { useTranslation } from './LocalizationProvider';

const ErrorHandler = () => {
  const dispatch = useDispatch();
  const t = useTranslation();

  const error = useSelector((state) => state.errors.errors.find(() => true));
  const cachedError = usePrevious(error);

  const message = error || cachedError;
  const multiline = message?.includes('\n');
  const displayMessage = multiline
    ? message.split('\n')[0].replace(/^(?:(?:[\w$]+\.)*[\w$]+(?:Exception|Error)?:\s*)+/i, '')
    : message;

  const [expanded, setExpanded] = useState(false);

  return (
    <>
      <Snackbar
        open={Boolean(error) && !expanded}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
        sx={{
          top: { xs: 20, sm: 30 },
          zIndex: 99999,
        }}
      >
        <Alert
          elevation={8}
          onClose={() => dispatch(errorsActions.pop())}
          severity="info"
          variant="filled"
          sx={{
            minWidth: 280,
            borderRadius: '16px',
            backgroundColor: '#1f2937',
            color: '#ffffff',
            boxShadow: '0 8px 24px rgba(0,0,0,0.25)',
            fontWeight: 500,
            fontSize: '0.9rem',
            '& .MuiAlert-icon': {
              color: '#ffffff',
            },
          }}
        >
          {displayMessage}
          {multiline && (
            <>
              {' | '}
              <Link color="inherit" href="#" onClick={() => setExpanded(true)}>
                {t('sharedShowDetails')}
              </Link>
            </>
          )}
        </Alert>
      </Snackbar>
      <Dialog open={expanded} onClose={() => setExpanded(false)} maxWidth={false}>
        <DialogContent>
          <DialogContentText component="div">
            <Typography component="pre" variant="caption">
              {message}
            </Typography>
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setExpanded(false)} autoFocus>
            {t('sharedHide')}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default ErrorHandler;