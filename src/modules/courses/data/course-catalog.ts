import type {
  CourseLevel,
  CourseLevelData,
  CourseSection,
  CourseTopic,
} from "@/modules/courses/types/course-catalog.types";

type TopicInput = readonly [title: string, example?: string];

type SectionInput = {
  slug: string;
  title: string;
  topics: readonly TopicInput[];
};

type LevelInput = Omit<CourseLevelData, "sections"> & { sections: readonly SectionInput[] };

function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "topic";
}

function createTopics(level: CourseLevel, sectionSlug: string, inputs: readonly TopicInput[]): CourseTopic[] {
  const duplicates = new Map<string, number>();
  return inputs.map(([title, example], index) => {
    const baseSlug = slugify(title);
    const occurrence = (duplicates.get(baseSlug) ?? 0) + 1;
    duplicates.set(baseSlug, occurrence);
    const slug = occurrence === 1 ? baseSlug : `${baseSlug}-${occurrence}`;
    return {
      id: `${level.toLowerCase()}-${sectionSlug}-${slug}`,
      slug,
      title,
      ...(example ? { example } : {}),
      order: index + 1,
    };
  });
}

function createSections(level: CourseLevel, inputs: readonly SectionInput[]): CourseSection[] {
  return inputs.map((section, index) => ({
    id: `${level.toLowerCase()}-${section.slug}`,
    slug: section.slug,
    title: section.title,
    order: index + 1,
    topics: createTopics(level, section.slug, section.topics),
  }));
}

function createLevel(input: LevelInput): CourseLevelData {
  return { ...input, sections: createSections(input.level, input.sections) };
}

/**
 * Single source of truth for the public CEFR topic tree.  The wording and
 * instructional order come from the supplied curriculum list.  The builders
 * add stable, level-scoped IDs without merging repeated wording between levels.
 */
