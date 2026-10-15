import { Injectable, BadRequestException } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class UploadService {
  private uploadDir: string;

  constructor() {
    this.uploadDir = path.resolve(process.cwd(), 'uploads');
    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
    }
  }

  async uploadImage(file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('未选择文件');
    }

    const content = file.path
      ? await fs.promises.readFile(file.path)
      : file.buffer;

    if (!content || content.length === 0) {
      throw new BadRequestException('文件内容为空');
    }

    const ext = (file.originalname || 'image.png').split('.').pop() || 'png';
    const filename = `product_${Date.now()}.${ext}`;
    const filepath = path.join(this.uploadDir, filename);

    await fs.promises.writeFile(filepath, content);

    const imageUrl = `/uploads/${filename}`;
    console.log('图片上传成功:', { imageUrl });
    return { imageKey: filename, imageUrl };
  }
}
