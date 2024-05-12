import '../styles/JoinPage.scss';

export default function JoinPage() {
  return (
    <>
      <main className="start-page">
        <div className="start-info-wrapper">
          <i></i>
          <h1>Thiscord에 어서오세요!</h1>
          <p>시작하기 앞서 채팅에 사용할 닉네임을 입력해야 해요.</p>
          <form>
            <div className="nickname-wrapper">
              <p>닉네임</p>
              <input />
            </div>
            <button type="submit">로그인</button>
          </form>
        </div>
      </main>
    </>
  );
}
