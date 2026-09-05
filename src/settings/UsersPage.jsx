import { useCallback, useReducer, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Table,
  TableRow,
  TableCell,
  TableHead,
  TableBody,
  Switch,
  FormControlLabel,
  Box,
  Paper,
  Typography,
  Avatar,
  Chip,
  IconButton,
  Tooltip,
} from '@mui/material';
import LoginIcon from '@mui/icons-material/Login';
import LinkIcon from '@mui/icons-material/Link';
import PersonIcon from '@mui/icons-material/Person';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import SupervisorAccountIcon from '@mui/icons-material/SupervisorAccount';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import { useCatch, useAsyncTask, useScrollToLoad, pageSize } from '../reactHelper';
import { useTranslation } from '../common/components/LocalizationProvider';
import { formatTime } from '../common/util/formatter';
import { usePreference } from '../common/util/preferences';
import PageLayout from '../common/components/PageLayout';
import SettingsMenu from './components/SettingsMenu';
import CollectionFab from './components/CollectionFab';
import CollectionActions from './components/CollectionActions';
import TableShimmer from '../common/components/TableShimmer';
import { useManager } from '../common/util/permissions';
import SearchHeader from './components/SearchHeader';
import fetchOrThrow from '../common/util/fetchOrThrow';

const UsersPage = () => {
  const navigate = useNavigate();
  const t = useTranslation();
  const manager = useManager();
  const format = usePreference('twelveHourFormat') ? 'YYYY-MM-DD hh:mm A' : 'YYYY-MM-DD HH:mm';

  const [reloadKey, reload] = useReducer((k) => k + 1, 0);
  const [items, setItems] = useState([]);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [hasMore, setHasMore] = useState(true);
  const [temporary, setTemporary] = useState(false);

  const handleLogin = useCatch(async (userId) => {
    await fetchOrThrow(`/api/session/${userId}`);
    window.location.replace('/');
  });

  const actionLogin = {
    key: 'login',
    title: t('loginLogin'),
    icon: <LoginIcon fontSize="small" />,
    handler: handleLogin,
  };

  const actionConnections = {
    key: 'connections',
    title: t('sharedConnections'),
    icon: <LinkIcon fontSize="small" />,
    handler: (userId) => navigate(`/settings/user/${userId}/connections`),
  };

  const loadItems = useCallback(
    async (offset, signal) => {
      const query = new URLSearchParams({ excludeAttributes: false, limit: pageSize, offset });
      const response = await fetchOrThrow(`/api/users?${query.toString()}`, { signal });
      const data = await response.json();
      console.log('API Users Data Loaded:', data);

      setItems((previous) => {
        const combined = offset ? [...previous, ...data] : data;
        const uniqueMap = new Map();
        combined.forEach((u) => uniqueMap.set(u.id, u));
        return Array.from(uniqueMap.values());
      });

      setHasMore(data.length >= pageSize);
    },
    [],
  );

  const sentinelRef = useScrollToLoad(() => loadItems(items.length));

  useAsyncTask(
    async ({ signal }) => {
      void reloadKey;
      setItems([]);
      await loadItems(0, signal);
    },
    [reloadKey, loadItems],
  );

  const filteredItems = items
    .filter((u) => temporary || !u.temporary)
    .filter((u) => {
      if (!searchKeyword) return true;
      const keyword = searchKeyword.toLowerCase();
      return (
        (u.name && u.name.toLowerCase().includes(keyword)) ||
        (u.email && u.email.toLowerCase().includes(keyword))
      );
    });

  const getAvatarIcon = (item) => {
    if (item.administrator) return <AdminPanelSettingsIcon sx={{ fontSize: 18 }} />;
    if (item.userLimit) return <SupervisorAccountIcon sx={{ fontSize: 18 }} />;
    return <PersonIcon sx={{ fontSize: 18 }} />;
  };

  const getAvatarColor = (item) => {
    if (item.administrator) return { bg: '#fee2e2', color: '#dc2626' };
    if (item.userLimit) return { bg: '#fef3c7', color: '#d97706' };
    return { bg: '#ede9fe', color: '#7c3aed' };
  };

  const getLastAccessTime = (item) => {
    return item.lastUpdate || item.attributes?.lastUpdate || new Date().toISOString();
  };

  return (
    <PageLayout menu={<SettingsMenu />} breadcrumbs={['settingsTitle', 'settingsUsers']}>
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          width: '100%',
          maxWidth: 1000,
          mx: 'auto',
          px: { xs: 1.5, sm: 3 },
          boxSizing: 'border-box',
        }}
      >
        {/* CABEÇALHO 100% FIXO */}
        <Box
          sx={{
            flexShrink: 0,
            backgroundColor: '#ffffff',
            pt: { xs: 1.5, sm: 2 },
            pb: 1,
            zIndex: 10,
          }}
        >
          <SearchHeader keyword={searchKeyword} setKeyword={setSearchKeyword} />

          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 1 }}>
            <FormControlLabel
              control={
                <Switch
                  checked={temporary}
                  onChange={(e) => setTemporary(e.target.checked)}
                  size="small"
                  sx={{
                    '& .MuiSwitch-switchBase.Mui-checked': {
                      color: '#7c3aed',
                    },
                    '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                      backgroundColor: '#7c3aed',
                    },
                  }}
                />
              }
              label={
                <Typography sx={{ fontSize: '0.85rem', fontWeight: 600, color: '#64748b' }}>
                  {t('userTemporary')}
                </Typography>
              }
              labelPlacement="start"
            />
          </Box>
        </Box>

        {/* ÁREA COM ROLAGEM INDEPENDENTE */}
        <Box
          sx={{
            flexGrow: 1,
            overflowY: 'auto',
            pb: 8,
            WebkitOverflowScrolling: 'touch',
          }}
        >
          <Paper
            elevation={0}
            sx={{
              borderRadius: '24px',
              border: '1px solid #edf2f7',
              boxShadow: '0 10px 30px rgba(15, 23, 42, 0.06)',
              overflow: 'hidden',
              backgroundColor: '#ffffff',
            }}
          >
            {/* VISUALIZAÇÃO EM CARDS PARA SMARTPHONE */}
            <Box sx={{ display: { xs: 'flex', md: 'none' }, flexDirection: 'column', p: 1.5, gap: 1.5 }}>
              {filteredItems.map((item) => {
                const avatarStyle = getAvatarColor(item);
                const lastAccess = getLastAccessTime(item);
                return (
                  <Paper
                    key={item.id}
                    elevation={0}
                    sx={{
                      p: 2,
                      borderRadius: '18px',
                      border: '1px solid #f1f5f9',
                      backgroundColor: '#f8fafc',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 1.5,
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2 }}>
                        <Avatar
                          sx={{
                            width: 40,
                            height: 40,
                            backgroundColor: avatarStyle.bg,
                            color: avatarStyle.color,
                          }}
                        >
                          {getAvatarIcon(item)}
                        </Avatar>
                        <Box sx={{ minWidth: 0 }}>
                          <Typography noWrap sx={{ fontWeight: 800, fontSize: '0.94rem', color: '#1e293b' }}>
                            {item.name}
                          </Typography>
                          <Typography noWrap sx={{ fontSize: '0.8rem', color: '#64748b' }}>
                            {item.email}
                          </Typography>
                        </Box>
                      </Box>
                      {item.disabled && (
                        <Chip
                          label={t('sharedDisabled')}
                          size="small"
                          color="error"
                          sx={{ height: 20, fontSize: '0.68rem', fontWeight: 700 }}
                        />
                      )}
                    </Box>

                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8, px: 0.5 }}>
                      <AccessTimeIcon sx={{ fontSize: 15, color: '#7c3aed' }} />
                      <Typography sx={{ fontSize: '0.78rem', color: '#475569', fontWeight: 600 }}>
                        Último Acesso: {lastAccess ? formatTime(lastAccess, format) : 'Nunca acessou'}
                      </Typography>
                    </Box>

                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'flex-end',
                        gap: 1,
                        pt: 1,
                        borderTop: '1px solid #e2e8f0',
                      }}
                    >
                      {manager && (
                        <Tooltip title={t('loginLogin')}>
                          <IconButton
                            size="small"
                            onClick={() => handleLogin(item.id)}
                            sx={{
                              color: '#7c3aed',
                              backgroundColor: '#ede9fe',
                              '&:hover': { backgroundColor: '#ddd6fe' },
                            }}
                          >
                            <LoginIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}
                      <Tooltip title={t('sharedConnections')}>
                        <IconButton
                          size="small"
                          onClick={() => navigate(`/settings/user/${item.id}/connections`)}
                          sx={{
                            color: '#0284c7',
                            backgroundColor: '#e0f2fe',
                            '&:hover': { backgroundColor: '#bae6fd' },
                          }}
                        >
                          <LinkIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <CollectionActions
                        itemId={item.id}
                        editPath="/settings/user"
                        endpoint="users"
                        onReload={reload}
                      />
                    </Box>
                  </Paper>
                );
              })}
              {hasMore && <TableShimmer ref={sentinelRef} columns={1} />}
            </Box>

            {/* TABELA PARA DESKTOP E TABLET */}
            <Box sx={{ display: { xs: 'none', md: 'block' }, overflowX: 'auto' }}>
              <Table>
                <TableHead sx={{ backgroundColor: '#f8fafc' }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 800, color: '#475569', fontSize: '0.82rem', py: 1.8 }}>
                      {t('sharedName')}
                    </TableCell>
                    <TableCell sx={{ fontWeight: 800, color: '#475569', fontSize: '0.82rem', py: 1.8 }}>
                      {t('userEmail')}
                    </TableCell>
                    <TableCell sx={{ fontWeight: 800, color: '#475569', fontSize: '0.82rem', py: 1.8, whiteSpace: 'nowrap' }}>
                      Último Acesso
                    </TableCell>
                    <TableCell sx={{ fontWeight: 800, color: '#475569', fontSize: '0.82rem', py: 1.8 }}>
                      {t('sharedDisabled')}
                    </TableCell>
                    <TableCell align="right" sx={{ fontWeight: 800, color: '#475569', fontSize: '0.82rem', py: 1.8 }}>
                      {t('sharedActions')}
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredItems.map((item) => {
                    const avatarStyle = getAvatarColor(item);
                    const lastAccess = getLastAccessTime(item);
                    return (
                      <TableRow
                        key={item.id}
                        hover
                        sx={{
                          transition: 'background-color 0.15s',
                          '&:last-child td, &:last-child th': { border: 0 },
                        }}
                      >
                        <TableCell sx={{ py: 1.6 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                            <Avatar
                              sx={{
                                width: 34,
                                height: 34,
                                backgroundColor: avatarStyle.bg,
                                color: avatarStyle.color,
                              }}
                            >
                              {getAvatarIcon(item)}
                            </Avatar>
                            <Typography sx={{ fontWeight: 700, fontSize: '0.88rem', color: '#1e293b' }}>
                              {item.name}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell sx={{ color: '#64748b', fontSize: '0.86rem', py: 1.6 }}>
                          {item.email}
                        </TableCell>
                        <TableCell sx={{ py: 1.6, whiteSpace: 'nowrap' }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
                            <AccessTimeIcon sx={{ fontSize: 16, color: '#7c3aed' }} />
                            <Typography sx={{ fontSize: '0.82rem', color: '#334155', fontWeight: 600 }}>
                              {lastAccess ? formatTime(lastAccess, format) : 'Nunca acessou'}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell sx={{ py: 1.6 }}>
                          {item.disabled ? (
                            <Chip
                              label={t('sharedYes')}
                              size="small"
                              color="error"
                              sx={{ height: 22, fontSize: '0.72rem', fontWeight: 700 }}
                            />
                          ) : (
                            <Chip
                              label={t('sharedNo')}
                              size="small"
                              sx={{
                                height: 22,
                                fontSize: '0.72rem',
                                fontWeight: 700,
                                backgroundColor: '#f1f5f9',
                                color: '#475569',
                              }}
                            />
                          )}
                        </TableCell>
                        <TableCell align="right" sx={{ py: 1.6 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 0.8 }}>
                            {manager && (
                              <Tooltip title={t('loginLogin')}>
                                <IconButton
                                  size="small"
                                  onClick={() => handleLogin(item.id)}
                                  sx={{
                                    color: '#7c3aed',
                                    backgroundColor: '#ede9fe',
                                    '&:hover': { backgroundColor: '#ddd6fe' },
                                  }}
                                >
                                  <LoginIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            )}
                            <Tooltip title={t('sharedConnections')}>
                              <IconButton
                                size="small"
                                onClick={() => navigate(`/settings/user/${item.id}/connections`)}
                                sx={{
                                  color: '#0284c7',
                                  backgroundColor: '#e0f2fe',
                                  '&:hover': { backgroundColor: '#bae6fd' },
                                }}
                              >
                                <LinkIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            <CollectionActions
                              itemId={item.id}
                              editPath="/settings/user"
                              endpoint="users"
                              onReload={reload}
                            />
                          </Box>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {hasMore && (
                    <TableShimmer ref={items.length > 0 ? sentinelRef : null} columns={5} endAction />
                  )}
                </TableBody>
              </Table>
            </Box>
          </Paper>
        </Box>

        <CollectionFab editPath="/settings/user" />
      </Box>
    </PageLayout>
  );
};

export default UsersPage;