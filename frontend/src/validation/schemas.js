import { z } from 'zod';

export const studentSchema = z.object({
  firstName: z.string().trim().min(2, 'First name must be at least 2 characters'),
  lastName: z.string().trim().min(2, 'Last name must be at least 2 characters'),
  gender: z.enum(['male', 'female', 'other'], { message: 'Select a valid gender' }),
  dateOfBirth: z.string().min(1, 'Date of birth is required'),
  curriculum: z.enum(['8-4-4', 'cbc'], { message: 'Select a valid curriculum' }),
  currentGrade: z.string().trim().min(1, 'Current grade is required'),
  stream: z.string().trim().optional(),
  boardingStatus: z.enum(['day', 'boarding'], { message: 'Select valid boarding status' })
});

export const feePaymentSchema = z.object({
  studentId: z.string().uuid('Select a valid student'),
  amount: z.number().positive('Amount must be greater than 0'),
  paymentMethod: z.enum(['cash', 'mpesa', 'cheque', 'bank'], {
    message: 'Select a valid payment method'
  }),
  status: z.enum(['completed', 'pending'], { message: 'Select a valid payment status' }),
  reference: z.string().trim().optional(),
  description: z.string().trim().optional()
});
