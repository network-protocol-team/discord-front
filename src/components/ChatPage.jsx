import '../styles/ChatPage.scss';

import { useNavigate, useParams } from 'react-router-dom';
import ChatList from './ChatList';
import ChatRoom from './ChatRoom';
import { useEffect } from 'react';
import { useChatStore, useTempStore } from '../data/store';
import { axiosApi } from '../utils/axios';
import { getCookie } from '../utils/cookie';
import { useEject } from '../hooks/users';

export default function ChatPage() {
  const { channelId } = useParams();
  const eject = useEject();

  const userId = useChatStore((state) => state.userId);
  const channels = useChatStore((state) => state.channels);
  const setChannels = useChatStore((state) => state.setChannels);
  const setSelectedId = useChatStore((state) => state.setSelectedId);
  const setSelectedChatRoom = useChatStore(
    (state) => state.setSelectedChatRoom,
  );

  const fetchTriggered = useTempStore((state) => state.triggered);

  // 쿠키가 적절하게 박혀 있는지 확인
  useEffect(() => {
    if (userId !== getCookie('userId')) {
      // 잘못된 쿠키면 추방
      eject();
    }
  }, [userId]);

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
        const { channelList } = result;
        setChannels(channelList);
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
