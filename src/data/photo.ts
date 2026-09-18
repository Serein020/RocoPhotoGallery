import {
	generatedPhotoWorks,
	type GeneratedPhotoWork,
} from './generated-photos';

export type PhotoWork = GeneratedPhotoWork;

export const photoWorks: PhotoWork[] =
	generatedPhotoWorks;

export const photoCount =
	photoWorks.length;

export const latestSixWorks =
	photoWorks.slice(0, 6);

export const latestPhoto =
	photoWorks[0] ?? null;