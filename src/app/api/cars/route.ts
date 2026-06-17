import { NextResponse } from 'next/server';
import { cars, brands, CarModel } from '@/data/cars';

export const runtime = 'nodejs';

export async function GET() {
  return NextResponse.json({
    brands,
    cars,
    total: cars.length,
  });
}
