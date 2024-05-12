import '../styles/ChatPage.scss';

import { useParams } from 'react-router-dom';
import ChatList from './ChatList';
import ChatRoom from './ChatRoom';

export default function ChatPage() {
  const { channelId } = useParams();
  console.log(channelId);
  return (
    <main className="chat-wrapper">
      <ChatList />
      <ChatRoom channelId={channelId} />
    </main>
  );
}
