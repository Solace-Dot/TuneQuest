import { useEffect, useRef, useState } from "react";

// Simple Web Audio API hook for recording
export function useRecorder() {
  const audioContextRef = useRef(null);
  const mediaStreamRef = useRef(null);
  const processorRef = useRef(null);
  const [isRecording, setIsRecording] = useState(false);
  const [permissionError, setPermissionError] = useState("");
  const [audioUrl, setAudioUrl] = useState("");
  const audioDataRef = useRef([]);

  useEffect(() => {
    return () => {
      // Cleanup: stop recording and close context
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

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

    try {
      const stream = await requestStream();
      mediaStreamRef.current = stream;

      // Initialize Web Audio API context
      const audioContext = new (window.AudioContext ||
        window.webkitAudioContext)();
      audioContextRef.current = audioContext;

      const source = audioContext.createMediaStreamSource(stream);

      // Create ScriptProcessorNode for collecting audio data
      const processor = audioContext.createScriptProcessor(4096, 1, 1);
      processorRef.current = processor;
      audioDataRef.current = [];

      processor.onaudioprocess = (event) => {
        const data = event.inputBuffer.getChannelData(0);
        audioDataRef.current.push(new Float32Array(data));
      };

      source.connect(processor);
      processor.connect(audioContext.destination);

      setIsRecording(true);
    } catch (error) {
      console.error("Error starting recording:", error);
    }
  };

  const stop = () => {
    if (!audioContextRef.current) return;

    // Disconnect and stop recording
    if (processorRef.current) {
      processorRef.current.disconnect();
    }

    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
    }

    // Convert audio data to WAV format
    const audioData = convertToWAV(audioDataRef.current);
    const blob = new Blob([audioData], { type: "audio/wav" });
    const url = URL.createObjectURL(blob);
    setAudioUrl(url);
    audioDataRef.current = [];

    setIsRecording(false);
  };

  return { isRecording, start, stop, audioUrl, permissionError };
}

// Helper function to convert Float32Array audio data to WAV format
function convertToWAV(audioData) {
  const sampleRate = 44100;
  const numChannels = 1;
  const totalSamples = audioData.reduce((sum, arr) => sum + arr.length, 0);

  // WAV file header
  const buffer = new ArrayBuffer(44 + totalSamples * 2);
  const view = new DataView(buffer);

  // Helper to write string as bytes
  function writeString(offset, string) {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  }

  // WAV header
  writeString(0, "RIFF");
  view.setUint32(4, 36 + totalSamples * 2, true);
  writeString(8, "WAVE");
  writeString(12, "fmt ");
  view.setUint32(16, 16, true); // fmt chunk size
  view.setUint16(20, 1, true); // PCM format
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true); // byte rate
  view.setUint16(32, 2, true); // block align
  view.setUint16(34, 16, true); // bits per sample
  writeString(36, "data");
  view.setUint32(40, totalSamples * 2, true);

  // Convert float samples to PCM
  let offset = 44;
  for (const chunk of audioData) {
    for (let i = 0; i < chunk.length; i++) {
      const sample = Math.max(-1, Math.min(1, chunk[i]));
      view.setInt16(
        offset,
        sample < 0 ? sample * 0x8000 : sample * 0x7fff,
        true
      );
      offset += 2;
    }
  }

  return buffer;
}
