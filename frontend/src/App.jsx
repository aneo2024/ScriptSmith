import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ConfigProvider } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import AppLayout from './components/Layout';
import NovelInputPage from './pages/NovelInputPage';
import EditorPage from './pages/EditorPage';
import CharacterListPage from './pages/CharacterListPage';
import SceneListPage from './pages/SceneListPage';
import { TaskProvider } from './hooks/useTask';

function App() {
  return (
    <ConfigProvider locale={zhCN} theme={{ token: { colorPrimary: '#1677ff' } }}>
      <TaskProvider>
        <BrowserRouter>
          <AppLayout>
            <Routes>
              <Route path="/" element={<NovelInputPage />} />
              <Route path="/editor" element={<EditorPage />} />
              <Route path="/characters" element={<CharacterListPage />} />
              <Route path="/scenes" element={<SceneListPage />} />
              <Route path="*" element={<NovelInputPage />} />
            </Routes>
          </AppLayout>
        </BrowserRouter>
      </TaskProvider>
    </ConfigProvider>
  );
}

export default App;
