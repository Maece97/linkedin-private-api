import { filter, get, keyBy, map } from 'lodash';

import { Client } from '../core/client';
import { LinkedInMiniProfile, MINI_PROFILE_TYPE } from '../entities/linkedin-mini-profile.entity';
import { LinkedInProfile } from '../entities/linkedin-profile.entity';
import { LinkedInVectorImage } from '../entities/linkedin-vector-image.entity';
import { MiniProfile, ProfileId } from '../entities/mini-profile.entity';
import { Education, ProfileLanguage, Profile, Skill, Work } from '../entities/profile.entity';
import _ from 'lodash';

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

const mapDateRage = (dateRange: any): any => {
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
};

export class ProfileRepository {
  private client: Client;

  private data: any;

  constructor({ client }: { client: Client }) {
    this.client = client;
  }

  async getProfile({ publicIdentifier }: { publicIdentifier: string }): Promise<Profile> {
    const response = await this.client.request.profile.getProfile({ publicIdentifier });

    this.data = response.included;

    const profile = response?.included?.find(x => x.entityUrn === response.data['*elements'][0]) as LinkedInProfile;

    return {
      firstName: profile.firstName,
      lastName: profile.lastName,
      summary: profile.summary,
      education: this.mapLinkedInDataToSection(profile['*profileEducations'], this.educationMapper),
      work: this.mapLinkedInDataToSection(profile['*profilePositionGroups'], x => this.workMapper(x)),
      skills: this.mapLinkedInDataToSection(profile['*profileSkills'], this.skillsMapper),
      languages: this.mapLinkedInDataToSection(profile['*profileLanguages'], this.languageMapper),
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

  private mapLinkedInDataToSection<T>(urn: string, mapper: (x: any) => T | T[]): T[] {
    const urns = this.data.find((x: any) => x.entityUrn === urn)['*elements'];

    if (!urns) {
      return [];
    }

    return _.flatten(
      urns.map((x: any) => {
        console.log(typeof this);
        const data = this.data.find((y: any) => y.entityUrn === x);
        return mapper(data);
      }),
    );
  }

  private educationMapper(x: any): Education {
    return {
      schoolName: x.schoolName,
      fieldOfStudy: x.fieldOfStudy,
      dateRange: mapDateRage(x.dateRange),
      description: x.description,
      degreeName: x.degreeName,
      grade: x.grade,
    };
  }

  private workMapper(x: any): Work[] {
    return this.mapLinkedInDataToSection(x['*profilePositionInPositionGroup'], (y: any) => this.positionMapper(y));
  }

  private positionMapper(x: any): Work {
    return {
      position: x.title,
      name: x.companyName,
      dateRange: mapDateRage(x.dateRange),
      summary: x.description,
    };
  }

  private skillsMapper(x: any): Skill {
    return {
      name: x.name,
    };
  }

  private languageMapper(x: any): ProfileLanguage {
    return {
      name: x.name,
      proficiency: x.proficiency,
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
