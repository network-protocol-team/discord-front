import '../styles/ChatPage.scss';

import { useParams } from 'react-router-dom';
import ChatList from './ChatList';
import ChatRoom from './ChatRoom';
import { useEffect } from 'react';
import { useChatStore } from '../data/store';
import { chatRooms } from '../data/mockChat';

export default function ChatPage() {
  const { channelId } = useParams();
  const setSelectedId = useChatStore((state) => state.setSelectedId);
  const setSelectedChatRoom = useChatStore(
    (state) => state.setSelectedChatRoom,
  );

  useEffect(() => {
    if (channelId === undefined) return;

    const currRoom = chatRooms.find(({ channelId: id }) => id === channelId);

    setSelectedId(channelId);
    setSelectedChatRoom(currRoom);
  }, [channelId, setSelectedChatRoom, setSelectedId]);

  return (
    <main className="chat-wrapper">
      <ChatList />
      <ChatRoom channelId={channelId} />
    </main>
  );
}
