import axios from 'axios';

const tenantId = process.env.VINNOVA_TENANT_ID!;
const clientId = process.env.VINNOVA_CLIENT_ID!;
const clientSecret = process.env.VINNOVA_CLIENT_SECRET!;
const scope = process.env.VINNOVA_SCOPE!;

if (!tenantId || !clientId || !clientSecret || !scope) {
  throw new Error('Missing required VINNOVA_* environment variables. Please check your .env file.');
}

const TOKEN_URL = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`;

let accessToken: string | null = null;
let tokenExpiresAt = 0;

export async function getVinnovaAccessToken(): Promise<string> {
  const now = Date.now();
  if (accessToken && now < tokenExpiresAt - 60000) {
    return accessToken;
  }

  const params = new URLSearchParams();
  params.append('grant_type', 'client_credentials');
  params.append('client_id', clientId);
  params.append('client_secret', clientSecret);
  params.append('scope', scope);

  const response = await axios.post(TOKEN_URL, params, {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  });

  accessToken = response.data.access_token;
  tokenExpiresAt = now + response.data.expires_in * 1000;
  if (!accessToken) {
    throw new Error('Failed to obtain Vinnova access token');
  }
  return accessToken;
} 