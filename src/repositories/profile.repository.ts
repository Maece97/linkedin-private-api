import { filter, get, keyBy, map } from 'lodash';

import { Client } from '../core/client';
import { LinkedInCompany } from '../entities/linkedin-company.entity';
import { LinkedInMiniProfile, MINI_PROFILE_TYPE } from '../entities/linkedin-mini-profile.entity';
import { LinkedInProfile } from '../entities/linkedin-profile.entity';
import { LinkedInVectorImage } from '../entities/linkedin-vector-image.entity';
import { MiniProfile, ProfileId } from '../entities/mini-profile.entity';
import { Education, ProfileLanguage, Profile, Skill } from '../entities/profile.entity';

const getProfilePictureUrls = (picture?: LinkedInVectorImage): string[] =>
  map(picture?.artifacts, artifact => `${picture?.rootUrl}${artifact.fileIdentifyingUrlPathSegment}`);

const transformMiniProfile = (miniProfile: LinkedInMiniProfile): MiniProfile => ({
  ...miniProfile,
  pictureUrls: getProfilePictureUrls(miniProfile.picture),
  profileId: (miniProfile.entityUrn || '').replace('urn:li:fs_miniProfile:', ''),
});

export const getProfilesFromResponse = <T extends { included: (LinkedInMiniProfile | { $type: string })[] }>(
  response: T,
): Record<ProfileId, MiniProfile> => {
  const miniProfiles = filter(response.included, p => p.$type === MINI_PROFILE_TYPE) as LinkedInMiniProfile[];

  const transformedMiniProfiles = miniProfiles.map((miniProfile: LinkedInMiniProfile) => transformMiniProfile(miniProfile));

  return keyBy(transformedMiniProfiles, 'profileId');
};

export class ProfileRepository {
  private client: Client;

  constructor({ client }: { client: Client }) {
    this.client = client;
  }

  async getProfile({ publicIdentifier }: { publicIdentifier: string }): Promise<Profile> {
    const response = await this.client.request.profile.getProfile({ publicIdentifier });

    const profile = response?.included?.find(x => x.entityUrn === response.data['*elements'][0]) as LinkedInProfile;
    const company = {} as LinkedInCompany;
    const education = this.getEducation(response?.included, profile['*profileEducations']);

    return {
      firstName: profile.firstName,
      lastName: profile.lastName,
      summary: profile.summary,
      company,
      education,
      skills: this.getSkills(response?.included, profile['*profileSkills']),
      languages: this.getLanguages(response?.included, profile['*profileLanguages']),
      pictureUrls: getProfilePictureUrls(get(profile, 'profilePicture.displayImageReference.vectorImage', {})),
    };

    // const results = response.included || [];

    // const profile = results.find(r => r.$type === PROFILE_TYPE && r.publicIdentifier === publicIdentifier) as LinkedInProfile;
    // const company = results.find(r => r.$type === COMPANY_TYPE && profile.headline.includes(r.name)) as LinkedInCompany;
    // const pictureUrls = getProfilePictureUrls(get(profile, 'profilePicture.displayImageReference.vectorImage', {}));

    // return {
    //   ...profile,
    //   company,
    //   pictureUrls,
    // };
  }

  private getEducation(data: any, urn: string): Education[] {
    const edUrns: string[] = data.find((x: any) => x.entityUrn === urn)['*elements'];

    const ed = edUrns.map(x => {
      const uni = data.find((y: any) => y.entityUrn === x);
      return {
        schoolName: uni.schoolName,
        fieldOfStudy: uni.fieldOfStudy,
        dateRange: this.mapDateRage(uni.dateRange),
        description: uni.description,
        degreeName: uni.degreeName,
        grade: uni.grade,
      };
    });

    return ed;
  }

  private getSkills(data: any, urn: string): Skill[] {
    const skillUrns: string[] = data.find((x: any) => x.entityUrn === urn)['*elements'];
    if (!skillUrns) {
      return [];
    }

    const skills = skillUrns.map(x => {
      const skill = data.find((y: any) => y.entityUrn === x);
      return {
        name: skill.name,
      };
    });

    return skills;
  }

  private getLanguages(data: any, urn: string): ProfileLanguage[] {
    const langUrns: string[] = data.find((x: any) => x.entityUrn === urn)['*elements'];
    if (!langUrns) {
      return [];
    }
    console.log(langUrns);

    const langs = langUrns.map(x => {
      const lang = data.find((y: any) => y.entityUrn === x);
      console.log(lang);
      return {
        name: lang.name,
        proficiency: lang.proficiency,
      };
    });

    return langs;
  }

  private mapDateRage(dateRange: any): any {
    return {
      start: {
        month: dateRange?.start?.month || undefined,
        year: dateRange?.start?.year || undefined,
      },
      end: {
        month: dateRange?.end?.month || undefined,
        year: dateRange?.end?.year || undefined,
      },
    };
  }

  async getOwnProfile(): Promise<Profile | null> {
    const response = await this.client.request.profile.getOwnProfile();

    const miniProfile = response?.included?.find(r => r.$type === MINI_PROFILE_TYPE);

    if (!miniProfile) {
      return null;
    }

    return this.getProfile(miniProfile);
  }
}
