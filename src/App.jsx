import './styles/App.scss';
import { Routes, Route, BrowserRouter, Navigate } from 'react-router-dom';
import ChatPage from './components/ChatPage';
import JoinPage from './components/JoinPage';
import * as encoding from 'text-encoding';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route exact path="/" element={<Navigate replace to="/users" />} />
        <Route path="/users" element={<JoinPage />} />
        <Route path="/channels" element={<ChatPage />}>
          <Route path=":channelId" element={<ChatPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
