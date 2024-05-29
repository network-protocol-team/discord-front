import VideocamIcon from '@mui/icons-material/Videocam';
import VideocamOffIcon from '@mui/icons-material/VideocamOff';
import MicIcon from '@mui/icons-material/Mic';
import MicOffIcon from '@mui/icons-material/MicOff';
import CallEndIcon from '@mui/icons-material/CallEnd';
import { useChatStore } from '../data/store';
import { Client } from '@stomp/stompjs';
import { useEffect, useReducer, useRef, useState } from 'react';
import { parseMessage, sendToServer } from '../utils/socket';
import { Timer, sleep } from '../utils/common';
import { Exception } from 'sass';
import { useNavigate, useParams } from 'react-router-dom';

export default function VideoChatRoom() {
  const navigation = useNavigate();
  const setSelectedId = useChatStore((state) => state.setSelectedId);

  // 채널 id 변경해서 나간 사람들 강제 제거하기 위한 임시 state
  const [willDeleteOutUser, forceDeleteOutUser] = useReducer((n) => n + 1, 0);

  // timer init
  const timer = new Timer(1000);

  // 소켓은 ref 로 관리
  const videoSocket = useRef(null);
  const localVideoRef = useRef(null);
  const localStreamRef = useRef(null);

  const selectedId = useChatStore((state) => state.selectedId);
  const nickName = useChatStore((state) => state.nickName);
  const userKey = nickName;

  const [remoteStreams, setRemoteStreams] = useState({});
  const [isCameraOn, setIsCameraOn] = useState(true);
  const [isMicOn, setIsMicOn] = useState(true);
  const [isLocalStreamLoaded, setIsLocalStreamLoaded] = useState(false);
  const [outUsers, setOutUsers] = useState([]);

  const otherUsers = useRef({});
  const isNew = useRef(true);

  // videoSocket 용 signaling 서버로 보내는 함수
  const sendToVideoServer = sendToServer(videoSocket);

  const configuration = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
    ],
  };

  const startLocalStream = async () => {
    try {
      localStreamRef.current = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { min: 10, ideal: 360, max: 360 },
          height: { min: 10, ideal: 270, max: 270 },
          frameRate: { ideal: 15 },
        },
        audio: true,
      });
      localVideoRef.current.srcObject = localStreamRef.current;

      setIsLocalStreamLoaded(true);
    } catch (err) {
      console.error('Error accessing local media:', err);
    }
  };

  const connectVideoSocket = () => {
    const camKey = nickName;

    videoSocket.current = new Client({
      brokerURL: import.meta.env.VITE_SOCK_URL,
      debug: (str) => {
        // console.log(str);
      },
      reconnectDelay: 5000, // 자동 재 연결
      heartbeatIncoming: 4000,
      heartbeatOutgoing: 4000,

      onConnect: () => {
        console.log('Connected to video webSocket');
        // subscribe api 작성

        videoSocket.current.subscribe(
          `/sub/channels/${selectedId}/video/offer/${camKey}`,
          onOffer,
        );
        videoSocket.current.subscribe(
          `/sub/channels/${selectedId}/video/answer/${camKey}`,
          onAnswer,
        );
        videoSocket.current.subscribe(
          `/sub/channels/${selectedId}/video/ice-candidate/${camKey}`,
          onCandidate,
        );
        videoSocket.current.subscribe(
          `/sub/channels/${selectedId}/receive-other`,
          onOthers,
        );
      },
      onDisconnect: () => {
        console.log('Disconnected from video webSocket');
      },
      onStompError: (frame) => {
        console.error(frame);
      },
    });
    videoSocket.current.activate();
  };

  // 나간 유저 찾기
  const findOutUsers = (userKeys) => {
    const users = [];

    for (const key of Object.keys(otherUsers.current)) {
      if (!userKeys.has(key)) users.push(key);
    }

    return users;
  };

  // subscriber 함수 정의

  const onOffer = async (message) => {
    const data = parseMessage(message);
    const { sender, offer } = data;

    // 자기 자신이 보낸 offer은 무시
    if (sender === nickName) return;

    // 보낸 사람(신규 유저)의 이름으로 rtc peer 만듦
    const peerConnection = createPeerConnection(sender);

    // 기존에 설정한 peer 을 덮어쓰기
    otherUsers.current = {
      ...otherUsers.current,
      [sender]: peerConnection,
    };

    // remote description 에 추가
    peerConnection.setRemoteDescription(offer);

    // answer 생성 후 local description 에 추가
    const answer = await peerConnection.createAnswer();
    peerConnection.setLocalDescription(answer);

    // answer 보내기
    sendAnswer(sender, answer);
  };

  const onAnswer = async (message) => {
    const data = parseMessage(message);
    const { sender, answer } = data;

    if (otherUsers.current[sender] === undefined) {
      throw new Exception('없는 사용자로부터 answer를 받았습니다.');
    }

    // 보낸 사람(기존 유저)의 rtc peer에 remote description 추가
    const peerConnection = otherUsers.current[sender];

    // 기존에 설정한 peer 을 덮어쓰기
    otherUsers.current = {
      ...otherUsers.current,
      [sender]: peerConnection,
    };

    peerConnection.setRemoteDescription(answer);
  };

  const onCandidate = async (message) => {
    const data = parseMessage(message);
    const { sender, iceCandidate } = data;

    // rtc peer를 바로 가져옴
    const peerConnection = otherUsers.current[sender];

    if (peerConnection === undefined) return;

    // iceCandidate 를 등록해줌
    await peerConnection.addIceCandidate(new RTCIceCandidate(iceCandidate));
  };

  const onOthers = async (message) => {
    // 다른 사람들의 정보를 받음
    const data = parseMessage(message);
    const { userKeys } = data;

    const userKeySet = new Set(userKeys);

    // 나간 유저 제거
    setOutUsers(findOutUsers(userKeySet));

    // 새로 들어온 사람만 offer 보내기
    if (isNew.current) {
      // local stream 갱신을 위한 io-bound job 수행
      timer.reset();
      await timer.start();

      // timer 가 중간에 abort 되면 중단
      if (timer.isAborted) return;

      await Promise.all(
        userKeys.map(async (receiver) => {
          if (receiver === nickName) return;
          return await sendOffer(receiver);
        }),
      );

      isNew.current = false;
    }
  };

  // publisher 함수 정의

  // 현재 유저(신규 가입자; nickName)가 다른 유저(receiver)에게 offer 보냄
  const sendOffer = async (receiver) => {
    // 상대방을 나타내는 RTC peer 생성
    const peerConnection = createPeerConnection(receiver);

    // 기존에 설정한 peer 을 덮어쓰기
    otherUsers.current = {
      ...otherUsers.current,
      [receiver]: peerConnection,
    };

    const offer = await peerConnection.createOffer();
    peerConnection.setLocalDescription(offer);

    sendToVideoServer(`/pub/channels/${selectedId}/video/offer/${receiver}`, {
      sender: nickName,
      channelId: selectedId,
      userKey,
      offer,
    });
  };

  // 기존 유저가 신규 유저에게 answer 보냄
  const sendAnswer = (receiver, answer) => {
    sendToVideoServer(`/pub/channels/${selectedId}/video/answer/${receiver}`, {
      sender: nickName,
      channelId: selectedId,
      userKey,
      answer,
    });
  };

  const joinUser = () => {
    sendToVideoServer(`/pub/channels/${selectedId}/send-me`, {
      sender: nickName,
      channelId: selectedId,
      userKey,
      state: 'join',
    });
  };

  const outUser = () => {
    sendToVideoServer(`/pub/channels/${selectedId}/send-me`, {
      sender: nickName,
      channelId: selectedId,
      userKey,
      state: 'out',
    });
  };

  // webRTC 관련 함수 정의

  const createPeerConnection = (targetId) => {
    const peerConnection = new RTCPeerConnection(configuration);

    peerConnection.onicecandidate = (event) => {
      if (!event.candidate) return;

      sendToVideoServer(
        `/pub/channels/${selectedId}/video/ice-candidate/${targetId}`,
        {
          sender: nickName,
          channelId: selectedId,
          userKey,
          iceCandidate: event.candidate,
        },
      );
    };

    peerConnection.ontrack = (event) => {
      setRemoteStreams((prevStreams) => ({
        ...prevStreams,
        [targetId]: event.streams[0],
      }));
      forceDeleteOutUser();
    };

    localStreamRef.current?.getTracks().forEach((track) => {
      peerConnection.addTrack(track, localStreamRef.current);
    });

    return peerConnection;
  };

  const endCall = () => {
    // 카메라, 마이크 off
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => {
        console.log(track);
        track.stop();
      });
      localStreamRef.current = null;
    }
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = null;
    }

    // state reset
    setIsCameraOn(true);
    setIsMicOn(true);

    setIsLocalStreamLoaded(false);
    isNew.current = true;

    try {
      outUser();
    } catch {
      //
    }

    // 연결한 rtc peer 들 해제
    Object.values(otherUsers.current).forEach((peerConnection) =>
      peerConnection.close(),
    );
    otherUsers.current = {};

    // 소켓 닫기
    videoSocket.current.deactivate();
  };

  const init = async () => {
    // 이미 소켓이 있으면 정리해준다
    if (videoSocket.current && videoSocket.current.connected) {
      endCall();
      await sleep(1000);
    }

    timer.abort(); // 타이머 중지

    startLocalStream(); // 카메라, 마이크 on
    connectVideoSocket(); // 소켓 연결

    // selectedId 변경 시 remoteStreams 초기화
    setRemoteStreams({});
    otherUsers.current = {};
  };

  // 소켓 activate 및 deactivate
  useEffect(() => {
    init();
    // component unmount 시 소켓 정리
    return () => {
      if (videoSocket.current && videoSocket.current.connected) {
        endCall();
      }
    };
  }, [selectedId]);

  useEffect(() => {
    if (isLocalStreamLoaded) {
      // 먼저 채널에 접속했음을 알린다.

      joinUser();
    }
  }, [isLocalStreamLoaded]);

  useEffect(() => {
    const tempRemoteStreams = { ...remoteStreams };
    const tempOtherUsers = { ...otherUsers.current };
    outUsers.forEach((user) => {
      delete tempRemoteStreams[user];
      delete tempOtherUsers[user];
    });

    otherUsers.current = tempOtherUsers;
    setRemoteStreams(tempRemoteStreams);
  }, [outUsers, willDeleteOutUser]);

  const toggleCamera = () => {
    const videoTrack = localStreamRef.current
      ?.getVideoTracks()
      .find((track) => track.kind === 'video');
    if (videoTrack) {
      videoTrack.enabled = !videoTrack.enabled;
      setIsCameraOn(videoTrack.enabled);
    }
  };

  const toggleMic = () => {
    const audioTrack = localStreamRef.current
      ?.getAudioTracks()
      .find((track) => track.kind === 'audio');
    if (audioTrack) {
      audioTrack.enabled = !audioTrack.enabled;
      setIsMicOn(audioTrack.enabled);
    }
  };

  return (
    <div className="video-chat-wrapper">
      <div className="video-grid">
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <span>나 ({nickName})</span>
          <video
            className="video-p2p"
            ref={localVideoRef}
            autoPlay
            playsInline
            muted
            style={{ width: '300px', marginRight: '20px' }}
          />
        </div>
        {Object.entries(remoteStreams).map(([peerId, stream]) => {
          return (
            <div
              key={peerId}
              style={{
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              <span>{peerId}</span>
              <video
                ref={(video) => {
                  if (video) video.srcObject = stream;
                }}
                className="video-p2p"
                autoPlay
                playsInline
                style={{ width: '300px', marginRight: '20px' }}
              />
            </div>
          );
        })}
      </div>
      <div className="video-buttons">
        <button
          className={`camera ${isCameraOn ? 'active' : ''}`}
          onClick={toggleCamera}
        >
          {isCameraOn ? <VideocamIcon /> : <VideocamOffIcon />}
        </button>
        <button
          className={`mic ${isMicOn ? 'active' : ''}`}
          onClick={toggleMic}
        >
          {isMicOn ? <MicIcon /> : <MicOffIcon />}
        </button>
        <button
          className="end"
          onClick={() => {
            endCall();
            navigation('/channels');
            // 다시 채널 불러오도록 하기
            setSelectedId('');
          }}
        >
          <CallEndIcon />
        </button>
      </div>
    </div>
  );
}
