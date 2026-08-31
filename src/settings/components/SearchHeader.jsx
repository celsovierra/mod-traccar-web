import { useState, useEffect, useRef } from 'react';
import { TextField, InputAdornment, IconButton } from '@mui/material';
import ClearIcon from '@mui/icons-material/Clear';
import { makeStyles } from 'tss-react/mui';
import { useTranslation } from '../../common/components/LocalizationProvider';

const useStyles = makeStyles()((theme) => ({
  header: {
    position: 'sticky',
    left: 0,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'stretch',
    padding: theme.spacing(3, 2, 2),
  },
}));

const SearchHeader = ({ keyword, setKeyword }) => {
  const { classes } = useStyles();
  const t = useTranslation();

  const [input, setInput] = useState(keyword || '');
  const timerRef = useRef();

  useEffect(() => {
    setInput(keyword || '');
  }, [keyword]);

  useEffect(() => {
    timerRef.current = setTimeout(() => setKeyword(input), 300);
    return () => clearTimeout(timerRef.current);
  }, [input, setKeyword]);

  const handleClear = () => {
    setInput('');
    setKeyword('');
  };

  const clearAdornment = input ? (
    <InputAdornment position="end">
      <IconButton size="small" onClick={handleClear} edge="end">
        <ClearIcon fontSize="small" />
      </IconButton>
    </InputAdornment>
  ) : null;

  return (
    <div className={classes.header}>
      <TextField
        variant="outlined"
        placeholder={t('sharedSearch')}
        value={input}
        onChange={(e) => setInput(e.target.value)}
        InputProps={{ endAdornment: clearAdornment }}
        slotProps={{ input: { endAdornment: clearAdornment } }}
      />
    </div>
  );
};

export default SearchHeader;