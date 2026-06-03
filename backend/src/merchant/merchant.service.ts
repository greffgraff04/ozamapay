import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';

export class ApplyDto {
  businessName: string;
  email: string;
  phone: string;
  address: string;
  plan?: string;
}

@Injectable()
export class MerchantService {
  constructor(
    private prisma: PrismaService,
    private mailService: MailService,
  ) {}

  async apply(dto: ApplyDto) {
    if (!dto.businessName || !dto.email || !dto.phone || !dto.address) {
      throw new BadRequestException('Tout chan obligatwa yo nesesè');
    }

    const application = await this.prisma.merchantApplication.create({
      data: {
        businessName: dto.businessName,
        email: dto.email.toLowerCase().trim(),
        phone: dto.phone,
        address: dto.address,
        plan: dto.plan || 'STARTER',
      },
    });

    try {
      await this.mailService.sendMerchantApplication(
        dto.email,
        dto.businessName,
        dto.phone,
        dto.address,
        dto.plan || 'STARTER',
      );
    } catch {}

    return { success: true, id: application.id };
  }
}
