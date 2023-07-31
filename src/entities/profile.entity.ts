export type DateRange = {
  start: {
    year: number;
    month: number;
  };
  end: {
    year: number;
    month: number;
  };
};

export interface Education {
  schoolName: string;
  fieldOfStudy: string;
  dateRange: DateRange;
  description: string;
  degreeName: string;
  grade: string;
}

export interface Skill {
  name: string;
}

export interface ProfileLanguage {
  name: string;
  proficiency: string;
}

export interface Work {
  name: string;
  position: string;
  dateRange: DateRange;
  summary: string;
}

export interface Profile {
  firstName: string;
  lastName: string;
  summary: string;
  education: Education[];
  pictureUrls: string[];
  skills: Skill[];
  languages: ProfileLanguage[];
  work: Work[];
}
