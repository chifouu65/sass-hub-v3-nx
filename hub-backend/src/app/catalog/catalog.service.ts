import { Injectable } from '@nestjs/common';

export interface AppDescriptor {
  id: string;
  name: string;
  tagline: string;
  description: string;
  plans: string[];
  url: string;
}

@Injectable()
export class CatalogService {
  private apps: AppDescriptor[] = [
    {
      id: 'linkedin-ai',
      name: 'LinkedIn AI Messaging',
      tagline: 'Automate LinkedIn outreach with AI-crafted messages.',
      description: 'Plan, generate, and send LinkedIn messages with guardrails.',
      plans: ['free', 'pro', 'team'],
      url: 'https://linkedin-ai.example.com',
    },
  ];

  list(): AppDescriptor[] {
    return this.apps;
  }
}
