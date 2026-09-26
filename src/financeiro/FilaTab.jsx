import { Table, TableRow, TableCell, TableHead, TableBody, Box, Paper, Typography } from '@mui/material';
import { useTranslation } from '../common/components/LocalizationProvider';

const FilaTab = () => {
  const t = useTranslation();
  const headCell = { fontWeight: 800, color: '#475569', fontSize: '0.82rem', py: 1.8, whiteSpace: 'nowrap' };
  const bodyCell = { py: 1.6, color: '#64748b', fontSize: '0.86rem' };

  return (
    <Box sx={{ width: '100%', maxWidth: 1200, mx: 'auto' }}>
      <Paper elevation={0} sx={{ borderRadius: '24px', border: '1px solid #edf2f7', boxShadow: '0 10px 30px rgba(15, 23, 42, 0.06)', overflow: 'hidden', backgroundColor: '#ffffff' }}>
        <Box sx={{ overflowX: 'auto' }}>
          <Table>
            <TableHead sx={{ backgroundColor: '#f8fafc' }}>
              <TableRow>
                <TableCell sx={headCell}>Cliente</TableCell>
                <TableCell sx={headCell}>Valor</TableCell>
                <TableCell sx={headCell}>Vencimento</TableCell>
                <TableCell sx={headCell}>Dias de Atraso</TableCell>
                <TableCell sx={headCell}>Status</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              <TableRow>
                <TableCell sx={bodyCell}>-</TableCell>
                <TableCell sx={bodyCell}>-</TableCell>
                <TableCell sx={bodyCell}>-</TableCell>
                <TableCell sx={bodyCell}>-</TableCell>
                <TableCell sx={bodyCell}>-</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </Box>
      </Paper>
    </Box>
  );
};

export default FilaTab;
