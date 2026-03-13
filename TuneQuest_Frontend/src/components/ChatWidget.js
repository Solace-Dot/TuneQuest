import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from '../styles/components/ChatWidget.module.css';

const FAQ_ITEMS = [
  {
    question: 'How often should I practice?',
    answer: 'Aim for 20-30 minutes a day, 4-5 days a week. Consistency beats marathon sessions.',
  },
  {
    question: 'How do I build a practice plan?',
    answer: 'Open Chat and tap "Make a Practice Plan?". TuneQuest will guide you based on your instrument and level.',
  },
  {
    question: 'Can I take quizzes for different skill levels?',
    answer: 'Yes. In the Quiz tab, ask for a quiz with a level like beginner, intermediate, or advanced.',
  },
  {
    question: 'What if I miss practice days?',
    answer: 'No problem. Resume with a shorter session and focus on one core skill to get momentum back quickly.',
  },
];

// 1. The Circular Toggle Icon - Fixed Positioning
const FloatingIcon = ({ isOpen, onClick, onMouseDown }) => (
  <button
    onClick={onClick}
    onMouseDown={onMouseDown}
    onTouchStart={onMouseDown}
    className={`${styles.floatingBtn} ${isOpen ? styles.floatingBtnOpen : styles.floatingBtnClosed}`}
    style={{ position: 'relative', zIndex: 10000 }}
    aria-label={isOpen ? 'Close chat' : 'Open chat'}
  >
    {isOpen ? '✕' : '💬'}
  </button>
);

// 2. The Teaser Popup
const ChatTeaser = ({ onOpen, onClose }) => (
  <div className={styles.teaser}>
    <button onClick={onClose} className={styles.teaserClose} aria-label="Dismiss">&times;</button>
    <div className={styles.teaserContent}>
      <p className={styles.teaserTitle}>Got questions? Let us help.</p>
      <span className={styles.teaserStatus}>
        <span className={styles.teaserDot} />
        Team TuneQuest is online
      </span>
    </div>
    <button onClick={onOpen} className={styles.teaserBtn}>Chat</button>
  </div>
);

