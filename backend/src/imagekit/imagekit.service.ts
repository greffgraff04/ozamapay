import { Injectable } from '@nestjs/common';
import ImageKit from 'imagekit';

@Injectable()
export class ImageKitService {
  private imagekit = new ImageKit({
    publicKey: process.env.IMAGEKIT_PUBLIC_KEY!,
    privateKey: process.env.IMAGEKIT_PRIVATE_KEY!,
    urlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT || 'https://ik.imagekit.io/ozamapay',
  });

  async uploadFile(file: Express.Multer.File, folder: string): Promise<string> {
    const result = await this.imagekit.upload({
      file: file.buffer,
      fileName: `${Date.now()}-${file.originalname}`,
      folder: `/ozamapay/${folder}`,
    });
    return result.url;
  }
}
