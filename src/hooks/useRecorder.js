import { useEffect, useRef, useState } from "react";

// Minimal MediaRecorder hook with permission + status tracking
export function useRecorder() {
  const mediaRecorder = useRef(null);
  const [isRecording, setIsRecording] = useState(false);
  const [permissionError, setPermissionError] = useState("");
  const [audioUrl, setAudioUrl] = useState("");
  const chunksRef = useRef([]);

  useEffect(
    () => () => {
      if (mediaRecorder.current && mediaRecorder.current.state !== "inactive") {
        mediaRecorder.current.stop();
      }
    },
    [],
  );

  const requestStream = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setPermissionError("");
      return stream;
    } catch (error) {
      setPermissionError(
        "Microphone access denied. Please enable it to record.",
      );
      throw error;
    }
  };

  const start = async () => {
    if (isRecording) return;
    const stream = await requestStream();
    mediaRecorder.current = new MediaRecorder(stream);
    chunksRef.current = [];

    mediaRecorder.current.ondataavailable = (event) => {
      if (event.data.size > 0) chunksRef.current.push(event.data);
    };

    mediaRecorder.current.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: "audio/webm" });
      setAudioUrl(URL.createObjectURL(blob));
      chunksRef.current = [];
    };

    mediaRecorder.current.start();
    setIsRecording(true);
  };

  const stop = () => {
    if (!mediaRecorder.current) return;
    mediaRecorder.current.stop();
    setIsRecording(false);
  };

  return { isRecording, start, stop, audioUrl, permissionError };
}
