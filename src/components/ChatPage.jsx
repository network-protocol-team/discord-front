import '../styles/ChatPage.scss';

import { useNavigate, useParams } from 'react-router-dom';
import ChatList from './ChatList';
import ChatRoom from './ChatRoom';
import { useEffect, useRef } from 'react';
import { useChatStore, useTempStore } from '../data/store';
import { axiosApi } from '../utils/axios';
import { getCookie } from '../utils/cookie';
import { useEject } from '../hooks/users';
import { Client } from '@stomp/stompjs';
import { parseMessage, sendToServer } from '../utils/socket';

export default function ChatPage() {
  const { channelId } = useParams();
  const navigate = useNavigate();
  const eject = useEject();

  // 채널 상태 관리 소켓
  const channelSocket = useRef(null);
  const sendToChannelServer = sendToServer(channelSocket);

  const userId = useChatStore((state) => state.userId);
  const channels = useChatStore((state) => state.channels);
  const selectedId = useChatStore((state) => state.selectedId);
  const setChannels = useChatStore((state) => state.setChannels);
  const setSelectedId = useChatStore((state) => state.setSelectedId);
  const setSelectedChatRoom = useChatStore(
    (state) => state.setSelectedChatRoom,
  );

  const fetchTriggered = useTempStore((state) => state.triggered);
  const triggerFetch = useTempStore((state) => state.trigger);

  const connectChannelSocket = () => {
    channelSocket.current = new Client({
      brokerURL: import.meta.env.VITE_SOCK_URL,
      debug: () => {},
      reconnectDelay: 5000, // 자동 재 연결
      heartbeatIncoming: 4000,
      heartbeatOutgoing: 4000,

      onConnect: () => {
        console.log('Connected to channel webSocket');
        // subscribe api 작성

        channelSocket.current.subscribe(
          `/sub/channels/manage`,
          onChannelChange,
        );
      },
      onDisconnect: () => {
        console.log('Disconnected from channel webSocket');
      },
      onStompError: (frame) => {
        console.error(frame);
      },
    });
    channelSocket.current.activate();
  };

  const onChannelChange = (message) => {
    const data = parseMessage(message);
    const { status } = data;

    if (status === 'delete') {
      const currRoom = channels.find(
        ({ channelId: id }) => `${id}` === channelId,
      );

      if (!currRoom) {
        navigate('/channels');
      }
    }

    triggerFetch();
  };

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

  useEffect(() => {
    connectChannelSocket();

    return () => {
      channelSocket.current.deactivate();
    };
  }, []);

  return (
    <main className="chat-wrapper">
      <ChatList publish={sendToChannelServer} />
      <ChatRoom channelId={channelId} />
    </main>
  );
}