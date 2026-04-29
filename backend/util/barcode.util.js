import { v4 as uuidv4 } from 'uuid';

export function generateBarcodeValue() {
  const raw = uuidv4().replace(/-/g, '').slice(0, 16).toUpperCase();
  return `AN-${raw}`;
}
