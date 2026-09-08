import { Injectable, BadRequestException } from '@nestjs/common';
import { S3Storage } from 'coze-coding-dev-sdk';

@Injectable()
export class UploadService {
  private storage: S3Storage;

  constructor() {
    this.storage = new S3Storage({
      endpointUrl: process.env.COZE_BUCKET_ENDPOINT_URL,
      accessKey: '',
      secretKey: '',
      bucketName: process.env.COZE_BUCKET_NAME,
      region: 'cn-beijing',
    });
  }

  async uploadImage(file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('未选择文件');
    }

    const content = file.path ? 
      await require('fs').promises.readFile(file.path) :
      file.buffer;

    if (!content || content.length === 0) {
      throw new BadRequestException('文件内容为空');
    }

    const ext = (file.originalname || 'image.png').split('.').pop() || 'png';
    const safeName = `products/product_${Date.now()}.${ext}`;

    const imageKey = await this.storage.uploadFile({
      fileContent: content,
      fileName: safeName,
      contentType: file.mimetype || 'image/png',
    });

    const imageUrl = await this.storage.generatePresignedUrl({
      key: imageKey,
      expireTime: 2592000,
    });

    console.log('图片上传成功:', { imageKey, imageUrl });
    return { imageKey, imageUrl };
  }
}