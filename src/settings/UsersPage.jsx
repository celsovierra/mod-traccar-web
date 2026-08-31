import { useCallback, useReducer, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Table,
  TableRow,
  TableCell,
  TableHead,
  TableBody,
  Switch,
  TableFooter,
  FormControlLabel,
  Box,
} from '@mui/material';
import LoginIcon from '@mui/icons-material/Login';
import LinkIcon from '@mui/icons-material/Link';
import { useCatch, useAsyncTask, useScrollToLoad, pageSize } from '../reactHelper';
import { formatBoolean } from '../common/util/formatter';
import { useTranslation } from '../common/components/LocalizationProvider';
import PageLayout from '../common/components/PageLayout';
import SettingsMenu from './components/SettingsMenu';
import CollectionFab from './components/CollectionFab';
import CollectionActions from './components/CollectionActions';
import TableShimmer from '../common/components/TableShimmer';
import { useManager } from '../common/util/permissions';
import SearchHeader from './components/SearchHeader';
import useSettingsStyles from './common/useSettingsStyles';
import fetchOrThrow from '../common/util/fetchOrThrow';

const UsersPage = () => {
  const { classes } = useSettingsStyles();
  const navigate = useNavigate();
  const t = useTranslation();

  const manager = useManager();

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
      const query = new URLSearchParams({ excludeAttributes: true, limit: pageSize, offset });
      const response = await fetchOrThrow(`/api/users?${query.toString()}`, { signal });
      const data = await response.json();
      setItems((previous) => (offset ? [...previous, ...data] : data));
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

  return (
    <PageLayout menu={<SettingsMenu />} breadcrumbs={['settingsTitle', 'settingsUsers']}>
      <SearchHeader keyword={searchKeyword} setKeyword={setSearchKeyword} />
      <Box sx={{ width: '100%', overflowX: 'auto', WebkitOverflowScrolling: 'touch', pb: 10 }}>
        <Table className={classes.table} sx={{ minWidth: 320 }}>
          <TableHead>
            <TableRow>
              <TableCell sx={{ minWidth: 120 }}>{t('sharedName')}</TableCell>
              <TableCell sx={{ minWidth: 160 }}>{t('userEmail')}</TableCell>
              <TableCell sx={{ width: 90 }}>{t('sharedDisabled')}</TableCell>
              <TableCell sx={{ width: 64, pr: 2, textAlign: 'center' }}>{t('sharedActions')}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {items
              .filter((u) => temporary || !u.temporary)
              .filter((u) => {
                if (!searchKeyword) return true;
                const keyword = searchKeyword.toLowerCase();
                return (
                  (u.name && u.name.toLowerCase().includes(keyword)) ||
                  (u.email && u.email.toLowerCase().includes(keyword))
                );
              })
              .map((item) => (
                <TableRow key={item.id} hover>
                  <TableCell>{item.name}</TableCell>
                  <TableCell>{item.email}</TableCell>
                  <TableCell>{formatBoolean(item.disabled, t)}</TableCell>
                  <TableCell padding="none" sx={{ width: 64, pr: 2, textAlign: 'center' }}>
                    <CollectionActions
                      itemId={item.id}
                      editPath="/settings/user"
                      endpoint="users"
                      onReload={reload}
                      customActions={manager ? [actionLogin, actionConnections] : [actionConnections]}
                    />
                  </TableCell>
                </TableRow>
              ))}
            {hasMore && (
              <TableShimmer ref={items.length > 0 ? sentinelRef : null} columns={4} endAction />
            )}
          </TableBody>
          <TableFooter>
            <TableRow>
              <TableCell colSpan={4} align="right">
                <FormControlLabel
                  control={
                    <Switch
                      value={temporary}
                      onChange={(e) => setTemporary(e.target.checked)}
                      size="small"
                    />
                  }
                  label={t('userTemporary')}
                  labelPlacement="start"
                />
              </TableCell>
            </TableRow>
          </TableFooter>
        </Table>
      </Box>
      <CollectionFab editPath="/settings/user" />
    </PageLayout>
  );
};

export default UsersPage;