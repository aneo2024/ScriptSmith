import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ConfigProvider, App as AntdApp } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import AppLayout from './components/Layout';
import AuthGuard from './components/AuthGuard';
import DashboardPage from './pages/DashboardPage';
import NovelInputPage from './pages/NovelInputPage';
import EditorPage from './pages/EditorPage';
import WorkListPage from './pages/WorkListPage';
import WorkDetailPage from './pages/WorkDetailPage';
import CreateWorkPage from './pages/CreateWorkPage';
import CharacterProfilePage from './pages/CharacterProfilePage';
import InspirationPage from './pages/InspirationPage';
import ArticleDetailPage from './pages/ArticleDetailPage';
import SettingsPage from './pages/SettingsPage';
import LoginPage from './pages/LoginPage';
import { TaskProvider } from './hooks/useTask';
import { AuthProvider } from './hooks/useAuth';

function AppRoutes() {
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
                <Route path="/" element={<DashboardPage />} />
                <Route path="/works" element={<WorkListPage />} />
                <Route path="/works/:id" element={<WorkDetailPage />} />
                <Route path="/works/:id/character/:index" element={<CharacterProfilePage />} />
                <Route path="/create-work" element={<CreateWorkPage />} />
                <Route path="/editor" element={<EditorPage />} />
                <Route path="/inspiration" element={<InspirationPage />} />
                <Route path="/inspiration/article/:id" element={<ArticleDetailPage />} />
                <Route path="/novel-input" element={<NovelInputPage />} />
                <Route path="/settings" element={<SettingsPage />} />
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
    <ConfigProvider locale={zhCN} theme={{ token: { colorPrimary: '#3a6b28' } }}>
      <AntdApp>
        <AuthProvider>
          <TaskProvider>
            <BrowserRouter>
              <AppRoutes />
            </BrowserRouter>
          </TaskProvider>
        </AuthProvider>
      </AntdApp>
    </ConfigProvider>
  );
}

export default App;
