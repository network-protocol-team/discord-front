import CameraAltIcon from '@mui/icons-material/CameraAlt';
import MicIcon from '@mui/icons-material/Mic';
import CallEndIcon from '@mui/icons-material/CallEnd';
import { useChatStore } from '../data/store';
import SockJS from 'sockjs-client';
import { Client } from '@stomp/stompjs';
import { useEffect, useRef, useState } from 'react';
import { sendToServer } from '../utils/socket';

export default function VideoChatRoom() {
  // 소켓은 ref 로 관리
  const videoSocket = useRef(null);

  const selectedId = useChatStore((state) => state.selectedId);
  const nickName = useChatStore((state) => state.nickName);

  const [otherUsers, setOtherUsers] = useState(new Map());

  // videoSocket 용 signaling 서버로 보내는 함수
  const sendToVideoServer = sendToServer(videoSocket.current);

  const connectVideoSocket = () => {
    const socket = new SockJS(import.meta.env.VITE_SOCK_URL);
    const camKey = nickName;
    videoSocket.current = new Client({
      webSocketFactory: () => socket,
      // brokerURL: 'ws://localhost:8000/ws',
      onConnect: () => {
        console.log('Connected to video webSocket');

        // subscribe api 작성

        videoSocket.subscribe(
          `/sub/channels/${selectedId}/video/offer/${camKey}`,
          onOffer,
        );
        videoSocket.subscribe(
          `/sub/channels/${selectedId}/video/answer/${camKey}`,
          onAnswer,
        );
        videoSocket.subscribe(
          `/sub/channels/${selectedId}/video/ice-candidate/${camKey}`,
          onCandidate,
        );
        videoSocket.subscribe(
          `/sub/channels/${selectedId}/video/call-members`,
          onMembers,
        );
        videoSocket.subscribe(
          `/sub/channels/${selectedId}/video/receive-other`,
          onOthers,
        );

        // 먼저 채널에 접속했음을 알린다.
        callMembers();
      },
      onDisconnect: () => {
        console.log('Disconnected from video webSocket');
      },
    });
    videoSocket.current.activate();
  };

  // subscriber 함수 정의
  const onOffer = (message) => {};
  const onAnswer = (message) => {};
  const onCandidate = (message) => {};
  const onMembers = (message) => {
    console.log(`sub: call-member to ${nickName}`);

    // 누군가 접속했다고 하면 자신의 정보를 준다.
    sendMe();
  };
  const onOthers = (message) => {
    // 다른 사람들의 정보를 받음

    const data = JSON.parse(message.body);
    const { sender, channelId, userKey } = data;

    if (channelId !== selectedId) {
      throw new Error('잘못된 채팅방으로부터 요청이 날아왔습니다.');
    }

    // 자기 자신의 이름을 받으면 무시
    if (sender === nickName) return;

    // 다른 사람을 리스트에 추가
    // TODO: Map 으로 관리
    setOtherUsers((prev) => [...prev, sender]);
  };

  // publisher 함수 정의
  const sendOffer = () => {};
  const sendAnswer = () => {};
  const sendCandidate = () => {};
  const callMembers = () => {
    sendToVideoServer(`/pub/channels/${selectedId}/video/call-members`, {
      sender: nickName,
      channelId: selectedId,
    });
  };
  const sendMe = () => {
    sendToVideoServer(`/pub/channels/${selectedId}/send-me`, {
      sender: nickName,
      channelId: selectedId,
      userKey: nickName, // TODO: userKey 에 정확한 값 넣기
    });
  };

  const endCall = () => {};

  useEffect(() => {
    connectVideoSocket();
    return () => {
      endCall();
    };
  }, [selectedId]);

  return (
    <div className="video-chat-wrapper">
      <div className="video-grid">
        <VideoBox />
        <VideoBox />
        <VideoBox />
        <VideoBox />
        <VideoBox />
        <VideoBox />
      </div>
      <div className="video-buttons">
        <button className="camera">
          <CameraAltIcon />
        </button>
        <button className="mic">
          <MicIcon />
        </button>
        <button className="end">
          <CallEndIcon />
        </button>
      </div>
    </div>
  );
}

const VideoBox = () => {
  return <div className="video-box"></div>;
};

const calcVideoBoxSize = (num) => {
  const $videoGrid = document.querySelector('.video-grid');
  const maxHeight = 800;
  const maxWidth = getComputedStyle($videoGrid).width;
  const gap = 16;
  const ratio = 16 / 9;

  let height, width;
  for (let maxRow = 1; ; maxRow++) {
    height = (maxHeight - (maxRow - 1) * gap) / maxRow;
    width = ratio * height;
    const maxColumn = Math.ceil(num / maxRow);
    const res = maxColumn * width + (maxColumn - 1) * gap;

    if (res <= maxWidth) break;
  }

  return { height, width };
};
