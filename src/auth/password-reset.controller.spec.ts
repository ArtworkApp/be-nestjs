import { ConfigService } from '@nestjs/config';
import { Request, Response } from 'express';
import { PasswordResetController } from './password-reset.controller';
import { PasswordResetRequestService } from './password-reset-request.service';
import { PasswordResetConfirmService } from './password-reset-confirm.service';

describe('PasswordResetController', () => {
  const config = {
    get: () => 'development',
    getOrThrow: () => 'http://localhost:3000',
  } as unknown as ConfigService;
  const request = {
    headers: {
      origin: 'http://localhost:3000',
      'content-type': 'application/json',
    },
  } as Request;
  let requests: { request: jest.Mock };
  let confirmations: { confirm: jest.Mock };
  let response: { setHeader: jest.Mock };
  let controller: PasswordResetController;

  beforeEach(() => {
    requests = { request: jest.fn().mockResolvedValue(undefined) };
    confirmations = { confirm: jest.fn().mockResolvedValue(undefined) };
    response = { setHeader: jest.fn() };
    controller = new PasswordResetController(
      requests as unknown as PasswordResetRequestService,
      confirmations as unknown as PasswordResetConfirmService,
      config,
    );
  });

  it('returns the generic accepted message for a reset request', async () => {
    await expect(
      controller.requestReset(
        request,
        { email: 'person@example.com' },
        response as unknown as Response,
      ),
    ).resolves.toEqual({
      message:
        'If an account exists for this email address, a password reset link will be sent.',
    });
    expect(requests.request).toHaveBeenCalledWith('person@example.com');
    expect(response.setHeader).toHaveBeenCalledWith(
      'Cache-Control',
      'no-store',
    );
  });

  it('confirms a reset without returning token or password', async () => {
    const body = { token: 'a'.repeat(43), password: 'long-password' };
    await expect(
      controller.confirmReset(request, body, response as unknown as Response),
    ).resolves.toBeUndefined();
    expect(confirmations.confirm).toHaveBeenCalledWith(
      body.token,
      body.password,
    );
    expect(response.setHeader).toHaveBeenCalledWith(
      'Cache-Control',
      'no-store',
    );
  });

  it('rejects an untrusted origin before requesting a reset', async () => {
    const untrusted = {
      headers: {
        origin: 'https://evil.example',
        'content-type': 'application/json',
      },
    } as Request;
    await expect(
      controller.requestReset(
        untrusted,
        { email: 'person@example.com' },
        response as unknown as Response,
      ),
    ).rejects.toMatchObject({ status: 403 });
    expect(requests.request).not.toHaveBeenCalled();
  });
});
