import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

interface CalendarEvent {
  summary: string;
  description?: string;
  start: Date;
  end: Date;
  attendees?: string[];
}

@Injectable()
export class CalendarService {
  private readonly apiKey: string;

  constructor(private config: ConfigService) {
    this.apiKey = this.config.get('GOOGLE_CALENDAR_API_KEY') || '';
  }

  get isConfigured(): boolean {
    return !!this.apiKey;
  }

  async createEvent(calendarId: string, event: CalendarEvent): Promise<any> {
    if (!this.isConfigured) {
      console.log(`[Calendar Mock] Creating event: ${event.summary}`);
      return { mock: true, event };
    }

    // Google Calendar API integration
    // Requires OAuth2 for full access - placeholder for implementation
    console.log(`[Calendar] Creating event on ${calendarId}: ${event.summary}`);
    return { created: true };
  }

  async syncPrazos(calendarId: string, prazos: Array<{ descricao: string; dataLimite: Date; processoNumero: string }>): Promise<void> {
    for (const prazo of prazos) {
      await this.createEvent(calendarId, {
        summary: `[Prazo] ${prazo.descricao}`,
        description: `Processo: ${prazo.processoNumero}`,
        start: prazo.dataLimite,
        end: new Date(prazo.dataLimite.getTime() + 60 * 60 * 1000),
      });
    }
  }
}
