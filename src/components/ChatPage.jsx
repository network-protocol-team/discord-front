import '../styles/ChatPage.scss';
import { useParams, useNavigate } from 'react-router-dom';
import ChatList from './ChatList';
import ChatRoom from './ChatRoom';
import { useEffect } from 'react';
import { useChatStore, useTempStore } from '../data/store';
import { axiosApi } from '../utils/axios';

// 쿠키를 확인하는 유틸리티 함수
const getCookie = (name) => {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop().split(';').shift();
};

export default function ChatPage() {
  const { channelId } = useParams();
  const navigate = useNavigate(); // useNavigate 훅 사용
  const channels = useChatStore((state) => state.channels);
  const setChannels = useChatStore((state) => state.setChannels);
  const setSelectedId = useChatStore((state) => state.setSelectedId);
  const setSelectedChatRoom = useChatStore((state) => state.setSelectedChatRoom);

  const fetchTriggered = useTempStore((state) => state.triggered);

  // 페이지 로딩 시 쿠키가 없으면 /channels로 이동
  useEffect(() => {
    const userId = getCookie('userId');
    if (!userId) {
      //navigate('/users');
    }
  }, [navigate]);

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