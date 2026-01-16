import React, { FC, useState } from "react";
import "bootstrap/dist/css/bootstrap.min.css";
import "./StudentPollPage.css";
import stopwatch from "../../assets/stopwatch.svg";
import ChatPopover from "../../components/chat/ChatPopover.jsx";
import { useNavigate } from "react-router-dom";
import stars from "../../assets/spark.svg";
import { 
  useSocket, 
  usePollTimer, 
  useStudentPollRecovery 
} from "../../hooks/usePoll";
import { showSuccess, showError, Toaster } from "../../utils/toast";

const StudentPollPage: FC = () => {
  const navigate = useNavigate();
  const username = sessionStorage.getItem("username");
  const { socket, isConnected } = useSocket();

  // Use enhanced hook for state recovery
  const {
    pollQuestion,
    pollOptions,
    votes,
    timeLeft,
    pollId,
    submitted,
    setSubmitted,
    isLoading,
    serverStartedAt
  } = useStudentPollRecovery(socket, username);

  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [kickedOut, setKickedOut] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Use custom hook for timer with server synchronization
  usePollTimer(timeLeft, () => {
    setSubmitted(true);
  }, serverStartedAt);

  const totalVotes = Object.values(votes).reduce((a: number, b: number) => a + b, 0);

  const handleOptionSelect = (option: string): void => {
    if (!submitted && timeLeft > 0) {
      setSelectedOption(option);
    }
  };

  const handleSubmit = (): void => {
    if (!selectedOption) {
      showError("Please select an option before submitting.");
      return;
    }

    if (!socket || !isConnected) {
      showError("Connection lost. Please check your internet connection.");
      return;
    }

    if (submitted) {
      showError("You have already voted in this poll.");
      return;
    }

    if (timeLeft <= 0) {
      showError("Time has expired for this poll.");
      return;
    }

    if (!username) {
      showError("Session error: Username not found.");
      return;
    }

    try {
      setIsSubmitting(true);
      
      // Send vote with validation
      socket.emit("submitAnswer", {
        username: username,
        option: selectedOption,
        pollId: pollId,
      }, (response: { success: boolean; message?: string }) => {
        setIsSubmitting(false);
        
        if (response.success) {
          setSubmitted(true);
          showSuccess("Your vote has been submitted!");
        } else {
          const errorMsg = response.message || "Failed to submit vote. Please try again.";
          showError(errorMsg);
        }
      });

      // Fallback timeout for acknowledgment
      setTimeout(() => {
        setIsSubmitting(false);
        if (!submitted) {
          setSubmitted(true);
        }
      }, 3000);

      // Cleanup not needed in try-catch, only in useEffect
    } catch (err) {
      setIsSubmitting(false);
      const errorMsg = err instanceof Error ? err.message : "Failed to submit vote.";
      showError(errorMsg);
    }
  };

  // Handle kicked out event
  React.useEffect(() => {
    if (!socket) return;

    const handleKickedOut = (): void => {
      setKickedOut(true);
      sessionStorage.removeItem("username");
      setTimeout(() => navigate("/kicked-out"), 500);
    };

    socket.on("kickedOut", handleKickedOut);

    return () => {
      socket.off("kickedOut", handleKickedOut);
    };
  }, [socket, navigate]);

  const calculatePercentage = (count: number): number => {
    if (totalVotes === 0) return 0;
    return (count / totalVotes) * 100;
  };

  if (isLoading) {
    return (
      <div className="d-flex justify-content-center align-items-center vh-100 w-75 mx-auto">
        <div className="student-landing-container text-center">
          <button className="btn btn-sm intervue-btn mb-5">
            <img src={stars} className="px-1" alt="" />
            Intervue Poll
          </button>
          <br />
          <div className="spinner-border text-center spinner" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <h3 className="landing-title">
            <b>Loading poll state...</b>
          </h3>
        </div>
      </div>
    );
  }

  return (
    <>
      <Toaster />
      <ChatPopover />
      {kickedOut ? (
        <div className="d-flex justify-content-center align-items-center vh-100">
          <div className="text-center">
            <h2>You have been kicked out</h2>
            <p>The teacher has removed you from this poll session.</p>
          </div>
        </div>
      ) : (
        <>
          {pollQuestion === "" && timeLeft === 0 && !isLoading && (
            <div className="d-flex justify-content-center align-items-center vh-100 w-75 mx-auto">
              <div className="student-landing-container text-center">
                <button className="btn btn-sm intervue-btn mb-5">
                  <img src={stars} className="px-1" alt="" />
                  Intervue Poll
                </button>
                <br />
                <div className="spinner-border text-center spinner" role="status">
                  <span className="visually-hidden">Loading...</span>
                </div>
                <h3 className="landing-title">
                  <b>Wait for the teacher to ask questions..</b>
                </h3>
              </div>
            </div>
          )}
          {pollQuestion !== "" && (
            <div className="container mt-5 w-50">
              <div className="d-flex align-items-center mb-4">
                <h5 className="m-0 pe-5">Question</h5>
                <img
                  src={stopwatch}
                  width="15px"
                  height="auto"
                  alt="Stopwatch"
                />
                <span className="ps-2 ml-2 text-danger">{timeLeft}s</span>
              </div>
              <div className="card">
                <div className="card-body">
                  <h6 className="question py-2 ps-2 float-left rounded text-white">
                    {pollQuestion}?
                  </h6>
                  <div className="list-group mt-4">
                    {pollOptions.map((option) => (
                      <div
                        key={option.id}
                        className={`list-group-item rounded m-1 ${
                          selectedOption === option.text
                            ? "border option-border"
                            : ""
                        }`}
                        style={{
                          padding: "10px",
                          cursor:
                            submitted || timeLeft === 0
                              ? "not-allowed"
                              : "pointer",
                        }}
                        onClick={() => handleOptionSelect(option.text)}
                      >
                        <div className="d-flex justify-content-between align-items-center">
                          <span
                            className={`ml-2 text-left ${
                              submitted ? "font-weight-bold" : ""
                            }`}
                          >
                            {option.text}
                          </span>
                          {submitted && (
                            <span className="text-right">
                              {Math.round(
                                calculatePercentage(votes[option.text] || 0)
                              )}
                              %
                            </span>
                          )}
                        </div>
                        {submitted && (
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
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {!submitted && selectedOption && timeLeft > 0 && (
                <div className="d-flex justify-content-end align-items-center">
                  <button
                    type="submit"
                    className="btn continue-btn my-3 w-25"
                    onClick={handleSubmit}
                    disabled={isSubmitting || !isConnected}
                  >
                    {isSubmitting ? "Submitting..." : "Submit"}
                  </button>
                </div>
              )}

              {submitted && (
                <div className="mt-5">
                  <h6 className="text-center">
                    Wait for the teacher to ask a new question...
                  </h6>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </>
  );
};

export default StudentPollPage;
