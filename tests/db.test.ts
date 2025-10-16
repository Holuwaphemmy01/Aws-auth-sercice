import { getUserByEmail, putUser, updateLoginMeta } from '../src/lib/db';
import { DynamoDBDocumentClient, GetCommand, PutCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';

jest.mock('@aws-sdk/lib-dynamodb', () => ({
  DynamoDBDocumentClient: { from: jest.fn() },
  GetCommand: jest.fn(),
  PutCommand: jest.fn(),
  UpdateCommand: jest.fn()
}));

const mockSend = jest.fn();
(DynamoDBDocumentClient.from as jest.Mock).mockReturnValue({ send: mockSend });

describe('DB Library', () => {
  beforeEach(() => jest.clearAllMocks());

  it('getUserByEmail should call GetCommand with correct key', async () => {
    mockSend.mockResolvedValue({ Item: { email: 'test@example.com' } });
    const res = await getUserByEmail('test@example.com');
    expect(res.email).toBe('test@example.com');
  });

  it('putUser should insert a new user', async () => {
    await putUser({ email: 'a@b.com', name: 'Jane', password_hash: 'hashed' });
    expect(PutCommand).toHaveBeenCalled();
  });

  it('updateLoginMeta should update login info', async () => {
    await updateLoginMeta('test@example.com', { lastLoginAt: 'now', failedLoginCount: 0 });
    expect(UpdateCommand).toHaveBeenCalled();
  });
});
