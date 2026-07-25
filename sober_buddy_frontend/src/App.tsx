import { AuthProvider } from './shared/context/AuthContext';
import { RouterProvider } from './shared/context/RouterContext';
import { AppRouter } from './routes/AppRouter';

function App() {
  return (
    <AuthProvider>
      <RouterProvider>
        <AppRouter />
      </RouterProvider>
    </AuthProvider>
  );
}

export default App;
