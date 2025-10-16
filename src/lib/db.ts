import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, PutCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import dotenv from 'dotenv';

dotenv.config();


const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

const TABLE_NAME = process.env.TABLE_NAME || 'UsersTable';

export const getUserByEmail = async (email: string) => {
  const res = await docClient.send(
    new GetCommand({
      TableName: TABLE_NAME,
      Key: { pk: `USER#${email}`, sk: 'PROFILE' }
    })
  );
  return res.Item;
};

export const putUser = async (user: { email: string; name: string; password_hash: string }) => {
  const now = new Date().toISOString();
  await docClient.send(
    new PutCommand({
      TableName: TABLE_NAME,
      Item: {
        pk: `USER#${user.email}`,
        sk: 'PROFILE',
        email: user.email,
        name: user.name,
        password_hash: user.password_hash,
        createdAt: now,
        updatedAt: now,
        failedLoginCount: 0
      },
      ConditionExpression: 'attribute_not_exists(pk)'
    })
  );
};

export const updateLoginMeta = async (email: string, updates: Record<string, any>) => {
  const now = new Date().toISOString();
  await docClient.send(
    new UpdateCommand({
      TableName: TABLE_NAME,
      Key: { pk: `USER#${email}`, sk: 'PROFILE' },
      UpdateExpression: 'SET lastLoginAt = :l, failedLoginCount = :f, updatedAt = :u',
      ExpressionAttributeValues: {
        ':l': updates.lastLoginAt,
        ':f': updates.failedLoginCount,
        ':u': now
      }
    })
  );
};
