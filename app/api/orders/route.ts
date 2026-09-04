import { handleRecords } from '@/lib/records-api';

export const GET = (request: Request) => handleRecords(request, 'orders');
export const POST = (request: Request) => handleRecords(request, 'orders');
export const PUT = (request: Request) => handleRecords(request, 'orders');
export const DELETE = (request: Request) => handleRecords(request, 'orders');
