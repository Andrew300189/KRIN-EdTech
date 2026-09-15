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
type InterfaceLocale = "ru" | "uk";

const coachCopy = {
  ru: {
    microphonePermission: "Разрешите доступ к микрофону, чтобы потренировать произношение.",
    noSpeech: "Не удалось услышать ответ. Произнесите слово ещё раз.",
    audioCapture: "Микрофон не найден или занят другой программой.",
    network: "Распознавание временно недоступно. Проверьте соединение и повторите.",
    recognitionFailed: "Не удалось распознать произношение. Попробуйте ещё раз.",
    microphoneStartFailed: "Не удалось включить микрофон. Попробуйте ещё раз.",
    match: (transcript: string) => `Отлично! Я услышал: «${transcript}».`,
    close: (transcript: string) => `Почти правильно: «${transcript}». Прослушайте слово и повторите его ещё раз точнее.`,
    retry: (transcript: string) => `Я услышал: «${transcript}». Послушайте образец и попробуйте ещё раз.`,
    aria: (word: string) => `Практика произношения: ${word}`,
    title: "Произношение",
    hint: (word: string) => `Прослушайте «${word}» и повторите вслух.`,
    variants: "Вариант английского",
    listen: (variant: string, word: string) => `Прослушать ${variant === "BRITISH" ? "британское" : "американское"} произношение слова ${word}`,
    playing: "♪ Воспроизводится",
    play: "🔊 Прослушать",
    stop: "■ Остановить",
    speak: "🎙 Повторить вслух",
    listening: "Слушаю…",
    unsupported: "В этом браузере нет распознавания голоса. Прослушивание слова всё равно доступно.",
  },
  uk: {
    microphonePermission: "Надайте доступ до мікрофона, щоб потренувати вимову.",
    noSpeech: "Не вдалося почути відповідь. Спробуйте сказати слово ще раз.",
    audioCapture: "Мікрофон не знайдено або зайнятий іншою програмою.",
    network: "Розпізнавання тимчасово недоступне. Перевірте з’єднання та повторіть.",
    recognitionFailed: "Не вдалося розпізнати вимову. Спробуйте ще раз.",
    microphoneStartFailed: "Не вдалося запустити мікрофон. Спробуйте ще раз.",
    match: (transcript: string) => `Чудово! Я почув: «${transcript}».`,
    close: (transcript: string) => `Майже правильно: «${transcript}». Прослухайте слово й повторіть його ще раз для точності.`,
    retry: (transcript: string) => `Я почув: «${transcript}». Послухайте зразок і спробуйте ще раз.`,
    aria: (word: string) => `Практика вимови: ${word}`,
    title: "Вимова",
    hint: (word: string) => `Послухайте «${word}» і повторіть уголос.`,
    variants: "Варіант англійської",
    listen: (variant: string, word: string) => `Прослухати ${variant === "BRITISH" ? "британську" : "американську"} вимову слова ${word}`,
    playing: "♪ Відтворюється",
    play: "🔊 Прослухати",
    stop: "■ Зупинити",
    speak: "🎙 Повторити вголос",
    listening: "Слухаю…",
    unsupported: "У цьому браузері немає розпізнавання голосу. Прослуховування слова все одно доступне.",
  },
} as const;

function recognitionConstructor() {
  const browser = window as Window & typeof globalThis & { SpeechRecognition?: SpeechRecognitionConstructor; webkitSpeechRecognition?: SpeechRecognitionConstructor };
  return browser.SpeechRecognition ?? browser.webkitSpeechRecognition ?? null;
}

function recognitionErrorMessage(error: string, locale: InterfaceLocale) {
  const copy = coachCopy[locale];
  if (error === "not-allowed" || error === "service-not-allowed") return copy.microphonePermission;
  if (error === "no-speech") return copy.noSpeech;
  if (error === "audio-capture") return copy.audioCapture;
  if (error === "network") return copy.network;
  return copy.recognitionFailed;
}

function resultMessage(assessment: PronunciationAssessment, transcript: string, locale: InterfaceLocale) {
  const copy = coachCopy[locale];
  if (assessment.verdict === "MATCH") return copy.match(transcript);
  if (assessment.verdict === "CLOSE") return copy.close(transcript);
  return copy.retry(transcript);
}

export function PronunciationCoach({
  word,
  britishAudioUrl = null,
  americanAudioUrl = null,
  compact = false,
  locale: interfaceLocale = "uk",
  onAssessment,
}: {
  word: string;
  britishAudioUrl?: string | null;
  americanAudioUrl?: string | null;
  compact?: boolean;
  locale?: InterfaceLocale;
  /** Lets a structured lesson record a server-validated spoken attempt. */
  onAssessment?: (assessment: { value: PronunciationAssessment; transcript: string }) => void;
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

  const speechLocale = variant === "BRITISH" ? "en-GB" : "en-US";
  const audioUrl = variant === "BRITISH" ? britishAudioUrl : americanAudioUrl;
  const copy = coachCopy[interfaceLocale];

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
    utterance.lang = speechLocale;
    utterance.rate = 0.82;
    utterance.pitch = 1;
    const matchingVoice = window.speechSynthesis.getVoices().find((voice) => voice.lang.toLocaleLowerCase().startsWith(speechLocale.toLocaleLowerCase()));
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
    recognition.lang = speechLocale;
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
        const nextAssessment = { value: assessPronunciation(word, spoken), transcript: spoken };
        setAssessment(nextAssessment);
        onAssessment?.(nextAssessment);
      }
    };
    recognition.onerror = (event) => {
      if (event.error !== "aborted") setRecognitionError(recognitionErrorMessage(event.error, interfaceLocale));
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
      setRecognitionError(copy.microphoneStartFailed);
    }
  }

  return <section className={`${styles.coach} ${compact ? styles.compact : ""}`} aria-label={copy.aria(word)}>
    <div className={styles.heading}>
      <div><h3 className={styles.title}>{copy.title}</h3><p className={styles.hint}>{copy.hint(word)}</p></div>
      <div className={styles.variants} aria-label={copy.variants}>
        <button type="button" className={`${styles.variant} ${variant === "BRITISH" ? styles.variantActive : ""}`} aria-pressed={variant === "BRITISH"} onClick={() => setVariant("BRITISH")}>UK</button>
        <button type="button" className={`${styles.variant} ${variant === "AMERICAN" ? styles.variantActive : ""}`} aria-pressed={variant === "AMERICAN"} onClick={() => setVariant("AMERICAN")}>US</button>
      </div>
    </div>
    <div className={styles.actions}>
      <button type="button" className={`${styles.button} ${styles.listen}`} disabled={isPlaying} onClick={playSample} aria-label={copy.listen(variant, word)}>{isPlaying ? copy.playing : copy.play}</button>
      {recognitionAvailable ? <button type="button" className={styles.button} onClick={startListening} aria-pressed={isListening}>{isListening ? copy.stop : copy.speak}</button> : null}
    </div>
    {isListening && <p className={styles.live} role="status">{copy.listening}{liveTranscript ? ` «${liveTranscript}»` : ""}</p>}
    {assessment && <p className={`${styles.result} ${assessment.value.verdict === "MATCH" ? styles.resultMatch : assessment.value.verdict === "CLOSE" ? styles.resultClose : styles.resultRetry}`} role="status">{resultMessage(assessment.value, assessment.transcript, interfaceLocale)}</p>}
    {recognitionError && <p className={`${styles.result} ${styles.resultRetry}`} role="alert">{recognitionError}</p>}
    {recognitionAvailable === false && <p className={styles.unsupported}>{copy.unsupported}</p>}
  </section>;
}
