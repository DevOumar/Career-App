import React, { useState, useEffect, useRef } from "react";
import { UiIcon } from "../../components/UiIcon.jsx";

export function VoiceInterviewCall({ onEndCall, typeEntretien, domaine }) {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [subtitles, setSubtitles] = useState([
    { role: "assistant", text: "Bonjour ! Bienvenue à votre entretien. Appuyez sur le micro pour prendre la parole." }
  ]);

  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const timerRef = useRef(null);

  useEffect(() => {
    timerRef.current = setInterval(() => {
      setSeconds((prev) => prev + 1);
    }, 1000);

    // Speak initial greeting
    speakText("Bonjour ! Bienvenue à votre entretien. Appuyez sur le micro pour prendre la parole.");

    return () => {
      clearInterval(timerRef.current);
      window.speechSynthesis?.cancel();
    };
  }, []);

  function formatTimer(totalSec) {
    const mins = String(Math.floor(totalSec / 60)).padStart(2, "0");
    const secs = String(totalSec % 60).padStart(2, "0");
    return `${mins}:${secs}`;
  }

  function speakText(text) {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const cleanText = text.replace(/_\w+_/g, "").replace(/\*\*/g, "").trim();
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = "fr-FR";
    utterance.rate = 1.0;
    window.speechSynthesis.speak(utterance);
  }

  async function startRecording() {
    try {
      window.speechSynthesis?.cancel();
      audioChunksRef.current = [];
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        stream.getTracks().forEach((track) => track.stop());
        await processAudio(audioBlob);
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error("Erreur accès micro:", err);
      alert("Impossible d'accéder au microphone. Veuillez vérifier les permissions de votre navigateur.");
    }
  }

  function stopRecording() {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  }

  async function processAudio(blob) {
    setIsProcessing(true);
    try {
      const response = await fetch(`/api/interview/audio-message?type_entretien=${typeEntretien}&domaine=${domaine}`, {
        method: "POST",
        headers: {
          "Content-Type": "audio/webm"
        },
        body: blob
      });

      if (response.ok) {
        const data = await response.json();
        const userSpeech = data.transcribed_text || "Parole transcrite";
        const aiReply = data.rawAnswer || data.message || "";

        setSubtitles((prev) => [
          ...prev,
          { role: "user", text: userSpeech },
          { role: "assistant", text: aiReply }
        ]);

        speakText(aiReply);
      }
    } catch (err) {
      console.error("Erreur envoi audio:", err);
    } finally {
      setIsProcessing(false);
    }
  }

  return (
    <div className="voice-call-container card">
      <div className="voice-call-header">
        <div className="call-status">
          <span className="live-dot" /> EN DIRECT — Appel Entretien ({typeEntretien})
        </div>
        <div className="call-timer">{formatTimer(seconds)}</div>
      </div>

      <div className="voice-call-body">
        <div className="recruiter-avatar-large">
          <div className="avatar-wave-ring" />
          <div className="avatar-circle-icon">👔</div>
        </div>
        <h4 className="recruiter-name">Recruteur Senior IA</h4>
        <p className="recruiter-subtitle">Entretien de préparation en cours...</p>

        <div className="subtitles-box">
          {subtitles.slice(-2).map((sub, i) => (
            <p key={i} className={`subtitle-line ${sub.role}`}>
              <strong>{sub.role === "user" ? "Vous : " : "Recruteur : "}</strong>
              {sub.text}
            </p>
          ))}
        </div>
      </div>

      <div className="voice-call-controls">
        {!isRecording ? (
          <button
            type="button"
            className={`btn-mic-record ${isProcessing ? "processing" : ""}`}
            onClick={startRecording}
            disabled={isProcessing}
          >
            <span className="mic-icon">🎙️</span>
            {isProcessing ? "Analyse en cours..." : "Parler au recruteur"}
          </button>
        ) : (
          <button type="button" className="btn-mic-stop" onClick={stopRecording}>
            <span className="mic-icon pulse">🔴</span> Écoute en cours... Appuyer pour envoyer
          </button>
        )}

        <button type="button" className="btn-hangup" onClick={() => onEndCall(subtitles)}>
          📞 Raccrocher & Bilan
        </button>
      </div>
    </div>
  );
}

