import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Typography,
  Container,
  TextField,
  Button,
  Snackbar,
  Alert,
  Box,
  Paper,
  IconButton,
  Popover,
  InputAdornment,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import CampaignIcon from '@mui/icons-material/Campaign';
import InsertEmoticonIcon from '@mui/icons-material/InsertEmoticon';
import { useTranslation } from '../common/components/LocalizationProvider';
import PageLayout from '../common/components/PageLayout';
import SettingsMenu from './components/SettingsMenu';
import { useCatchCallback } from '../reactHelper';
import SelectField from '../common/components/SelectField';
import { prefixString } from '../common/util/stringUtils';
import fetchOrThrow from '../common/util/fetchOrThrow';

const AnnouncementPage = () => {
  const navigate = useNavigate();
  const t = useTranslation();

  const [users, setUsers] = useState([]);
  const [notificator, setNotificator] = useState();
  const [message, setMessage] = useState({});
  const [toast, setToast] = useState({ open: false, message: '' });
  const [expanded, setExpanded] = useState(true);
  const [emojiAnchor, setEmojiAnchor] = useState(null);

  const handleSelectAllUsers = useCatchCallback(async () => {
    const response = await fetchOrThrow('/api/users', { method: 'GET' });
    const allUsers = await response.json();
    setUsers(allUsers.map((u) => u.id));
  }, []);

  const handleSend = useCatchCallback(async () => {
    const query = new URLSearchParams();
    users.forEach((userId) => query.append('userId', userId));
    await fetchOrThrow(`/api/notifications/send/${notificator}?${query.toString()}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(message),
    });
    setToast({ open: true, message: `Enviado para ${users.length} usuario(s).` });
  }, [users, notificator, message, navigate]);

  return (
    <PageLayout menu={<SettingsMenu />} breadcrumbs={['serverAnnouncement']}>
      <Box
        sx={{
          width: '100%',
          maxWidth: 480,
          mx: 'auto',
          p: { xs: 1, sm: 2 },
          '& .MuiOutlinedInput-root': {
            borderRadius: '14px',
            backgroundColor: '#f9fafb',
            transition: 'all 0.2s',
            '&:hover': { backgroundColor: '#ffffff' },
            '&.Mui-focused': {
              backgroundColor: '#ffffff',
              boxShadow: '0 0 0 3px rgba(124, 58, 237, 0.15)',
            },
          },
        }}
      >
        <Paper
          elevation={0}
          sx={{
            borderRadius: '20px',
            mb: 2,
            border: '1px solid #edf2f7',
            boxShadow: '0 8px 24px rgba(149, 157, 165, 0.08)',
            overflow: 'hidden',
          }}
        >
          <Accordion
            expanded={expanded}
            onChange={(_, isExpanded) => setExpanded(isExpanded)}
            sx={{ boxShadow: 'none', backgroundColor: 'transparent', '&:before': { display: 'none' } }}
          >
            <AccordionSummary
              expandIcon={<ExpandMoreIcon sx={{ color: '#7c3aed' }} />}
              sx={{
                px: 2.5,
                py: 1,
                backgroundColor: expanded ? '#f5f3ff' : '#ffffff',
                transition: 'background-color 0.2s',
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Box
                  sx={{
                    width: 36,
                    height: 36,
                    borderRadius: '10px',
                    backgroundColor: expanded ? '#ede9fe' : '#f3f4f6',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.2s',
                  }}
                >
                  <CampaignIcon sx={{ fontSize: 20, color: '#7c3aed' }} />
                </Box>
                <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#1e293b', fontSize: '0.98rem' }}>
                  {t('sharedRequired')}
                </Typography>
              </Box>
            </AccordionSummary>
            <AccordionDetails sx={{ p: 2.5, display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Box>
                <SelectField
                  multiple
                  value={users}
                  onChange={(e) => setUsers(e.target.value)}
                  endpoint="/api/users"
                  singleLine
                  label={t('settingsUsers')}
                  fullWidth
                />
                <Button
                  type="button"
                  size="small"
                  variant="text"
                  onClick={handleSelectAllUsers}
                  sx={{
                    mt: 0.5,
                    textTransform: 'none',
                    fontWeight: 700,
                    color: '#7c3aed',
                    '&:hover': { backgroundColor: '#f5f3ff' },
                  }}
                >
                  Selecionar todos
                </Button>
              </Box>
              <SelectField
                value={notificator}
                onChange={(e) => setNotificator(e.target.value)}
                endpoint="/api/notifications/notificators?announcement=true"
                keyGetter={(it) => it.type}
                titleGetter={(it) => t(prefixString('notificator', it.type))}
                label={t('notificationNotificators')}
                fullWidth
              />
              <TextField
                value={message.subject}
                onChange={(e) => setMessage({ ...message, subject: e.target.value })}
                label={t('sharedSubject')}
                fullWidth
              />
              <TextField
                value={message.body}
                onChange={(e) => setMessage({ ...message, body: e.target.value })}
                label={t('commandMessage')}
                multiline
                rows={3}
                fullWidth
                slotProps={{
                  input: {
                    endAdornment: (
                      <InputAdornment position="end" sx={{ alignSelf: "flex-end", mb: 1 }}>
                        <IconButton
                          size="small"
                          onClick={(e) => setEmojiAnchor(e.currentTarget)}
                          sx={{ color: "#7c3aed" }}
                        >
                          <InsertEmoticonIcon fontSize="small" />
                        </IconButton>
                      </InputAdornment>
                    ),
                  },
                }}
              />
              <Popover
                open={Boolean(emojiAnchor)}
                anchorEl={emojiAnchor}
                onClose={() => setEmojiAnchor(null)}
                anchorOrigin={{ vertical: 'top', horizontal: 'left' }}
              >
                <Box
                  sx={{
                    p: 1.5,
                    display: 'grid',
                    gridTemplateColumns: 'repeat(6, 1fr)',
                    gap: 0.5,
                    maxWidth: 260,
                  }}
                >
                  {['\uD83D\uDE00','\uD83D\uDE02','\uD83D\uDE0D','\uD83D\uDE0E','\uD83D\uDE22','\uD83D\uDE21',
                    '\uD83D\uDC4D','\uD83D\uDC4E','\uD83D\uDE4F','\uD83D\uDCAA','\uD83D\uDC4F','\u2764\uFE0F',
                    '\uD83D\uDD25','\u2705','\u274C','\u26A0\uFE0F','\uD83D\uDEA8','\u2757',
                    '\uD83D\uDE97','\u26FD','\uD83D\uDCCD','\uD83D\uDD52','\uD83D\uDCF1','\uD83D\uDD14'].map((emoji) => (
                    <IconButton
                      key={emoji}
                      size="small"
                      onClick={() => {
                        setMessage({ ...message, body: (message.body || '') + emoji });
                        setEmojiAnchor(null);
                      }}
                      sx={{ fontSize: "1.2rem" }}
                    >
                      {emoji}
                    </IconButton>
                  ))}
                </Box>
              </Popover>
            </AccordionDetails>
          </Accordion>
        </Paper>

        <Box sx={{ display: 'flex', gap: 1.5, pb: 4 }}>
          <Button
            type="button"
            variant="outlined"
            onClick={() => navigate(-1)}
            sx={{
              flex: 1,
              py: 1.2,
              borderRadius: '14px',
              fontWeight: 700,
              textTransform: 'none',
              borderColor: '#cbd5e1',
              color: '#475569',
              '&:hover': { borderColor: '#94a3b8', backgroundColor: '#f1f5f9' },
            }}
          >
            {t('sharedCancel')}
          </Button>
          <Button
            type="button"
            variant="contained"
            onClick={handleSend}
            disabled={!notificator || !message.subject || !message.body}
            sx={{
              flex: 1,
              py: 1.2,
              borderRadius: '14px',
              fontWeight: 800,
              textTransform: 'none',
              background: 'linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)',
              boxShadow: '0 4px 14px rgba(124, 58, 237, 0.4)',
              '&:hover': { background: 'linear-gradient(135deg, #6d28d9 0%, #5b21b6 100%)' },
              '&.Mui-disabled': { background: '#e2e8f0', color: '#94a3b8' },
            }}
          >
            {t('commandSend')}
          </Button>
        </Box>

        <Snackbar
          open={toast.open}
          autoHideDuration={3000}
          onClose={() => setToast((prev) => ({ ...prev, open: false }))}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        >
          <Alert
            onClose={() => setToast((prev) => ({ ...prev, open: false }))}
            severity="success"
            variant="filled"
            sx={{ borderRadius: '12px', fontWeight: 600, boxShadow: '0 6px 18px rgba(0,0,0,0.25)' }}
          >
            {toast.message}
          </Alert>
        </Snackbar>
      </Box>
    </PageLayout>
  );
};

export default AnnouncementPage;
