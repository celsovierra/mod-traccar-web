import { makeStyles } from 'tss-react/mui';

const useStyles = makeStyles()((theme) => ({
  root: {
    justifyContent: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    alignItems: 'center',
    display: 'flex',
    flexDirection: 'column',
    minHeight: '100dvh',
    background: 'linear-gradient(160deg, #0b1d3a 0%, #123a63 55%, #1a5490 100%)',
    position: 'relative',
    overflow: 'hidden',
  },
  radarRing: {
    position: 'absolute',
    borderRadius: '50%',
    border: '1px solid rgba(255,255,255,0.08)',
    top: '-15%',
    left: '50%',
    transform: 'translateX(-50%)',
  },
  topArea: {
    flex: '0 0 auto',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 'max(env(safe-area-inset-top), 32px)',
    paddingBottom: theme.spacing(4),
    position: 'relative',
    zIndex: 1,
    [theme.breakpoints.down('sm')]: {
      paddingBottom: theme.spacing(2),
    },
  },
  form: {
    flex: '0 1 auto',
    display: 'flex',
    justifyContent: 'center',
    width: '100%',
    maxWidth: '480px',
    margin: '0 auto',
    backgroundColor: '#ffffff',
    borderRadius: '28px',
    padding: theme.spacing(4, 3),
    paddingBottom: 'max(env(safe-area-inset-bottom), 24px)',
    boxShadow: '0 -12px 40px rgba(0, 0, 0, 0.25)',
    position: 'relative',
    zIndex: 1,
    [theme.breakpoints.down('sm')]: {
      padding: theme.spacing(3, 2.5),
      paddingBottom: 'max(env(safe-area-inset-bottom), 20px)',
    },
    [theme.breakpoints.up('sm')]: {
      borderRadius: '28px',
      marginBottom: theme.spacing(4),
      flex: '0 1 auto',
      maxWidth: '440px',
    },
  },
}));

const LoginLayout = ({ header, children }) => {
  const { classes } = useStyles();

  return (
    <main className={classes.root}>
      <div className={classes.radarRing} style={{ width: 500, height: 500 }} />
      <div className={classes.radarRing} style={{ width: 350, height: 350 }} />
      <div className={classes.radarRing} style={{ width: 200, height: 200 }} />
      <div className={classes.topArea}>{header}</div>
      <form className={classes.form}>{children}</form>
    </main>
  );
};

export default LoginLayout;


