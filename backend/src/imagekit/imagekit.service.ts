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
    console.log('ImageKit upload attempt:', {
      fileName: file.originalname,
      bufferSize: file.buffer?.length,
      folder,
      hasPublicKey: !!process.env.IMAGEKIT_PUBLIC_KEY,
      hasPrivateKey: !!process.env.IMAGEKIT_PRIVATE_KEY,
      urlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT,
    });
    try {
      const result = await this.imagekit.upload({
        file: file.buffer,
        fileName: `${Date.now()}-${file.originalname}`,
        folder: `/ozamapay/${folder}`,
      });
      console.log('ImageKit upload success:', result.url);
      return result.url;
    } catch (error) {
      console.error('ImageKit upload FAILED:', error.message);
      return '';
    }
  }
}