// 3. The Full Chat Window
const ChatWindow = ({ onClose, activeTab, setActiveTab }) => {
  const [message, setMessage] = useState('');
  const navigate = useNavigate();

  const handlePlanClick = () => {
    navigate('/plan/form');
  };

  const handleProgressClick = () => {
    navigate('/progress');
  };

  const handleExercisesClick = () => {
    navigate('/exercises');
  };

  const handleQuizClick = () => {
    navigate('/quiz');
  };


  return (
    <div className={styles.window}>

      {/* Header */}
      <div className={styles.header}>
        <div className={styles.tabRow}>
          <button
            onClick={() => setActiveTab('chat')}
            className={`${styles.tab} ${activeTab === 'chat' ? styles.tabActive : ''}`}
          >
            Chat
          </button>
          <button
            onClick={() => setActiveTab('faqs')}
            className={`${styles.tab} ${activeTab === 'faqs' ? styles.tabActive : ''}`}
          >
            FAQs
          </button>
                    <button
            onClick={() => setActiveTab('shortcuts')}
            className={`${styles.tab} ${activeTab === 'shortcuts' ? styles.tabActive : ''}`}
          >
            TP
          </button>
        </div>
        <div className={styles.headerText}>
          <p className={styles.headerTitle}>Got questions? Let us help.</p>
          <p className={styles.headerSub}>Typically replies under 15 mins</p>
        </div>
      </div>


      {/* Body */}
      <div className={styles.body}>
        {activeTab === 'chat' && (
          <>
            <div className={styles.msgBot}>Hey there! Ready to practice today? </div>
          </>
        )}

        {activeTab === 'faqs' && (
          <div className={styles.faqList}>
            {FAQ_ITEMS.map((item) => (
              <details key={item.question} className={styles.faqItem}>
                <summary className={styles.faqQuestion}>{item.question}</summary>
                <p className={styles.faqAnswer}>{item.answer}</p>
              </details>
            ))}
          </div>
        )}

          {activeTab === 'shortcuts' && (
            <>
              <div className={`${styles.msgBot} ${styles.clickable}`} onClick={handlePlanClick}>
                  Make a Practice Plan?
              </div>
              <div className={`${styles.msgBot} ${styles.clickable}`} onClick={handleProgressClick}>
                  Check Your Progress?
              </div>
              <div className={`${styles.msgBot} ${styles.clickable}`} onClick={handleExercisesClick}>
                  View Exercises?
              </div>
              <div className={`${styles.msgBot} ${styles.clickable}`} onClick={handleQuizClick}>
                  Take a Quiz?
              </div>
            </>
        )}
      </div>
      

      {/* Footer */}
      {activeTab === 'chat' && (
        <div className={styles.footer}>
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Write your message..."
            className={styles.input}
          />
          <button className={styles.sendBtn} aria-label="Send">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
};

const getBtnSize = () => (window.innerWidth <= 768 ? 48 : 60);

const ChatWidget = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [showTeaser, setShowTeaser] = useState(true);
  const [activeTab, setActiveTab] = useState('chat');
  const [isSnapping, setIsSnapping] = useState(false);

  // Position stored as bottom/right CSS offsets
  const [pos, setPos] = useState(() => {
    try {
      const saved = localStorage.getItem('chat_widget_pos');
      if (saved) return JSON.parse(saved);
    } catch {}
    return { x: 24, y: 24 };
  });
  const posRef = useRef(pos);
  const isDragging = useRef(false);
  const hasMoved = useRef(false);
  const dragRef = useRef({ startX: 0, startY: 0, posX: 24, posY: 24 });

  useEffect(() => {
    const saved = localStorage.getItem('chat_open') === 'true';
    if (saved) {
      setIsOpen(true);
      setShowTeaser(false);
    }
  }, []);

  // Clear snap transition after animation finishes
  useEffect(() => {
    if (!isSnapping) return;
    const t = setTimeout(() => setIsSnapping(false), 380);
    return () => clearTimeout(t);
  }, [isSnapping]);

  const handleDragStart = (e) => {
    isDragging.current = true;
    hasMoved.current = false;
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    dragRef.current = {
      startX: clientX,
      startY: clientY,
      posX: posRef.current.x,
      posY: posRef.current.y,
    };
  };

  useEffect(() => {
    const onMove = (e) => {
      if (!isDragging.current) return;
      if (e.cancelable) e.preventDefault(); // prevent page scroll on touch while dragging
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      const dx = clientX - dragRef.current.startX;
      const dy = clientY - dragRef.current.startY;
      if (Math.abs(dx) > 4 || Math.abs(dy) > 4) hasMoved.current = true;
      const newPos = {
        x: Math.max(0, Math.min(window.innerWidth - 80, dragRef.current.posX - dx)),
        y: Math.max(0, Math.min(window.innerHeight - 80, dragRef.current.posY - dy)),
      };
      posRef.current = newPos;
      setPos(newPos);
    };

    const onEnd = () => {
      if (!isDragging.current) return;
      isDragging.current = false;

      const MARGIN = 16;
      const BTN = getBtnSize();
      // Snap to the nearest left or right screen edge
      const bubbleCenterX = window.innerWidth - posRef.current.x - BTN / 2;
      const snapToLeft = bubbleCenterX < window.innerWidth / 2;
      const snappedX = snapToLeft
        ? window.innerWidth - BTN - MARGIN   // right-offset when at left edge
        : MARGIN;                            // right-offset when at right edge
      const snappedY = Math.max(MARGIN, Math.min(window.innerHeight - BTN - MARGIN, posRef.current.y));
      const snapped = { x: snappedX, y: snappedY };

      posRef.current = snapped;
      setIsSnapping(true);
      setPos(snapped);
      localStorage.setItem('chat_widget_pos', JSON.stringify(snapped));
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onEnd);
    window.addEventListener('touchmove', onMove, { passive: false });
    window.addEventListener('touchend', onEnd);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onEnd);
      window.removeEventListener('touchmove', onMove);
      window.removeEventListener('touchend', onEnd);
    };
  }, []);

  // Re-snap to the correct edge whenever screen dimensions change (orientation, resize)
  useEffect(() => {
    const onResize = () => {
      const MARGIN = 16;
      const BTN = getBtnSize();
      const cur = posRef.current;
      // If x (right-offset) is small the bubble was at the right edge, otherwise left edge
      const wasAtLeftEdge = cur.x > 100;
      const snappedX = wasAtLeftEdge
        ? window.innerWidth - BTN - MARGIN
        : MARGIN;
      const snappedY = Math.max(MARGIN, Math.min(window.innerHeight - BTN - MARGIN, cur.y));
      const snapped = { x: snappedX, y: snappedY };
      posRef.current = snapped;
      setIsSnapping(true);
      setPos(snapped);
      localStorage.setItem('chat_widget_pos', JSON.stringify(snapped));
    };

    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const toggleFullChat = () => {
    if (hasMoved.current) return; // was a drag, not a tap
    const nextState = !isOpen;
    setIsOpen(nextState);
    if (nextState) setShowTeaser(false);
    localStorage.setItem('chat_open', nextState);
  };

  // Derive layout direction from bubble position
  const BTN = getBtnSize();
  const WINDOW_H = 510;
  const POPUP_MARGIN = 8;
  const spaceAbove = window.innerHeight - pos.y - BTN;
  const openDownward = spaceAbove < WINDOW_H + POPUP_MARGIN;
  const snapLeft = pos.x > window.innerWidth / 2;
  const popupOffset = BTN + POPUP_MARGIN;

  return (
    <div
      className={styles.container}
      style={{
        bottom: pos.y,
        right: pos.x,
        transition: isSnapping ? 'bottom 0.35s ease, right 0.35s ease' : 'none',
      }}
    >
      {isOpen && (
        <div style={{
          position: 'absolute',
          ...(openDownward ? { top: popupOffset } : { bottom: popupOffset }),
          ...(snapLeft ? { left: 0 } : { right: 0 }),
        }}>
          <ChatWindow activeTab={activeTab} setActiveTab={setActiveTab} onClose={toggleFullChat} />
        </div>
      )}

      {(!isOpen && showTeaser) && (
        <div style={{
          position: 'absolute',
          bottom: popupOffset,
          ...(snapLeft ? { left: 0 } : { right: 0 }),
        }}>
          <ChatTeaser
            onOpen={toggleFullChat}
            onClose={() => setShowTeaser(false)}
          />
        </div>
      )}

      <FloatingIcon isOpen={isOpen} onClick={toggleFullChat} onMouseDown={handleDragStart} />
    </div>
  );
};

export default ChatWidget;