import { LinkedInCompany } from './linkedin-company.entity';

export interface Education {
  schoolName: string;
  fieldOfStudy: string;
  dateRange: {
    start: {
      year: number;
      month: number;
    };
    end: {
      year: number;
      month: number;
    };
  };
  description: string;
  degreeName: string;
  grade: string;
}

export interface Skill {
  name: string;
}

export interface Profile {
  firstName: string;
  lastName: string;
  summary: string;
  company: LinkedInCompany;
  education: Education[];
  pictureUrls: string[];
  skills: Skill[];
}
