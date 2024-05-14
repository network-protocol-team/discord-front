import { useEffect } from "react";
import { useParams } from "react-router-dom";
import { chatRooms } from "../data/mockChat";
import { useChatStore } from "../data/store";
import "../styles/ChatPage.scss";
import ChatList from "./ChatList";
import ChatRoom from "./ChatRoom";

export default function ChatPage() {
  const { channelId } = useParams();
  const setSelectedId = useChatStore((state) => state.setSelectedId);
  const setSelectedChatRoom = useChatStore(
    (state) => state.setSelectedChatRoom
  );
  // 이 부분에 추가
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
