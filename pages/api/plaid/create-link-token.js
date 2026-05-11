import { getPlaidClient, getUserFromRequest } from '../../../lib/plaidServer';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  const { user, error: authError } = await getUserFromRequest(req);
  if (!user) return res.status(401).json({ error: authError || 'Unauthorized' });

  try {
    const plaid = getPlaidClient();
    const response = await plaid.linkTokenCreate({
      user: { client_user_id: user.id },
      client_name: 'Cashflo',
      products: ['transactions'],
      country_codes: ['US'],
      language: 'en',
      webhook: process.env.PLAID_WEBHOOK_URL || undefined,
    });

    return res.status(200).json({ link_token: response.data.link_token });
  } catch (err) {
    console.error('create-link-token error:', err?.response?.data || err);
    return res.status(500).json({ error: err?.response?.data?.error_message || err.message });
  }
}
