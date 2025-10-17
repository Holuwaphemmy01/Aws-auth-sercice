import { getUserByEmail, putUser, updateLoginMeta } from '../src/lib/db';
import { mockClient } from 'aws-sdk-client-mock';
import { DynamoDBDocumentClient, GetCommand, PutCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';

// Mock the DynamoDB Document Client
const ddbMock = mockClient(DynamoDBDocumentClient);

// Required for db.ts (environment validation)
process.env.TABLE_NAME = 'MockUserTable';

describe('db.ts', () => {
  beforeEach(() => {
    ddbMock.reset();
  });

  test('putUser should insert a user successfully', async () => {
    ddbMock.on(PutCommand).resolves({});

    await expect(
      putUser({
        email: 'test@example.com',
        name: 'John Doe',
        password_hash: 'hashed_pw',
      })
    ).resolves.not.toThrow();

    const calls = ddbMock.commandCalls(PutCommand);
    expect(calls.length).toBe(1);

    const call = calls[0].args[0].input;
    expect(call?.Item?.email).toBe('test@example.com');
    expect(call?.Item?.name).toBe('John Doe');
  });

  test('getUserByEmail should return user when found', async () => {
    ddbMock.on(GetCommand).resolves({
      Item: {
        pk: 'USER#test@example.com',
        sk: 'PROFILE',
        email: 'test@example.com',
        name: 'John Doe',
        password_hash: 'hashed_pw',
      },
    });

    const res = await getUserByEmail('test@example.com');

    expect(res).toBeDefined();
    expect(res?.email).toBe('test@example.com');
    expect(res?.name).toBe('John Doe');
  });

  test('getUserByEmail should return undefined when user not found', async () => {
    ddbMock.on(GetCommand).resolves({});
    const res = await getUserByEmail('missing@example.com');
    expect(res).toBeUndefined();
  });

  test('updateLoginMeta should update login metadata successfully', async () => {
    ddbMock.on(UpdateCommand).resolves({});

    await expect(
      updateLoginMeta('test@example.com', {
        lastLoginAt: '2025-10-16T00:00:00Z',
        failedLoginCount: 1,
      })
    ).resolves.not.toThrow();

    const calls = ddbMock.commandCalls(UpdateCommand);
    expect(calls.length).toBe(1);

    const input = calls[0].args[0].input;
    expect(input.TableName).toBe('MockUserTable');
   // expect(input.Key.pk).toBe('USER#test@example.com');
    expect(input.UpdateExpression).toContain('SET');
  });
});
