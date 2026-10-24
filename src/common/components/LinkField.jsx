import { Autocomplete, TextField, Button, Box } from '@mui/material';
import { useState, useEffect } from 'react';
import { useTranslation } from './LocalizationProvider';
import fetchOrThrow from '../util/fetchOrThrow';

const defaultTitleGetter = (item) => item.name;

const LinkField = ({
  label,
  endpointAll,
  endpointLinked,
  baseId,
  keyBase,
  keyLink,
  titleGetter = defaultTitleGetter,
}) => {
  const t = useTranslation();
  const [active, setActive] = useState(false);
  const [items, setItems] = useState([]);
  const [linked, setLinked] = useState([]);
  const [tempValue, setTempValue] = useState([]);

  useEffect(() => {
    if (active) {
      fetchOrThrow(endpointAll)
        .then((res) => res.json())
        .then((data) => setItems(data))
        .catch(() => {});
    }
  }, [active, endpointAll]);

  useEffect(() => {
    if (active) {
      fetchOrThrow(endpointLinked)
        .then((res) => res.json())
        .then((data) => {
          setLinked(data);
          setTempValue(data);
        })
        .catch(() => {});
    }
  }, [active, endpointLinked]);

  const handleSave = async () => {
    const oldValue = linked.map((it) => it.id);
    const newValue = tempValue.map((it) => it.id);

    try {
      // 1. Adicionar novas permissões
      for (const added of newValue.filter((it) => !oldValue.includes(it))) {
        await fetchOrThrow('/api/permissions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ [keyBase]: baseId, [keyLink]: added }),
        });
      }

      // 2. Remover permissões antigas
      for (const removed of oldValue.filter((it) => !newValue.includes(it))) {
        await fetchOrThrow('/api/permissions', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ [keyBase]: baseId, [keyLink]: removed }),
        });
      }

      window.location.reload();
    } catch (err) {
      alert('Erro ao salvar: ' + err.message);
    }
  };

  return (
    <Box>
      <Autocomplete
        size="small"
        loading={active && items.length === 0}
        isOptionEqualToValue={(i1, i2) => i1.id === i2.id}
        options={items || []}
        getOptionLabel={(item) => titleGetter(item)}
        slotProps={{ chip: { size: 'small' } }}
        renderInput={(params) => (
          <TextField
            {...params}
            label={label}
            placeholder={!active ? t('reportShow') : null}
            onFocus={() => setActive(true)}
            slotProps={{
              ...params.slotProps,
              inputLabel: {
                ...params.slotProps?.inputLabel,
                shrink: !active || params.slotProps?.inputLabel?.shrink,
              },
            }}
          />
        )}
        value={tempValue || []}
        onChange={(_, val) => setTempValue(val)}
        multiple
      />
      <Button variant="contained" size="small" onClick={handleSave} sx={{ mt: 2 }}>
        Salvar
      </Button>
    </Box>
  );
};

export default LinkField;
