import { useNavigate } from 'react-router-dom';
import '../styles/JoinPage.scss';
import SportsEsportsIcon from '@mui/icons-material/SportsEsports';

export default function JoinPage() {
  const navigation = useNavigate();
  const login = () => {
    // TODO: 서버로 로그인 요청 보내고 응답 대기
    navigation('/channels');
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
            <input className="full" autoFocus />
            <button type="submit" className="submit">
              로그인
            </button>
          </form>
        </div>
      </main>
    </>
  );
}
