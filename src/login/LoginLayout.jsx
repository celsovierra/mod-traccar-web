import { makeStyles } from 'tss-react/mui';

const useStyles = makeStyles()((theme) => ({
  root: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    backgroundImage: 'linear-gradient(rgba(11, 19, 43, 0.65), rgba(11, 19, 43, 0.8)), url("https://images.unsplash.com/photo-1558981403-c5f9899a28bc?auto=format&fit=crop&w=1920&q=80")',
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    padding: theme.spacing(2),
  },
  form: {
    width: '100%',
    maxWidth: '420px',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    backdropFilter: 'blur(10px)',
    padding: theme.spacing(4),
    borderRadius: theme.spacing(2),
    boxShadow: '0 12px 40px rgba(0, 0, 0, 0.3)',
    [theme.breakpoints.down('sm')]: {
      padding: theme.spacing(3, 2),
    },
  },
}));

const LoginLayout = ({ children }) => {
  const { classes } = useStyles();

  return (
    <main className={classes.root}>
      <form className={classes.form}>{children}</form>
    </main>
  );
};

export default LoginLayout;