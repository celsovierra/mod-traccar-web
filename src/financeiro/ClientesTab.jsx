import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import { Table, TableRow, TableCell, TableHead, TableBody, Box, Paper, Typography, Avatar } from '@mui/material';
import PersonIcon from '@mui/icons-material/Person';
import SupervisorAccountIcon from '@mui/icons-material/SupervisorAccount';
import { useAsyncTask, useScrollToLoad, pageSize } from '../reactHelper';
import { useTranslation } from '../common/components/LocalizationProvider';
import TableShimmer from '../common/components/TableShimmer';
import SearchHeader from '../settings/components/SearchHeader';
import fetchOrThrow from '../common/util/fetchOrThrow';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';

const ClientesTab = () => {
  const t = useTranslation();
  const [reloadKey, reload] = useReducer((k) => k + 1, 0);
  const [items, setItems] = useState([]);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [hasMore, setHasMore] = useState(true);

  const loadItems = useCallback(async (offset, signal) => {
    const limit = offset === 0 ? 30 : pageSize;
    const query = new URLSearchParams({ excludeAttributes: true, limit, offset });
    const response = await fetchOrThrow('/api/users?' + query.toString(), { signal });
    const data = await response.json();
    setItems((previous) => {
      const combined = offset ? [...previous, ...data] : data;
      const uniqueMap = new Map();
      combined.forEach((u) => uniqueMap.set(u.id, u));
      return Array.from(uniqueMap.values());
    });
    setHasMore(data.length >= limit);
  }, []);


  const searchTimeoutRef = useRef(null);
  useEffect(() => {
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    searchTimeoutRef.current = setTimeout(async () => {
      const keyword = searchKeyword.trim();
      if (keyword) {
        try {
          const q = new URLSearchParams({ excludeAttributes: true, limit: 5000, offset: 0 });
          const r = await fetchOrThrow('/api/users?' + q.toString());
          const d = await r.json();
          setItems(d);
          setHasMore(false);
        } catch (e) { }
      } else { reload(); }
    }, 400);
    return () => { if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current); };
  }, [searchKeyword]);
  const sentinelRef = useScrollToLoad(() => loadItems(items.length));
  useAsyncTask(
    async ({ signal }) => {
      void reloadKey;
      setItems([]);
      await loadItems(0, signal);
    },
    [reloadKey, loadItems],
  );

  const filteredItems = items.filter((u) => !u.temporary).filter((u) => {
    if (!searchKeyword) return true;
    const k = searchKeyword.toLowerCase();
    return (u.name && u.name.toLowerCase().includes(k)) || (u.email && u.email.toLowerCase().includes(k));
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

  const headCell = { fontWeight: 800, color: '#475569', fontSize: '0.82rem', py: 1.8, whiteSpace: 'nowrap' };
  const bodyCell = { py: 1.6, color: '#64748b', fontSize: '0.86rem' };

  return (
    <>
      <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', width: '100%', maxWidth: 1200, mx: 'auto', px: { xs: 1.5, sm: 3 }, boxSizing: 'border-box' }}>
        <Box sx={{ flexShrink: 0, backgroundColor: '#ffffff', pt: { xs: 1.5, sm: 2 }, pb: 1, zIndex: 10 }}>
          <SearchHeader keyword={searchKeyword} setKeyword={setSearchKeyword} />
        </Box>
        <Box sx={{ flexGrow: 1, overflowY: 'auto', pb: 8 }}>
          <Paper elevation={0} sx={{ borderRadius: '24px', border: '1px solid #edf2f7', boxShadow: '0 10px 30px rgba(15, 23, 42, 0.06)', overflow: 'hidden', backgroundColor: '#ffffff' }}>
            <Box sx={{ overflowX: 'auto' }}>
              <Table>
                <TableHead sx={{ backgroundColor: '#f8fafc' }}>
                  <TableRow>
                    <TableCell sx={headCell}>{t('sharedName')}</TableCell>
                    <TableCell sx={headCell}>Telefone 1</TableCell>
                    <TableCell sx={headCell}>Telefone 2</TableCell>
                    <TableCell sx={headCell}>Valor</TableCell>
                    <TableCell sx={headCell}>Vencimento</TableCell>
                    <TableCell sx={headCell}>Contrato</TableCell>
                    <TableCell sx={{ ...headCell, textAlign: 'right' }}>Acoes</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredItems.map((item) => {
                    const avatarStyle = getAvatarColor(item);
                    return (
                      <TableRow key={item.id} hover sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                        <TableCell sx={{ py: 1.6 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                            <Avatar sx={{ width: 34, height: 34, backgroundColor: avatarStyle.bg, color: avatarStyle.color }}>
                              {getAvatarIcon(item)}
                            </Avatar>
                            <Typography sx={{ fontWeight: 700, fontSize: '0.88rem', color: '#1e293b' }}>
                              {item.name}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell sx={bodyCell}>-</TableCell>
                        <TableCell sx={bodyCell}>-</TableCell>
                        <TableCell sx={bodyCell}>-</TableCell>
                        <TableCell sx={bodyCell}>-</TableCell>
                        <TableCell sx={bodyCell}>-</TableCell>
                        <TableCell sx={{ py: 1.6, textAlign: 'right' }}>-</TableCell>
                      </TableRow>
                    );
                  })}
                  {hasMore && (
                    <TableShimmer ref={items.length > 0 ? sentinelRef : null} columns={7} endAction />
                  )}
                </TableBody>
              </Table>
            </Box>
          </Paper>
        </Box>
      </Box>
    </>
  );
};

export default ClientesTab;
