"use client";

import { useEffect, useRef, useState } from "react";
import { assessPronunciation, type PronunciationAssessment } from "@/modules/vocabulary/utils/pronunciation";
import styles from "./PronunciationCoach.module.css";

type PronunciationVariant = "BRITISH" | "AMERICAN";
type RecognitionResultLike = { isFinal: boolean; 0: { transcript: string } };
type RecognitionEventLike = { resultIndex: number; results: ArrayLike<RecognitionResultLike> };
type RecognitionErrorEventLike = { error: string };
type SpeechRecognitionLike = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  start: () => void;
  abort: () => void;
  onresult: ((event: RecognitionEventLike) => void) | null;
  onerror: ((event: RecognitionErrorEventLike) => void) | null;
  onend: (() => void) | null;
};
type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

function recognitionConstructor() {
  const browser = window as Window & typeof globalThis & { SpeechRecognition?: SpeechRecognitionConstructor; webkitSpeechRecognition?: SpeechRecognitionConstructor };
  return browser.SpeechRecognition ?? browser.webkitSpeechRecognition ?? null;
}

function recognitionErrorMessage(error: string) {
  if (error === "not-allowed" || error === "service-not-allowed") return "Надайте доступ до мікрофона, щоб потренувати вимову.";
  if (error === "no-speech") return "Не вдалося почути відповідь. Спробуйте сказати слово ще раз.";
  if (error === "audio-capture") return "Мікрофон не знайдено або зайнятий іншою програмою.";
  if (error === "network") return "Розпізнавання тимчасово недоступне. Перевірте з’єднання та повторіть.";
  return "Не вдалося розпізнати вимову. Спробуйте ще раз.";
}

function resultMessage(assessment: PronunciationAssessment, transcript: string) {
  if (assessment.verdict === "MATCH") return `Чудово! Я почув: «${transcript}».`;
  if (assessment.verdict === "CLOSE") return `Майже правильно: «${transcript}». Прослухайте слово й повторіть його ще раз для точності.`;
  return `Я почув: «${transcript}». Послухайте зразок і спробуйте ще раз.`;
}

