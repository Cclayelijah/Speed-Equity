import { createTheme } from '@mui/material/styles';

export const theme = createTheme({
  shape: { borderRadius: 12 },
  typography: { h2: { fontWeight: 700 } },
  palette: {
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
  },
});