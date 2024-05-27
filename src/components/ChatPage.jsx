import '../styles/ChatPage.scss';

import { useParams } from 'react-router-dom';
import ChatList from './ChatList';
import ChatRoom from './ChatRoom';
import { useEffect } from 'react';
import { useChatStore, useTempStore } from '../data/store';
import { axiosApi } from '../utils/axios';
import { useCookies } from 'react-cookie';

export default function ChatPage() {
  const { channelId } = useParams();
  const [cookies] = useCookies(['userId']);
  const channels = useChatStore((state) => state.channels);
  const setChannels = useChatStore((state) => state.setChannels);
  const setSelectedId = useChatStore((state) => state.setSelectedId);
  const setSelectedChatRoom = useChatStore(
    (state) => state.setSelectedChatRoom,
  );

  const fetchTriggered = useTempStore((state) => state.triggered);

  useEffect(() => {
    console.log('cookie: ', cookies.userId);
  }, [cookies]);

  // 이 부분에 추가
  useEffect(() => {
    if (channelId === undefined) return;

    const currRoom = channels.find(
      ({ channelId: id }) => `${id}` === channelId,
    );

    setSelectedId(channelId);
    setSelectedChatRoom(currRoom);
  }, [channelId, setSelectedChatRoom, setSelectedId, channels]);

  // 채팅방 정보 받아오기
  useEffect(() => {
    // GET 요청
    axiosApi
      .get(`/channels`)
      .then((res) => res.data)
      .then(({ code, message, result }) => {
        if (code !== 200) {
          throw new Error(message);
        }

        // 성공하면 서버에서 받아온 channel 들로 등록
        const { channels } = result;
        setChannels(channels);
      })
      .catch((err) => console.error(err));
  }, [setChannels, channelId, fetchTriggered]);

  return (
    <main className="chat-wrapper">
      <ChatList />
      <ChatRoom channelId={channelId} />
    </main>
  );
}