export const courseCatalog: Record<CourseLevel, CourseLevelData> = {
  A1: createLevel({
    level: "A1",
    title: "Beginner",
    description: "Build essential English for familiar everyday situations.",
    access: "free",
    sections: [
      {
        slug: "adjectives-and-adverbs",
        title: "Adjectives and adverbs",
        topics: [
          ["Adjectives vs adverbs, word formation, word order", "good vs well, quick vs quickly"],
          ["Comparative of adjectives with -er and more", "happier, more comfortable"],
          ["Superlative of adjectives with -est and the most", "the happiest, the most comfortable"],
        ],
      },
      {
        slug: "articles-and-quantifiers",
        title: "Articles and quantifiers",
        topics: [
          ["A, An, The, 0 article", "I am a singer. I have an orange. I have books. I feel love."],
          ["Superlative of adjectives", "the best, the most interesting"],
        ],
      },
      { slug: "conditionals", title: "Conditionals", topics: [["Zero conditional", "If you are ill, go to the doctor."]] },
      {
        slug: "future-tenses",
        title: "Future tenses",
        topics: [
          ["Future with will: sudden decision", "I will help you with that."],
          ["Future with going to: making plans", "I am going to see my sister for Christmas."],
          ["Will for asking for help", "Will you carry my bag, please?"],
        ],
      },
      {
        slug: "gerund-and-infinitive",
        title: "Gerund and infinitive",
        topics: [
          ["Verbs followed by infinitive or gerund (like, love, want, would like, etc.)", "I like reading. I want to see my family. I love singing."],
          ["Stative verbs", "know, like, seem, love, have, want, see, etc."],
        ],
      },
      {
        slug: "past-tenses",
        title: "Past tenses",
        topics: [
          ["Past simple: actions in the past", "I worked last night. I didn’t work."],
          ["Past simple of TO BE", "I was, You were, She was, He was, It was, We were, You were, They were"],
          ["Past simple: regular and irregular verbs", "I visited London in 1998. I went to see a film yesterday."],
        ],
      },
      {
        slug: "modal-verbs",
        title: "Modal verbs",
        topics: [
          ["Can or can’t for abilities", "I can’t swim. I can cook."],
          ["Past simple of can or can’t for abilities", "I could swim when I was five. I couldn’t sing as a child."],
          ["Polite request with could and couldn’t", "Could you help me to find the purse? Couldn’t you be quicker?"],
          ["Obligation with must and mustn’t", "I must study. You mustn’t clean the dishes."],
          ["Prohibition with mustn’t", "You mustn’t smoke around children."],
          ["The necessity with need and needn’t", "You need to finish by 5 p.m. You needn’t hurry."],
          ["Needn’t for permissions", "Do I need to wear a uniform?"],
          ["Can for asking for permission", "Can I bring my dog to work?"],
          ["Can for possibility", "I can see you after work."],
          ["Shall for suggestions", "Shall I walk you to work?"],
        ],
      },
      {
        slug: "prepositions",
        title: "Prepositions",
        topics: [
          ["Prepositions of place", "at, in on, in front of, under, behind, among, beside, near, next to, between, across, into, through, onto, out of, etc."],
          ["By, of, etc."],
        ],
      },
      {
        slug: "pronouns",
        title: "Pronouns",
        topics: [
          ["Personal pronouns", "I, he, she, he, it, we you, they"],
          ["Possessive pronouns", "my, your, his, her, its, our, your, their"],
          ["Possessive with ‘s", "Paul’s daughter, my sister’s house"],
          ["Object pronouns", "me, you, him, her, it, us, you, them"],
          ["Demonstrative pronouns", "that, those, this, these"],
          ["Pronouns: something, anything"],
        ],
      },
      {
        slug: "present-tenses",
        title: "Present tenses",
        topics: [
          ["HAVE GOT, positive, negative, question", "I have got blond hair. She has got a car."],
          ["HAVE", "I have breakfast at 8 every day. She has dinner with her family."],
          ["TO BE", "I am, You are, He is, She is, It is, We are, You are, They are"],
          ["There is, There are", "There is a book on the table, There are books on the table."],
          ["Present simple for habits and daily routines", "I wake up at 8 every day."],
          ["Adverbs of frequency: always, never, often, seldom, usually, etc.", "I usually drink coffee for breakfast. I never drink alcohol."],
          ["Present progressive: actions happening now", "I am working now. She is swimming now."],
          ["Present perfect with since and for", "I have lived alone since 2000. She has studied for the exam for 4 years."],
          ["Present perfect with ever and never", "I have never smoked. Have you ever been to Britain?"],
          ["Present perfect with already and yet", "I haven’t been to Europe yet. I have already done that."],
          ["Imperative", "Stand up! Do this!"],
        ],
      },
      {
        slug: "questions",
        title: "Questions",
        topics: [
          ["Interrogative pronouns: Where, Whose, When, Who, How long, Whose, How, What time, Which, What", "How is she? Where do you live? What time is your concert? Whose book is this?"],
          ["Forming questions with TO BE", "Are they relatives? Is she a singer?"],
          ["Forming questions with HAVE GOT", "Have you got a car? Has she got a dog?"],
          ["Forming questions with Present simple", "Are you happy? Do you speak English? Do you speak English?"],
          ["Forming questions with Past simple", "Did he do it? Was he at home last night? Did you work?"],
          ["Question tags", "She is Spanish, isn’t she? They are coming, aren’t they? He isn’t Irish, is he?"],
        ],
      },
      {
        slug: "vocabulary",
        title: "Vocabulary",
        topics: [
          ["Personal information"], ["daily routines"], ["my typical day at home"], ["at work"], ["talking about experiences"], ["my house"], ["my flat"], ["my country"], ["daily routines"], ["my family"], ["my likes and dislikes"], ["my school"], ["my past experiences with past simple and present perfect"], ["my favourite food"], ["verb phrases"], ["word formations"], ["places and buildings"],
        ],
      },
    ],
  }),
  A2: createLevel({
    level: "A2",
    title: "Elementary",
    description: "Expand everyday communication and confidence.",
    access: "free",
    sections: [
      {
        slug: "adjectives-and-adverbs",
        title: "Adjectives and adverbs",
        topics: [
          ["Adjectives vs adverbs, word formation, word order", "quick vs quickly, sudden vs suddenly, bad vs badly."],
          ["Comparative of adjectives with -er and more", "older, more expensive"],
          ["Superlative of adjectives with -est and the most", "the biggest, the most interesting"],
          ["Irregular adjectives", "less, good, bad, more"],
          ["The use of than", "She is a better driver than me."],
          ["Adverbial phrases of time, place and frequency – including word order"],
        ],
      },
      {
        slug: "articles-and-quantifiers",
        title: "Articles and quantifiers",
        topics: [
          ["A, An, The, 0 article", "a book, an orange, the book, the students, students, etc."],
          ["Superlative of adjectives with the best, the most", "He is the best man I have ever met. This is the most interesting book I have ever read."],
        ],
      },
      {
        slug: "conditionals",
        title: "Conditionals",
        topics: [
          ["Zero conditional", "Take medicine if you feel ill."],
          ["First conditional", "If it rains tomorrow, I will stay home."],
          ["First conditional with unless, if only", "I will come unless you cancel. If only my boyfriend knew."],
          ["Wish", "I wish I was taller. I wish it wasn’t true."],
        ],
      },
      {
        slug: "conjunctions",
        title: "Conjunctions",
        topics: [
          ["where, when, whose, why, whose, who, that"],
          ["Basic compound sentences", "I went out when it was raining. She is the woman who can speak five languages. Emma lives in a house that is 100 years old."],
        ],
      },
      {
        slug: "future-tenses",
        title: "Future tenses",
        topics: [
          ["Future with will: sudden decision", "I will show you how to use the new laptop."],
          ["Future with going to", "Sarah is going to sell her car."],
          ["Present simple for future", "The plane leaves at 8."],
          ["Present progressive for future plans", "He is not working tomorrow."],
          ["Will for asking for help", "Will you do it for me?"],
          ["Shall for suggestions", "Shall we go for a walk?"],
        ],
      },
      {
        slug: "gerund-and-infinitive",
        title: "Gerund and infinitive",
        topics: [
          ["Verbs followed by infinitive or gerund", "want, plan, decide, try, hope, expect, offer, forget, need, promise, refuse, learn, etc."],
          ["Stative verbs", "like, know, belong, love, hate, suppose, mean, want, understand, seem, prefer, etc."],
        ],
      },
      {
        slug: "modal-verbs",
        title: "Modal verbs",
        topics: [
          ["Can or can’t for abilities", "I can play tennis. I can’t speak Spanish."],
          ["Past simple of can or can’t for abilities", "She could paint before she started school. I couldn’t cook until I went to university."],
          ["Polite request with could and couldn’t", "Could you post this letter for me?"],
          ["Obligation with must", "I must clean. You must carry your ID at all times."],
          ["Prohibition with mustn’t", "I mustn’t be late. You mustn’t smoke here."],
          ["Have to for obligations in present and past", "I have to take my medicine. I had to see my boss last night. I had to go to the dentist."],
          ["Must vs have to", "I must eat something. I have to pass an English test."],
          ["Necessity with need and needn’t and have to", "You need to study. You needn’t go yet."],
          ["Needn’t for permissions", "You needn’t wear glasses."],
          ["Can for asking for permission", "Can I leave now?"],
          ["Can for possibility", "Can I open that door, please?"],
          ["Shall for suggestions", "Shall we see your parents next week?"],
          ["Should for giving advice", "You should sleep more. You shouldn’t work so much."],
        ],
      },
      {
        slug: "past-tenses",
        title: "Past tenses",
        topics: [
          ["Past simple: actions in the past", "I worked last night. I didn’t work. Did you work?"],
          ["Past simple of TO BE", "I was, You were, She was, He was, It was, We were, You were, They were"],
          ["Past simple: regular and irregular verbs", "I visited London in 1998. I went to see a film yesterday."],
          ["Past progressive", "I was watching the game. She was working for hours."],
          ["Past progressive action interrupted by past simple", "I was playing basketball when the phone rang. She was cooking when we came."],
          ["Major irregular verbs"],
        ],
      },
      {
        slug: "prepositions",
        title: "Prepositions",
        topics: [
          ["Prepositions of place", "at, in on, in front of, under, behind, among, beside, near, next to, between, across, into, through, onto, out of, etc."],
          ["Prepositions of time", "on, in, for, at, etc."],
          ["Prepositional phrases", "on foot, etc."],
          ["By, Of, With"],
        ],
      },
      {
        slug: "present-tenses",
        title: "Present tenses",
        topics: [
          ["TO BE", "I am, You are, He is, She is, It is, We are, You are, They are"],
          ["There is, There are", "There is a book on the table. There are books on the table."],
          ["HAVE GOT, positive, negative", "She has got two sisters. I haven’t got a house."],
          ["HAVE", "I have blue eyes. Our house doesn’t have five bedrooms."],
          ["Present simple for habits and daily routines", "I never drink coffee in the morning. I never drink and drive. I usually visit my family for holidays."],
          ["Present simple for future", "The bank is open from 8 o’clock. The concert starts at 7 p.m."],
          ["Adverbs of frequency: always, never, often, seldom, usually", "I often go to the farmers’ market. I often watch romantic movies."],
          ["Word order of sentences with adverbs", "She ate quickly. He played brilliantly."],
          ["Present progressive: actions happening now", "She is washing the car now. He is singing."],
          ["Present progressive for future", "I am seeing my mother tonight. She is coming tomorrow."],
          ["Present perfect with since and for", "I have been learning English for seven years. I have lived here since 2001."],
          ["Present perfect with ever and never", "Have you ever been to the USA? I have never flown before."],
          ["Present perfect with already and yet", "I have already done my homework. I haven’t spoken to my boss yet. Have you drunk your tea yet?"],
        ],
      },
      {
        slug: "pronouns",
        title: "Pronouns",
        topics: [
          ["Personal pronouns", "I, he, she, he, it, we you, they"],
          ["Possessive pronouns", "my, your, his, her, his, its, our, your, their"],
          ["Possessive with ‘s", "Tom’s diner, Susan’s song"],
          ["Object pronouns", "me, you, him, her, it, us, you, them"],
          ["Demonstrative pronouns", "that, those, this, these"],
          ["Pronouns: something, anything"],
          ["Reflexive pronouns", "myself, himself, herself, etc."],
        ],
      },
      {
        slug: "questions",
        title: "Questions",
        topics: [
          ["Interrogative pronouns: Where, Whose, When, Who, How long, Whose, How, What time, Which, What", "Who said that? How are you? Whose shoes are these? What time is your lesson?"],
          ["Forming questions with TO BE", "Are you happy? Is she your sister?"],
          ["Forming questions with HAVE GOT", "Have you got a green car? Has she got a cat?"],
          ["Forming questions with Present simple, progressive", "Do you speak Spanish? Are you wearing a hat?"],
          ["Forming questions with Past simple, progressive", "Did you work last night? Were you working last night?"],
          ["Forming questions with Present perfect", "Have you ever been to New York?"],
          ["Question tags", "You have a cat, don’t you? She is American, isn’t she?"],
        ],
      },
      {
        slug: "vocabulary",
        title: "Vocabulary",
        topics: [
          ["Phrasal verbs: Common phrasal verbs", "get up, put on, come in, etc."], ["jobs"], ["do vs make"], ["family"], ["occupations"], ["travelling"], ["everyday activities"], ["eating out"], ["adjectives"], ["health and medicine"], ["nature"], ["gadgets"], ["technology"], ["containers for food"], ["clothes"], ["parts of body"], ["animals"], ["weather"], ["say vs tell"],
        ],
      },
    ],
  }),
  B1: createLevel({
    level: "B1",
    title: "Intermediate",
    description: "Use English independently at work, study and travel.",
    access: "free",
    sections: [
      {
        slug: "adjectives-and-adverbs",
        title: "Adjectives and adverbs",
        topics: [
          ["Adjectives with -ed vs -ing", "boring vs bored, tiring vs tired, shocking vs shocked etc."],
          ["Adverbs of frequency – always, never, seldom, sometimes, often, rarely, occasionally, etc."],
          ["Word order of adverbs of frequency", "I never smoke. I am never late."],
          ["Comparative and superlative of irregular adjectives", "little – less – the least"],
          ["Same as, the same", "Laura gets the same salary as me. You’re just the same as your mother."],
          ["As… as", "He isn’t as old as he looks. It’s not as cold."],
          ["Like, alike, slightly", "You look like your mother, They look alike. She is slightly taller than me"],
        ],
      },
      {
        slug: "conditionals",
        title: "Conditionals",
        topics: [
          ["0 conditional", "If people eat too much, they get fat quickly."],
          ["1st conditional", "If you are late, I will be angry."],
          ["2nd conditional", "If they had time, they would go on holiday."],
          ["3rd conditional", "We would have won if we had played better."],
        ],
      },
      {
        slug: "conjunctions",
        title: "Conjunctions",
        topics: [["Connecting words expressing cause and effect and contrast", "so, which, until, why, while, when, as, before, after, until, as long as, whenever, etc."]],
      },
      {
        slug: "future-tenses",
        title: "Future tenses",
        topics: [
          ["Will – sudden decisions", "I will phone tomorrow. I will carry it for you."],
          ["Future progressive", "Will you be going away this summer?"],
          ["Going to – for plans", "I am going to give you a call soon."],
          ["Passive voice", "The report will be done by tomorrow."],
        ],
      },
      {
        slug: "gerund-and-infinitive",
        title: "Gerund and infinitive",
        topics: [
          ["Verbs followed by infinitive", "want, hope, need, plan, expect, promise, decide, offer, refuse, try, forget, learn, would like, etc."],
          ["Verbs followed by gerund", "enjoy, mind, finish, suggest, etc."],
          ["Verbs followed by infinitive or gerund", "stop"],
          ["Forming nouns from verbs using – ing", "swim – swimming, talk – talking"],
        ],
      },
      {
        slug: "modal-verbs",
        title: "Modal verbs",
        topics: [
          ["may, might for probability", "I might go to the cinema. It may be late now."],
          ["May, might for polite request", "May I sit here? Might I ask you something?"],
          ["Can, can’t in past", "She can’t have seen me. She can have left the purse on the table."],
          ["Can for polite request", "Can you change my room, please?"],
          ["Can for probability", "We can ask her again."],
          ["Could for ability", "He couldn’t dance at all until he took lessons."],
          ["Could for probability", "Alcohol could cause cancer."],
          ["Must vs have to", "You must clean your clothes. I have to go to the dentist."],
          ["Must/can’t for deduction", "That must be the main entrance. It can’t be far now."],
          ["Be able to in past and present perfect and future", "She wasn’t able to visit us. We haven’t been able to travel for a year now. He will be able to come to the party."],
          ["Be able to for possibility", "We were not able to get the tickets."],
          ["Ought to for obligation", "We ought to leave now. You ought to listen carefully."],
          ["Need for necessity", "I need new glasses."],
          ["Needn’t for obligation", "You needn’t wear a tie."],
          ["Need in past", "I needed to know who that person was."],
          ["Mustn’t for obligation", "Students mustn’t speak during the exam."],
          ["Shall for suggestions and polite offers", "Shall we meet again? Shall we have pizza?"],
        ],
      },
      {
        slug: "past-tenses",
        title: "Past tenses",
        topics: [
          ["Past simple", "I was tired last night. We enjoyed the party."],
          ["Past progressive", "In 2010 we were living in Australia."],
          ["Past perfect", "When I arrived, everybody had left. I had exercised."],
          ["Past perfect progressive", "I had been playing basketball."],
          ["Used to", "I used to have a dog."],
          ["Passive voice", "She said she had been tired."],
          ["Reported speech", "She said she loved the film. She didn’t know where her father was."],
          ["All main irregular verbs"],
        ],
      },
      {
        slug: "prepositions",
        title: "Prepositions",
        topics: [
          ["Prepositional phrases with in, for, from, to, at, to, in, about, with, from, of"],
          ["Among, Until, On, At, In"],
        ],
      },
      {
        slug: "present-tenses",
        title: "Present tenses",
        topics: [
          ["Present simple", "I come from Greece. I work late on Tuesdays."],
          ["Present progressive", "She isn’t eating. Why are you wearing a coat?"],
          ["Present perfect with for, since, yet, already, never, ever, just", "I have never seen that film before. She hasn’t written yet. We have just finished eating."],
          ["Present perfect progressive", "I have been learning English for ever."],
          ["Passive voice", "The book has been rewritten many times. The dinner is served. She is being vaccinated."],
          ["Present progressive for future", "When are you meeting again?"],
          ["Present simple for future", "School starts at 8 every day."],
          ["Reported speech", "She said she had been waiting for hours."],
          ["There is, There are", "There is a dog in the garden. There are people everywhere."],
        ],
      },
      {
        slug: "pronouns",
        title: "Pronouns",
        topics: [
          ["Pronouns: something, anything, nothing"],
          ["Reflexive pronouns", "myself, himself, herself, itself, ourselves, yourself, themselves"],
        ],
      },
      {
        slug: "questions",
        title: "Questions",
        topics: [
          ["Complex question tags", "It was raining, wasn’t it? You did it, didn’t you?"],
          ["Wh- questions", "Who is she with? How do you like it? What are they like? What kind of job do you need?"],
        ],
      },
      {
        slug: "vocabulary",
        title: "Vocabulary",
        topics: [
          ["Phrasal verbs – turn, give, go, get, run, etc."], ["jobs"], ["family"], ["food and drinks"], ["climate and weather"], ["environment"], ["animals"], ["living areas"], ["flat"], ["house"], ["furniture"], ["means of transportation"], ["free time activities"], ["daily routines"],
        ],
      },
    ],
  }),
  B2: createLevel({
    level: "B2",
    title: "Upper-Intermediate",
    description: "Communicate fluently and precisely in complex situations.",
    access: "premium",
    sections: [
      {
        slug: "adjectives-and-adverbs",
        title: "Adjectives and adverbs",
        topics: [
          ["Adjectives with -ed vs -ing", "I am interested in your offer. Your offer is interesting."],
          ["Adverbs of frequency – always, never, seldom, sometimes, often, etc."],
          ["Word order of adverbs of frequency", "I am never late. I never call people after 10 p.m."],
          ["Comparative and superlative of irregular adjectives", "far – further / farther – furthest / farthest"],
          ["Same as, the same", "Laura gets the same salary as me. You’re just the same as your mother."],
          ["As… as", "He isn’t as old as he looks. It’s not as cold."],
          ["Like, alike, slightly", "You look like your mother, They look alike. She is slightly taller than me."],
        ],
      },
      {
        slug: "conditionals",
        title: "Conditionals",
        topics: [
          ["0 conditional", "If you are happy, clap your hands."],
          ["1st conditional", "If it rains, I will stay at home."],
          ["2nd conditional", "If I were you, I would drink more water."],
          ["3rd conditional", "If I had married Paul, I would have lived in that beautiful house."],
          ["Mixed conditional", "If I had worked harder at school, I would have a better job now."],
          ["Wish", "I wish I was taller. I wish I had done that earlier."],
        ],
      },
      {
        slug: "future-tenses",
        title: "Future tenses",
        topics: [
          ["Will", "I am sure she will win the race. I will call you tomorrow."],
          ["Future progressive", "I will be taking my nephew to a concert tomorrow."],
          ["Going to", "I am going to buy some books."],
          ["Will and going to for prediction", "I’m sure you will pass the test."],
          ["Will get used to", "I will get used to living in a city eventually."],
          ["Passive voice", "The dinner will be cooked by my friend."],
          ["Reported speech", "She said she would come for sure."],
          ["Future perfect", "Next year we will have been married for ten years."],
          ["Future perfect progressive", "You will have been waiting for more than two hours when her plane finally arrives."],
        ],
      },
      {
        slug: "gerund-and-infinitive",
        title: "Gerund and infinitive",
        topics: [
          ["Forming nouns from verbs using – ing", "swim – swimming, play – playing"],
          ["Verbs followed by gerund", "decide, make me, hate, suggest, remember, think about, prefer, try, etc."],
          ["Verbs followed by infinitives", "think about, make me, hope, advise, manage, mind, etc."],
          ["Verbs followed by bare infinitives", "I’d rather, had better, etc."],
          ["Verbs followed by to + gerund", "help, look forward, etc."],
        ],
      },
      {
        slug: "modal-verbs",
        title: "Modal verbs",
        topics: [
          ["may, might for probability", "It might rain."],
          ["May, might for polite request", "May I see your passport?"],
          ["May and might for deduction or speculation", "I might look for another job."],
          ["Can, can’t have done", "It could have been Sarah last night."],
          ["Can, could for polite request", "Can I see your manager? Could you say it again?"],
          ["Can for probability", "I can come and see you if you like."],
          ["Could for ability", "I could ski before I could walk."],
          ["Could for probability", "We could see the lake when we kept walking."],
          ["Could for deduction or speculation", "It could be far now. It could be easy."],
          ["Must vs have to", "I must phone her. I have to work from 8 to 5."],
          ["Have got to", "You have got to concentrate."],
          ["Must have done", "She must have been asleep when I walked in."],
          ["must/can’t for deduction", "She must be a chef. She can’t be a policeman."],
          ["Be able to in past and present perfect", "I was able to escape. I haven’t been able to see her in the hospital."],
          ["Be able to for possibility", "I might be able to speak English after this course."],
          ["Ought to for obligation", "You ought to study more."],
          ["Need for necessity", "You need to see a doctor soon."],
          ["Needn’t for obligation", "You needn’t go to the staff meetings."],
          ["Need, Needn’t have done", "You needn’t have gotten up so early."],
          ["Mustn’t for obligation", "You mustn’t go."],
          ["Shall for polite request", "Shall we go?"],
          ["Shall for suggestions", "Shall we invite my mom for lunch?"],
          ["Be able to in present, future, past and present perfect for ability", "I was able to drive. I will be able to drive. I have been able to drive."],
          ["Should for giving advice", "You shouldn’t be here now."],
          ["Should have done", "They should have arrived a long ago."],
          ["Would expressing habits, in the past", "My dad would read me amazing stories every night at bedtime."],
          ["Reported speech"],
        ],
      },
      {
        slug: "past-tenses",
        title: "Past tenses",
        topics: [
          ["Past simple", "They watched TV all evening. It began to rain soon after dinner. I didn’t see Jane all evening. Did you meet your friend?"],
          ["Past progressive", "The telephone rang when she was having a bath. She was wearing trousers yesterday."],
          ["Past perfect", "She found the keys she had lost."],
          ["Past perfect progressive", "We had been playing tennis all evening."],
          ["Used to", "She used to play football as a kid."],
          ["Was used to, got used to in all forms", "She was used to talking to her family on the phone."],
          ["Had something done", "I had my hair cut."],
          ["Passive voice of all past tenses", "The promise was broken. The office was cleaned every day."],
          ["Reported speech", "She said she wanted to buy a car."],
          ["Past tenses used for narration"],
          ["All irregular verbs"],
        ],
      },
      {
        slug: "prepositions",
        title: "Prepositions",
        topics: [
          ["Prepositional phrases with in, for, from, to, at, to, in, about, with, from, of, etc."],
          ["Among, Until, On, At, In, In case, By, Of, With, About, To, For, About, From, Out of"],
        ],
      },
      {
        slug: "present-tenses",
        title: "Present tenses",
        topics: [
          ["Present simple", "Mark usually plays football on Sundays."],
          ["Stative verbs", "like, prefer, understand, want, need, know, mean, believe, remember, forget"],
          ["Present simple for future", "The train leaves at 8. The bank closes at 4."],
          ["Present progressive", "Please be quiet, I am working."],
          ["Present progressive for future", "I am seeing my sister tomorrow."],
          ["Present progressive with always", "She is always screaming."],
          ["Present perfect with for, since, yet, already, never, ever, just, recently, etc."],
          ["Present perfect progressive", "I have been working for Jane for seven years now."],
          ["Passive voice of all present tenses", "Hamlet was written by Shakespeare. The sweater is made of wool."],
          ["Reported speech", "She said she was happy."],
          ["Is used to, get used to in all present tenses", "I used to live in a city. You can get used to living in a village."],
          ["To have something done", "I have had my hair cut."],
        ],
      },
      {
        slug: "pronouns",
        title: "Pronouns",
        topics: [
          ["Pronouns: something, anything, someone, anyone, something, anything, somewhere, anywhere, etc."],
          ["Reflexive pronouns", "myself, himself, herself, himself, ourselves, yourself, themselves"],
          ["Relative pronouns used for relative clauses", "which, who, whose, whom, that, where, when, etc."],
        ],
      },
      {
        slug: "questions",
        title: "Questions",
        topics: [
          ["Complex question tags", "I’m going to get an email with the details, aren’t I?"],
          ["Wh- questions", "How long ago etc."],
          ["Auxiliary verbs", "either, neither, So do I, I hope so, etc."],
        ],
      },
      {
        slug: "vocabulary",
        title: "Vocabulary",
        topics: [
          ["Phrasal verbs – turn, give, go, get, run, hold, let, carry, come, etc."],
          ["Idioms and fixed phrases about housing, holidays, music, pets, human qualities, work, feelings, finances, etc."],
          ["jobs"], ["family"], ["food and drinks"], ["climate and weather"], ["environment"], ["animals"], ["living areas"], ["flat"], ["house"], ["furniture"], ["means of transportation"], ["free time activities"], ["daily routines"],
        ],
      },
    ],
  }),
  C1: createLevel({
    level: "C1",
    title: "Advanced",
    description: "Master nuanced, accurate English for academic and professional contexts.",
    access: "premium",
    sections: [
      {
        slug: "adjectives-and-adverbs",
        title: "Adjectives and adverbs",
        topics: [["All forms"], ["Inversion with negative adverbials"]],
      },
      {
        slug: "modal-verbs",
        title: "Modal verbs",
        topics: [["Modals in the past", "could have done, may have seen, should have done, could have found"]],
      },
      {
        slug: "conditionals",
        title: "Conditionals",
        topics: [["All forms"], ["Wish, if only, expressing regrets"], ["Mixed conditionals in past, present and future"]],
      },
      {
        slug: "vocabulary",
        title: "Vocabulary",
        topics: [["Phrasal verbs: All forms"], ["Splitting phrasal verbs", "She shut the door up."], ["Idioms: All forms"], ["Vocabulary: All topics"]],
      },
    ],
  }),
  C2: createLevel({
    level: "C2",
    title: "Mastery",
    description: "Course content is being prepared.",
    access: "premium",
    sections: [],
  }),
};
