import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, PutCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import dotenv from 'dotenv';

dotenv.config();

// Validate environment variables
const TABLE_NAME = process.env.TABLE_NAME;
if (!TABLE_NAME) {
  throw new Error('TABLE_NAME environment variable is required');
}

// Configure DynamoDB client
const client = new DynamoDBClient({
  region: process.env.AWS_REGION || 'us-east-1', // Default region if not set
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  },
});
const docClient = DynamoDBDocumentClient.from(client);

// Define user interface
interface User {
  pk: string;
  sk: string;
  email: string;
  name: string;
  password_hash: string;
  lastLoginAt?: string;
  failedLoginCount?: number;
  updatedAt?: string;
}

// Get user by email
export const getUserByEmail = async (email: string): Promise<User | undefined> => {
  try {
    const res = await docClient.send(
      new GetCommand({
        TableName: TABLE_NAME,
        Key: { pk: `USER#${email}`, sk: 'PROFILE' },
      })
    );
    return res.Item as User | undefined;
  } catch (error) {
    console.error(`Error fetching user ${email}:`, error);
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to fetch user: ${message}`);
  }
};

// Put user
export const putUser = async (user: {
  email: string;
  name: string;
  password_hash: string;
}): Promise<void> => {
  try {
    const item: User = {
      pk: `USER#${user.email}`,
      sk: 'PROFILE',
      ...user,
      failedLoginCount: 0,
      updatedAt: new Date().toISOString(),
    };
    await docClient.send(
      new PutCommand({
        TableName: TABLE_NAME,
        Item: item,
      })
    );
  } catch (error) {
    console.error(`Error putting user ${user.email}:`, error);
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to put user: ${message}`);
  }
};

// Update login metadata
export const updateLoginMeta = async (
  email: string,
  updates: { lastLoginAt?: string; failedLoginCount?: number }
): Promise<void> => {
  try {
    const now = new Date().toISOString();
    await docClient.send(
      new UpdateCommand({
        TableName: TABLE_NAME,
        Key: { pk: `USER#${email}`, sk: 'PROFILE' },
        UpdateExpression: 'SET lastLoginAt = :l, failedLoginCount = :f, updatedAt = :u',
        ExpressionAttributeValues: {
          ':l': updates.lastLoginAt || now,
          ':f': updates.failedLoginCount || 0,
          ':u': now,
        },
      })
    );
  } catch (error) {
    console.error(`Error updating login meta for ${email}:`, error);
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to update login meta: ${message}`);
  }
};