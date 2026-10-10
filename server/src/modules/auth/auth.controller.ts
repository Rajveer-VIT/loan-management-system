import { Request, Response } from 'express';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { AuthService } from './auth.service.js';

export const signup = asyncHandler(async (req: Request, res: Response) => {
  const result = await AuthService.registerBorrower(req.body);
  res.status(201).json({ success: true, message: 'Account created successfully', data: result });
});

export const login = asyncHandler(async (req: Request, res: Response) => {
  const result = await AuthService.login(req.body);
  res.status(200).json({ success: true, message: 'Login successful', data: result });
});

export const getMe = asyncHandler(async (req: Request, res: Response) => {
  const user = await AuthService.getCurrentUser(req.user!.id);
  res.status(200).json({ success: true, data: user });
});
