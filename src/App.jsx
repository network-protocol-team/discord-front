import './App.css';
import { Routes, Route, BrowserRouter } from 'react-router-dom';
import StartPage from './components/StartPage';
import ChatPage from './components/ChatPage';
import JoinPage from './components/JoinPage';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route exact path="/" element={<StartPage />} />
        <Route path="/users" element={<JoinPage />} />
        <Route path="/channels" element={<ChatPage />}>
          <Route path=":channelId" element={<ChatPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
