import { auth } from '$lib/server/auth';
import { toSvelteKitHandler } from 'better-auth/svelte-kit';
import type { RequestHandler } from './$types';

const handleAuth = toSvelteKitHandler(auth);

export const GET: RequestHandler = async (event) => handleAuth(event);
export const POST: RequestHandler = async (event) => handleAuth(event);
