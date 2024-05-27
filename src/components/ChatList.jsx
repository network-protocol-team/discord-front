import LogoutIcon from '@mui/icons-material/Logout';
import TagIcon from '@mui/icons-material/Tag';
import ProfileImage from '../assets/sample.png';
import MapsUgcIcon from '@mui/icons-material/MapsUgc';
import DeleteIcon from '@mui/icons-material/Delete';
import { useRef, useState } from 'react';
import { Modal } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useChatStore, useTempStore } from '../data/store';
import { axiosApi } from '../utils/axios';
import { useEject } from '../hooks/users';

export default function ChatList() {
  const navigation = useNavigate();
  const eject = useEject();

  const channels = useChatStore((state) => state.channels);
  const setChannels = useChatStore((state) => state.setChannels);
  const nickName = useChatStore((state) => state.nickName);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const inputRef = useRef();

  const openModal = () => {
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
  };

  const createRoom = (e) => {
    const channelName = inputRef.current.value;
    const data = { channelName };

    axiosApi
      .post(`/channels`, data)
      .then((res) => res.data)
      .then(({ code, message, result }) => {
        if (code !== 200) {
          throw new Error(message);
        }

        const { channelId, channelName } = result;

        // 성공하면 채팅방에 추가
        setChannels([...channels, { channelId, channelName }]);

        // 모달 닫기
        closeModal();

        // 새롭게 생성한 채팅방으로 이동
        navigation(`/channels/${channelId}`);
      })
      .catch((err) => console.error(err));

    e.preventDefault();
  };

  const logout = () => {
    // TODO: 쿠키 및 클라이언트 상태 삭제
    const isLogout = confirm('정말로 로그아웃 하시겠습니까?');

    if (!isLogout) return;

    eject();
  };

  const handleInputChange = (e) => {
    inputRef.current.value = e.target.value;
  };

  return (
    <>
      <Modal open={isModalOpen} onClose={closeModal}>
        <div className="modal-box">
          <header>
            <h1>새로운 채널 만들기</h1>
            <p>새롭게 만들 채널의 이름을 입력해주세요.</p>
          </header>
          <form onSubmit={createRoom}>
            <p className="desc">채널 이름</p>
            <input
              autoFocus
              className="full"
              ref={inputRef}
              onChange={handleInputChange}
              defaultValue=""
            />
            <button className="submit">채널 생성</button>
          </form>
        </div>
      </Modal>
      <div className="chat-list">
        <header>
          <h3>채널</h3>
          <MapsUgcIcon className="new-chat-button" onClick={openModal} />
        </header>
        <hr className="hr-light" />
        <ul>
          {channels &&
            channels.map(({ channelName, channelId }) => (
              <ChatListItem
                channelName={channelName}
                channelId={channelId}
                key={channelId}
              />
            ))}
        </ul>
        <footer>
          <img src={ProfileImage} alt="프로필 사진" />
          <p>{nickName}</p>
          <LogoutIcon onClick={logout} />
        </footer>
      </div>
    </>
  );
}

const ChatListItem = ({ channelName, channelId }) => {
  const navigate = useNavigate();
  const selectedId = useChatStore((state) => state.selectedId);
  const selectItem = (id) => {
    navigate(`/channels/${id}`);
  };

  const triggerFetch = useTempStore((state) => state.trigger);

  const deleteChannel = (e, id) => {
    e.stopPropagation();

    const isDelete = confirm(
      `정말로 채널 '${channelName}'을 삭제하시겠습니까?`,
    );

    if (!isDelete) return;

    // 채널 삭제 수행
    axiosApi
      .delete(`/channels/${id}`)
      .then((res) => res.data)
      .then(({ code, message }) => {
        if (code !== 200) {
          throw new Error(message);
        }

        // TODO: 소켓 연결 끊기

        // 지금 들어온 채팅방을 삭제하면 메인 페이지로 이동
        if (id === selectedId) {
          navigate('/channels');
        }
        // 그러지 않으면 유지
        else {
          navigate(`/channels/${selectedId}`);
        }

        // 다시 채널 불러오도록 하기
        triggerFetch();
      })
      .catch((err) => console.error(err));
  };

  return (
    <li
      onClick={() => selectItem(channelId)}
      className={selectedId === channelId ? 'active' : ''}
    >
      <TagIcon />
      <p>{channelName}</p>
      <DeleteIcon
        className="delete"
        onClick={(e) => deleteChannel(e, channelId)}
      />
    </li>
  );
};
