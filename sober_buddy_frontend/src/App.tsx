import { AuthProvider } from './shared/context/AuthContext';
import { RouterProvider } from './shared/context/RouterContext';
import { AppRouter } from './routes/AppRouter';
import en from './shared/i18n/en.json';

function App() {
  return (
    <>
      <a href="#main-content" className="skip-link">
        {en.app_skip_link}
      </a>
      <AuthProvider>
        <RouterProvider>
          <AppRouter />
        </RouterProvider>
      </AuthProvider>
    </>
  );
}

export default App;
