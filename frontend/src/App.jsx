import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ConfigProvider } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import AppLayout from './components/Layout';
import AuthGuard from './components/AuthGuard';
import NovelInputPage from './pages/NovelInputPage';
import EditorPage from './pages/EditorPage';
import WorkListPage from './pages/WorkListPage';
import WorkDetailPage from './pages/WorkDetailPage';
import CreateWorkPage from './pages/CreateWorkPage';
import LoginPage from './pages/LoginPage';
import { TaskProvider } from './hooks/useTask';
import { AuthProvider, useAuth } from './hooks/useAuth';

function AppRoutes() {
  const { isLoggedIn } = useAuth();

  return (
    <Routes>
      <Route
        path="/login"
        element={<LoginPage />}
      />
      <Route
        path="/*"
        element={
          <AuthGuard>
            <AppLayout>
              <Routes>
                <Route path="/works" element={<WorkListPage />} />
                <Route path="/works/:id" element={<WorkDetailPage />} />
                <Route path="/create-work" element={<CreateWorkPage />} />
                <Route path="/" element={<Navigate to="/works" replace />} />
                <Route path="/editor" element={<EditorPage />} />
                <Route path="/novel-input" element={<NovelInputPage />} />
                <Route path="*" element={<WorkListPage />} />
              </Routes>
            </AppLayout>
          </AuthGuard>
        }
      />
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
