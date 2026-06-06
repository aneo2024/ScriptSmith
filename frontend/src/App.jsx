import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ConfigProvider } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import AppLayout from './components/Layout';
import AuthGuard from './components/AuthGuard';
import NovelInputPage from './pages/NovelInputPage';
import EditorPage from './pages/EditorPage';
import CharacterListPage from './pages/CharacterListPage';
import SceneListPage from './pages/SceneListPage';
import LoginPage from './pages/LoginPage';
import { TaskProvider } from './hooks/useTask';
import { AuthProvider, useAuth } from './hooks/useAuth';

function AppRoutes() {
  const { isLoggedIn } = useAuth();

  return (
    <Routes>
      <Route path="/login" element={
        isLoggedIn ? <Navigate to="/" replace /> : <LoginPage />
      } />
      {/* 受保护的路由 */}
      <Route path="/*" element={
        <AuthGuard>
          <AppLayout>
            <Routes>
              <Route path="/" element={<NovelInputPage />} />
              <Route path="/editor" element={<EditorPage />} />
              <Route path="/characters" element={<CharacterListPage />} />
              <Route path="/scenes" element={<SceneListPage />} />
              <Route path="*" element={<NovelInputPage />} />
            </Routes>
          </AppLayout>
        </AuthGuard>
      } />
    </Routes>
  );
}

function App() {
  return (
    <ConfigProvider locale={zhCN} theme={{ token: { colorPrimary: '#1677ff' } }}>
      <AuthProvider>
        <TaskProvider>
          <BrowserRouter>
            <AppRoutes />
          </BrowserRouter>
        </TaskProvider>
      </AuthProvider>
    </ConfigProvider>
  );
}

export default App;
