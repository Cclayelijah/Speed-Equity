// src/theme.ts
import { createTheme } from '@mui/material/styles';

export const theme = createTheme({
  palette: {
    mode: "dark",
    background: { default: "#05060A", paper: "rgba(255,255,255,0.06)" },
  },
  shape: { borderRadius: 12 },
  typography: { fontFamily: `"Inter", system-ui, -apple-system, Segoe UI, Roboto, Arial, "Apple Color Emoji", "Segoe UI Emoji"` },
});

// export const theme = createTheme({
//   shape: { borderRadius: 12 },
//   typography: {
//     fontFamily: `"Inter", system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, Cantarell, 'Helvetica Neue', Arial, 'Noto Sans', 'Apple Color Emoji','Segoe UI Emoji','Segoe UI Symbol'`,
//     h2: { fontWeight: 700 },
//   },
//   palette: {
//     primary: {
//       main: '#1976d2',
//     },
//     secondary: {
//       main: '#dc004e',
//     },
//   },
// });