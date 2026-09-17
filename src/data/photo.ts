import fs from 'node:fs';
import path from 'node:path';

export type PhotoWork = {
	id: string;
	image: string;
	date: string;
	order: number;
};

const photosDirectory = path.join(
	process.cwd(),
	'public',
	'photos',
	'pics',
);

const supportedExtensions = new Set([
	'.png',
	'.jpg',
	'.jpeg',
	'.webp',
	'.gif',
]);

function parsePhotoFile(filename: string) {
	const extension = path.extname(filename).toLowerCase();

	if (!supportedExtensions.has(extension)) {
		return null;
	}

	const id = path.basename(filename, extension);

	/*
	 * 文件名格式：
	 *
	 * YYYYMMDD-XXX
	 *
	 * 例如：
	 * 20260918-001
	 */
	const match = id.match(
		/^(\d{4})(\d{2})(\d{2})-/,
	);

	if (!match) {
		return null;
	}

	const date =
		`${match[1]}-${match[2]}-${match[3]}`;

	return {
		id,
		image: `/photos/pics/${filename}`,
		date,
	};
}

function discoverPhotos(): PhotoWork[] {
	if (!fs.existsSync(photosDirectory)) {
		return [];
	}

	const files = fs
		.readdirSync(photosDirectory, {
			withFileTypes: true,
		})
		.filter((entry) => entry.isFile())
		.map((entry) => entry.name);

	const works = files
		.map(parsePhotoFile)
		.filter(
			(
				photo,
			): photo is {
				id: string;
				image: string;
				date: string;
			} => photo !== null,
		)
		.sort(
			(a, b) =>
				b.date.localeCompare(a.date) ||
				b.id.localeCompare(a.id),
		);

	return works.map((photo, index) => ({
		...photo,
		order: index + 1,
	}));
}

export const photoWorks = discoverPhotos();

export const photoCount = photoWorks.length;

export const latestSixWorks =
	photoWorks.slice(0, 6);

export const latestPhoto =
	photoWorks[0] ?? null;