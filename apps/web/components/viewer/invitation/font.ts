import { Cormorant_Garamond } from 'next/font/google';

/** Display serif of the 2D invitation only (D-036); the rest of the app keeps its own type. */
export const invitationFont = Cormorant_Garamond({
  subsets: ['latin'],
  weight: ['500', '600'],
  style: ['normal', 'italic'],
  display: 'swap',
  preload: false,
  variable: '--inv-font',
});
