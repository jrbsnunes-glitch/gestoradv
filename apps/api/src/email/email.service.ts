import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailService {
  private transporter: nodemailer.Transporter;

  constructor(private config: ConfigService) {
    const host = this.config.get('SMTP_HOST');
    if (host) {
      this.transporter = nodemailer.createTransport({
        host,
        port: parseInt(this.config.get('SMTP_PORT') || '587'),
        auth: {
          user: this.config.get('SMTP_USER'),
          pass: this.config.get('SMTP_PASS') || this.config.get('SENDGRID_API_KEY'),
        },
      });
    } else {
      this.transporter = nodemailer.createTransport({
        jsonTransport: true,
      });
    }
  }

  async sendPrazoAlert(to: string, data: { advogadoName: string; processoNumero: string; prazoDescricao: string; dataLimite: string; diasRestantes: number }) {
    const html = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #1e40af; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
          <h2 style="margin:0;">GestorAdv - Alerta de Prazo</h2>
        </div>
        <div style="padding: 24px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 8px 8px;">
          <p>Olá, <strong>${data.advogadoName}</strong>,</p>
          <p>O seguinte prazo vence em <strong>${data.diasRestantes} dia(s)</strong>:</p>
          <div style="background: #f8fafc; padding: 16px; border-radius: 8px; margin: 16px 0;">
            <p style="margin:0 0 8px;"><strong>Processo:</strong> ${data.processoNumero}</p>
            <p style="margin:0 0 8px;"><strong>Prazo:</strong> ${data.prazoDescricao}</p>
            <p style="margin:0;"><strong>Data limite:</strong> ${data.dataLimite}</p>
          </div>
          <p style="color: #64748b; font-size: 12px;">Esta é uma mensagem automática do GestorAdv.</p>
        </div>
      </div>
    `;

    return this.transporter.sendMail({
      from: this.config.get('SMTP_FROM') || 'noreply@gestoradv.com',
      to,
      subject: `Prazo em ${data.diasRestantes} dia(s) - ${data.processoNumero}`,
      html,
    });
  }
}
