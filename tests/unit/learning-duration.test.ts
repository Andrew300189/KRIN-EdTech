import { estimateBlockSeconds, estimateExerciseSeconds } from "@/modules/lessons/utils/learning-duration";

describe("learning duration", () => {
  it("keeps a short single-choice interaction fast for a confident learner", () => {
    const seconds = estimateExerciseSeconds({
      engineKey: "single-choice",
      instruction: "Choose the correct verb.",
      question: "I ___ ready.",
      content: { options: ["am", "is", "are"] },
      correctAnswer: "am",
      difficulty: 1,
    });

    expect(seconds).toBeGreaterThanOrEqual(4);
    expect(seconds).toBeLessThan(12);
  });

  it("uses the real number of matching pairs instead of one engine-wide value", () => {
    const onePair = estimateExerciseSeconds({
      engineKey: "matching",
      instruction: "Match the pair.",
      question: "Choose a match.",
      content: { left: ["I"], right: ["am"] },
      correctAnswer: { I: "am" },
    });
    const eightPairs = estimateExerciseSeconds({
      engineKey: "matching",
      instruction: "Match every subject to its verb.",
      question: "Choose a match.",
      content: {
        left: ["I", "you", "we", "they", "he", "she", "it", "Anna"],
        right: ["am", "are", "are", "are", "is", "is", "is", "is"],
      },
      correctAnswer: { I: "am", you: "are", we: "are", they: "are", he: "is", she: "is", it: "is", Anna: "is" },
    });

    expect(eightPairs).toBeGreaterThan(onePair);
  });

  it("uses the configured media length when the author provides it", () => {
    const seconds = estimateBlockSeconds({
      type: "LISTENING",
      title: "Listen and answer",
      content: { url: "https://cdn.example.test/audio.mp3", durationSeconds: 92, text: "Listen once, then answer." },
      settings: {},
      exercises: [],
    });

    expect(seconds).toBeGreaterThanOrEqual(92);
    expect(seconds).toBeLessThan(110);
  });

  it("does not count a duplicated authoring prompt twice", () => {
    const once = estimateExerciseSeconds({
      engineKey: "text-input",
      instruction: "Write the missing verb.",
      question: "They ___ at home.",
      content: {},
      correctAnswer: "are",
    });
    const duplicatedForAuthoring = estimateExerciseSeconds({
      engineKey: "text-input",
      instruction: "Write the missing verb.",
      question: "They ___ at home.",
      content: { authoringSource: "They ___ at home." },
      correctAnswer: "are",
    });

    expect(duplicatedForAuthoring).toBe(once);
  });
});
