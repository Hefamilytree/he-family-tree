import { Controller, Get, Query, Res, HttpException, HttpStatus } from '@nestjs/common';
import type { Response } from 'express';
import { PdfService } from './pdf.service';

@Controller('pdf')
export class PdfController {
  constructor(private readonly pdfService: PdfService) {}

  // GET /api/pdf/genealogy?mode=branch&branch=xxx&toAncestor=1&startGen=&endGen=
  @Get('genealogy')
  async genealogy(
    @Query('mode') mode: string,
    @Query('branch') branch: string,
    @Query('toAncestor') toAncestor: string,
    @Query('startGen') startGen: string,
    @Query('endGen') endGen: string,
    @Res() res: Response,
  ) {
    try {
      const doc = await this.pdfService.generate({ mode, branch, toAncestor, startGen, endGen });
      const filename = encodeURIComponent('何氏族谱.pdf');
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `inline; filename*=UTF-8''${filename}`);
      doc.pipe(res);
    } catch (e) {
      console.error('生成PDF失败:', e);
      throw new HttpException('生成PDF失败', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}