export function PronunciationCoach({
  word,
  britishAudioUrl = null,
  americanAudioUrl = null,
  compact = false,
}: {
  word: string;
  britishAudioUrl?: string | null;
  americanAudioUrl?: string | null;
  compact?: boolean;
}) {
  const [variant, setVariant] = useState<PronunciationVariant>("BRITISH");
  const [isPlaying, setIsPlaying] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [recognitionAvailable, setRecognitionAvailable] = useState<boolean | null>(null);
  const [liveTranscript, setLiveTranscript] = useState("");
  const [assessment, setAssessment] = useState<{ value: PronunciationAssessment; transcript: string } | null>(null);
  const [recognitionError, setRecognitionError] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const listeningRef = useRef(false);

  const locale = variant === "BRITISH" ? "en-GB" : "en-US";
  const audioUrl = variant === "BRITISH" ? britishAudioUrl : americanAudioUrl;

  useEffect(() => {
    setRecognitionAvailable(Boolean(recognitionConstructor()));
    return () => {
      audioRef.current?.pause();
      recognitionRef.current?.abort();
      window.speechSynthesis?.cancel();
    };
  }, []);

  function speakWithBrowserVoice() {
    if (!("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(word);
    utterance.lang = locale;
    utterance.rate = 0.82;
    utterance.pitch = 1;
    const matchingVoice = window.speechSynthesis.getVoices().find((voice) => voice.lang.toLocaleLowerCase().startsWith(locale.toLocaleLowerCase()));
    if (matchingVoice) utterance.voice = matchingVoice;
    utterance.onend = () => setIsPlaying(false);
    utterance.onerror = () => setIsPlaying(false);
    window.speechSynthesis.speak(utterance);
  }

  function playSample() {
    setIsPlaying(true);
    audioRef.current?.pause();
    window.speechSynthesis?.cancel();
    if (!audioUrl) {
      speakWithBrowserVoice();
      return;
    }
    const audio = new Audio(audioUrl);
    audioRef.current = audio;
    let usedFallback = false;
    const useFallback = () => {
      if (usedFallback) return;
      usedFallback = true;
      speakWithBrowserVoice();
    };
    audio.onended = () => setIsPlaying(false);
    audio.onerror = useFallback;
    void audio.play().catch(useFallback);
  }

  function stopListening() {
    listeningRef.current = false;
    recognitionRef.current?.abort();
    setIsListening(false);
  }

  function startListening() {
    const Recognition = recognitionConstructor();
    if (!Recognition) {
      setRecognitionAvailable(false);
      return;
    }
    if (listeningRef.current) {
      stopListening();
      return;
    }
    setRecognitionError(null);
    setAssessment(null);
    setLiveTranscript("");
    const recognition = new Recognition();
    recognition.lang = locale;
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.maxAlternatives = 3;
    recognition.onresult = (event) => {
      let transcript = "";
      let finalTranscript = "";
      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        const result = event.results[index];
        transcript += result[0]?.transcript ?? "";
        if (result.isFinal) finalTranscript += result[0]?.transcript ?? "";
      }
      setLiveTranscript(transcript.trim());
      if (finalTranscript.trim()) {
        const spoken = finalTranscript.trim();
        setAssessment({ value: assessPronunciation(word, spoken), transcript: spoken });
      }
    };
    recognition.onerror = (event) => {
      if (event.error !== "aborted") setRecognitionError(recognitionErrorMessage(event.error));
    };
    recognition.onend = () => {
      listeningRef.current = false;
      setIsListening(false);
    };
    recognitionRef.current = recognition;
    listeningRef.current = true;
    setIsListening(true);
    try {
      recognition.start();
    } catch {
      listeningRef.current = false;
      setIsListening(false);
      setRecognitionError("Не вдалося запустити мікрофон. Спробуйте ще раз.");
    }
  }

  return <section className={`${styles.coach} ${compact ? styles.compact : ""}`} aria-label={`Практика вимови: ${word}`}>
    <div className={styles.heading}>
      <div><h3 className={styles.title}>Вимова</h3><p className={styles.hint}>Послухайте «{word}» і повторіть уголос.</p></div>
      <div className={styles.variants} aria-label="Варіант англійської">
        <button type="button" className={`${styles.variant} ${variant === "BRITISH" ? styles.variantActive : ""}`} aria-pressed={variant === "BRITISH"} onClick={() => setVariant("BRITISH")}>UK</button>
        <button type="button" className={`${styles.variant} ${variant === "AMERICAN" ? styles.variantActive : ""}`} aria-pressed={variant === "AMERICAN"} onClick={() => setVariant("AMERICAN")}>US</button>
      </div>
    </div>
    <div className={styles.actions}>
      <button type="button" className={`${styles.button} ${styles.listen}`} disabled={isPlaying} onClick={playSample} aria-label={`Прослухати ${variant === "BRITISH" ? "британську" : "американську"} вимову слова ${word}`}>{isPlaying ? "♪ Відтворюється" : "🔊 Прослухати"}</button>
      {recognitionAvailable ? <button type="button" className={styles.button} onClick={startListening} aria-pressed={isListening}>{isListening ? "■ Зупинити" : "🎙 Повторити вголос"}</button> : null}
    </div>
    {isListening && <p className={styles.live} role="status">Слухаю…{liveTranscript ? ` «${liveTranscript}»` : ""}</p>}
    {assessment && <p className={`${styles.result} ${assessment.value.verdict === "MATCH" ? styles.resultMatch : assessment.value.verdict === "CLOSE" ? styles.resultClose : styles.resultRetry}`} role="status">{resultMessage(assessment.value, assessment.transcript)}</p>}
    {recognitionError && <p className={`${styles.result} ${styles.resultRetry}`} role="alert">{recognitionError}</p>}
    {recognitionAvailable === false && <p className={styles.unsupported}>У цьому браузері немає розпізнавання голосу. Прослуховування слова все одно доступне.</p>}
  </section>;
}
