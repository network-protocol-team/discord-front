import { useNavigate } from 'react-router-dom';
import '../styles/JoinPage.scss';
import SportsEsportsIcon from '@mui/icons-material/SportsEsports';
import { useRef, useState } from 'react';
import { useChatStore } from '../data/store';
import { axiosApi } from '../utils/axios';

export default function JoinPage() {
  const inputRef = useRef();
  const [errorMessage, setErrorMessage] = useState('');

  const setNickName = useChatStore((state) => state.setNickName);
  const setUserId = useChatStore((state) => state.setUserId);

  const navigation = useNavigate();
  const login = (e) => {
    // TODO: 서버로 로그인 요청 보내고 응답 대기
    const nickName = inputRef.current.value;

    const data = { nickName };

    // 로그인
    axiosApi
      .post(`/users`, data)
      .then((res) => res.data)
      .then(({ code, message, result }) => {
        if (code === '200' || code === 200) {
          console.log('로그인 성공!');

          // 서버 측에서 검증된 닉네임으로 고정
          setNickName(result.nickName);
          setUserId(result.userId);

          // 성공하면 메인 페이지로 이동
          navigation('/channels');
        } else {
          // 서버에서 받은 에러 메세지로 예외를 발생한다.
          throw new Error(message);
        }
      })
      .catch((err) => {
        // 실패 시 에러 메세지 설정
        setErrorMessage(err.message);
      });

    e.preventDefault();
  };

  // 재렌더링 방지를 위해 input을 ref로 설정
  const handleInputChange = (e) => {
    inputRef.current.value = e.target.value;
  };

  return (
    <>
      <main className="start-page">
        <div className="start-info-wrapper">
          <SportsEsportsIcon className="icon" sx={{ fontSize: '64px' }} />
          <header>
            <h1>Thiscord에 어서오세요!</h1>
            <p>시작하기 앞서 채팅에 사용할 닉네임을 입력해야 해요.</p>
          </header>
          <form onSubmit={login}>
            <p className="desc">닉네임</p>
            <input
              className="full"
              autoFocus
              ref={inputRef}
              onChange={handleInputChange}
              defaultValue=""
            />
            <button type="submit" className="submit">
              로그인
            </button>
            {errorMessage !== '' ? (
              <p className="error-text">{errorMessage}</p>
            ) : (
              <></>
            )}
          </form>
        </div>
      </main>
    </>
  );
}
