"use client";

import { useState } from "react";
import styles from "@/app/home.module.css";

const options = [
  { id: "correct", label: "She goes to work every day.", isCorrect: true },
  { id: "subject", label: "She go to work every day.", isCorrect: false },
  { id: "tense", label: "She going to work every day.", isCorrect: false },
];

/** A compact, interactive example of the real SINGLE_CHOICE exercise engine. */
export function InteractiveExercisePreview() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = options.find((option) => option.id === selectedId);

  return (
    <section className={styles.exercisePreview} aria-labelledby="exercise-preview-title">
      <div className={styles.exerciseHeader}>
        <div>
          <p className={styles.eyebrow}>Lesson preview</p>
          <h2 id="exercise-preview-title">Choose the correct sentence</h2>
        </div>
        <span className={styles.engineBadge}>Single choice</span>
      </div>
      <p className={styles.exerciseInstruction}>Select the Present Simple form that matches the subject.</p>
      <div className={styles.answerList} role="radiogroup" aria-label="Sentence options">
        {options.map((option, index) => {
          const isSelected = selectedId === option.id;
          const status = selectedId
            ? option.isCorrect
              ? "correct"
              : isSelected
                ? "incorrect"
                : ""
            : "";

          return (
            <button
              type="button"
              key={option.id}
              role="radio"
              aria-checked={isSelected}
              className={`${styles.answerOption} ${status ? styles[status] : ""}`}
              onClick={() => setSelectedId(option.id)}
            >
              <span aria-hidden="true" className={styles.answerMarker}>{String.fromCharCode(65 + index)}</span>
              {option.label}
            </button>
          );
        })}
      </div>
      <p className={`${styles.exerciseFeedback} ${selected ? (selected.isCorrect ? styles.correctText : styles.incorrectText) : ""}`} aria-live="polite">
        {!selected ? "Choose an answer to see the explanation." : selected.isCorrect ? "Correct. With she, the verb takes -s: goes." : "Not quite. In the Present Simple, use goes with she."}
      </p>
    </section>
  );
}
