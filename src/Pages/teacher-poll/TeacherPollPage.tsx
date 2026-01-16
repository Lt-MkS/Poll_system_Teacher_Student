import { FC } from "react";
import "bootstrap/dist/css/bootstrap.min.css";
import ChatPopover from "../../components/chat/ChatPopover.jsx";
import { useNavigate } from "react-router-dom";
import eyeIcon from "../../assets/eye.svg";
import { useSocket, useTeacherPollRecovery } from "../../hooks/usePoll";
import { showSuccess, showError, showWarning, Toaster } from "../../utils/toast";

const TeacherPollPage: FC = () => {
  const navigate = useNavigate();
  const { socket, isConnected } = useSocket();

  const {
    pollQuestion,
    pollOptions,
    votes,
    totalVotes,
    isLoading,
    pollId
  } = useTeacherPollRecovery(socket);

  const handleViewPollHistory = (): void => {
    navigate("/teacher-poll-history");
  };

  const askNewQuestion = (): void => {
    if (!isConnected) {
      showError("Connection lost. Please check your internet connection.");
      return;
    }

    navigate("/teacher-home-page");
  };

  const calculatePercentage = (count: number): number => {
    if (totalVotes === 0) return 0;
    return (count / totalVotes) * 100;
  };

  if (isLoading) {
    return (
      <div className="d-flex justify-content-center align-items-center vh-100">
        <div className="text-center">
          <div className="spinner-border" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <h3 className="mt-3">Loading poll state...</h3>
        </div>
      </div>
    );
  }

  return (
    <>
      <Toaster />
      <button
        className="btn rounded-pill ask-question poll-history px-4 m-2"
        onClick={handleViewPollHistory}
      >
        <img src={eyeIcon} alt="" />
        View Poll history
      </button>
      <br />
      <div className="container mt-5 w-50">
        <h3 className="mb-4 text-center">Poll Results</h3>

        {pollQuestion && (
          <>
            <div className="card">
              <div className="card-body">
                <h6 className="question py-2 ps-2 text-left rounded text-white">
                  {pollQuestion} ?
                </h6>
                <div className="list-group mt-4">
                  {pollOptions.map((option) => (
                    <div
                      key={option.id}
                      className="list-group-item rounded m-2"
                    >
                      <div className="d-flex justify-content-between align-items-center">
                        <span>{option.text}</span>
                        <span>
                          {Math.round(
                            calculatePercentage(votes[option.text] || 0)
                          )}
                          %
                        </span>
                      </div>
                      <div className="progress mt-2">
                        <div
                          className="progress-bar progress-bar-bg"
                          role="progressbar"
                          style={{
                            width: `${calculatePercentage(
                              votes[option.text] || 0
                            )}%`,
                          }}
                          aria-valuenow={votes[option.text] || 0}
                          aria-valuemin={0}
                          aria-valuemax={100}
                        ></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div>
              <button
                className="btn rounded-pill ask-question px-4 m-2"
                onClick={askNewQuestion}
                disabled={!isConnected}
              >
                + Ask a new question
              </button>
            </div>
          </>
        )}

        {!pollQuestion && (
          <div className="text-muted">
            Waiting for the first poll to start...
          </div>
        )}
        <ChatPopover />
      </div>
    </>
  );
};

export default TeacherPollPage;
