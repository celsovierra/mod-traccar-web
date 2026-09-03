import React from 'react';
import { ButtonBase, Typography } from '@mui/material';
import AnchorIcon from '@mui/icons-material/Anchor';

export const AnchorButton = ({ isAnchorActive, onClick, disabled, classes }) => {
  return (
    <ButtonBase
      className={classes.actionItemBtn}
      onClick={onClick}
      disabled={disabled}
    >
      <AnchorIcon 
        sx={{ 
          fontSize: 22, 
          color: isAnchorActive ? '#dc2626' : '#0284c7',
          animation: isAnchorActive ? 'superBlinkRed 0.7s infinite ease-in-out' : 'none'
        }} 
      />
      <Typography 
        className={`${classes.actionText} ${isAnchorActive ? 'blinking-anchor-active' : ''}`}
        sx={{ color: isAnchorActive ? '#dc2626 !important' : 'inherit', fontWeight: isAnchorActive ? '800 !important' : '600' }}
      >
        {isAnchorActive ? 'Ancorado' : 'Âncora'}
      </Typography>
    </ButtonBase>
  );
};
