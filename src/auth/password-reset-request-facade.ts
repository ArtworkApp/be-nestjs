import { Logger } from '@nestjs/common';
import { PasswordResetRequestService } from './password-reset-request.service';

const MINIMUM_RESPONSE_MS = 500;

function wait(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

export class PasswordResetRequestFacade {
  private readonly logger = new Logger(PasswordResetRequestFacade.name);

  constructor(
    private readonly requests: PasswordResetRequestService,
    private readonly delay: (milliseconds: number) => Promise<void> = wait,
  ) {}

  async request(email: string): Promise<void> {
    await Promise.all([
      this.processRequest(email),
      this.delay(MINIMUM_RESPONSE_MS),
    ]);
  }

  private async processRequest(email: string): Promise<void> {
    try {
      await this.requests.request(email);
    } catch {
      this.logger.error('Password reset request processing failed.');
    }
  }
}
