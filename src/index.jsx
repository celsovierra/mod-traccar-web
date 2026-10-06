import './smsMarket/credentialSync';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { CssBaseline, StyledEngineProvider } from '@mui/material';
import store from './store';
import { LocalizationProvider } from './common/components/LocalizationProvider';
import ErrorHandler from './common/components/ErrorHandler';
import Navigation from './Navigation';
import preloadImages from './map/core/preloadImages';
import NativeInterface from './common/components/NativeInterface';
import ServerProvider from './ServerProvider';
import ErrorBoundary from './ErrorBoundary';
import AppThemeProvider from './AppThemeProvider';

preloadImages();

if ('serviceWorker' in navigator) {
  let refreshing = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!refreshing) { refreshing = true; window.location.reload(); }
  });
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').then((reg) => {
      setInterval(() => reg.update(), 60 * 60 * 1000);
      reg.addEventListener('updatefound', () => {
        const nw = reg.installing;
        if (!nw) return;
        nw.addEventListener('statechange', () => {
          if (nw.state === 'installed' && navigator.serviceWorker.controller) {
            const box = document.createElement('div');
            box.style.cssText = 'position:fixed;inset:0;background:rgba(15,23,42,0.55);backdrop-filter:blur(6px);z-index:99999;display:flex;align-items:center;justify-content:center;font-family:system-ui,-apple-system,sans-serif;padding:20px;';
            box.innerHTML = '<div style="background:#fff;border-radius:20px;padding:28px 24px;max-width:340px;width:100%;box-shadow:0 20px 50px rgba(0,0,0,0.3);text-align:center;">'
              + '<div style="width:64px;height:64px;border-radius:50%;background:linear-gradient(135deg,#3b82f6,#2563eb);display:flex;align-items:center;justify-content:center;margin:0 auto 16px;box-shadow:0 8px 20px rgba(59,130,246,0.4);">'
              + '<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"32\" height=\"32\" fill=\"none\" stroke=\"#fff\" stroke-width=\"2.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\" viewBox=\"0 0 24 24\"><path d=\"M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8\"/><path d=\"M21 3v5h-5\"/></svg>'
              + '</div>'
              + '<div style="font-size:19px;font-weight:800;color:#0f172a;margin-bottom:8px;">Nova versao disponivel</div>'
              + '<div style="font-size:14px;color:#64748b;line-height:1.5;margin-bottom:22px;">Uma atualizacao do sistema esta pronta. Deseja atualizar agora?</div>'
              + '<div style="display:flex;gap:10px;">'
              + '<button id=\"__sw_later\" style=\"flex:1;padding:12px;border-radius:12px;border:1.5px solid #e2e8f0;background:#fff;color:#475569;font-weight:700;font-size:14px;cursor:pointer;\">Depois</button>'
              + '<button id=\"__sw_now\" style=\"flex:1;padding:12px;border-radius:12px;border:none;background:linear-gradient(135deg,#3b82f6,#2563eb);color:#fff;font-weight:700;font-size:14px;cursor:pointer;box-shadow:0 6px 16px rgba(59,130,246,0.4);\">Atualizar</button>'
              + '</div>'
              + '</div>';
            document.body.appendChild(box);
            box.querySelector('#__sw_now').onclick = () => {
              box.remove();
              nw.postMessage({ type: 'SKIP_WAITING' });
            };
            box.querySelector('#__sw_later').onclick = () => box.remove();
          }
        });
      });
    });
  });
}

const root = createRoot(document.getElementById('root'));
root.render(
  <ErrorBoundary>
    <Provider store={store}>
      <LocalizationProvider>
        <StyledEngineProvider injectFirst>
          <AppThemeProvider>
            <CssBaseline />
            <ServerProvider>
              <BrowserRouter>
                <Navigation />
              </BrowserRouter>
              <ErrorHandler />
              <NativeInterface />
            </ServerProvider>
          </AppThemeProvider>
        </StyledEngineProvider>
      </LocalizationProvider>
    </Provider>
  </ErrorBoundary>,
);
