import { Configuration, PlaidApi, PlaidEnvironments } from 'plaid';

const configuration = new Configuration({
  basePath: PlaidEnvironments[process.env.PLAID_ENV || 'sandbox'],
  baseOptions: {
    headers: {
      'PLAID-CLIENT-ID': process.env.PLAID_CLIENT_ID,
      'PLAID-SECRET': process.env.PLAID_SECRET,
    },
  },
});

const plaidClient = new PlaidApi(configuration);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { access_token } = req.body;
    
    // Get current balance
    const balanceResponse = await plaidClient.accountsBalanceGet({
      access_token,
    });

    res.status(200).json({
      accounts: balanceResponse.data.accounts,
    });
  } catch (error) {
    console.error('Error syncing accounts:', error);
    res.status(500).json({ error: 'Failed to sync accounts' });
  }
}
