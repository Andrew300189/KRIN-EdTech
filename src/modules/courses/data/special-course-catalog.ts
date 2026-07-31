type SpecialCourseTopic = {
  slug: string;
  title: string;
};

type SpecialCourse = {
  slug: string;
  title: string;
  description: string;
  topics: readonly SpecialCourseTopic[];
};

const topics = (...values: readonly string[]) => values.map((title) => ({
  slug: title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, ""),
  title,
}));

export const specialCourseCatalog = [
  {
    slug: "it-english",
    title: "English for IT",
    description: "Technology, software development, and communication for digital teams.",
    topics: topics("English for IT", "English for Programmers", "English for Software Developers", "English for Frontend Developers", "English for Backend Developers", "English for Full Stack Developers", "English for QA Engineers", "English for DevOps Engineers", "English for Data Analysts", "English for Data Scientists", "English for Cybersecurity Specialists", "English for System Administrators", "English for Technical Support", "English for Game Developers", "English for AI and Machine Learning", "English for Product Managers", "English for UX/UI Designers"),
  },
  {
    slug: "medical-english",
    title: "Medical English",
    description: "Professional vocabulary and communication for healthcare settings.",
    topics: topics("Medical English", "English for Doctors", "English for Nurses", "English for Pharmacists", "English for Dentists", "English for Surgeons", "English for Psychologists", "English for Veterinarians", "English for Medical Students", "English for Healthcare Workers", "English for Emergency Medicine", "English for Patient Communication"),
  },
  {
    slug: "business-english",
    title: "Business English",
    description: "Confident communication for organisations, clients, and leadership.",
    topics: topics("Business English", "English for Entrepreneurs", "English for Managers", "English for Executives", "English for Startups", "English for Sales", "English for Marketing", "English for Digital Marketing", "English for Advertising", "English for Human Resources", "English for Accountants", "English for Economists", "English for Finance", "English for Banking", "English for Investment", "English for Insurance", "English for Customer Service", "English for Business Negotiations", "English for Presentations", "English for Business Correspondence"),
  },
  {
    slug: "legal-english",
    title: "Legal English",
    description: "Accurate language for legal practice, correspondence, and proceedings.",
    topics: topics("Legal English", "English for Lawyers", "English for Judges", "English for Legal Assistants", "English for International Law", "English for Contract Law", "English for Corporate Law", "English for Legal Correspondence", "English for Court Proceedings"),
  },
  {
    slug: "military-english",
    title: "Military English",
    description: "Communication and terminology for defence, safety, and international cooperation.",
    topics: topics("Military English", "English for Soldiers", "English for Officers", "English for Peacekeepers", "English for Military Medicine", "English for NATO Communication", "English for Police Officers", "English for Security Specialists", "English for Border Guards", "English for Emergency Services"),
  },
  {
    slug: "aviation-english",
    title: "Aviation English",
    description: "Aviation and transport language for safe, clear operational communication.",
    topics: topics("Aviation English", "English for Pilots", "English for Cabin Crew", "English for Air Traffic Controllers", "English for Airport Staff", "English for Logistics", "English for Truck Drivers", "English for Railway Workers", "English for Taxi Drivers", "English for Transport Managers"),
  },
  {
    slug: "maritime-english",
    title: "Maritime English",
    description: "Language for crews, ports, navigation, and marine communication.",
    topics: topics("Maritime English", "English for Seafarers", "English for Ship Engineers", "English for Deck Officers", "English for Captains", "English for Port Workers", "English for Marine Communication"),
  },
  {
    slug: "tourism-english",
    title: "English for Tourism",
    description: "Service-focused English for travel, hospitality, and restaurants.",
    topics: topics("English for Tourism", "English for Travel", "English for Hotels", "English for Hotel Receptionists", "English for Tour Guides", "English for Travel Agents", "English for Restaurant Staff", "English for Waiters", "English for Bartenders", "English for Chefs", "English for Hospitality Management"),
  },
  {
    slug: "academic-english",
    title: "Academic English",
    description: "Academic communication, teaching, research, and university study.",
    topics: topics("English for Teachers", "English for English Teachers", "Classroom English", "Academic English", "English for University Students", "English for Researchers", "English for Scientists", "English for Schoolchildren", "English for Preschool Teachers", "English for Online Tutors", "English for Educational Management"),
  },
  {
    slug: "technical-english",
    title: "Technical English",
    description: "Precise English for engineering, manufacturing, and technical documentation.",
    topics: topics("Technical English", "English for Engineers", "English for Mechanical Engineers", "English for Electrical Engineers", "English for Civil Engineers", "English for Chemical Engineers", "English for Industrial Engineers", "English for Manufacturing", "English for Factory Workers", "English for Technicians", "English for Construction Workers", "English for Architects"),
  },
  {
    slug: "exam-english",
    title: "English Exam Preparation",
    description: "Focused preparation for international, school, and university entrance exams.",
    topics: topics("IELTS Preparation", "TOEFL Preparation", "Cambridge English Preparation", "PTE Academic Preparation", "Duolingo English Test Preparation", "TOEIC Preparation", "EVI English Preparation", "NMT English Preparation", "English for University Admission", "English for Citizenship Exams"),
  },
  {
    slug: "travel-english",
    title: "English for Travel",
    description: "Practical English for everyday situations abroad.",
    topics: topics("English for Travelling", "English at the Airport", "English at a Hotel", "English at a Restaurant", "English for Shopping", "English for Relocation", "English for Immigration", "English for Dating", "English for Social Networking", "English for Living Abroad"),
  },
  {
    slug: "work-english",
    title: "English for Work",
    description: "Useful English for jobs, meetings, communication, and professional growth.",
    topics: topics("English for Job Interviews", "English for Work", "English for Office Communication", "English for Meetings", "English for Negotiations", "English for Presentations", "English for Email Writing", "English for Phone Calls", "English for Busy Professionals"),
  },
  {
    slug: "english-for-children",
    title: "English for Children",
    description: "A supportive path for young learners, families, and inclusive learning.",
    topics: topics("English for Children", "English for Schoolchildren", "English for Teenagers", "English for Parents", "English for Families", "English for People with Dyslexia", "English for Ukrainian Speakers"),
  },
] as const satisfies readonly SpecialCourse[];

export type SpecialCourseSlug = (typeof specialCourseCatalog)[number]["slug"];

export function getSpecialCourse(slug: string) {
  return specialCourseCatalog.find((course) => course.slug === slug);
}

export function getSpecialCourseTopic(course: SpecialCourse, topicSlug: string) {
  return course.topics.find((topic) => topic.slug === topicSlug);
}
