import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Typography,
  FormControlLabel,
  Checkbox,
  TextField,
  Button,
  Box,
  Paper,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import AssignmentIcon from '@mui/icons-material/Assignment';
import TuneIcon from '@mui/icons-material/Tune';
import AddPhotoAlternateIcon from '@mui/icons-material/AddPhotoAlternate';
import QrCodeScannerIcon from '@mui/icons-material/QrCodeScanner';
import FileInput from '../common/components/FileInput';
import EditItemView from './components/EditItemView';
import SelectField from '../common/components/SelectField';
import deviceCategories from '../common/util/deviceCategories';
import { useTranslation } from '../common/components/LocalizationProvider';
import { useManager } from '../common/util/permissions';
import { useCatch } from '../reactHelper';
import useSettingsStyles from './common/useSettingsStyles';
import QrCodeDialog from '../common/components/QrCodeDialog';
import fetchOrThrow from '../common/util/fetchOrThrow';

const DevicePage = () => {
  const { classes } = useSettingsStyles();
  const t = useTranslation();

  const manager = useManager();

  const [searchParams] = useSearchParams();
  const uniqueId = searchParams.get('uniqueId');

  const [item, setItem] = useState(uniqueId ? { uniqueId } : null);
  const [showQr, setShowQr] = useState(false);
  const [imageFile, setImageFile] = useState(null);

  const [expandedPanel, setExpandedPanel] = useState('required');

  const handleChange = (panel) => (event, isExpanded) => {
    setExpandedPanel(isExpanded ? panel : false);
  };

  const handleFileInput = useCatch(async (newFile) => {
    setImageFile(newFile);
    if (newFile && item?.id) {
      const response = await fetchOrThrow(`/api/devices/${item.id}/image`, {
        method: 'POST',
        body: newFile,
      });
      setItem({ ...item, attributes: { ...item.attributes, deviceImage: await response.text() } });
    } else if (!newFile) {
      // eslint-disable-next-line no-unused-vars
      const { deviceImage, ...remainingAttributes } = item.attributes || {};
      setItem({ ...item, attributes: remainingAttributes });
    }
  });

  const handlePlateChange = (event) => {
    const rawValue = event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
    setItem((prev) => ({
      ...prev,
      attributes: {
        ...(prev?.attributes || {}),
        plate: rawValue,
      },
    }));
  };

  const validate = () => item && item.name && item.uniqueId;

  return (
    <EditItemView
      endpoint="devices"
      item={item}
      setItem={setItem}
      validate={validate}
      breadcrumbs={['sharedDevice']}
    >
      {item && (
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
              '&:hover': {
                backgroundColor: '#ffffff',
              },
              '&.Mui-focused': {
                backgroundColor: '#ffffff',
                boxShadow: '0 0 0 3px rgba(124, 58, 237, 0.15)',
              },
            },
          }}
        >
          {/* Aba Exigido */}
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
              expanded={expandedPanel === 'required'}
              onChange={handleChange('required')}
              sx={{
                boxShadow: 'none',
                backgroundColor: 'transparent',
                '&:before': { display: 'none' },
              }}
            >
              <AccordionSummary
                expandIcon={<ExpandMoreIcon sx={{ color: '#7c3aed' }} />}
                sx={{
                  px: 2.5,
                  py: 1,
                  backgroundColor: expandedPanel === 'required' ? '#f5f3ff' : '#ffffff',
                  transition: 'background-color 0.2s',
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <Box
                    sx={{
                      width: 36,
                      height: 36,
                      borderRadius: '10px',
                      backgroundColor: expandedPanel === 'required' ? '#ede9fe' : '#f3f4f6',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <AssignmentIcon sx={{ fontSize: 20, color: '#7c3aed' }} />
                  </Box>
                  <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#1e293b', fontSize: '0.98rem' }}>
                    {t('sharedRequired')}
                  </Typography>
                </Box>
              </AccordionSummary>
              <AccordionDetails sx={{ p: 2.5, display: 'flex', flexDirection: 'column', gap: 2 }}>
                <TextField
                  value={item.name || ''}
                  onChange={(event) => setItem({ ...item, name: event.target.value })}
                  label={t('sharedName')}
                  fullWidth
                  variant="outlined"
                />
                <TextField
                  value={item.uniqueId || ''}
                  onChange={(event) => setItem({ ...item, uniqueId: event.target.value })}
                  label={t('deviceIdentifier')}
                  disabled={Boolean(uniqueId)}
                  fullWidth
                  variant="outlined"
                />
              </AccordionDetails>
            </Accordion>
          </Paper>

          {/* Aba Extra */}
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
              expanded={expandedPanel === 'extra'}
              onChange={handleChange('extra')}
              sx={{
                boxShadow: 'none',
                backgroundColor: 'transparent',
                '&:before': { display: 'none' },
              }}
            >
              <AccordionSummary
                expandIcon={<ExpandMoreIcon sx={{ color: '#7c3aed' }} />}
                sx={{
                  px: 2.5,
                  py: 1,
                  backgroundColor: expandedPanel === 'extra' ? '#f5f3ff' : '#ffffff',
                  transition: 'background-color 0.2s',
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <Box
                    sx={{
                      width: 36,
                      height: 36,
                      borderRadius: '10px',
                      backgroundColor: expandedPanel === 'extra' ? '#ede9fe' : '#f3f4f6',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <TuneIcon sx={{ fontSize: 20, color: '#7c3aed' }} />
                  </Box>
                  <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#1e293b', fontSize: '0.98rem' }}>
                    {t('sharedExtra')}
                  </Typography>
                </Box>
              </AccordionSummary>
              <AccordionDetails sx={{ p: 2.5, display: 'flex', flexDirection: 'column', gap: 2 }}>
                <SelectField
                  value={item.groupId}
                  onChange={(event) => setItem({ ...item, groupId: Number(event.target.value) })}
                  endpoint="/api/groups"
                  label={t('groupParent')}
                  fullWidth
                />
                <TextField
                  value={item.phone || ''}
                  onChange={(event) => setItem({ ...item, phone: event.target.value })}
                  label={t('sharedPhone')}
                  fullWidth
                  variant="outlined"
                />
                <TextField
                  value={item.model || ''}
                  onChange={(event) => setItem({ ...item, model: event.target.value })}
                  label={t('deviceModel')}
                  fullWidth
                  variant="outlined"
                />
                <TextField
                  value={item.attributes?.plate || ''}
                  onChange={handlePlateChange}
                  label="Placa do Veículo"
                  placeholder="Ex: ABC1D23"
                  inputProps={{ maxLength: 8, style: { textTransform: 'uppercase', fontWeight: 800, letterSpacing: 1 } }}
                  helperText="Exibida na placa Mercosul"
                  fullWidth
                  variant="outlined"
                />
                <SelectField
                  value={item.category || 'default'}
                  onChange={(event) => setItem({ ...item, category: event.target.value })}
                  data={deviceCategories
                    .map((category) => ({
                      id: category,
                      name: t(`category${category.replace(/^\w/, (c) => c.toUpperCase())}`),
                    }))
                    .sort((a, b) => a.name.localeCompare(b.name))}
                  label={t('deviceCategory')}
                  fullWidth
                />
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pt: 1 }}>
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={item.disabled}
                        onChange={(event) => setItem({ ...item, disabled: event.target.checked })}
                        sx={{ color: '#7c3aed', '&.Mui-checked': { color: '#6d28d9' } }}
                      />
                    }
                    label={<Typography sx={{ fontSize: '0.88rem', fontWeight: 700, color: '#475569' }}>{t('sharedDisabled')}</Typography>}
                    disabled={!manager}
                  />
                  <Button
                    variant="outlined"
                    startIcon={<QrCodeScannerIcon />}
                    onClick={() => setShowQr(true)}
                    sx={{
                      borderRadius: '12px',
                      textTransform: 'none',
                      fontWeight: 700,
                      borderColor: '#ddd6fe',
                      color: '#7c3aed',
                      backgroundColor: '#f5f3ff',
                      '&:hover': {
                        borderColor: '#7c3aed',
                        backgroundColor: '#ede9fe',
                      },
                    }}
                  >
                    {t('sharedQrCode')}
                  </Button>
                </Box>
              </AccordionDetails>
            </Accordion>
          </Paper>

          {/* Aba Imagem */}
          {item.id && (
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
                expanded={expandedPanel === 'image'}
                onChange={handleChange('image')}
                sx={{
                  boxShadow: 'none',
                  backgroundColor: 'transparent',
                  '&:before': { display: 'none' },
                }}
              >
                <AccordionSummary
                  expandIcon={<ExpandMoreIcon sx={{ color: '#7c3aed' }} />}
                  sx={{
                    px: 2.5,
                    py: 1,
                    backgroundColor: expandedPanel === 'image' ? '#f5f3ff' : '#ffffff',
                    transition: 'background-color 0.2s',
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Box
                      sx={{
                        width: 36,
                        height: 36,
                        borderRadius: '10px',
                        backgroundColor: expandedPanel === 'image' ? '#ede9fe' : '#f3f4f6',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <AddPhotoAlternateIcon sx={{ fontSize: 20, color: '#7c3aed' }} />
                    </Box>
                    <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#1e293b', fontSize: '0.98rem' }}>
                      {t('attributeDeviceImage')}
                    </Typography>
                  </Box>
                </AccordionSummary>
                <AccordionDetails sx={{ p: 2.5 }}>
                  <FileInput
                    placeholder={t('attributeDeviceImage')}
                    value={imageFile}
                    onChange={handleFileInput}
                    slotProps={{ htmlInput: { accept: 'image/*' } }}
                  />
                </AccordionDetails>
              </Accordion>
            </Paper>
          )}
        </Box>
      )}
      <QrCodeDialog open={showQr} onClose={() => setShowQr(false)} />
    </EditItemView>
  );
};

export default DevicePage;