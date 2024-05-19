import CameraAltIcon from '@mui/icons-material/CameraAlt';
import MicIcon from '@mui/icons-material/Mic';
import CallEndIcon from '@mui/icons-material/CallEnd';
import { useChatStore, useSocketStore } from '../data/store';
import SockJS from 'sockjs-client';
import { Client } from '@stomp/stompjs';
import { useCallback, useEffect } from 'react';

export default function VideoChatRoom() {
  const videoSocket = useSocketStore((state) => state.videoSocket);
  const setVideoSocket = useSocketStore((state) => state.setVideoSocket);

  const selectedId = useChatStore((state) => state.selectedId);
  const nickName = useChatStore((state) => state.nickName);

  const connectVideoSocket = useCallback(() => {
    const socket = new SockJS(import.meta.env.VITE_SOCK_URL);
    const camKey = nickName;
    setVideoSocket(
      new Client({
        webSocketFactory: () => socket,
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

          // TODO: publish 로직 작성
        },
        onDisconnect: () => {
          console.log('Disconnected from video webSocket');
        },
      }),
    );
    videoSocket.activate();
  }, [selectedId, nickName, videoSocket, setVideoSocket]);

  const onOffer = () => {};
  const sendOffer = () => {};
  const onAnswer = () => {};
  const sendAnswer = () => {};
  const onCandidate = () => {};
  const sendCandidate = () => {};
  const onMembers = () => {};
  const sendMembers = () => {};
  const onOthers = () => {};
  const sendSelf = () => {};
  const endCall = () => {};

  useEffect(() => {
    connectVideoSocket();
    return () => {
      endCall();
    };
  }, []);

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
