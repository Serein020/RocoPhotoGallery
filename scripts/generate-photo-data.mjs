import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const projectRoot = path.resolve(__dirname, '..');

const photosDirectory = path.join(
        projectRoot,
        'public',
        'photos',
        'pics',
);

const optimizedDirectory = path.join(
        projectRoot,
        'public',
        'photos',
        'optimized',
);

const outputDirectory = path.join(
        projectRoot,
        'src',
        'data',
);

const outputFile = path.join(
        outputDirectory,
        'generated-photos.ts',
);

const supportedExtensions = new Set([
        '.png',
        '.jpg',
        '.jpeg',
        '.webp',
        '.gif',
]);

const optimizedSizes = [
        {
                suffix: '480',
                width: 480,
        },
        {
                suffix: '960',
                width: 960,
        },
        {
                suffix: '1600',
                width: 1600,
        },
];

function parsePhotoFile(filename) {
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

        const baseName = id;

        return {
                id,

                /*
                 * 原始图片
                 */
                image: `/photos/pics/${filename}`,

                /*
                 * Exhibition 卡片使用的小尺寸图片
                 */
                imageSmall:
                        `/photos/optimized/${baseName}-480.webp`,

                /*
                 * Exhibition / 平板使用的中尺寸图片
                 */
                imageMedium:
                        `/photos/optimized/${baseName}-960.webp`,

                /*
                 * Lightbox 使用的大尺寸图片
                 */
                imageLarge:
                        `/photos/optimized/${baseName}-1600.webp`,

                date,
        };
}

function discoverPhotos() {
        if (!fs.existsSync(photosDirectory)) {
                return [];
        }

        const files = fs
                .readdirSync(photosDirectory, {
                        withFileTypes: true,
                })
                .filter((entry) => entry.isFile())
                .map((entry) => entry.name);

        return files
                .map(parsePhotoFile)
                .filter((photo) => photo !== null)
                .sort(
                        (a, b) =>
                                b.date.localeCompare(a.date) ||
                                b.id.localeCompare(a.id),
                )
                .map((photo, index) => ({
                        ...photo,
                        order: index + 1,
                }));
}

async function generateOptimizedImages(photos) {
        if (!fs.existsSync(photosDirectory)) {
                return;
        }

        fs.mkdirSync(optimizedDirectory, {
                recursive: true,
        });

        let generatedCount = 0;
        let skippedCount = 0;
        let failedCount = 0;

        for (const photo of photos) {
                const sourceExtension =
                        path.extname(photo.id).toLowerCase();

                /*
                 * photo.id 本身不包含扩展名，
                 * 因此通过原始目录找到对应文件。
                 */
                const sourceFilename = fs
                        .readdirSync(photosDirectory)
                        .find((filename) => {
                                const extension =
                                        path.extname(
                                                filename,
                                        ).toLowerCase();

                                if (
                                        !supportedExtensions.has(
                                                extension,
                                        )
                                ) {
                                        return false;
                                }

                                return (
                                        path.basename(
                                                filename,
                                                extension,
                                        ) === photo.id
                                );
                        });

                if (!sourceFilename) {
                        console.warn(
                                `Source image not found: ${photo.id}`,
                        );

                        failedCount += 1;
                        continue;
                }

                const sourcePath = path.join(
                        photosDirectory,
                        sourceFilename,
                );

                for (const size of optimizedSizes) {
                        const outputPath = path.join(
                                optimizedDirectory,
                                `${photo.id}-${size.suffix}.webp`,
                        );

                        /*
                         * 如果优化图片已经存在，
                         * 就不重复生成。
                         *
                         * 这样以后新增照片时，
                         * build 不需要重新处理所有历史照片。
                         */
                        if (fs.existsSync(outputPath)) {
                                skippedCount += 1;
                                continue;
                        }

                        try {
                                await sharp(sourcePath, {
                                        animated:
                                                sourceExtension ===
                                                '.gif',
                                })
                                        .resize({
                                                width: size.width,
                                                withoutEnlargement: true,
                                                fit: 'inside',
                                        })
                                        .webp({
                                                quality: 82,
                                                effort: 4,
                                        })
                                        .toFile(outputPath);

                                generatedCount += 1;

                                console.log(
                                        `Generated ${photo.id}-${size.suffix}.webp`,
                                );
                        } catch (error) {
                                failedCount += 1;

                                console.error(
                                        `Failed to optimize ${sourceFilename} -> ${size.suffix}.webp`,
                                );

                                console.error(error);
                        }
                }
        }

        console.log(
                `Optimized images: ${generatedCount} generated, ${skippedCount} already existed, ${failedCount} failed.`,
        );
}

async function main() {
        const photoWorks = discoverPhotos();

        /*
         * 确保 optimized 目录存在。
         */
        fs.mkdirSync(optimizedDirectory, {
                recursive: true,
        });

        /*
         * 先生成优化图片。
         *
         * 只有优化图片生成完成之后，
         * 才继续生成 generated-photos.ts。
         */
        await generateOptimizedImages(photoWorks);

        fs.mkdirSync(outputDirectory, {
                recursive: true,
        });

        const generatedContent = `/**
 * AUTO-GENERATED FILE.
 *
 * Do not edit this file manually.
 *
 * Generated by:
 * scripts/generate-photo-data.mjs
 */

export type GeneratedPhotoWork = {
\tid: string;
\timage: string;
\timageSmall: string;
\timageMedium: string;
\timageLarge: string;
\tdate: string;
\torder: number;
};

export const generatedPhotoWorks: GeneratedPhotoWork[] = ${JSON.stringify(
                photoWorks,
                null,
                2,
)};
`;

        fs.writeFileSync(
                outputFile,
                generatedContent,
                'utf8',
        );

        console.log(
                `Generated ${photoWorks.length} photo(s) -> ${path.relative(
                        projectRoot,
                        outputFile,
                )}`,
        );
}

main().catch((error) => {
        console.error(error);
        process.exit(1);
});